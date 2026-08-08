# PEFT Dataset — LoRA Eğitim Rehberi

Bu doküman, `peft-dataset/` klasöründeki bağımsız Python altyapısı ile instruction fine-tuning, değerlendirme ve Ollama aktarım adımlarını açıklar.

**Ana projeden bağımsızdır.** Veritabanı, Go API veya Studio UI gerektirmez.

---

## 1. Eğitim altyapısının amacı

Mevcut `train.jsonl` / `val.jsonl` dosyalarını kullanarak Hugging Face **Transformers**, **TRL** ve **PEFT** ile LoRA adapter eğitmek; base model ile karşılaştırmak; isteğe bağlı birleştirip Ollama'ya aktarım için yardımcı dosyalar üretmek.

İlk hedef gerçek bir production modeli değil, **uçtan uca pipeline'ın smoke modunda doğrulanmasıdır**.

---

## 2. Deneysel dataset uyarısı

Bu klasördeki veriler **sentetik** ve **deneysel** amaçlıdır. `metadata.source = synthetic` olarak işaretlenmiştir.

---

## 3. 42 kayıt neden yeterli değil?

Mevcut dataset **42 kayıt** içerir. Bu, pipeline testi için uygundur; anlamlı model kalitesi için **yetersizdir**.

Overfitting, zayıf genelleme ve güvenilmez değerlendirme sonuçları beklenir.

---

## 4. Python ortamı oluşturma

Python **3.11** önerilir.

```powershell
cd peft-dataset
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

Linux/macOS:

```bash
cd peft-dataset
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

---

## 5. Windows PowerShell komutları

```powershell
cd peft-dataset
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/check_environment.py
python scripts/prepare_training_data.py
python scripts/train_lora.py --max-steps 2
python scripts/create_ollama_files.py
```

CUDA destekli ortam:

```powershell
pip install -r requirements-cuda.txt
```

---

## 6. Linux/macOS komutları

```bash
cd peft-dataset
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/check_environment.py
python scripts/prepare_training_data.py
python scripts/train_lora.py --max-steps 2
python scripts/create_ollama_files.py
```

Apple Silicon (MPS) için genellikle `requirements.txt` yeterlidir.

---

## 7. Bağımlılık kurulumu

| Dosya | Amaç |
|-------|------|
| `requirements.txt` | CPU / genel (torch, transformers, trl, peft, …) |
| `requirements-cuda.txt` | CUDA + isteğe bağlı `bitsandbytes` |

**Notlar:**

- `bitsandbytes` yalnızca desteklenen CUDA ortamında kullanılmalıdır.
- CPU ortamında 4-bit quantization **kullanılmaz**.
- Hugging Face token yalnızca gated model indirirken gerekebilir; varsayılan model (`Qwen/Qwen2.5-0.5B-Instruct`) genelde token gerektirmez.

---

## 8. Ortam kontrolü

```bash
python scripts/check_environment.py
```

Kontrol edilenler:

- Python / PyTorch / Transformers / TRL / PEFT sürümleri
- CUDA, GPU belleği, MPS
- Train / val dosyaları
- Config geçerliliği
- Disk alanı

CUDA yokluğu **FAIL değil WARN** sayılır.

---

## 9. Dataset doğrulama

```bash
python scripts/prepare_training_data.py
```

Bu script **dosyaları değiştirmez**; yalnızca:

- `messages` formatını doğrular
- Kayıt sayılarını raporlar
- Ortalama uzunluk ve tahmini token hesaplar
- `max_seq_length` aşımı riski taşıyan satırları uyarır

---

## 10. Smoke training

Pipeline doğrulaması için:

```bash
python scripts/train_lora.py --max-steps 2
```

Bu komut model indirir, birkaç adım eğitim yapar ve adapter + `training_report.json` üretir. Tam kalite beklentisiyle kullanılmamalıdır.

---

## 11. Tam eğitim

```bash
python scripts/train_lora.py --config configs/training_config.json
```

CLI ile config ezilebilir:

```bash
python scripts/train_lora.py \
  --model-name Qwen/Qwen2.5-0.5B-Instruct \
  --output-dir training-output/lora-adapter \
  --epochs 1
```

**GPU önerilir.** CPU'da mümkün olsa da çok yavaştır.

---

## 12. Base ve LoRA karşılaştırması

```bash
python scripts/evaluate_model.py \
  --base-model Qwen/Qwen2.5-0.5B-Instruct \
  --adapter-dir training-output/lora-adapter
```

Hızlı test:

```bash
python scripts/evaluate_model.py \
  --base-model Qwen/Qwen2.5-0.5B-Instruct \
  --adapter-dir training-output/lora-adapter \
  --limit 2
```

Çıktılar:

- `training-output/evaluation/comparison.json`
- `training-output/evaluation/comparison.md`

Otomatik sinyaller (boş cevap, Türkçe görünüm, başlık ipuçları, kısalık, tekrar) **gerçek kalite ölçümü değildir**.

---

## 13. Adapter birleştirme

Smoke training sonrası otomatik merge **yapılmaz**. Manuel:

```bash
python scripts/merge_adapter.py \
  --base-model Qwen/Qwen2.5-0.5B-Instruct \
  --adapter-dir training-output/lora-adapter \
  --output-dir training-output/merged-model
```

Bellek sorununda:

```bash
python scripts/merge_adapter.py ... --cpu-offload
```

---

## 14. GGUF dönüşümü

Bu repo GGUF dönüşümünü otomatik yapmaz. Safetensors çıktısını Ollama'da kullanmak için genellikle:

1. Birleştirilmiş model (`merge_adapter.py`)
2. `llama.cpp` veya benzeri araçla GGUF export
3. Ollama Modelfile ile import

gerekir.

---

## 15. Ollama'ya aktarma

Yardımcı dosyalar:

```bash
python scripts/create_ollama_files.py
```

Üretilenler:

```text
training-output/ollama/
├── Modelfile.adapter.example
├── Modelfile.gguf.example
└── OLLAMA_IMPORT.md
```

Örnek:

```bash
ollama create product-spec-tr -f Modelfile
ollama run product-spec-tr
```

**Ollama doğrudan LoRA eğitimi yapmaz** — eğitilmiş veya dönüştürülmüş modeli çalıştırır.

---

## 16. CPU ve GPU farkları

| Ortam | Dtype | 4-bit | Hız |
|-------|-------|-------|-----|
| CUDA (bf16 destekli) | bfloat16 | isteğe bağlı | Hızlı |
| CUDA (bf16 yok) | float16 | isteğe bağlı | Orta |
| MPS | float16 | Hayır | Orta |
| CPU | float32 | Hayır | Çok yavaş |

---

## 17. Sık karşılaşılan hatalar

| Hata | Çözüm |
|------|-------|
| `torch kurulu değil` | `pip install -r requirements.txt` |
| `CUDA out of memory` | Batch size 1, `--max-steps 2`, daha küçük model |
| `use_4bit ... bitsandbytes` | `requirements-cuda.txt` kur veya config'te `use_4bit: false` |
| `train.jsonl bulunamadı` | Önce `npm run dataset:build` |
| LoRA target module hatası | Model mimarisine uygun modül adlarını `--lora-target-modules` ile ver |
| Ollama adapter yüklenmiyor | Base model ile adapter mimarisinin uyumlu olduğundan emin ol |

---

## 18. Disk ve bellek gereksinimleri

| Bileşen | Yaklaşık |
|---------|----------|
| Qwen2.5-0.5B model cache | ~1–2 GB |
| Eğitim geçici dosyalar | 2–5 GB |
| Merge edilmiş model | 1–3 GB |
| Önerilen boş disk | 15+ GB |

Merge işlemi yüksek RAM/VRAM tüketebilir; `--cpu-offload` denenebilir.

---

## 19. Sonuçların manuel değerlendirilmesi

- `comparison.md` dosyasını okuyun
- Türkçe akıcılık, başlık yapısı, hallucination ve tekrarları insan gözüyle kontrol edin
- Otomatik sinyallere güvenmeyin
- Smoke sonuçları production kararı için yeterli değildir

---

## 20. Dataset'i 300–500 örneğe büyütme önerisi

1. `data/raw_examples.json` dosyasına gerçekçi, çeşitli Türkçe örnekler ekleyin
2. `npm run dataset:build` ile JSONL yenileyin
3. `python scripts/prepare_training_data.py` ile doğrulayın
4. GPU üzerinde tam eğitim çalıştırın
5. `evaluate_model.py` ile base/LoRA karşılaştırması yapın
6. Sonuçları manuel inceleyin

Hedef: kategori dengesi korunarak **300–500** benzersiz, kaliteli instruction örneği.

---

## Konfigürasyon

`configs/training_config.json` varsayılan smoke-dostu ayardır:

- Model: `Qwen/Qwen2.5-0.5B-Instruct` (düşük kaynak)
- LoRA target modules: `q_proj`, `k_proj`, `v_proj`, `o_proj`

**Farklı model mimarilerinde** target module adları değişir. Örnek:

- Llama/Qwen: `q_proj,k_proj,v_proj,o_proj`
- Bazı modeller: `c_attn`, `c_proj` vb.

Model kartını ve PEFT dokümantasyonunu kontrol edin.

---

## Dosya yapısı

```text
peft-dataset/
├── configs/training_config.json
├── evaluation/prompts.json
├── scripts/
│   ├── check_environment.py
│   ├── prepare_training_data.py
│   ├── train_lora.py
│   ├── evaluate_model.py
│   ├── merge_adapter.py
│   └── create_ollama_files.py
├── training-output/
├── requirements.txt
├── requirements-cuda.txt
└── README_TRAINING.md
```

---

## Eğitim raporu

Başarılı veya başarısız her eğitim denemesi `training-output/lora-adapter/training_report.json` dosyasına yazılır.

Başarısız denemelerde `status: failed` ve hata detayı bulunur — sahte başarı raporu üretilmez.
