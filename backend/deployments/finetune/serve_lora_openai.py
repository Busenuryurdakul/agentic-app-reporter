#!/usr/bin/env python3
"""Minimal OpenAI-compatible /v1/chat/completions server for Unsloth Gemma2 + optional LoRA."""

from __future__ import annotations

import argparse
import json
import time
import uuid
from typing import Any

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    max_tokens: int | None = Field(default=4096, alias="max_tokens")
    temperature: float = 0.2
    top_p: float = 1.0
    response_format: dict[str, Any] | None = None
    stream: bool = False


app = FastAPI(title="product-spec-lora-openai")
_state: dict[str, Any] = {}


def load_model(base_model: str, adapter_dir: str | None, max_seq_length: int) -> None:
    from unsloth import FastLanguageModel

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=base_model,
        max_seq_length=max_seq_length,
        dtype=None,
        load_in_4bit=True,
    )
    if adapter_dir:
        from peft import PeftModel

        model = PeftModel.from_pretrained(model, adapter_dir)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    FastLanguageModel.for_inference(model)
    _state["model"] = model
    _state["tokenizer"] = tokenizer
    _state["max_seq_length"] = max_seq_length
    _state["model_name"] = "product-spec-gemma-lora-v1" if adapter_dir else "product-spec-gemma-base-v1"


def apply_gemma_chat_template(tokenizer, messages: list[dict[str, str]], json_mode: bool) -> str:
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    if json_mode:
        text = text.rstrip() + "\nReturn valid JSON only.\n"
    return text


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "model_loaded": "model" in _state}


@app.get("/v1/models")
def list_models() -> dict[str, Any]:
    name = _state.get("model_name", "product-spec-gemma-lora-v1")
    return {
        "object": "list",
        "data": [{"id": name, "object": "model", "owned_by": "local"}],
    }


@app.post("/v1/chat/completions")
def chat_completions(req: ChatCompletionRequest) -> dict[str, Any]:
    if "model" not in _state:
        raise HTTPException(status_code=503, detail="model not loaded")
    if req.stream:
        raise HTTPException(status_code=400, detail="stream not supported")

    model = _state["model"]
    tokenizer = _state["tokenizer"]
    max_seq = int(_state["max_seq_length"])
    json_mode = bool(req.response_format and req.response_format.get("type") == "json_object")

    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    prompt = apply_gemma_chat_template(tokenizer, messages, json_mode)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    input_len = int(inputs["input_ids"].shape[-1])
    max_new = min(int(req.max_tokens or 4096), max(256, max_seq - input_len - 8))

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=max_new,
            do_sample=req.temperature > 0,
            temperature=max(req.temperature, 0.01),
            top_p=req.top_p,
            use_cache=True,
        )

    sequences = output.sequences if hasattr(output, "sequences") else output
    if sequences.dim() == 1:
        generated = sequences[input_len:]
    else:
        generated = sequences[0, input_len:]
    content = tokenizer.decode(generated, skip_special_tokens=True).strip()
    finish_reason = "length" if len(generated) >= max_new else "stop"
    model_name = req.model or _state.get("model_name", "product-spec-gemma-lora-v1")

    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:24]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model_name,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": finish_reason,
            }
        ],
        "usage": {
            "prompt_tokens": input_len,
            "completion_tokens": int(len(generated)),
            "total_tokens": input_len + int(len(generated)),
        },
    }


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="OpenAI-compatible LoRA inference server")
    p.add_argument("--base-model", default="unsloth/gemma-2-2b-it-bnb-4bit")
    p.add_argument("--adapter-dir", default="", help="LoRA adapter path; omit for base-only server")
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--max-seq-length", type=int, default=16384)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    adapter = args.adapter_dir.strip() or None
    load_model(args.base_model, adapter, args.max_seq_length)
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
