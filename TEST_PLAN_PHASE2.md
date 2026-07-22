# Phase 2 Test Plan — Project Profile & Questionnaire

Bu doküman, Phase 2 özelliklerinin doğrulanması için **backend unit**, **backend integration** ve **frontend manuel E2E** senaryolarını kapsar. Kod değişikliği gerektirmez; mevcut API ve UI davranışına göre yazılmıştır.

## Kapsam

| Alan | Endpoint / UI |
|------|----------------|
| Project Profile oluşturma/güncelleme | `PUT /api/v1/workspaces/{workspaceId}/profile` · Plan sayfası |
| Profile okuma | `GET /api/v1/workspaces/{workspaceId}/profile` |
| Completeness | `GET /api/v1/workspaces/{workspaceId}/profile/completeness` |
| Questionnaire soruları | `GET /api/v1/workspaces/{workspaceId}/questions` |
| Tekli cevap | `PUT /api/v1/workspaces/{workspaceId}/answers/{questionId}` |
| Toplu cevap | `POST /api/v1/workspaces/{workspaceId}/answers/bulk` |
| Missing Information | `GET /api/v1/workspaces/{workspaceId}/missing-information` |
| Auth / RBAC | JWT + `X-Organization-ID` + permission middleware |
| Workspace ownership | Use-case `resolveWorkspace` / org eşleşmesi |

**Ortak header’lar (protected routes):**

- `Authorization: Bearer <token>`
- `X-Organization-ID: <org-uuid>`
- İsteğe bağlı: `X-Workspace-ID` (path `workspaceId` asıl kaynaktır)

**Permission matrisi:**

| Route | Permission |
|-------|------------|
| Profile GET / completeness | `profile:read` |
| Profile PUT | `profile:write` |
| Questions / missing-information / questionnaire sets | `questionnaire:read` |
| Answers GET | `answer:read` |
| Answer PUT / bulk POST | `answer:write` |

**Rol beklentileri (seed):** `admin`/`org_admin`/`developer` → read+write; `viewer` → sadece read; üye olmayan / yetkisiz → 403.

**Ön koşullar:** migration `00013`+`00014`, seed (`studio-default` set, ~36 soru, 9 required), en az 2 org / 2 workspace / farklı roller.

---

## 1. Backend Unit Tests

Saf fonksiyonlar ve mock’lu use-case’ler. HTTP / DB yok.

### 1.1 Completeness (`CalculateCompleteness`)

Dosya: `backend/internal/application/projectprofile/usecase/completeness.go`  
Mevcut: `completeness_test.go` — boş, tam, kısmi (19), deterministik, over-cap.

| ID | Senaryo | Girdi | Beklenen |
|----|---------|-------|----------|
| U-COMP-01 | Boş profil | `NewEmpty` | `overall=0`, tüm section=0, `missing_fields` uzunluğu 12 (6 genel + 6 JSONB) |
| U-COMP-02 | Tam dolu | 6 genel alan + her section’ta ≥3 non-empty key | `overall=100`, `missing_fields=[]`, tüm section=100 |
| U-COMP-03 | Kısmi | name+description + frontend 1 key | `overall=19` (16+3), missing’de `product_type` vb. var, `frontend` yok, `backend` var |
| U-COMP-04 | Deterministik | Aynı profil 2 kez | Sonuç eşit |
| U-COMP-05 | Section over-cap | Tek section’ta 5 key | Section % = 100, weight cap 10 |
| U-COMP-06 | Whitespace genel alan | `project_name="   "` | Alan boş sayılır, missing’e girer, puan yok |
| U-COMP-07 | Zeroish JSON değerleri | `{"a":"","b":[],"c":{},"d":null,"e":true,"f":0}` | Sadece `e`,`f` sayılır → 2/3 ratio |
| U-COMP-08 | `project_status` / `preferred_document_language` | Dolu | Completeness’e **dahil edilmez** |
| U-COMP-09 | `sections.general` formülü | 3/6 genel dolu | `general = 50` (count-based; weight-based değil) |
| U-COMP-10 | Truncation | 1/3 section key | points = `int(10/3)=3`, section% = `int(100/3)=33` |

### 1.2 Missing Information (`MissingInformationUseCase`)

Dosya: `missing_information.go` · Mevcut: `missing_information_test.go`

| ID | Senaryo | Beklenen |
|----|---------|----------|
| U-MISS-01 | Required answered + unanswered + empty `""` + optional + inactive required | `total_required=3`, `total_answered=1`, missing=2 (unanswered + empty); optional/inactive yok |
| U-MISS-02 | Tüm required answered | `missing=[]`, answered=total |
| U-MISS-03 | Wrong-org workspace | Forbidden hata |
| U-MISS-04 | Empty value setleri | `null`, `""`, `[]`, `{}`, whitespace → unanswered |
| U-MISS-05 | Non-empty boolean/`true`, number, non-empty string | Answered sayılır |
| U-MISS-06 | Default set yok | `no default questionnaire set configured` (NotFound) |
| U-MISS-07 | Org context yok | Unauthorized / org context required |

### 1.3 `IsEmptyValue`

| ID | Girdi | Beklenen |
|----|-------|----------|
| U-EMPTY-01 | `""`, `"null"`, `""` (JSON), `"[]"`, `"{}"`, whitespace | `true` |
| U-EMPTY-02 | `"Reporter"`, `true`, `0`, `[1]`, `{"a":1}` | `false` |

### 1.4 Upsert Profile (use-case, mock repo)

| ID | Senaryo | Beklenen |
|----|---------|----------|
| U-PROF-01 | İlk kayıt (profil yok) | Create; default `planned` / `tr` korunur veya body override |
| U-PROF-02 | Partial update | Sadece gönderilen alanlar değişir; boş string / boş `{}` mevcut değeri **değiştirmez** |
| U-PROF-03 | `preferred_document_language: "de"` | 422 validation |
| U-PROF-04 | `preferred_document_language: "en"` | Kabul |
| U-PROF-05 | Wrong-org workspace | 403 `workspace does not belong to your organization` |
| U-PROF-06 | Workspace not found | 404 |
| U-PROF-07 | Org context missing | Unauthorized |

### 1.5 Upsert Answer (tekli)

| ID | Senaryo | Beklenen |
|----|---------|----------|
| U-ANS-01 | Yeni cevap | Insert; `AnswerInfo` döner |
| U-ANS-02 | Mevcut cevap | Update (aynı workspace+question) |
| U-ANS-03 | Bilinmeyen `questionId` | 404 `question not found` |
| U-ANS-04 | Wrong-org workspace | 403 |
| U-ANS-05 | `value: null` / boş | Kaydedilir; missing-info’da empty sayılır |

### 1.6 Bulk Upsert Answers

| ID | Senaryo | Beklenen |
|----|---------|----------|
| U-BULK-01 | ≥1 geçerli item | Hepsi upsert; `AnswerInfo[]` |
| U-BULK-02 | `answers: []` | 422 `at least one answer is required` |
| U-BULK-03 | `question_id` nil/UUID zero | 422 `question_id is required for each answer` |
| U-BULK-04 | Wrong-org | 403 |
| U-BULK-05 | Karışık create/update | Idempotent upsert davranışı |

**Not (bilinen gap):** Bulk use-case question existence doğrulamaz; FK hatası integration’da 500 olabilir — unit’te mock ile ayrı doğrulanabilir.

### 1.7 List Workspace Questions / Completeness use-case wiring

| ID | Senaryo | Beklenen |
|----|---------|----------|
| U-Q-01 | Default set + answers | `answered=true` yalnızca non-empty value için; set_key doğru |
| U-Q-02 | Wrong-org | 403 |
| U-COMP-UC-01 | Profil yok | Empty profil üzerinden completeness (0) |

---

## 2. Backend Integration Tests

Gerçek HTTP + Postgres (+ seed). JWT ve org header zorunlu.

### 2.1 Test fixture önerisi

| Actor | Org | Rol | Beklenen erişim |
|-------|-----|-----|-----------------|
| A-Dev | Org A | developer | Profile/answer R+W |
| A-Viewer | Org A | viewer | Sadece read |
| A-None | Org A | üyelik yok / app_admin | 403 insufficient permissions |
| B-Dev | Org B | developer | Org A workspace’lerine 403 ownership |

Workspace: `WS-A1` (Org A), `WS-B1` (Org B). Questionnaire seed çalışmış olmalı.

### 2.2 Project Profile — oluşturma ve güncelleme

| ID | Method / Path | Actor | Body / not | Beklenen |
|----|---------------|-------|------------|----------|
| I-PROF-01 | `GET .../profile` | A-Dev | Profil yok | 200; soft-empty (`planned`, `tr`, section `{}`); **404 değil** |
| I-PROF-02 | `PUT .../profile` | A-Dev | `project_name`, `project_description` | 200; persist; `id` non-zero |
| I-PROF-03 | `GET .../profile` | A-Dev | — | Önceki değerler |
| I-PROF-04 | `PUT` partial | A-Dev | Sadece `product_type` | Diğer alanlar korunur |
| I-PROF-05 | `PUT` sections | A-Dev | `frontend: {framework, language, ui_library}` | JSONB persist |
| I-PROF-06 | `PUT` lang `en` | A-Dev | — | 200 |
| I-PROF-07 | `PUT` lang `fr` | A-Dev | — | 400 veya 422 |
| I-PROF-08 | `PUT` boş string name | A-Dev | `project_name: ""` | Önceki name **silinmez** (partial) |
| I-PROF-09 | Unique workspace | A-Dev | İkinci PUT | Aynı satır update (yeni row yok) |

### 2.3 Completeness yüzdesi

| ID | Setup | Beklenen |
|----|-------|----------|
| I-COMP-01 | Boş profil | `overall=0`, 12 missing |
| I-COMP-02 | U-COMP-03 ile aynı veri | `overall=19` |
| I-COMP-03 | Tam dolu | `overall=100`, `missing_fields=[]` |
| I-COMP-04 | Profile PUT sonrası completeness | Yeni overall yansır |
| I-COMP-05 | Response shape | `overall`, `sections`, `missing_fields` |

### 2.4 Questionnaire sorularını listeleme

| ID | Senaryo | Beklenen |
|----|---------|----------|
| I-Q-01 | `GET .../questions` | 200; `set_key=studio-default`; ~36 active soru; category/title/input_type/options |
| I-Q-02 | Cevapsız | `answered=false`, `answer` yok/boş |
| I-Q-03 | Cevap sonrası | İlgili soruda `answered=true`, `answer` = kaydedilen value |
| I-Q-04 | Inactive sorular | Listede yok |
| I-Q-05 | `GET /questionnaires` | Set listesi |
| I-Q-06 | `GET /questionnaires/{id}` | Set + questions detail |

### 2.5 Tekli cevap kaydetme

| ID | Senaryo | Beklenen |
|----|---------|----------|
| I-ANS-01 | short_text | 200; DB’de value |
| I-ANS-02 | boolean `true`/`false` | Persist; missing’de answered |
| I-ANS-03 | single_select option value | Persist |
| I-ANS-04 | Aynı question tekrar PUT | Update; tek satır |
| I-ANS-05 | Geçersiz question UUID path | 400 `invalid question id` |
| I-ANS-06 | Var olmayan question UUID | 404 |
| I-ANS-07 | `value` omit / null | 200 (type validation yok) |

### 2.6 Toplu cevap kaydetme

| ID | Senaryo | Beklenen |
|----|---------|----------|
| I-BULK-01 | 3 geçerli answer | 200; array length 3; hepsi listede |
| I-BULK-02 | `{}` / `answers` yok | 400 validator |
| I-BULK-03 | `answers: []` | 400 veya 422 |
| I-BULK-04 | Missing `question_id` item | 400/422 |
| I-BULK-05 | Var olmayan question_id | FK → 500 (bilinen gap; dokümante et) |
| I-BULK-06 | Tekli + bulk karışık | Son yazılan kazanır |

### 2.7 Missing Information

| ID | Setup | Beklenen |
|----|-------|----------|
| I-MISS-01 | Hiç cevap yok | `total_required=9`, `total_answered=0`, missing length=9; title/category dolu |
| I-MISS-02 | 3 required answered | answered=3, missing=6 |
| I-MISS-03 | Hepsi answered | missing=[], answered=total_required |
| I-MISS-04 | Required’a `""` | Hâlâ missing |
| I-MISS-05 | Optional-only cevap | total_required değişmez |
| I-MISS-06 | Completeness’ten bağımsız | Profile 100 olsa bile questionnaire missing ayrı kalabilir |

### 2.8 Organization membership kontrolü

| ID | Senaryo | Beklenen |
|----|---------|----------|
| I-ORG-01 | Token yok | 401 |
| I-ORG-02 | Geçersiz token | 401 |
| I-ORG-03 | `X-Organization-ID` yok (ve JWT org yok) | 400 `organization context required` veya use-case unauthorized |
| I-ORG-04 | Org’da rolü olmayan user + doğru header | 403 `insufficient permissions` |
| I-ORG-05 | Spoof: Org B header + Org A üyesi | 403 (RBAC empty) |
| I-ORG-06 | Viewer → GET profile/questions/missing/answers | 200 |
| I-ORG-07 | Viewer → PUT profile / PUT answer / POST bulk | 403 |
| I-ORG-08 | Developer → write | 200 |

### 2.9 Workspace ownership kontrolü

| ID | Senaryo | Beklenen |
|----|---------|----------|
| I-WS-01 | A-Dev + `X-Organization-ID=A` + `WS-B1` path | 403 `workspace does not belong to your organization` (tüm workspace-scoped route’lar) |
| I-WS-02 | A-Dev + WS-A1 | 200 |
| I-WS-03 | Geçersiz workspace UUID | 400 `invalid workspace id` |
| I-WS-04 | Var olmayan workspace UUID | 404 |
| I-WS-05 | Silinmiş workspace | 404 |

### 2.10 Yetkisiz kullanıcı senaryoları (özet matrisi)

Her satır için ilgili method’lar:

| Actor | GET profile | PUT profile | GET questions | PUT answer | POST bulk | GET missing | GET completeness |
|-------|-------------|-------------|---------------|------------|-----------|-------------|------------------|
| Unauthenticated | 401 | 401 | 401 | 401 | 401 | 401 | 401 |
| A-Viewer | 200 | 403 | 200 | 403 | 403 | 200 | 200 |
| A-None | 403 | 403 | 403 | 403 | 403 | 403 | 403 |
| B-Dev on WS-A1 (org B header) | 403 ownership veya 403 perms | aynı | aynı | aynı | aynı | aynı | aynı |
| A-Dev on WS-B1 (org A header) | 403 ownership | aynı | aynı | aynı | aynı | aynı | aynı |

### 2.11 Hatalı request body senaryoları

| ID | Endpoint | Body | Beklenen |
|----|----------|------|----------|
| I-BODY-01 | PUT profile | Invalid JSON | 400 |
| I-BODY-02 | PUT profile | `preferred_document_language: "xx"` | 400/422 |
| I-BODY-03 | PUT profile | `frontend: "not-an-object"` | 400 decode veya DB hatası |
| I-BODY-04 | PUT answer | Invalid JSON | 400 |
| I-BODY-05 | POST bulk | `answers: "x"` | 400 |
| I-BODY-06 | POST bulk | `answers: []` | 400/422 |
| I-BODY-07 | POST bulk | item without `question_id` | 400/422 |
| I-BODY-08 | Path | non-UUID workspace/question/set | 400 invalid id |
| I-BODY-09 | Oversized body | MaxBodyBytes aşımı | 413 veya 400 (middleware) |

---

## 3. Frontend Manuel E2E Senaryoları

**Sayfalar:**

- Plan / Profile: `/o/{orgId}/w/{workspaceId}/plan` → `ProjectProfilePage`
- Questionnaire: `/o/{orgId}/w/{workspaceId}/questionnaires` → `QuestionnairePage`

**Araçlar:** Chrome/Firefox; Network tab; farklı rollerle login.

### 3.1 Project Profile — form & kaydetme

| ID | Adımlar | Beklenen |
|----|---------|----------|
| E-PROF-01 | Plan sayfasını aç (boş profil) | Form default: status `planned`, lang `tr`; completeness ~0% |
| E-PROF-02 | `project_name` doldur (min 2), kaydet | Toast success; refresh sonrası değer kalır |
| E-PROF-03 | Genel alanlar + section alanları doldur, kaydet | Completeness paneli yükselir; section progress güncellenir |
| E-PROF-04 | Sadece bir alanı değiştirip kaydet | Diğer alanlar korunur (partial) |
| E-PROF-05 | Dil `en` seç, kaydet | Persist; reload’da `en` |
| E-PROF-06 | Status `in_progress` / `active` | Persist |

### 3.2 Frontend form validation (Profile)

| ID | Adımlar | Beklenen |
|----|---------|----------|
| E-VAL-01 | `project_name` boş veya 1 karakter, submit | `"Proje adı en az 2 karakter olmalı"`; request gitmez |
| E-VAL-02 | Geçerli name (≥2) | Submit geçer |
| E-VAL-03 | `project_status` / `preferred_document_language` | Sadece enum seçenekleri (Select) |
| E-VAL-04 | Opsiyonel alanlar boş | Submit engellenmez |

**Questionnaire notu:** Sayfada Zod yok; tip dönüşümü `prepareValueForSave` ile. Number NaN → `null`; JSON parse fail → string olarak gider. Client-side required zorunluluğu yok — missing tab’ı server-side kaynağa dayanır.

| ID | Adımlar | Beklenen |
|----|---------|----------|
| E-VAL-Q-01 | short_text boş bırakıp tek kaydet | Request gider; missing listesinde kalabilir |
| E-VAL-Q-02 | boolean switch | Her zaman boolean gönderilir |
| E-VAL-Q-03 | single_select | Option value kaydolur |
| E-VAL-Q-04 | multi_select checkbox | Array gönderilir |
| E-VAL-Q-05 | number alanına `abc` | `null` kaydı (client) |

### 3.3 Completeness UI

| ID | Adımlar | Beklenen |
|----|---------|----------|
| E-COMP-01 | Boş profil | Overall 0%; section bar’lar 0 |
| E-COMP-02 | Kaydet sonrası | Completeness query invalidate; yüzde güncellenir |
| E-COMP-03 | ≥80 overall | Badge variant değişimi (default vs secondary) |
| E-COMP-04 | Network: completeness fail (opsiyonel) | Form yine kullanılabilir; section değerleri 0 fallback |

### 3.4 Questionnaire — listeleme, tekli, toplu

| ID | Adımlar | Beklenen |
|----|---------|----------|
| E-Q-01 | Questionnaires sayfası | Kategorilere göre gruplu sorular; progress bar (answered/total) |
| E-Q-02 | Required badge | Required sorularda görünür |
| E-Q-03 | Tek soru kaydet | Toast success; dirty temizlenir; answered işareti |
| E-Q-04 | Birden fazla dirty → “Tümünü kaydet” / bulk | Toast bulkSaved; hepsi persist |
| E-Q-05 | Dirty yokken bulk | Toast `noChanges` |
| E-Q-06 | Kategori bazlı kaydet (varsa) | Sadece o kategori dirty’leri gider |
| E-Q-07 | Reload | Cevaplar input’lara yansır |

### 3.5 Missing Information UI

| ID | Adımlar | Beklenen |
|----|---------|----------|
| E-MISS-01 | Cevap yok | Missing tab badge = required sayısı (~9); liste title+category |
| E-MISS-02 | Listeden soruya jump | Questions tab + scroll |
| E-MISS-03 | Required’ları doldur | Missing empty state; answered/total = full |
| E-MISS-04 | Boş string required kaydı | Missing’te kalır |
| E-MISS-05 | Kaydet sonrası | Missing query refresh |

### 3.6 Loading, empty, error state’leri

#### Profile (`ProjectProfilePage`)

| ID | Durum | Nasıl tetiklenir | Beklenen UI |
|----|-------|------------------|-------------|
| E-STATE-P1 | Loading | Yavaş network / throttling | Skeleton bloklar |
| E-STATE-P2 | Error | API 500 / 403 (profile GET) | EmptyState + retry |
| E-STATE-P3 | Success empty | Soft-empty profil | Form açık, completeness 0 (ayrı “boş liste” empty-state yok) |
| E-STATE-P4 | Save error | PUT 403/500 | Toast error; form değerleri kaybolmaz |
| E-STATE-P5 | Save success | PUT 200 | Toast success; completeness refresh |
| E-STATE-P6 | Save pending | Mutation in-flight | Save butonu disabled / busy (mevcut UI’ya göre) |

#### Questionnaire (`QuestionnairePage`)

| ID | Durum | Nasıl tetiklenir | Beklenen UI |
|----|-------|------------------|-------------|
| E-STATE-Q1 | Loading | questions query | Skeleton |
| E-STATE-Q2 | Error | questions 403/500 | EmptyState + retry |
| E-STATE-Q3 | Empty questions | Set/soru yok (seed sil) | `emptyQuestions` EmptyState |
| E-STATE-Q4 | Missing empty | Hepsi cevaplı | `missingEmpty` EmptyState |
| E-STATE-Q5 | Single save error | PUT answer 403 | Toast error; dirty kalabilir |
| E-STATE-Q6 | Bulk save error | POST bulk 403 | Toast error |
| E-STATE-Q7 | Per-question saving | Tek kaydet | İlgili satır saving state |

### 3.7 Yetkisiz / cross-org (UI)

| ID | Adımlar | Beklenen |
|----|---------|----------|
| E-AUTH-01 | Logout → plan/questionnaires URL | Login’e yönlendirme |
| E-AUTH-02 | Viewer ile Plan | Form yüklenir; kaydet 403 toast |
| E-AUTH-03 | Viewer ile Questionnaire | Okuma OK; kaydet 403 toast |
| E-AUTH-04 | Başka org workspace URL’i | 403 EmptyState / ownership hatası |
| E-AUTH-05 | Header’larda `X-Organization-ID` + `X-Workspace-ID` | Network’te doğru gider |

### 3.8 Uçtan uca mutlu yol (smoke)

| ID | Akış | Pass kriteri |
|----|------|--------------|
| E-SMOKE-01 | Login (developer) → Plan → genel+section doldur → kaydet → completeness yükselir | overall > 0 |
| E-SMOKE-02 | Questionnaires → 9 required cevapla (tekli + bulk karışık) → Missing empty | `total_answered == total_required` |
| E-SMOKE-03 | Reload her iki sayfa | Veri kalıcı |

---

## 4. Öncelik ve Coverage Haritası

### P0 — Release blocker

- Auth 401, RBAC 403 (viewer write, non-member)
- Workspace ownership cross-org 403
- Profile PUT/GET + partial update
- Completeness doğru skor (özellikle 0 / 19 / 100)
- Questions list + single/bulk answer happy path
- Missing information required sayımı (9)
- Frontend: profile name validation; loading/error; kaydet toast’ları
- Frontend: questionnaire save + missing tab

### P1 — Yüksek

- Soft-empty profile (no 404)
- Empty answer → hâlâ missing
- Bulk validation (`[]`, missing question_id)
- Invalid language / invalid UUID
- Completeness vs missing-info bağımsızlığı
- Section zeroish JSON edge cases (unit)

### P2 — Bilinen gap / regression

- Bulk’ta olmayan question_id → 500
- Answer `input_type` server validation yok
- Profile alan clear edilememe (empty string)
- `project_status` server enum yok
- Questionnaire client required validation yok

### Mevcut otomatik coverage vs gap

| Alan | Mevcut unit | Gap |
|------|-------------|-----|
| Completeness pure fn | Var | Whitespace / zeroish ek case’ler |
| Missing info use-case | Var | Default-set-missing, IsEmptyValue tablosu |
| Profile/Answer/Bulk use-case | Yok | Mock unit + HTTP integration |
| Handler / RBAC / ownership | Yok | Integration P0 |
| Frontend | Manuel | E2E checklist (bu doküman) |

---

## 5. Çalıştırma Notları

**Unit:**

```bash
cd backend
go test ./internal/application/projectprofile/usecase/ -count=1
go test ./internal/application/questionnaire/usecase/ -count=1
```

**Integration (önerilen düzen):** migrate → seed → test user/org/workspace oluştur → yukarıdaki I-* case’lerini HTTP client veya Go `httptest` ile çalıştır.

**Frontend manuel:** `frontend` dev server + çalışan API; Network’te status/body doğrula; her rol için ayrı oturum.

---

## 6. Çıkış Kriterleri (Phase 2 test done)

1. P0 senaryolarının tamamı pass.
2. Completeness formülü unit + integration’da tutarlı (0 / kısmi / 100).
3. Missing information seed required=9 ile tutarlı; empty value answered sayılmaz.
4. Viewer write engelli; developer write başarılı; cross-org 403.
5. Plan ve Questionnaires sayfalarında loading / error / success (ve questionnaire empty/missing-empty) gözle doğrulandı.
6. Profile formunda `project_name` min-2 validation request’i engeller.
7. Bilinen gap’ler (bulk FK, no answer type validation) bilinçli olarak dokümante; blocker değilse P2’de bırakıldı.
`)