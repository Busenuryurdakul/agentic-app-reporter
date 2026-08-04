# PEFT Gerçek Dataset — Veri Üretim Planı

Bu doküman, fine-tuning pipeline'ı teknik olarak doğrulandıktan sonra **production organizasyonunda** en az **30 farklı, kaliteli ve insan onaylı** `product_spec` üretmek için manuel süreç rehberidir.

**Kapsam dışı:** otomatik seed, otomatik onay, GPU eğitimi, HF upload, yeni fine-tune altyapısı.

---

## 1. Production organizasyonu — mevcut durum (2026-07-30)

### Dışlama kriterleri

Aşağıdakiler production sayılmaz:

- Adında `PEFT Smoke`, `Smoke P3/P4/P5`, `MCP Smoke`, `Compose Smoke`, `E2E Org`, `Check Org`, `WebMCP` geçen org'lar
- Slug'ı `smokepeft*`, `smokep*`, `mcp*`, `csm*`, `e2e*`, `chk*`, `wm*` ile başlayan org'lar
- `[[PEFT_SMOKE_TEST]]` marker içeren kayıtlar
- Batch seed org'ları (`PEFT Smoke Batch Org …`)

### Production org tespiti

**Kesin production organizasyonu otomatik olarak belirlenemedi.**

Yerel veritabanında smoke/test dışında **tek aday**:

| Alan | Değer |
|------|-------|
| **Organization ID** | `3d9f3f39-a98b-49a0-94ff-4b808e71c065` |
| **Organization name** | Kırsal kalkınma projesi |
| **Slug** | `krsalkalknmaprojesi` |
| **Workspace count** | 1 |
| **Existing product_spec count** | **0** |
| **Approved product_spec count** | **0** |
| **Eligible PEFT document count** | **0** |

> **Onay gerekli:** Bu org gerçek çalışma organizasyonunuz mu? Değilse UI'dan kullandığınız production org UUID'sini bu dokümandaki `<PROD_ORG_ID>` yerine yazın. Yanlış org ile export yapmayın.

### Diğer org'lar (işlem yapılmadı)

Toplam 37 org; 36'sı smoke/test veya PEFT batch. Production adayı dışında otomatik işlem **yapılmadı**.

---

## 2. Production org — workspace durum raporu

Organizasyon: **Kırsal kalkınma projesi** (`3d9f3f39-a98b-49a0-94ff-4b808e71c065`)

| Workspace | Profile completeness | Questionnaire completeness | Latest product_spec status | Quality score | Approval status | PEFT eligibility | Exclusion reason |
|-----------|---------------------|---------------------------|---------------------------|---------------|-----------------|------------------|------------------|
| Kırsal kalkınma projesi (`888e568d-…`) | Kısmi — proje adı, açıklama, ürün tipi dolu | **0 cevap** — zorunlu anketler boş | **Hiç product_spec yok** (2× `studio_markdown`, draft) | studio_markdown ~ düşük (72 char body) | draft | **Hayır** | Hiç Product Spec üretilmemiş; profil/anket eksik; onay yok |

### Durum özeti (tüm workspace'ler)

| Durum | Adet |
|-------|------|
| Profil eksik | 1 (anket + detay profil alanları) |
| Zorunlu anket cevapları eksik | 1 |
| Hiç Product Spec üretilmemiş | 1 |
| Product Spec üretilmiş ancak onaylanmamış | 0 |
| Düşük kaliteli (product_spec) | 0 |
| Fingerprint mismatch | 0 |
| PEFT için uygun | **0** |
| Smoke/test içerik | 0 |

---

## 3. 30 örnek — kategori dağılım planı

Aynı profili yalnızca proje adı değiştirerek tekrar etmeyin. Her senaryoda platform, kullanıcı kitlesi, entegrasyon ve güvenlik farklı olsun.

| Proje kategorisi | Hedef örnek |
|------------------|-------------|
| SaaS / dashboard | 5 |
| E-ticaret | 4 |
| Mobil uygulama | 4 |
| Yapay zekâ / agent | 5 |
| Kurumsal iç araç | 4 |
| Raporlama / analitik | 4 |
| Rezervasyon / operasyon | 4 |
| **Toplam** | **30** |

### Çeşitlilik boyutları (her senaryoda en az 4'ü farklı olsun)

- Proje amacı ve domain
- Hedef kullanıcı personasu
- Platform (web / mobil / hibrit / API-only)
- Frontend / backend / veritabanı seçimi
- Ölçek (100 kullanıcı vs 100K+)
- Güvenlik (KVKK, RBAC, SSO, audit)
- Entegrasyonlar (ödeme, ERP, MCP, LLM)
- TR/EN çıktı dili ve beklenen belge uzunluğu

---

## 4. 30 proje senaryosu

### SaaS / dashboard (5)

## Senaryo 01 — FinOps Kontrol Paneli

- Kategori: SaaS / dashboard
- Kısa açıklama: Çok kiracılı SaaS finans ekipleri için bulut maliyet optimizasyonu ve bütçe takibi.
- Hedef kullanıcı: FinOps mühendisleri, engineering manager
- Platform: Web
- Frontend: Next.js, React, shadcn
- Backend: Go REST API
- Veritabanı: PostgreSQL
- Altyapı: Vercel + Render, Redis cache
- Temel özellikler: Cost anomaly alert, tag-based allocation, CSV export, RBAC
- Güvenlik gereksinimleri: SSO (OIDC), org isolation, audit log
- Entegrasyonlar: AWS Cost Explorer, Slack webhook
- Ölçek beklentisi: 50 org, 500 kullanıcı
- Product Spec içinde özellikle bulunması gerekenler: Multi-tenant model, rol matrisi, veri saklama süresi
- Diğer senaryolardan farkı: Finans odaklı metrikler; e-ticaret veya rezervasyon yok

## Senaryo 02 — HR Onboarding Portalı

- Kategori: SaaS / dashboard
- Kısa açıklama: İK ekiplerinin yeni çalışan onboarding checklist'lerini yönettiği portal.
- Hedef kullanıcı: İK uzmanları, people ops
- Platform: Web
- Frontend: React SPA
- Backend: Node.js NestJS
- Veritabanı: PostgreSQL
- Altyapı: Azure App Service
- Temel özellikler: Görev şablonları, belge yükleme, e-imza durumu
- Güvenlik gereksinimleri: KVKK, PII maskeleme, 2FA
- Entegrasyonlar: Microsoft 365, DocuSign
- Ölçek beklentisi: 5K çalışan, 200 İK kullanıcısı
- Product Spec içinde özellikle bulunması gerekenler: Onboarding SLA, veri silme politikası
- Diğer senaryolardan farkı: İnsan kaynakları workflow; operasyonel rezervasyon değil

## Senaryo 03 — SaaS Metrik Panosu (Product Analytics)

- Kategori: SaaS / dashboard
- Kısa açıklama: B2B SaaS ürün ekipleri için activation, retention ve feature adoption metrikleri.
- Hedef kullanıcı: Product manager, growth analyst
- Platform: Web
- Frontend: Next.js
- Backend: Python FastAPI
- Veritabanı: ClickHouse + PostgreSQL metadata
- Altyapı: Kubernetes
- Temel özellikler: Kohort analizi, funnel, feature flag korelasyonu
- Güvenlik gereksinimleri: Row-level security, API key rotation
- Entegrasyonlar: Segment, Amplitude export
- Ölçek beklentisi: 10M event/gün
- Product Spec içinde özellikle bulunması gerekenler: Event şeması, sampling stratejisi
- Diğer senaryolardan farkı: Analitik event pipeline; CRM iç aracından farklı

## Senaryo 04 — Vendor Yönetim Dashboard

- Kategori: SaaS / dashboard
- Kısa açıklama: Tedarikçi sözleşmeleri, SLA ve performans skor kartları.
- Hedef kullanıcı: Satın alma, tedarik zinciri yöneticileri
- Platform: Web
- Frontend: Vue 3
- Backend: Java Spring Boot
- Veritabanı: PostgreSQL
- Altyapı: On-prem + VPN
- Temel özellikler: Sözleşme yenileme uyarıları, KPI dashboard
- Güvenlik gereksinimleri: On-prem zorunlu, LDAP
- Entegrasyonlar: SAP Ariba read-only
- Ölçek beklentisi: 2K vendor kaydı
- Product Spec içinde özellikle bulunması gerekenler: Offline export, denetim izi
- Diğer senaryolardan farkı: Kurumsal satın alma; müşteri-facing e-ticaret değil

## Senaryo 05 — Eğitim LMS Yönetici Paneli

- Kategori: SaaS / dashboard
- Kısa açıklama: Okul/kurs sağlayıcıları için ders, öğrenci ve sınav yönetimi.
- Hedef kullanıcı: Akademik koordinatör, öğretmen
- Platform: Web
- Frontend: Next.js
- Backend: Go
- Veritabanı: PostgreSQL
- Altyapı: AWS ECS
- Temel özellikler: Ders planı, quiz bankası, ilerleme raporu
- Güvenlik gereksinimleri: Öğrenci PII, veli onayı
- Entegrasyonlar: Zoom API, SCORM import
- Ölçek beklentisi: 20K öğrenci
- Product Spec içinde özellikle bulunması gerekenler: Erişilebilirlik (WCAG), içerik lisans modeli
- Diğer senaryolardan farkı: Eğitim domain'i; FinOps veya agent değil

### E-ticaret (4)

## Senaryo 06 — Moda Markası D2C Mağazası

- Kategori: E-ticaret
- Kısa açıklama: Türkiye pazarına yönelik D2C moda e-ticaret sitesi.
- Hedef kullanıcı: 25–40 yaş online alışveriş yapan tüketiciler
- Platform: Web + mobil web
- Frontend: Next.js storefront
- Backend: Go microservices
- Veritabanı: PostgreSQL + Redis
- Altyapı: Vercel + Render
- Temel özellikler: Sepet, iade, beden rehberi, kampanya motoru
- Güvenlik gereksinimleri: PCI-DSS scope minimizasyonu, 3DS ödeme
- Entegrasyonlar: iyzico, Aras Kargo API
- Ölçek beklentisi: Black Friday 50K eşzamanlı oturum
- Product Spec içinde özellikle bulunması gerekenler: Stok rezervasyonu, KVKK aydınlatma
- Diğer senaryolardan farkı: B2C moda; B2B market değil

## Senaryo 07 — B2B Hırdavat Toptan Sipariş

- Kategori: E-ticaret
- Kısa açıklama: Esnaflara hırdavat toptan satış ve kredi limiti yönetimi.
- Hedef kullanıcı: Esnaf, küçük müteahhit
- Platform: Web
- Frontend: React
- Backend: .NET Core
- Veritabanı: SQL Server
- Altyapı: Azure
- Temel özellikler: Müşteri bazlı fiyat listesi, vadeli ödeme onayı
- Güvenlik gereksinimleri: B2B hesap doğrulama, e-fatura entegrasyonu
- Entegrasyonlar: Logo ERP, e-Arşiv
- Ölçek beklentisi: 3K aktif bayi
- Product Spec içinde özellikle bulunması gerekenler: Kredi limit workflow, minimum sipariş tutarı
- Diğer senaryolardan farkı: B2B fiyatlandırma; D2C modadan farklı

## Senaryo 08 — Market Yeri (Çok Satıcılı)

- Kategori: E-ticaret
- Kısa açıklama: Yerel üreticilerin doğrudan sattığı çok satıcılı pazar yeri.
- Hedef kullanıcı: Alıcılar ve KOBİ satıcılar
- Platform: Web + satıcı paneli
- Frontend: Next.js
- Backend: Node.js
- Veritabanı: PostgreSQL
- Altyapı: GCP
- Temel özellikler: Satıcı onboarding, komisyon, dispute resolution
- Güvenlik gereksinimleri: Escrow ödeme, KYC hafif doğrulama
- Entegrasyonlar: Stripe Connect benzeri payout
- Ölçek beklentisi: 500 satıcı, 100K SKU
- Product Spec içinde özellikle bulunması gerekenler: Komisyon hesaplama, iade politikası çok taraflı
- Diğer senaryolardan farkı: Marketplace modeli; tek marka D2C değil

## Senaryo 09 — Abonelik Kutusu (Subscription Commerce)

- Kategori: E-ticaret
- Kısa açıklama: Aylık kişisel bakım ürünü abonelik kutusu.
- Hedef kullanıcı: Abonelik tercih eden urban tüketiciler
- Platform: Web
- Frontend: Shopify headless + Next.js
- Backend: Serverless functions
- Veritabanı: PostgreSQL (Supabase)
- Altyapı: Vercel
- Temel özellikler: Abonelik planı, pause/skip, kişiselleştirme anketi
- Güvenlik gereksinimleri: Recurring payment tokenization
- Entegrasyonlar: Stripe Billing, kargo aggregator
- Ölçek beklentisi: 15K aktif abonelik
- Product Spec içinde özellikle bulunması gerekenler: Churn reduction akışları, faturalama döngüsü
- Diğer senaryolardan farkı: Recurring revenue; tek seferlik sepet odaklı değil

### Mobil uygulama (4)

## Senaryo 10 — Fitness Koçluk Uygulaması

- Kategori: Mobil uygulama
- Kısa açıklama: Kişisel antrenman planı ve ilerleme takibi.
- Hedef kullanıcı: Fitness meraklıları 18–45
- Platform: iOS + Android
- Frontend: React Native
- Backend: Go API
- Veritabanı: PostgreSQL
- Altyapı: AWS
- Temel özellikler: Workout plan, wearable sync, push reminder
- Güvenlik gereksinimleri: Sağlık verisi hassasiyeti, opt-in tracking
- Entegrasyonlar: Apple Health, Google Fit
- Ölçek beklentisi: 100K MAU
- Product Spec içinde özellikle bulunması gerekenler: Offline mode, bildirim stratejisi
- Diğer senaryolardan farkı: Consumer health; kurumsal iç araç değil

## Senaryo 11 — Saha Satış CRM Mobil

- Kategori: Mobil uygulama
- Kısa açıklama: Saha satış temsilcileri için ziyaret, sipariş ve stok kontrolü.
- Hedef kullanıcı: Saha satış ekipleri
- Platform: Android öncelikli (offline-first)
- Frontend: Flutter
- Backend: Java Spring
- Veritabanı: PostgreSQL + SQLite local cache
- Altyapı: Hybrid cloud
- Temel özellikler: Offline sipariş, GPS check-in, fotoğraf ekleme
- Güvenlik gereksinimleri: Cihaz MDM, remote wipe
- Entegrasyonlar: SAP SD sync
- Ölçek beklentisi: 800 saha kullanıcısı
- Product Spec içinde özellikle bulunması gerekenler: Sync conflict resolution
- Diğer senaryolardan farkı: Offline saha satış; consumer mobil app değil

## Senaryo 12 — Toplu Taşıma Mobil Bilet

- Kategori: Mobil uygulama
- Kısa açıklama: Şehir içi toplu taşımada QR bilet ve abonman yönetimi.
- Hedef kullanıcı: Günlük commuters
- Platform: iOS + Android
- Frontend: Kotlin/Swift native
- Backend: Go
- Veritabanı: PostgreSQL + Redis
- Altyapı: On-prem + CDN
- Temel özellikler: QR doğrulama, bakiye yükleme, hat bildirimleri
- Güvenlik gereksinimi: Fraud detection, cihaz bağlama
- Entegrasyonlar: Belediye AFC sistemi
- Ölçek beklentisi: 1M bilet/gün peak
- Product Spec içinde özellikle bulunması gerekenler: Peak load, offline QR grace period
- Diğer senaryolardan farkı: Kamu ulaşım; e-ticaret sepeti yok

## Senaryo 13 — Yemek Tarifi ve Meal Plan

- Kategori: Mobil uygulama
- Kısa açıklama: Kişiselleştirilmiş haftalık yemek planı ve alışveriş listesi.
- Hedef kullanıcı: Evde yemek yapan aileler
- Platform: iOS + Android
- Frontend: React Native
- Backend: Python Django
- Veritabanı: PostgreSQL
- Altyapı: Heroku/Render
- Temel özellikler: Tarif önerisi, alerjen filtre, market listesi export
- Güvenlik gereksinimleri: Alerjen verisi, çocuk profili KVKK
- Entegrasyonlar: LLM tarif önerisi (backend-only)
- Ölçek beklentisi: 200K MAU
- Product Spec içinde özellikle bulunması gerekenler: Content moderation, diyet kısıtları
- Diğer senaryolardan farkı: Lifestyle/food; fitness veya agent platformu değil

### Yapay zekâ / agent (5)

## Senaryo 14 — Müşteri Destek Agent Studio

- Kategori: Yapay zekâ / agent
- Kısa açıklama: Kurumsal destek ekipleri için RAG tabanlı ticket assist agent.
- Hedef kullanıcı: Destek agent'ları, support manager
- Platform: Web admin + API
- Frontend: Next.js
- Backend: Go + Python inference worker
- Veritabanı: PostgreSQL + vector store (pgvector)
- Altyapı: Render + GPU inference host
- Temel özellikler: Ticket özet, önerilen yanıt, KB sync
- Güvenlik gereksinimleri: PII redaction, prompt injection guard
- Entegrasyonlar: Zendesk, MCP read tools
- Ölçek beklentisi: 500 eşzamanlı agent oturumu
- Product Spec içinde özellikle bulunması gerekenler: LLM provider abstraction, human-in-the-loop
- Diğer senaryolardan farkı: Support RAG agent; codegen agent değil

## Senaryo 15 — Kod İnceleme Agent Pipeline

- Kategori: Yapay zekâ / agent
- Kısa açıklama: PR açıldığında otomatik kod kalitesi ve güvenlik yorumu üreten agent.
- Hedef kullanıcı: Yazılım ekipleri
- Platform: GitHub App + web dashboard
- Frontend: React
- Backend: Go
- Veritabanı: PostgreSQL
- Altyapı: Kubernetes jobs
- Temel özellikler: Diff analizi, policy check, yorum post
- Güvenlik gereksinimleri: Repo token scope minimizasyonu, secret scan
- Entegrasyonlar: GitHub API, Cursor MCP (read-only)
- Ölçek beklentisi: 2K repo, 10K PR/ay
- Product Spec içinde özellikle bulunması gerekenler: Rate limit, model fallback
- Diğer senaryolardan farkı: DevTools/agent; müşteri chatbot değil

## Senaryo 16 — Doküman Üretim Studio (bu ürün ailesi)

- Kategori: Yapay zekâ / agent
- Kısa açıklama: Proje profili ve anketten product spec üreten yapılandırma stüdyosu.
- Hedef kullanıcı: Product owner, tech lead
- Platform: Web
- Frontend: Next.js
- Backend: Go Clean Architecture
- Veritabanı: PostgreSQL
- Altyapı: Vercel + Render + external LLM
- Temel özellikler: Questionnaire, generate, approve, PEFT export
- Güvenlik gereksinimleri: Multi-tenant, prompt not persisted
- Entegrasyonlar: OpenAI-compatible LLM, MCP tools
- Ölçek beklentisi: 100 org, 1K workspace
- Product Spec içinde özellikle bulunması gerekenler: 9 bölümlü product_spec şeması, quality gate
- Diğer senaryolardan farkı: Meta — kendi ürününüz; diğer domain senaryolarından ayrı tutun

## Senaryo 17 — Sesli Asistan (IVR + LLM)

- Kategori: Yapay zekâ / agent
- Kısa açıklama: Bankacılık IVR hattında doğal dil yönlendirme.
- Hedef kullanıcı: Çağrı merkezi müşterileri
- Platform: Telephony + API
- Frontend: Yok (ses kanalı)
- Backend: Python + telephony gateway
- Veritabanı: PostgreSQL
- Altyapı: On-prem telephony + cloud LLM
- Temel özellikler: Intent routing, warm transfer, transcript log
- Güvenlik gereksinimleri: BDDK uyumu, ses kaydı onayı
- Entegrasyonlar: Asterisk, core banking read API
- Ölçek beklentisi: 5K eşzamanlı çağrı
- Product Spec içinde özellikle bulunması gerekenler: Fallback to human, latency SLA
- Diğer senaryolardan farkı: Voice channel; web chat agent değil

## Senaryo 18 — Araştırma Özet Agent

- Kategori: Yapay zekâ / agent
- Kısa açıklama: Pazarlama ekipleri için çok kaynaklı rekabet analizi özeti.
- Hedef kullanıcı: Pazarlama stratejisti
- Platform: Web
- Frontend: Next.js
- Backend: Python FastAPI
- Veritabanı: PostgreSQL + object storage
- Altyapı: AWS Lambda + batch
- Temel özellikler: URL ingest, citation list, haftalık digest
- Güvenlik gereksinimleri: Source attribution, copyright notice
- Entegrasyonlar: Web fetch, optional MCP
- Ölçek beklentisi: 500 rapor/ay
- Product Spec içinde özellikle bulunması gerekenler: Hallucination mitigation, source policy
- Diğer senaryolardan farkı: Research summarization; code review agent değil

### Kurumsal iç araç (4)

## Senaryo 19 — IT Helpdesk Portal

- Kategori: Kurumsal iç araç
- Kısa açıklama: Çalışanların IT talebi açtığı self-service portal.
- Hedef kullanıcı: Tüm çalışanlar, IT ops
- Platform: Web
- Frontend: React
- Backend: Go
- Veritabanı: PostgreSQL
- Altyapı: On-prem
- Temel özellikler: Ticket, KB arama, onay akışı
- Güvenlik gereksinimleri: LDAP/AD, iç ağ only
- Entegrasyonlar: Jira Service Management sync
- Ölçek beklentisi: 10K çalışan
- Product Spec içinde özellikle bulunması gerekenler: SLA sınıfları, escalation matrix
- Diğer senaryolardan farkı: Internal IT; HR onboarding farklı domain

## Senaryo 20 — CapEx Talep Yönetimi

- Kategori: Kurumsal iç araç
- Kısa açıklama: Departmanların yatırım bütçesi talep ve onay süreci.
- Hedef kullanıcı: Departman müdürleri, CFO office
- Platform: Web
- Frontend: Angular
- Backend: Java
- Veritabanı: Oracle
- Altyapı: On-prem
- Temel özellikler: Multi-step approval, bütçe kalem takibi
- Güvenlik gereksinimleri: SOX audit trail
- Entegrasyonlar: SAP FI export
- Ölçek beklentisi: 500 talep/yıl
- Product Spec içinde özellikle bulunması gerekenler: Onay hiyerarşisi, para birimi kuralları
- Diğer senaryolardan farkı: Finans onay workflow; vendor dashboard farklı

## Senaryo 21 — Bilgi Bankası Wiki (Internal)

- Kategori: Kurumsal iç araç
- Kısa açıklama: Mühendislik ekipleri için dahili dokümantasyon wiki.
- Hedef kullanıcı: Yazılım mühendisleri
- Platform: Web
- Frontend: Next.js MDX
- Backend: Go
- Veritabanı: PostgreSQL
- Altyapı: Kubernetes
- Temel özellikler: Versiyonlu sayfa, arama, review workflow
- Güvenlik gereksinimleri: SSO, doc classification labels
- Entegrasyonlar: GitHub link embed
- Ölçek beklentisi: 50K sayfa, 2K editör
- Product Spec içinde özellikle bulunması gerekenler: Arama indeksleme, deprecation policy
- Diğer senaryolardan farkı: Knowledge base; ticket sistemi değil

## Senaryo 22 — Envanter ve Demirbaş Takibi

- Kategori: Kurumsal iç araç
- Kısa açıklama: Ofis demirbaşları, zimmet ve bakım planı.
- Hedef kullanıcı: Idari işler, IT asset manager
- Platform: Web + barkod mobil web
- Frontend: React
- Backend: .NET
- Veritabanı: SQL Server
- Altyapı: Azure
- Temel özellikler: QR zimmet, bakım hatırlatıcı, amortisman raporu
- Güvenlik gereksinimleri: Rol bazlı görünürlük
- Entegrasyonlar: Active Directory
- Ölçek beklentisi: 20K asset kaydı
- Product Spec içinde özellikle bulunması gerekenler: Zimmet devir workflow
- Diğer senaryolardan farkı: Asset tracking; HR portal değil

### Raporlama / analitik (4)

## Senaryo 23 — Perakende Satış BI Portalı

- Kategori: Raporlama / analitik
- Kısa açıklama: Mağaza bazlı günlük satış ve stok devir hızı raporları.
- Hedef kullanıcı: Bölge müdürleri, merkez analist
- Platform: Web
- Frontend: React + ECharts
- Backend: Python + dbt pipeline
- Veritabanı: Snowflake + PostgreSQL app meta
- Altyapı: AWS
- Temel özellikler: Drill-down, scheduled PDF, alert threshold
- Güvenlik gereksinimleri: Mağaza bazlı data scope
- Entegrasyonlar: POS feed, ERP nightly sync
- Ölçek beklentisi: 500 mağaza, 5 yıl veri
- Product Spec içinde özellikle bulunması gerekenler: ETL SLA, veri gecikmesi gösterimi
- Diğer senaryolardan farkı: Retail BI; SaaS product analytics değil

## Senaryo 24 — Sağlık Kliniği Operasyon Raporu

- Kategori: Raporlama / analitik
- Kısa açıklama: Randevu doluluk, bekleme süresi ve doktor verimliliği.
- Hedef kullanıcı: Klinik yöneticisi
- Platform: Web
- Frontend: Vue
- Backend: Go
- Veritabanı: PostgreSQL
- Altyapı: Private cloud
- Temel özellikler: KPI dashboard, export, anonymized cohort
- Güvenlik gereksinimleri: Sağlık verisi, KVKK, erişim log
- Entegrasyonlar: HBYS read-only API
- Ölçek beklentisi: 30 şube
- Product Spec içinde özellikle bulunması gerekenler: Anonimleştirme kuralları
- Diğer senaryolardan farkı: Healthcare ops; finans dashboard değil

## Senaryo 25 — Enerji Tüketim Analitiği

- Kategori: Raporlama / analitik
- Kısa açıklama: Fabrika hatları için enerji tüketim ve anomali tespiti.
- Hedef kullanıcı: Enerji mühendisi, tesis müdürü
- Platform: Web + edge gateway
- Frontend: React
- Backend: Python time-series service
- Veritabanı: TimescaleDB
- Altyapı: Hybrid edge + cloud
- Temel özellikler: Real-time meter ingest, anomaly alert
- Güvenlik gereksinimleri: OT/IT ayrımı, read-only SCADA
- Entegrasyonlar: Modbus/MQTT ingest
- Ölçek beklentisi: 10K sensör noktası
- Product Spec içinde özellikle bulunması gerekenler: Veri retention, edge offline buffer
- Diğer senaryolardan farkı: IoT/energy; perakende BI değil

## Senaryo 26 — Uyum (Compliance) Raporlama Paketi

- Kategori: Raporlama / analitik
- Kısa açıklama: KVKK ve ISO 27001 kontrol matrisi durum raporu.
- Hedef kullanıcı: Compliance officer, CISO
- Platform: Web
- Frontend: Next.js
- Backend: Go
- Veritabanı: PostgreSQL
- Altyapı: Azure
- Temel özellikler: Control mapping, evidence upload, gap analysis
- Güvenlik gereksinimleri: Immutable audit log, encryption at rest
- Entegrasyonlar: Jira, Confluence link
- Ölçek beklentisi: 200 kontrol maddesi
- Product Spec içinde özellikle bulunması gerekenler: Evidence versioning, export format
- Diğer senaryolardan farkı: GRC/compliance; satış BI değil

### Rezervasyon / operasyon (4)

## Senaryo 27 — Butik Otel Rezervasyon Sistemi

- Kategori: Rezervasyon / operasyon
- Kısa açıklama: 20 odalı butik otel için channel manager entegre rezervasyon.
- Hedef kullanıcı: Resepsiyon, otel müdürü
- Platform: Web + booking widget
- Frontend: Next.js
- Backend: Node.js
- Veritabanı: PostgreSQL
- Altyapı: Vercel + Railway
- Temel özellikler: Oda takvimi, overbooking guard, ön ödeme
- Güvenlik gereksinimleri: PCI scope, misafir PII
- Entegrasyonlar: Booking.com channel API
- Ölçek beklentisi: 500 rezervasyon/ay
- Product Spec içinde özellikle bulunması gerekenler: No-show policy, iptal kuralları
- Diğer senaryolardan farkı: Hospitality; klinik randevu farklı

## Senaryo 28 — Spor Tesisi Kort Rezervasyonu

- Kategori: Rezervasyon / operasyon
- Kısa açıklama: Tenis/kort saatlik rezervasyon ve üyelik paketi.
- Hedef kullanıcı: Spor tesisi üyeleri, tesis işletmesi
- Platform: Mobil + web
- Frontend: Flutter + Next.js admin
- Backend: Go
- Veritabanı: PostgreSQL
- Altyapı: AWS
- Temel özellikler: Slot booking, waitlist, ödeme
- Güvenlik gereksinimleri: Ödeme iadesi kuralları
- Entegrasyonlar: SMS gateway, Sanal POS
- Ölçek beklentisi: 1K günlük slot
- Product Spec içinde özellikle bulunması gerekenler: Çakışma önleme, peak pricing
- Diğer senaryolardan farkı: Facility booking; otel channel manager değil

## Senaryo 29 — Lojistik Filo Dispatch Paneli

- Kategori: Rezervasyon / operasyon
- Kısa açıklama: Kamyon filosu için rota atama ve teslimat penceresi yönetimi.
- Hedef kullanıcı: Dispatcher, filo müdürü
- Platform: Web
- Frontend: React
- Backend: Go
- Veritabanı: PostgreSQL + PostGIS
- Altyapı: GCP
- Temel özellikler: Route optimization, driver app API, POD foto
- Güvenlik gereksinimleri: Konum verisi KVKK, driver authentication
- Entegrasyonlar: Google Maps, ERP sevkiyat
- Ölçek beklentisi: 300 aktif araç
- Product Spec içinde özellikle bulunması gerekenler: SLA breach alert, reroute policy
- Diğer senaryolardan farkı: Logistics dispatch; otel rezervasyon değil

## Senaryo 30 — Restoran Masa ve Mutfak Operasyonu

- Kategori: Rezervasyon / operasyon
- Kısa açıklama: Çok şubeli restoran zinciri masa rezervasyonu ve mutfak sıra ekranı.
- Hedef kullanıcı: Host, mutfak, area manager
- Platform: Tablet + web admin
- Frontend: React
- Backend: Node.js
- Veritabanı: PostgreSQL + Redis queue
- Altyapı: AWS
- Temel özellikler: Masa planı, walk-in queue, KDS entegrasyonu
- Güvenlik gereksinimleri: Şube izolasyonu, personel PIN
- Entegrasyonlar: POS webhook, SMS hatırlatma
- Ölçek beklentisi: 80 şube, 15K masa/gün
- Product Spec içinde özellikle bulunması gerekenler: Peak hour capacity, no-show handling
- Diğer senaryolardan farkı: F&B operations; otel konaklama değil

---

## 5. Manuel üretim ve onay süreci

### Adımlar

1. **Production organizasyonunda** workspace oluştur (smoke org kullanma).
2. Senaryo dokümanından bir profil seç; proje profilini eksiksiz doldur.
3. Zorunlu anket sorularını cevapla (UI'da eksik bilgi uyarısı kalmamalı).
4. `product_spec` üret (mock veya gerçek LLM — production kalitesi için gerçek LLM tercih edilir).
5. Markdown çıktısını insan gözüyle oku.
6. 9 zorunlu bölümün tamamını kontrol et.
7. Eksik/hatalı bölüm varsa regenerate et (eski sürümü silme; yeni satır oluşur).
8. Kalite skorunu UI/API'den kontrol et (hedef: ≥80, section coverage OK).
9. **Yalnızca yeterli kalitedeki** belgeyi onayla.
10. Export dry-run veya analiz ile PEFT uygunluğunu doğrula.

### Belge başına checklist

```text
[ ] Gerçek ve farklı proje senaryosu
[ ] Profil tamamlandı
[ ] Zorunlu sorular tamamlandı
[ ] Dokuz Product Spec bölümü mevcut
[ ] Boş başlık yok
[ ] Çelişkili teknoloji seçimi yok
[ ] Hassas bilgi veya secret yok
[ ] Smoke marker yok
[ ] Kalite skoru yeterli (≥80, section coverage OK)
[ ] İnsan tarafından kontrol edildi
[ ] Onaylandı
```

### İlerleme takibi (manuel)

| # | Senaryo | Workspace | Onaylandı | Not |
|---|---------|-----------|-----------|-----|
| 1 | FinOps Kontrol Paneli | | | |
| … | … | | | |
| 30 | Restoran Operasyonu | | | |

---

## 6. Duplicate ve benzerlik riski

### Mevcut export pipeline kontrolleri

| Kontrol | Nerede | Davranış |
|---------|--------|----------|
| Fingerprint gate | Export use case | Rebuilt context ≠ stored → skip |
| Dedupe (default fingerprint) | Export use case | Aynı fingerprint → en yeni onaylı |
| Quality + section coverage | Export use case | Min skor / bölüm eşiği |
| Secret scan | `--scan-assistant-secrets` | Opsiyonel |
| Smoke marker | `--exclude-smoke-markers` | Production export için zorunlu |

### Mevcut `analyze_dataset.py` kontrolleri

| Kontrol | Tip | Limitasyon |
|---------|-----|------------|
| `duplicate_fingerprint_count` | **Tam eşleşme** | Normalize edilmiş benzer fingerprint yakalamaz |
| `duplicate_user_prompt_groups` | **Tam string eşleşme** | Parafraz veya küçük farkları kaçırır |
| `duplicate_assistant_groups` | **Tam string eşleşme** | Aynı |
| `train_val_fingerprint_overlap` | Set kesişimi | İyi |
| `smoke_test_record_count` | Marker substring | İyi |
| `short_or_empty_assistant_count` | `<200` char | İyi |

**Eksik (bu aşamada implement edilmedi):**

- Embedding / semantic similarity
- Yakın eşleşen proje açıklaması (fuzzy)
- Anket cevap vektörü benzerliği
- Kategori dengesi analizi

### Manuel benzerlik uyarısı (öneri — pipeline değişikliği yok)

Export sonrası analiz raporuna bakarken şunları elle kontrol edin:

1. **User prompt ilk 500 karakter** — aynı profil şablonu tekrar ediyor mu?
2. **Assistant H2 başlık dizisi** — birebir aynı sıra ve boş bölüm?
3. **Proje adı + product_type kombinasyonu** — spreadsheet'te duplicate var mı?

İleride isteğe bağlı eklenebilir (şimdilik sadece öneri):

```text
normalized_hash = SHA256(lowercase(strip(user_prompt)))[:16]
```

Export JSONL metadata'ya yazmadan, analiz script'inde **yakın duplicate uyarısı** için kullanılabilir. **Bu planda kod değişikliği yapılmadı.**

---

## 7. Production export komutları

`<PROD_ORG_ID>` yerine onayladığınız production org UUID'sini yazın.

```bash
cd backend

go run ./cmd/export-peft-dataset \
  --org-id=<PROD_ORG_ID> \
  --exclude-smoke-markers \
  --out-dir=./peft-export-production \
  --force \
  --write-skipped \
  --verbose
```

Analiz:

```bash
node ./scripts/analyze_peft_dataset.mjs \
  --dataset-dir=./peft-export-production
```

### İlk eğitim öncesi beklenen kriterler

```text
total_records >= 30
readiness_level = initial fine-tune   # (analiz çıktısı: "initial fine-tune")
finetune_ready = true
smoke_marker_count = 0
duplicate_fingerprint_count = 0
train_val_fingerprint_overlap = 0
empty_or_short_assistant_count = 0
```

Ek manuel kontroller:

- Validation set boş değil (≥30 workspace export sonrası genelde 2–4 val beklenir, %90 split)
- Tek kategori dataset'in >50%'sini oluşturmuyor
- Duplicate user/assistant group sayısı 0'a yakın

---

## 8. GPU eğitimine geçiş — durdurma koşulları

Aşağıdakilerden **biri bile** varsa LoRA/GPU eğitimine geçmeyin:

| # | Koşul |
|---|--------|
| 1 | 30'dan az uygun kayıt |
| 2 | Smoke marker bulunması (`[[PEFT_SMOKE_TEST]]`) |
| 3 | Train ve validation fingerprint çakışması |
| 4 | Duplicate fingerprint (export sonrası analiz >0) |
| 5 | Çok sayıda aynı user prompt veya assistant cevabı |
| 6 | Boş veya aşırı kısa Product Spec (`short_or_empty_assistant_count > 0`) |
| 7 | İnsan onayı olmayan belgeler (export zaten `approved` filtreler) |
| 8 | Tek proje kategorisinin dataset'in çoğunu oluşturması |
| 9 | Validation setinin tamamen boş olması (30+ kayıt ile) |

---

## 9. İlgili dokümanlar

- [deployments/finetune/README.md](../deployments/finetune/README.md)
- [product-spec-schema.md](../../docs/product-spec-schema.md)
- [STUDIO.md](../STUDIO.md)
