# PEFT Dataset — Bağımsız Sentetik Veri Altyapısı

Bu klasör, ana projeden ve veritabanından **bağımsız** olarak instruction fine-tuning için JSONL dataset üretmek, train/validation ayırmak ve kalite kontrolü yapmak amacıyla tasarlanmıştır.

Harici npm paketi **gerektirmez** — yalnızca Node.js 18+ yeterlidir.

---

## Amaç

Sentetik Türkçe örneklerden aşağıdaki formatta eğitim verisi üretmek:

- `system` / `user` / `assistant` mesaj dizisi
- Kategori metadata (`product_spec`, `project_planning`, vb.)
- Deterministik train/validation ayrımı
- Otomatik kalite analizi

Sentetik veriler, pipeline ve model davranışını **test etmek** içindir. Production kalitesinde bir model için mutlaka **manuel inceleme** ve gerçek, insan onaylı örnekler eklenmelidir.

---

## Proje yapısı

```
peft-dataset/
├── data/
│   ├── raw_examples.json      # Ham sentetik örnekler
│   └── output/
│       ├── train.jsonl        # Eğitim seti
│       ├── val.jsonl          # Doğrulama seti
│       └── manifest.json      # Export özeti
├── scripts/
│   ├── generate_dataset.mjs   # JSONL üretici
│   └── analyze_dataset.mjs    # Kalite analizi
├── package.json
└── README.md
```

---

## Dataset formatı

### Ham örnek (`raw_examples.json`)

Her kayıt:

```json
{
  "instruction": "Kullanıcının görevi veya isteği",
  "input": "Görev için gerekli bağlam",
  "output": "Beklenen kaliteli cevap",
  "category": "product_spec"
}
```

Geçerli kategoriler:

| Kategori | Açıklama |
|----------|----------|
| `product_spec` | Ürün spesifikasyonu |
| `project_planning` | Proje planlama |
| `requirement_analysis` | Gereksinim analizi |
| `technical_documentation` | Teknik dokümantasyon |
| `risk_analysis` | Risk analizi |
| `user_story` | Kullanıcı hikâyesi |

### JSONL satır formatı (çıktı)

```json
{
  "messages": [
    {
      "role": "system",
      "content": "Sen Türkçe yanıt veren deneyimli bir ürün ve yazılım gereksinimleri uzmanısın."
    },
    {
      "role": "user",
      "content": "<instruction>\n\n<input>"
    },
    {
      "role": "assistant",
      "content": "<output>"
    }
  ],
  "metadata": {
    "category": "product_spec",
    "source": "synthetic",
    "language": "tr"
  }
}
```

---

## Hızlı başlangıç

### 1. Dataset oluştur

```bash
cd peft-dataset
npm run dataset:generate -- --force
```

İlk çalıştırmada `--force` olmadan mevcut çıktı varsa üzerine yazılmaz.

### 2. Analiz et

```bash
npm run dataset:analyze
```

### 3. Tek komutla üret + analiz

```bash
npm run dataset:build
```

---

## Komut seçenekleri

### `generate_dataset.mjs`

```bash
node scripts/generate_dataset.mjs
node scripts/generate_dataset.mjs --input=data/raw_examples.json
node scripts/generate_dataset.mjs --output=data/output
node scripts/generate_dataset.mjs --val-ratio=0.20
node scripts/generate_dataset.mjs --seed=42
node scripts/generate_dataset.mjs --force
```

| Seçenek | Varsayılan | Açıklama |
|---------|------------|----------|
| `--input` | `data/raw_examples.json` | Ham örnek dosyası |
| `--output` | `data/output` | Çıktı dizini |
| `--val-ratio` | `0.20` | Validation oranı (%20) |
| `--seed` | `42` | Deterministik karıştırma tohumu |
| `--force` | kapalı | Mevcut JSONL üzerine yaz |

**Üretim kuralları:**

- Boş `instruction` veya `output` reddedilir
- Tamamen aynı kayıtlar temizlenir
- `instruction + input` birleşiminde tekrarlar elenir
- Kategori dağılımı korunarak stratified split uygulanır
- Varsayılan split: **%80 train / %20 validation**

### `analyze_dataset.mjs`

```bash
node scripts/analyze_dataset.mjs --dataset-dir=data/output
```

Kontroller:

| Durum | Örnek |
|-------|-------|
| **PASS** | Geçerli JSON, roller doğru, train/val çakışması yok |
| **WARN** | Kısa assistant cevabı, uzun kayıt, kategori dengesizliği |
| **FAIL** | Geçersiz JSON, boş assistant, train/val birebir aynı kayıt |

- Ciddi hata varsa **exit code 1**
- Yalnızca uyarı varsa **exit code 0**

Token tahmini: toplam karakter / 4 (yaklaşık).

---

## Train / validation ayrımı

Split algoritması:

1. Kayıtlar kategoriye göre gruplanır
2. Her kategori kendi içinde seed ile karıştırılır
3. Kategori başına ~%20 validation'a ayrılır (tek kayıtlı kategoriler train'de kalır)
4. Sonuç `manifest.json` içinde raporlanır

Aynı `--seed` ile tekrar çalıştırıldığında split **aynı kalır**.

---

## Yeni örnek ekleme

1. `data/raw_examples.json` dosyasını açın
2. Yeni bir nesne ekleyin (benzersiz `instruction` + `input` kombinasyonu)
3. `category` alanını geçerli kategorilerden biri yapın
4. Dataset'i yeniden üretin:

```bash
npm run dataset:generate -- --force
npm run dataset:analyze
```

**Kalite ipuçları:**

- Örnekler birbirinin kopyası olmamalı
- `product_spec` kategorisinde mümkünse tüm bölümler bulunsun (Ürün özeti, Problem, Hedef kullanıcılar, vb.)
- Gerçek kişisel veri, API anahtarı veya şifre **eklemeyin**
- `metadata.source` otomatik olarak `synthetic` atanır

---

## Fine-tuning ve Ollama

> **Önemli:** Ollama doğrudan LoRA / fine-tune eğitimi **yapmaz**. Ollama, eğitilmiş veya birleştirilmiş (merged) modelleri **çalıştırmak** içindir.

Eğitim için tipik araç zinciri:

| Araç | Rol |
|------|-----|
| [Transformers](https://huggingface.co/docs/transformers) | Model ve tokenizer |
| [PEFT](https://huggingface.co/docs/peft) | LoRA adapter eğitimi |
| [TRL](https://huggingface.co/docs/trl) | SFTTrainer ile instruction tuning |
| Unsloth / Axolotl | Alternatif hızlandırılmış eğitim |

Örnek akış:

```
raw_examples.json
    → generate_dataset.mjs
    → train.jsonl / val.jsonl
    → TRL SFTTrainer (GPU)
    → lora_adapter/
    → (isteğe bağlı) merge weights
    → GGUF / Modelfile dönüşümü
    → Ollama'da serve
```

Eğitim sonrası modeli Ollama'da kullanmak için genellikle:

1. LoRA adapter'ı base model ile birleştirme
2. GGUF veya Ollama Modelfile formatına dönüştürme
3. `ollama create` ile yerel model tanımlama

gerekir.

---

## Güvenlik ve kalite

- Tüm örnekler sentetiktir; gerçek kişisel veri içermez
- Gizli bilgi (API key, şifre, token) eklenmemelidir
- Eğitime geçmeden önce `dataset:analyze` çıktısını ve birkaç satırı **manuel okuyun**
- Sentetik dataset tek başına production modeli için yeterli değildir

---

## Sorun giderme

| Sorun | Çözüm |
|-------|-------|
| `train.jsonl zaten var` | `--force` ekleyin |
| `Export edilecek geçerli kayıt kalmadı` | `raw_examples.json` doğrulamasını kontrol edin |
| Analiz FAIL — train/val çakışması | `--seed` veya split oranını değiştirin; duplicate raw kayıtları temizleyin |
| WARN — kısa assistant | `output` alanlarını zenginleştirin |

---

## Lisans

Bu araç ana repo ile birlikte kullanılmak üzere hazırlanmıştır. Sentetik örnekler eğitim amaçlıdır.
