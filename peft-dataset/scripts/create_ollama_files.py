#!/usr/bin/env python3
"""Create Ollama import helper files (no automatic conversion)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _utils import PROJECT_ROOT, load_training_config, resolve_project_path  # noqa: E402

SYSTEM_PROMPT = (
    "Sen Türkçe yanıt veren deneyimli bir ürün ve yazılım gereksinimleri uzmanısın."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ollama yardımcı dosyaları oluştur")
    parser.add_argument("--config", default="configs/training_config.json")
    parser.add_argument("--output-dir", default="training-output/ollama")
    parser.add_argument("--model-name", default=None, help="Modelfile FROM satırı için base model adı")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = load_training_config(resolve_project_path(args.config))
    model_name = args.model_name or config["model_name"]
    output_dir = resolve_project_path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    adapter_example = output_dir / "Modelfile.adapter.example"
    gguf_example = output_dir / "Modelfile.gguf.example"
    import_doc = output_dir / "OLLAMA_IMPORT.md"

    adapter_example.write_text(
        "\n".join(
            [
                f"FROM {model_name}",
                "ADAPTER ./adapter.gguf",
                "",
                "PARAMETER temperature 0.3",
                "PARAMETER num_ctx 4096",
                "",
                f"SYSTEM {SYSTEM_PROMPT}",
                "",
            ]
        ),
        encoding="utf-8",
    )

    gguf_example.write_text(
        "\n".join(
            [
                "FROM ./model.gguf",
                "",
                "PARAMETER temperature 0.3",
                "PARAMETER num_ctx 4096",
                "",
                f"SYSTEM {SYSTEM_PROMPT}",
                "",
            ]
        ),
        encoding="utf-8",
    )

    import_doc.write_text(
        "\n".join(
            [
                "# Ollama Aktarım Rehberi",
                "",
                "Bu klasördeki dosyalar **örnek şablonlardır**. Gerçek dönüşüm otomatik yapılmaz.",
                "",
                "## Önemli notlar",
                "",
                "- Safetensors dosyaları doğrudan her durumda Ollama adapter formatı değildir.",
                "- Gerekirse `llama.cpp` araçları ile GGUF dönüşümü yapılır.",
                "- Adapter'ın temel model mimarisi ile **tam uyumlu** olması gerekir.",
                "- Yanlış base model ile adapter birleştirilmemelidir.",
                f"- Bu pipeline varsayılan base model: `{model_name}`",
                "",
                "## Ollama oluşturma",
                "",
                "```bash",
                "ollama create product-spec-tr -f Modelfile",
                "ollama run product-spec-tr",
                "```",
                "",
                "## Önerilen akış",
                "",
                "1. LoRA adapter eğit (`scripts/train_lora.py`)",
                "2. İsteğe bağlı birleştir (`scripts/merge_adapter.py`)",
                "3. GGUF'ye dönüştür (llama.cpp / harici araç)",
                "4. Uygun Modelfile ile `ollama create` çalıştır",
                "",
                "## Adapter vs merged model",
                "",
                "- `Modelfile.adapter.example`: LoRA GGUF adapter senaryosu",
                "- `Modelfile.gguf.example`: Tamamen birleştirilmiş GGUF model senaryosu",
                "",
            ]
        ),
        encoding="utf-8",
    )

    print(f"Ollama yardımcı dosyaları oluşturuldu: {output_dir.relative_to(PROJECT_ROOT)}")
    for path in (adapter_example, gguf_example, import_doc):
        print(f"  - {path.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
