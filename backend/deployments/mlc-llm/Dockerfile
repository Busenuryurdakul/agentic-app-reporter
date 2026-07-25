# Custom MLC-LLM GPU server (OpenAI-compatible REST on :8080).
# Requires NVIDIA Container Toolkit at runtime (--gpus all).
#
# Build:  docker build -f deployments/mlc-llm/Dockerfile -t masterfabric-mlc-llm deployments/mlc-llm
# Run:    docker run --gpus all -p 8081:8080 -e MLC_MODEL=HF://mlc-ai/gemma-2b-it-q4f16_1-MLC masterfabric-mlc-llm
#
# First start may JIT-compile the model (several minutes). See deployments/mlc-llm/README.md.

FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    MLC_MODEL=HF://mlc-ai/gemma-2b-it-q4f16_1-MLC \
    MLC_HOST=0.0.0.0 \
    MLC_PORT=8080 \
    MLC_MODE=local \
    MLC_DEVICE=auto

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf python3 /usr/bin/python

RUN pip3 install --no-cache-dir --pre -U -f https://mlc.ai/wheels \
    mlc-llm-nightly-cu121 \
    mlc-ai-nightly-cu121

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=10s --retries=10 --start-period=180s \
  CMD wget -q -O- "http://127.0.0.1:${MLC_PORT}/v1/models" || exit 1

ENTRYPOINT ["/entrypoint.sh"]
