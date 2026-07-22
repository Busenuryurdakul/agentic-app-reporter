# Phase 2 UI Copy — Türkçe

Bu doküman, Phase 2 ekranları (**Plan / Proje Profili** ve **Anketler**) için tutarlı Türkçe arayüz metinlerini tanımlar. Kod değişikliği içermez; `frontend/src/lib/i18n/tr.ts` ve ilgili bileşenlere uygulanacak kaynak metindir.

**Sayfalar**

| Ekran | Rota |
|-------|------|
| Plan (Proje Profili) | `/o/{orgId}/w/{workspaceId}/plan` |
| Anketler | `/o/{orgId}/w/{workspaceId}/questionnaires` |

**Ton**

- Profesyonel, sade, doğrudan
- “Sen” hitabı yok; nötr emir / bildirim
- Teknik terimler gerektiğinde korunur (framework, CI/CD, MCP)
- Toast / hata / empty state cümleleri kısa ve eyleme yönelik

**Ortak kelime dağarcığı**

| Kavram | Kullanılacak terim | Kullanılmayacak |
|--------|--------------------|-----------------|
| Workspace | Çalışma alanı | Workspace, proje alanı |
| Project profile | Proje profili | Project profile |
| Completeness | Tamamlanma oranı | Completeness, doluluk skoru (başlıkta) |
| Questionnaire | Anket | Form, soru seti (nav’da) |
| Missing information | Eksik bilgiler | Missing info |
| Required | Zorunlu | Required, zorunlu alan (badge’de) |
| Optional | İsteğe bağlı | Opsiyonel (UI’da tutarlılık için) |
| Save | Kaydet | Save, Kaydetmek |

---

## 1. Ortak (Phase 2)

| Anahtar | Metin |
|---------|-------|
| `common.retry` | Yeniden dene |
| `common.save` | Kaydet |
| `common.saving` | Kaydediliyor… |
| `common.saved` | Kaydedildi |
| `common.cancel` | İptal |
| `common.confirm` | Onayla |
| `common.discard` | Vazgeç |
| `common.continue` | Devam et |
| `common.optional` | İsteğe bağlı |
| `common.required` | Zorunlu |
| `common.loadFailed` | Yüklenemedi |
| `common.loading` | Yükleniyor… |
| `common.permissionDenied` | Bu işlem için yetkiniz yok |
| `common.unexpectedError` | Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin. |

### Navigasyon

| Anahtar | Metin |
|---------|-------|
| `nav.plan` | Plan |
| `nav.questionnaires` | Anketler |

---

## 2. Plan — Proje Profili

### 2.1 Sayfa başlığı ve açıklama

| Anahtar | Metin |
|---------|-------|
| `plan.title` | Plan |
| `plan.description` | Proje profilini doldurun: genel bilgiler, teknoloji tercihleri, mimari, standartlar ve belge dili. |
| `plan.pageHeading` | Proje profili |
| `plan.pageSubheading` | Bu bilgiler belge üretimi ve hazırlık skorları için temel bağlam sağlar. |

> Not: Breadcrumb ve sidebar’da kısa başlık **Plan** kalsın. Sayfa içinde isteğe bağlı olarak `pageHeading` kullanılabilir.

### 2.2 Loading / error / empty

| Anahtar | Metin |
|---------|-------|
| `plan.loading` | Proje profili yükleniyor… |
| `plan.loadFailed` | Proje profili yüklenemedi |
| `plan.loadFailedDescription` | Profil bilgileri alınamadı. Bağlantıyı kontrol edip yeniden deneyin. |
| `plan.emptySoftTitle` | Profil henüz doldurulmadı |
| `plan.emptySoftDescription` | Formu doldurup kaydederek proje profilini oluşturabilirsiniz. |

### 2.3 Kaydetme mesajları

| Anahtar | Metin |
|---------|-------|
| `plan.saved` | Proje profili kaydedildi |
| `plan.saveFailed` | Proje profili kaydedilemedi |
| `plan.saving` | Kaydediliyor… |
| `plan.noChanges` | Kaydedilecek değişiklik yok |
| `plan.savePartialHint` | Yalnızca doldurulan alanlar güncellenir; boş bırakılan alanlar mevcut değerleri korur. |

### 2.4 Doğrulama (form)

| Anahtar | Metin |
|---------|-------|
| `plan.validation.projectNameRequired` | Proje adı zorunludur |
| `plan.validation.projectNameMin` | Proje adı en az 2 karakter olmalı |
| `plan.validation.invalidStatus` | Geçerli bir proje durumu seçin |
| `plan.validation.invalidLanguage` | Geçerli bir belge dili seçin |

### 2.5 Completeness

| Anahtar | Metin |
|---------|-------|
| `plan.completenessTitle` | Profil tamamlanma oranı |
| `plan.completenessHint` | Genel bilgiler ve teknik bölümler dolduruldukça oran yükselir. |
| `plan.completenessHintDetail` | Genel alanlar %40, teknik bölümler (frontend, backend, veri, altyapı, yapay zeka, standartlar) %60 ağırlığa sahiptir. |
| `plan.overall` | Genel tamamlanma |
| `plan.sectionsTitle` | Bölüm bazında doluluk |
| `plan.completenessLoading` | Tamamlanma oranı hesaplanıyor… |
| `plan.completenessLoadFailed` | Tamamlanma oranı alınamadı |
| `plan.completenessLow` | Profil henüz eksik. Belge üretiminden önce kritik alanları doldurun. |
| `plan.completenessMedium` | Profil kısmen tamamlandı. Eksik bölümleri gözden geçirin. |
| `plan.completenessHigh` | Profil büyük ölçüde tamamlandı. |
| `plan.completenessComplete` | Profil tamamlandı. |
| `plan.missingFieldsTitle` | Eksik profil alanları |
| `plan.missingFieldsEmpty` | Tamamlanma için gerekli alanlar dolu. |
| `plan.missingFieldsHint` | Aşağıdaki alanlar veya bölümler henüz boş. |

#### Completeness eşikleri (UI rehberi)

| Oran | Badge / durum metni |
|------|---------------------|
| 0–39% | Düşük — `completenessLow` |
| 40–79% | Orta — `completenessMedium` |
| 80–99% | Yüksek — `completenessHigh` |
| 100% | Tamamlandı — `completenessComplete` |

#### `missing_fields` anahtar → etiket

| API anahtarı | Türkçe etiket |
|--------------|---------------|
| `project_name` | Proje adı |
| `project_description` | Proje açıklaması |
| `product_type` | Ürün türü |
| `target_users` | Hedef kullanıcılar |
| `main_problem` | Ana problem |
| `main_use_cases` | Ana kullanım senaryoları |
| `frontend` | Frontend |
| `backend` | Backend |
| `data` | Veri |
| `infrastructure` | Altyapı |
| `ai` | Yapay zeka |
| `development_standards` | Geliştirme standartları |

### 2.6 Bölüm başlıkları

| Anahtar | Başlık | Açıklama |
|---------|--------|----------|
| `plan.sectionGeneral` | Genel | Proje kimliği ve kapsamı. |
| `plan.sectionFrontend` | Frontend | İstemci tarafı teknoloji tercihleri. |
| `plan.sectionBackend` | Backend | Sunucu tarafı teknoloji tercihleri. |
| `plan.sectionData` | Veri | Veritabanı ve veri altyapısı tercihleri. |
| `plan.sectionInfrastructure` | Altyapı | Barındırma, CI/CD ve konteynerizasyon. |
| `plan.sectionAI` | Yapay zeka | Model sağlayıcı ve entegrasyon tercihleri. |
| `plan.sectionStandards` | Geliştirme standartları | Kod kalitesi, test ve süreç standartları. |

### 2.7 Form label’ları ve placeholder’lar

#### Genel

| Label anahtarı | Label | Placeholder |
|----------------|-------|-------------|
| `projectName` | Proje adı | Örn. Agentic App Reporter |
| `projectDescription` | Proje açıklaması | Projenin amacını ve kapsamını özetleyin |
| `productType` | Ürün türü | Örn. B2B SaaS, iç araç, mobil uygulama |
| `targetUsers` | Hedef kullanıcılar | Bu ürünü kimler kullanacak? |
| `mainProblem` | Ana problem | Bu proje hangi problemi çözüyor? |
| `mainUseCases` | Ana kullanım senaryoları | Başlıca kullanım senaryolarını listeleyin |
| `projectStatus` | Proje durumu | — |
| `preferredDocumentLanguage` | Tercih edilen belge dili | — |

#### Frontend

| Label | Placeholder |
|-------|-------------|
| Frontend framework | Örn. React, Next.js, Vue |
| Frontend dili | Örn. TypeScript, JavaScript |
| UI kütüphanesi / stil çözümü | Örn. shadcn/ui, Tailwind CSS |

#### Backend

| Label | Placeholder |
|-------|-------------|
| Backend framework | Örn. Go/Chi, NestJS, Django |
| Backend dili | Örn. Go, TypeScript, Python |
| Birincil veritabanı | Örn. PostgreSQL, MySQL |

#### Veri

| Label | Placeholder |
|-------|-------------|
| Birincil veri deposu | Örn. PostgreSQL |
| Analitik / raporlama aracı | Örn. Metabase, Looker |
| Dosya / nesne depolama | Örn. S3, GCS |

#### Altyapı

| Label | Placeholder |
|-------|-------------|
| Barındırma sağlayıcısı | Örn. AWS, GCP, Azure |
| CI/CD aracı | Örn. GitHub Actions |
| Konteynerizasyon | Örn. Docker, Kubernetes |

#### Yapay zeka

| Label | Placeholder |
|-------|-------------|
| Model sağlayıcı | Örn. OpenAI, Anthropic |
| Birincil model | Örn. GPT-5, Claude |
| Vektör deposu | Örn. pgvector, Pinecone |

#### Geliştirme standartları

| Label | Placeholder |
|-------|-------------|
| Linter / kod stili aracı | Örn. ESLint, golangci-lint |
| Test framework’ü | Örn. Jest, Go test |
| Code review süreci | Örn. Zorunlu PR onayı |

### 2.8 Seçenek etiketleri

**Proje durumu**

| Değer | Metin |
|-------|-------|
| `planned` | Planlama |
| `in_progress` | Geliştirme |
| `active` | Aktif |
| `maintenance` | Bakım |
| `archived` | Arşivlendi |

**Belge dili**

| Değer | Metin |
|-------|-------|
| `tr` | Türkçe |
| `en` | İngilizce |

### 2.9 Confirmation dialog’ları (Plan)

| Anahtar | Metin |
|---------|-------|
| `plan.confirmLeaveTitle` | Kaydedilmemiş değişiklikler var |
| `plan.confirmLeaveDescription` | Sayfadan ayrılırsanız proje profilindeki değişiklikler kaybolur. |
| `plan.confirmLeaveConfirm` | Ayrıl |
| `plan.confirmLeaveCancel` | Düzenlemeye dön |
| `plan.confirmResetTitle` | Formu sıfırla |
| `plan.confirmResetDescription` | Kaydedilmemiş tüm değişiklikler silinecek. Bu işlem geri alınamaz. |
| `plan.confirmResetConfirm` | Sıfırla |
| `plan.confirmResetCancel` | İptal |

---

## 3. Anketler

### 3.1 Sayfa başlığı ve açıklama

| Anahtar | Metin |
|---------|-------|
| `questionnaire.title` | Anketler |
| `questionnaire.description` | Yönlendirmeli soruları yanıtlayın; belge üretiminden önce eksik bilgileri gözden geçirin. |
| `questionnaire.pageSubheading` | Yanıtlar çalışma alanına kaydedilir; istediğiniz zaman devam edebilirsiniz. |

### 3.2 Loading / error / empty

| Anahtar | Metin |
|---------|-------|
| `questionnaire.loading` | Sorular yükleniyor… |
| `questionnaire.loadFailed` | Sorular yüklenemedi |
| `questionnaire.loadFailedDescription` | Anket soruları alınamadı. Bağlantıyı kontrol edip yeniden deneyin. |
| `questionnaire.emptyQuestions` | Bu çalışma alanı için tanımlı soru bulunamadı |
| `questionnaire.emptyQuestionsDescription` | Varsayılan anket seti yapılandırılmamış olabilir. Bir yöneticiden kontrol etmesini isteyin. |
| `questionnaire.missingLoading` | Eksik bilgiler kontrol ediliyor… |
| `questionnaire.missingLoadFailed` | Eksik bilgiler yüklenemedi |

### 3.3 İlerleme ve sekmeler

| Anahtar | Metin |
|---------|-------|
| `questionnaire.progressLabel` | Tamamlanan |
| `questionnaire.progressOf` | / |
| `questionnaire.progressSummary` | `{answered} / {total} soru yanıtlandı` |
| `questionnaire.tabQuestions` | Sorular |
| `questionnaire.tabMissing` | Eksik bilgiler |
| `questionnaire.saveAndContinueLater` | Kaydedip daha sonra devam edebilirsiniz. |

### 3.4 Kaydetme mesajları

| Anahtar | Metin |
|---------|-------|
| `questionnaire.saved` | Yanıt kaydedildi |
| `questionnaire.bulkSaved` | Değişiklikler kaydedildi |
| `questionnaire.saveFailed` | Yanıt kaydedilemedi |
| `questionnaire.bulkSaveFailed` | Yanıtlar kaydedilemedi |
| `questionnaire.saveAll` | Tümünü kaydet |
| `questionnaire.savingAll` | Kaydediliyor… |
| `questionnaire.saveCategory` | Bu bölümü kaydet |
| `questionnaire.noChanges` | Kaydedilecek değişiklik yok |
| `questionnaire.dirtyCount` | `{count} değişiklik` |
| `questionnaire.unsavedChangesHint` | Kaydedilmemiş yanıtlar var |

### 3.5 Soru kartı / input

| Anahtar | Metin |
|---------|-------|
| `questionnaire.requiredBadge` | Zorunlu |
| `questionnaire.answeredBadge` | Yanıtlandı |
| `questionnaire.unansweredBadge` | Yanıtlanmadı |
| `questionnaire.helpTextLabel` | Yardım |
| `questionnaire.exampleAnswerLabel` | Örnek yanıt |
| `questionnaire.booleanYes` | Evet |
| `questionnaire.booleanNo` | Hayır |
| `questionnaire.selectPlaceholder` | Bir seçenek seçin |
| `questionnaire.multiSelectHint` | Birden fazla seçenek işaretleyebilirsiniz |
| `questionnaire.shortTextPlaceholder` | Kısa yanıtınızı yazın |
| `questionnaire.longTextPlaceholder` | Ayrıntılı yanıtınızı yazın |
| `questionnaire.urlPlaceholder` | https://… |
| `questionnaire.numberPlaceholder` | Sayı girin |
| `questionnaire.jsonPlaceholder` | JSON veya düz metin girin |
| `questionnaire.invalidJson` | Geçerli bir JSON değeri girin |
| `questionnaire.invalidNumber` | Geçerli bir sayı girin |
| `questionnaire.invalidUrl` | Geçerli bir URL girin |

### 3.6 Missing Information

| Anahtar | Metin |
|---------|-------|
| `questionnaire.missingTitle` | Eksik zorunlu bilgiler |
| `questionnaire.missingDescription` | Aşağıdaki zorunlu sorular henüz yanıtlanmadı. Belge üretiminden önce tamamlamanız önerilir. |
| `questionnaire.missingWarningBanner` | `{count} zorunlu soru eksik. Üretim kalitesi için yanıtlayın. |
| `questionnaire.missingAnsweredOf` | `{answered} / {total} zorunlu soru yanıtlandı` |
| `questionnaire.missingEmpty` | Tüm zorunlu sorular yanıtlandı |
| `questionnaire.missingEmptyDescription` | Belge üretimine devam etmek için gerekli bilgiler tamam. |
| `questionnaire.jumpToQuestion` | Yanıtla |
| `questionnaire.missingCategoryLabel` | Kategori |
| `questionnaire.missingListHint` | Eksik soruya gidip yanıtlayabilirsiniz. |

#### Missing Information uyarı seviyeleri

| Durum | Metin |
|-------|-------|
| Eksik var (`count > 0`) | `{count} zorunlu soru eksik` |
| Hepsi dolu | Tüm zorunlu sorular yanıtlandı |
| Tab badge | Sayıyı göster (örn. `3`) — metin yok |

### 3.7 Confirmation dialog’ları (Anketler)

| Anahtar | Metin |
|---------|-------|
| `questionnaire.confirmLeaveTitle` | Kaydedilmemiş yanıtlar var |
| `questionnaire.confirmLeaveDescription` | Sayfadan ayrılırsanız kaydedilmemiş yanıtlar kaybolur. |
| `questionnaire.confirmLeaveConfirm` | Ayrıl |
| `questionnaire.confirmLeaveCancel` | Düzenlemeye dön |
| `questionnaire.confirmBulkSaveTitle` | Tüm değişiklikleri kaydet |
| `questionnaire.confirmBulkSaveDescription` | `{count}` sorudaki değişiklikler kaydedilecek. |
| `questionnaire.confirmBulkSaveConfirm` | Kaydet |
| `questionnaire.confirmBulkSaveCancel` | İptal |
| `questionnaire.confirmClearAnswerTitle` | Yanıtı temizle |
| `questionnaire.confirmClearAnswerDescription` | Bu sorunun yanıtı silinecek. Zorunlu sorularda eksik bilgi uyarısı yeniden görünebilir. |
| `questionnaire.confirmClearAnswerConfirm` | Temizle |
| `questionnaire.confirmClearAnswerCancel` | İptal |

---

## 4. Yetki / API hata mesajları (kullanıcıya gösterilecek)

Backend İngilizce mesaj dönebilir; UI’da mümkünse şu Türkçe karşılıklar kullanılsın (fallback: `getErrorMessage` + aşağıdaki varsayılanlar).

| Durum | Kullanıcı metni |
|-------|-----------------|
| 401 | Oturumunuz sona ermiş olabilir. Yeniden giriş yapın. |
| 403 (RBAC) | Bu işlem için yetkiniz yok. |
| 403 (ownership) | Bu çalışma alanına erişim yetkiniz yok. |
| 404 (workspace) | Çalışma alanı bulunamadı. |
| 404 (question) | Soru bulunamadı. |
| 404 (default set) | Varsayılan anket seti yapılandırılmamış. |
| 422 (validation) | Gönderilen bilgiler geçersiz. Alanları kontrol edin. |
| 422 (empty bulk) | Kaydetmek için en az bir yanıt gerekli. |
| 500 | Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin. |
| Network | Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin. |

---

## 5. Anket kategorileri (seed — referans)

UI kategori başlıklarını API’den alır; seed ile tutarlılık için referans:

| Kategori |
|----------|
| Genel |
| Frontend |
| Backend |
| Veritabanı |
| Altyapı |
| Yapay Zeka |
| Geliştirme Standartları |
| Güvenlik |
| Test |
| Dağıtım |
| Harici Araçlar |
| MCP Entegrasyonları |

> Profil bölümlerinde “Yapay zeka” / “Geliştirme standartları” (cümle içi küçük harf kurallarına uygun); anket kategorilerinde seed’deki gibi Title Case korunabilir.

---

## 6. Toast sözlüğü (özet)

| Olay | Tür | Metin |
|------|-----|-------|
| Profil kaydedildi | success | Proje profili kaydedildi |
| Profil kaydı başarısız | error | Proje profili kaydedilemedi |
| Tek yanıt kaydedildi | success | Yanıt kaydedildi |
| Toplu kayıt başarılı | success | Değişiklikler kaydedildi |
| Yanıt kaydı başarısız | error | Yanıt kaydedilemedi |
| Değişiklik yok | info | Kaydedilecek değişiklik yok |
| Validasyon (isim) | inline | Proje adı en az 2 karakter olmalı |

---

## 7. Empty / loading / confirmation hızlı referans

### Empty state

| Ekran | Başlık | Açıklama |
|-------|--------|----------|
| Profil yükleme hatası | Proje profili yüklenemedi | Profil bilgileri alınamadı. Bağlantıyı kontrol edip yeniden deneyin. |
| Anket yükleme hatası | Sorular yüklenemedi | Anket soruları alınamadı. Bağlantıyı kontrol edip yeniden deneyin. |
| Soru yok | Bu çalışma alanı için tanımlı soru bulunamadı | Varsayılan anket seti yapılandırılmamış olabilir. … |
| Eksik bilgi yok | Tüm zorunlu sorular yanıtlandı | Belge üretimine devam etmek için gerekli bilgiler tamam. |
| Profil soft-empty | Profil henüz doldurulmadı | Formu doldurup kaydederek proje profilini oluşturabilirsiniz. |

### Loading

| Ekran | Metin |
|-------|-------|
| Plan | Proje profili yükleniyor… |
| Completeness | Tamamlanma oranı hesaplanıyor… |
| Anketler | Sorular yükleniyor… |
| Missing | Eksik bilgiler kontrol ediliyor… |
| Kaydet (ortak) | Kaydediliyor… |
| Toplu kaydet | Kaydediliyor… |

### Confirmation (özet)

| Diyalog | Başlık | Birincil aksiyon | İkincil |
|---------|--------|------------------|---------|
| Plan’dan ayrıl | Kaydedilmemiş değişiklikler var | Ayrıl | Düzenlemeye dön |
| Anket’ten ayrıl | Kaydedilmemiş yanıtlar var | Ayrıl | Düzenlemeye dön |
| Toplu kaydet onayı | Tüm değişiklikleri kaydet | Kaydet | İptal |
| Yanıtı temizle | Yanıtı temizle | Temizle | İptal |
| Formu sıfırla | Formu sıfırla | Sıfırla | İptal |

---

## 8. Uygulama notları

1. Mevcut kaynak: `frontend/src/lib/i18n/tr.ts` (`plan`, `questionnaire`, `common`, `nav`).
2. Confirmation dialog’lar Phase 2’de henüz bağlanmamış olabilir; metinler hazır tutulmalıdır.
3. Completeness `missing_fields` etiketleri UI’da henüz gösterilmiyorsa §2.5 tablosu referans alınmalıdır.
4. “Opsiyonel” yerine arayüzde **İsteğe bağlı** kullanın (`common.optional`).
5. Toast’larda nokta kullanmayın; boş durum ve dialog açıklamalarında tam cümle + nokta kullanın.
6. Ellipsis karakteri: `…` (üç nokta `...` değil).
)
