/**
 * Training v2 — 180 yeni kayıt üretici yardımcıları.
 * Her kategori için 30 benzersiz, domain-etiketli örnek.
 */

export const DOMAINS = [
  "saas",
  "finans",
  "sağlık",
  "eğitim",
  "tarım",
  "lojistik",
  "e-ticaret",
  "kamu",
  "insan kaynakları",
  "enerji",
  "sigorta",
  "turizm",
  "üretim",
  "siber güvenlik",
  "mobil uygulamalar",
];

export const PS_V2_SECTIONS = [
  "Ürün özeti",
  "Problem",
  "Hedef kullanıcılar",
  "Amaçlar",
  "Kapsam",
  "Fonksiyonel gereksinimler",
  "Fonksiyonel olmayan gereksinimler",
  "Riskler",
  "Başarı ölçütleri",
];

export function ps(instruction, input, body, domain) {
  const output = PS_V2_SECTIONS.map((title) => {
    const text = body[title];
    if (!text) throw new Error(`Eksik bölüm "${title}" — ${instruction.slice(0, 40)}`);
    return `## ${title}\n${text}`;
  }).join("\n\n");
  return { instruction, input, output, category: "product_spec", domain };
}

export function rec(instruction, input, output, category, domain) {
  return { instruction, input, output, category, domain };
}

/** Eski product_spec başlıklarını v2 formatına taşır (içerik korunur). */
function sectionCount(text, hints) {
  const lowered = text.toLowerCase();
  return hints.filter((h) => lowered.includes(h)).length;
}

export function hasValidRiskTable(text) {
  const lowered = text.toLowerCase();
  return (
    lowered.includes("| risk") &&
    lowered.includes("olasılık") &&
    lowered.includes("etki") &&
    lowered.includes("öncelik") &&
    lowered.includes("azaltma")
  );
}

function trLower(text) {
  return String(text).toLocaleLowerCase("tr");
}

function parseSections(output) {
  const sections = {};
  const source = output.trim().startsWith("##") ? output : `## ${output}`;
  for (const part of source.split(/\n## /)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const nl = trimmed.indexOf("\n");
    let title = (nl === -1 ? trimmed : trimmed.slice(0, nl)).trim();
    title = title.replace(/^#+\s*/, "");
    const body = nl === -1 ? "" : trimmed.slice(nl + 1).trim();
    sections[trLower(title)] = body;
  }
  return sections;
}

export function migrateProjectPlanningOutput(output, instruction) {
  const sections = parseSections(output);
  const fazlar = sections[trLower("fazlar")] || output.trim();
  const slug = instruction.slice(0, 50).trim();
  return `## Fazlar
${fazlar}

## Teslimatlar
${slug} kapsamında onaylı gereksinim seti, mimari/entegrasyon dokümanları, test özeti, operasyon runbook ve imzalı kabul tutanağı.

## Bağımlılıklar
${slug} kritik bağımlılıkları faz planında listelenmiştir: harici API erişimleri, regülasyon/onay süreçleri, altyapı provisioning ve paydaş kabul kapıları.

## Sorumlular
${slug} programında PM koordinasyonu, teknik lider, modül liderleri, QA kapısı ve iş sponsoru — rol dağılımı Fazlar bölümündeki kaynak planına göre.

## Süre tahmini
${slug} faz süreleri ve buffer Fazlar bölümündeki kilometre taşlarından türetilir; kritik yol orada tanımlıdır.

## Çıkış kriterleri
Faz sonu imzalı kabul, KPI hedef bandı, SEV1 açık kayıt kalmaması — ${slug} teslim kriterleri Fazlar bölümüne referansla uygulanır.`;
}

export function migrateRequirementAnalysisOutput(output, instruction) {
  const sections = parseSections(output);
  const slug = instruction.slice(0, 40).trim();
  let fr =
    sections[trLower("fonksiyonel gereksinimler")] ||
    sections[trLower("fonksiyonel gereksinim")] ||
    output.trim();
  let nfr =
    sections[trLower("fonksiyonel olmayan gereksinimler")] ||
    sections[trLower("fonksiyonel olmayan")] ||
    "";

  const inlineNfr = fr.match(/\bNFR\s*[:-]/i);
  if (inlineNfr && inlineNfr.index != null && inlineNfr.index > 0) {
    nfr = fr.slice(inlineNfr.index).trim();
    fr = fr.slice(0, inlineNfr.index).trim();
  } else if (!nfr || nfr === fr) {
    nfr = `NFR-LEG: p95 yanıt süresi, güvenlik kontrolleri ve erişilebilirlik hedefleri ${slug} kapsamında tanımlanır.`;
  }

  fr = fr.replace(/^FR\s*\([^)]+\):\s*/i, "").trim();
  nfr = nfr.replace(/^NFR\s*[:]\s*/i, "NFR: ").trim();

  return `## Fonksiyonel gereksinimler
${fr}

## Fonksiyonel olmayan gereksinimler
${nfr}

## Varsayımlar
${slug} kapsamında paydaş temsilcileri analiz oturumlarına katılır; test/staging ortamı erişilebilir kalır; hukuk yorumu onaylanmış kabul edilir.

## Kısıtlar
${slug} bütçe/kadro limitleri, mevcut entegrasyonlar ve regülasyon maddeleri kapsam dışı talepleri sınırlar.

## Açık sorular
${slug} final workshop gündeminde: NFR eşik değerleri, entegrasyon SLA sahipliği ve veri saklama süreleri kapatılacaktır.`;
}

export function migrateTechnicalDocOutput(output, instruction) {
  const sections = parseSections(output);
  const slug = instruction.slice(0, 40).trim();
  const flow =
    sections[trLower("mimari veya akış")] ||
    sections[trLower("mimari")] ||
    output.trim();
  return `## Amaç
${slug} kapsamındaki teknik bileşenin davranışını, sınırlarını ve operasyon beklentilerini tanımlar.

## Mimari veya akış
${flow}

## API/veri yapısı
İstek/yanıt şemaları, endpoint sözleşmeleri ve veri modeli ilişkileri yukarıdaki akış diyagramı ile tutarlı olmalıdır.

## Hata yönetimi
4xx istemci ve 5xx sunucu hataları ayrıştırılır; retry yalnızca idempotent uçlarda uygulanır; dead-letter kuyruğu devreye alınır.

## Güvenlik
Kimlik doğrulama, rol tabanlı yetkilendirme, girdi doğrulama ve hassas veri maskeleme kontrolleri zorunludur.

## Gözlemlenebilirlik
Yapılandırılmış log kayıtları, latency/error-rate metrikleri ve dağıtık trace ile uçtan uca izlenebilirlik sağlanır.

## Test yaklaşımı
Birim, entegrasyon ve contract testleri CI pipeline'ında çalıştırılır; release öncesi temel yük testi tamamlanır.`;
}

export function migrateRiskAnalysisOutput(output, instruction) {
  const slug = instruction.slice(0, 50).trim();
  const probLabels = ["Seyrek (≤1/yıl)", "Ara (çeyrekte)", "Muhtemel (ayda)", "Sık (haftalık)", "Kritik eşik"];
  const impactLabels = [
    "Operasyon duruşu",
    "Finansal kayıp",
    "Regülasyon cezası",
    "Veri sızıntısı",
    "Müşteri churn",
  ];
  const priLabels = ["P1", "P2", "P2", "P3", "P3"];
  const mitLabels = [
    `${slug}: erken uyarı paneli ve haftalık risk review oturumu`,
    `${slug}: yedek tedarikçi sözleşmesi ve SLA yeniden müzakere`,
    `${slug}: otomatik regresyon test paketi ve geri alma runbook`,
    `${slug}: kullanıcı eğitim programı ve saha destek hattı`,
    `${slug}: regülasyon danışmanlık ve audit log iyileştirmesi`,
  ];

  const tableMatch = output.match(/\|[^\n]+\|\s*\n\|[-|\s]+\|\s*\n((?:\|[^\n]+\|\s*\n?)+)/);
  if (tableMatch) {
    const dataRows = tableMatch[1]
      .trim()
      .split("\n")
      .filter((line) => line.trim().startsWith("|"));
    const rows = dataRows.slice(0, 5).map((line, i) => {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      const risk = cells[0] ?? `${slug} risk-${i + 1}`;
      return `| ${risk} | ${probLabels[i] ?? probLabels[0]} | ${impactLabels[i] ?? impactLabels[0]} | ${priLabels[i] ?? "P2"} | ${mitLabels[i] ?? mitLabels[0]} |`;
    });
    return `${slug} risk değerlendirme tablosu:

| Risk | Olasılık | Etki | Öncelik | Azaltma planı |
|---|---|---|---|---|
${rows.join("\n")}`;
  }

  const chunks = output
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  const base = chunks.length > 0 ? chunks : [output.trim()];
  const rows = base.slice(0, 5).map((chunk, i) => {
    const risk = `${slug} — ${chunk.replace(/\|/g, "/")}`;
    return `| ${risk} | ${probLabels[i]} | ${impactLabels[i]} | ${priLabels[i]} | ${mitLabels[i]} |`;
  });
  return `${slug} risk değerlendirme tablosu:

| Risk | Olasılık | Etki | Öncelik | Azaltma planı |
|---|---|---|---|---|
${rows.join("\n")}`;
}

export function migrateUserStoryOutput(output, instruction) {
  const sections = parseSections(output);
  const slug = (instruction ?? "").slice(0, 24).trim() || "LEG";

  if (sections[trLower("rol")]) {
    let need = sections[trLower("ihtiyaç")] || output;
    let benefit = sections[trLower("fayda")] || "iş hedefime daha hızlı ulaşmak";
    let kabul = sections[trLower("kabul kriterleri")] || "";

    if (need.includes("Kabul kriterleri:")) {
      const parts = need.split(/Kabul kriterleri:/i);
      need = parts[0].trim();
      if (!kabul && parts[1]) kabul = parts[1].trim();
    }

    const criteriaSource = kabul || "Ölçülebilir kabul kriterleri test senaryolarıyla doğrulanır.";
    const criteriaLines = criteriaSource
      .split(/\n|;\s*|,\s*(?=[A-Z0-9])/)
      .map((line) => line.replace(/^[-*]\s*AK-[\w-]+:\s*/i, "").trim())
      .filter((line) => line.length > 5)
      .map((line, i) => `- AK-${slug.replace(/\W+/g, "")}-${i + 1}: ${line.replace(/^[-*]\s*/, "")}`);

    return `## Rol
${sections[trLower("rol")]}

## İhtiyaç
${need}

## Fayda
${benefit}

## Kabul kriterleri
${criteriaLines.join("\n")}`;
  }

  let role = "Kullanıcı";
  let need = output;
  let benefit = "iş hedefime daha hızlı ulaşmak";
  const usMatch = output.match(/^(US-[\w-]+:\s*)?(.+?) olarak[,]?\s+(.+?)(?:,\s*böylece\s+(.+?))?(?:\.|$)/i);
  if (usMatch) {
    role = usMatch[2].trim();
    need = usMatch[3].trim();
    if (usMatch[4]) benefit = usMatch[4].trim();
  }

  const kabulPart = output.includes("Kabul")
    ? output.slice(trLower(output).indexOf("kabul"))
    : "Ölçülebilir kabul kriterleri ayrı test senaryolarıyla doğrulanır.";

  const criteriaLines = kabulPart
    .replace(/^Kabul( kriterleri)?:?\s*/i, "")
    .split(/\.\s+/)
    .filter(Boolean)
    .map((line, i) => `- AK-${slug.replace(/\W+/g, "")}-${i + 1}: ${line.trim()}`);

  return `## Rol
${role}

## İhtiyaç
${need}

## Fayda
${benefit}

## Kabul kriterleri
${criteriaLines.join("\n")}`;
}

export function migrateLegacyRecord(row) {
  const domain = row.domain ?? "legacy";
  switch (row.category) {
    case "product_spec":
      return { ...row, output: migrateProductSpecOutput(row.output), domain };
    case "project_planning":
      return { ...row, output: migrateProjectPlanningOutput(row.output, row.instruction), domain };
    case "requirement_analysis":
      return { ...row, output: migrateRequirementAnalysisOutput(row.output, row.instruction), domain };
    case "technical_documentation":
      return { ...row, output: migrateTechnicalDocOutput(row.output, row.instruction), domain };
    case "risk_analysis":
      return {
        ...row,
        output: migrateRiskAnalysisOutput(row.output, row.instruction),
        domain,
      };
    case "user_story":
      return { ...row, output: migrateUserStoryOutput(row.output, row.instruction), domain };
    default:
      return { ...row, domain };
  }
}

export function migrateProductSpecOutput(output) {
  const sections = parseSections(output);

  const get = (...keys) => {
    for (const key of keys) {
      const hit = sections[trLower(key)];
      if (hit) return hit;
    }
    return "";
  };

  const temel = get("temel özellikler");
  const teknik = get("teknik yaklaşım");
  const body = {
    "Ürün özeti": get("ürün özeti") || "Legacy kayıttan taşınan ürün özeti.",
    Problem: get("problem") || "Legacy kayıttan taşınan problem tanımı.",
    "Hedef kullanıcılar":
      get("hedef kullanıcılar") || "Legacy kayıttan taşınan hedef kullanıcı segmentleri.",
    Amaçlar: get("amaçlar") || temel || "Ürünün birincil iş hedefleri ve kullanıcıya sağlayacağı değer.",
    Kapsam:
      get("kapsam") ||
      teknik ||
      "MVP kapsamındaki modüller, entegrasyonlar ve bilinçli olarak dışarıda bırakılan alanlar.",
    "Fonksiyonel gereksinimler":
      get("fonksiyonel gereksinimler") || "Legacy fonksiyonel gereksinim maddeleri korunmuştur.",
    "Fonksiyonel olmayan gereksinimler":
      get("fonksiyonel olmayan gereksinimler") ||
      "Performans, güvenlik, erişilebilirlik ve uyumluluk hedefleri.",
    Riskler: get("riskler", "risk") || "Legacy risk maddeleri korunmuştur.",
    "Başarı ölçütleri":
      get("başarı ölçütleri", "başarı kriterleri") ||
      "Ölçülebilir KPI ve kabul eşikleri legacy kayıttan taşınmıştır.",
  };

  return PS_V2_SECTIONS.map((t) => `## ${t}\n${body[t]}`).join("\n\n");
}

function ppOutput(name, domain, idx, ctx) {
  const code = `PP-V2-${idx}`;
  return `## Fazlar
[${code}] ${name} — ${ctx}
Faz 0 (${2 + (idx % 3)} hf): ${domain} keşif, RACI, kapsam kilidi.
Faz 1 (${3 + (idx % 2)} hf): ${name} mimari/UX, güvenlik tasarım review.
Faz 2 (${6 + (idx % 4)} hf): ${ctx} geliştirme sprintleri, entegrasyon hardening.
Faz 3 (${3 + (idx % 2)} hf): ${domain} UAT, performans, güvenlik testi.
Faz 4 (2 hf): kademeli canlı, hypercare, retro.

## Teslimatlar
${code}-D1: ${name} gereksinim & risk register.
${code}-D2: ${domain} mimari karar kayıtları (ADR).
${code}-D3: ${ctx} MVP özellik seti.
${code}-D4: Test özeti + açık bulgu listesi.
${code}-D5: Runbook, eğitim, destek modeli.

## Bağımlılıklar
${name} ← ${ctx}; ${domain} regülasyon/onay; vendor API; staging/prod ortam; veri migrasyon penceresi; kullanıcı eğitim takvimi.

## Sorumlular
Program: PM-${idx}. Teknik: TL-${domain.slice(0, 3).toUpperCase()}. Kalite: QA-${idx}. Operasyon: DevOps-${idx}. İş: Sponsor-${name.slice(0, 8)}.

## Süre tahmini
${16 + (idx % 6)} hf toplam; ${name} kritik yol Faz 2 (${ctx}). Buffer %15. Blackout: ${domain} peak dönemlerinde deploy yok.

## Çıkış kriterleri
${code} kabul: ${ctx} KPI yeşil; ${name} p95<2s; SEV1=0; pilot NPS≥4; ${domain} güvenlik gate PASS; rollback tatbikatı başarılı.`;
}

function reqOutput(name, domain, idx, ctx) {
  const code = `REQ-V2-${idx}`;
  return `## Fonksiyonel gereksinimler
${code}: ${name} — ${ctx}
FR-${idx}-01: Kayıt/rol yönetimi (${domain}). FR-${idx}-02: ${name} çekirdek akış. FR-${idx}-03: Rapor/export. FR-${idx}-04: Bildirim/audit. FR-${idx}-05: ${ctx} entegrasyon olayı.

## Fonksiyonel olmayan gereksinimler
NFR-${idx}-01: p95 API <800 ms (${name}). NFR-${idx}-02: %99.5 uptime. NFR-${idx}-03: KVKK (${domain}). NFR-${idx}-04: 500 eşzamanlı tenant. NFR-${idx}-05: Audit 24 ay.

## Varsayımlar
${code}: ${domain} API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi; SSO test ortamı; hukuk onayı ${name} kapsamı için.

## Kısıtlar
${ctx} dışı legacy migrasyon yok; bütçe/kadro ${idx}. fazında sabit; tek bölge MVP; ${domain} regülasyon sınırları.

## Açık sorular
${name} veri saklama süresi? ${domain} tenant izolasyon modeli? ${ctx} offline kapsamda mı? SLA sahibi kim (${code})?`;
}

function techOutput(name, domain, idx, ctx) {
  const code = `TECH-V2-${idx}`;
  return `## Amaç
${code}: ${name} — ${ctx} (${domain}) bileşeninin davranışını tanımlar.

## Mimari veya akış
${domain} istemci → API Gateway → ${name} servisi (${ctx}) → PostgreSQL/Redis. Olaylar: \`${domain}.${name.replace(/\s+/g, "-").toLowerCase()}\`.

## API/veri yapısı
REST \`/v1/${code.toLowerCase()}/resources\`; şema \`{id, tenantId, status, payload, createdAt}\`; hata \`{code, message, traceId}\`.

## Hata yönetimi
${name}: 4xx/5xx ayrımı; retry 429/503; DLQ 5 deneme; ${ctx} için Türkçe kullanıcı mesajı.

## Güvenlik
JWT tenant claim; PII maskeleme; OWASP ASVS L2; ${domain} erişim audit.

## Gözlemlenebilirlik
OTel trace; Prometheus ${code}_latency; JSON log; alert p95>800ms.

## Test yaklaşımı
Unit %90+; Testcontainers; contract test; k6 2× trafik; SAST CI (${code}).`;
}

function riskOutput(name, domain, idx, ctx) {
  const code = `RISK-V2-${idx}`;
  const riskLines = [
    `${domain} ortamında ${name} bileşeninde ${ctx} kaynaklı servis kesintisi`,
    `${ctx} senaryosunda ${name} için yetkilendirme veya konfigürasyon hatası`,
    `${domain} veri hattında ${name} senkronizasyon gecikmesi ve tutarsızlık`,
    `${name} üzerinde ${ctx} bağımlılığının erişilememesi`,
    `${domain} kullanıcılarında ${name} adaptasyonu ve eğitim yetersizliği`,
  ];
  const probLabels = [
    `Seyrek (≤1/yıl, ${code}-P1)`,
    `Ara (çeyrekte, ${code}-P2)`,
    `Muhtemel (ayda, ${code}-P3)`,
    `Sık (haftalık, ${code}-P4)`,
    `Kritik eşik (günlük, ${code}-P5)`,
  ];
  const impactLabels = [
    `Operasyon duruşu (${name})`,
    `Finansal kayıp (${domain})`,
    `Regülasyon cezası (${ctx})`,
    `Veri bütünlüğü kaybı (${name})`,
    `Müşteri güven kaybı (${domain})`,
  ];
  const priLabels = ["P1", "P2", "P1", "P3", "P2"];
  const mitLabels = [
    `Erken entegrasyon tatbikatı ve runbook-${idx}`,
    `Hukuk/denetim review ve erişim matrisi-${idx}`,
    `Checksum, dry-run migrasyon ve geri alma-${idx}`,
    `Yedek vendor ve SLA yeniden müzakere-${idx}`,
    `Pilot kullanıcı programı ve eğitim paketi-${idx}`,
  ];
  const rows = riskLines.map((risk, ri) =>
    `| ${risk} | ${probLabels[ri]} | ${impactLabels[ri]} | ${priLabels[ri]} | ${mitLabels[ri]} |`,
  );
  const header =
    "| Risk | Olasılık | Etki | Öncelik | Azaltma planı |\n|---|---|---|---|---|";
  const intro = `${code}: ${domain} sektöründe "${name}" risk matrisi — tetikleyici "${ctx}". İnceleme dönemi Q${(idx % 4) + 1}/2026.`;
  const footer = `Onay kapısı: ${name} canlı geçişi öncesi tüm P1 maddeleri kapatılmalıdır (ref: ${code}).`;
  return `${intro}\n\n${header}\n${rows.join("\n")}\n\n${footer}`;
}

function usOutput(role, need, benefit, domain, idx) {
  const code = `US-V2-${idx}`;
  const criteria = [
    `Given ${role} ${domain} portalına giriş yaptığında When ${need} akışını başlatırsa Then işlem en fazla 3 adımda tamamlanır (${code})`,
    `Given geçersiz ${domain} girdisi When kaydet denirse Then Türkçe alan bazlı hata gösterilir (${code})`,
    `Given offline ${domain} modu When ağ gelince Then ${need} verisi kaybolmadan senkron olur (${code})`,
    `Given denetim gerektiğinde When işlem biterse Then kullanıcı+zaman+tenant audit loglanır (${code})`,
  ];
  return `## Rol
${role} (${domain})

## İhtiyaç
${need}

## Fayda
${benefit}

## Kabul kriterleri
${criteria.map((c, i) => `- AK-${idx}-${i + 1}: ${c}`).join("\n")}

Story kodu: ${code}. Domain: ${domain}.`;
}

const PS_BLUEPRINTS = [
  ["saas", "FlowDesk Pro", "Çok kiracılı proje ve destek bileti yönetimi", "Ekipler dağınık araç kullanıyor"],
  ["finans", "RiskLens", "Kurumsal kredi limit izleme paneli", "Limit aşımları geç fark ediliyor"],
  ["sağlık", "MedTrail", "Taburcu sonrası hasta takip uygulaması", "Taburcu talimatları kayboluyor"],
  ["eğitim", "CampusMatch", "Üniversite mentörlük eşleştirme platformu", "Mentor-mentee eşleşmesi manuel"],
  ["tarım", "CropLedger", "Kooperatif mahsul alım-satım defteri", "Excel kayıtları uyuşmuyor"],
  ["lojistik", "DepoPulse", "Depo slotting ve pick-path optimizasyonu", "Yürüme mesafesi yüksek"],
  ["e-ticaret", "CartShield", "Sepet terk kurtarma ve kupon motoru", "Sepet terk oranı %72"],
  ["kamu", "PermitOne", "Belediye ruhsat başvuru self-servis portalı", "Vatandaş queue bekliyor"],
  ["insan kaynakları", "SkillAtlas", "Yetkinlik matrisi ve eğitim öneri motoru", "Yetkinlik verisi güncel değil"],
  ["enerji", "GridWatch", "Dağıtım şebekesi yük dengeleme izleme", "Trafo aşırı yük geç görülüyor"],
  ["sigorta", "ClaimFlow", "Hasar dosyası dijital kabul ve ekspertiz", "Kağıt evrak gecikmesi"],
  ["turizm", "StayLocal", "Butik otel kanal yönetimi ve fiyat senkronu", "Overbooking riski"],
  ["üretim", "LineSight", "OEE ve duruş kodu analiz platformu", "Duruş nedenleri standart değil"],
  ["siber güvenlik", "TrustGate", "Zero-trust erişim ve cihaz posture", "VPN tabanlı erişim yetersiz"],
  ["mobil uygulamalar", "PocketCoach", "Kişisel finans alışkanlık koçluğu", "Harcama farkındalığı düşük"],
  ["saas", "DocuChain", "Sözleşme yaşam döngüsü ve e-imza", "Sözleşme versiyon karmaşası"],
  ["finans", "TreasuryHub", "Grup şirketi nakit konsolidasyonu", "Excel konsolidasyon hatalı"],
  ["sağlık", "LabLink", "Laboratuvar sonuç HL7 dağıtım hub'ı", "Sonuç gecikmesi"],
  ["eğitim", "ExamForge", "Soru bankası ve adaptif sınav üretimi", "Soru tekrarı ve sızıntı"],
  ["tarım", "AgroAlert", "Don ve dolu erken uyarı servisi", "Hava olayı kaybı yüksek"],
  ["lojistik", "FleetGuard", "Araç bakım ve muayene takvimi", "Plansız arıza maliyeti"],
  ["e-ticaret", "ReturnEase", "İade portalı ve otomatik iade etiketi", "İade süreci yavaş"],
  ["kamu", "OpenBudget", "Belediye bütçe şeffaflık portalı", "Vatandaş veriye erişemiyor"],
  ["insan kaynakları", "LeaveSync", "Çok ülkeli izin ve resmi tatil motoru", "Yanlış izin bakiyesi"],
  ["enerji", "SolarOps", "GES santral inverter performans izleme", "PR sapması geç fark ediliyor"],
  ["sigorta", "PolicyGen", "Mikro sigorta ürün konfigüratörü", "Ürün çıkış süresi uzun"],
  ["turizm", "GuideMe", "Müze AR rehber ve rota önerisi", "Kalabalık alanlarda kaybolma"],
  ["üretim", "QualityGate", "Statik proses kalite SPC modülü", "Limit dışı trend geç yakalanıyor"],
  ["siber güvenlik", "PhishSim", "Çalışan oltalama simülasyon platformu", "Tıklama oranı yüksek"],
  ["mobil uygulamalar", "MindPause", "Kurumsal wellness mola hatırlatıcı", "Tükenmişlik bildirimi yok"],
];

const PP_TOPICS = [
  ["saas", "CRM migrasyonu", "Salesforce'tan in-house CRM'e geçiş, 500 kullanıcı"],
  ["finans", "Basel raporlama", "Yeni regülasyon rapor modülü, 9 aylık deadline"],
  ["sağlık", "HIS entegrasyonu", "Epikrisis modülü, HL7 FHIR"],
  ["eğitim", "LMS rollout", "15 kampüs, 40.000 öğrenci"],
  ["tarım", "Kooperatif ERP", "Hasat sezonu öncesi canlı"],
  ["lojistik", "WMS değişimi", "Eski WMS ile paralel 4 hafta"],
  ["e-ticaret", "Headless storefront", "Black Friday hedefi, 3× trafik"],
  ["kamu", "e-Devlet entegrasyon", "Yeni hizmet katalog API"],
  ["insan kaynakları", "HRIS birleşimi", "İki şirket birleşmesi post-merger"],
  ["enerji", "SCADA modernizasyon", "Legacy SCADA → bulut telemetri"],
  ["sigorta", "Hasar core replatform", "Anaframe → microservice"],
  ["turizm", "Rezervasyon motoru", "Peak sezon öncesi lansman"],
  ["üretim", "MES go-live", "3 hat pilot, sonra 12 hat"],
  ["siber güvenlik", "SOC2 Type II", "Kontrol kapanışı 6 ay"],
  ["mobil uygulamalar", "Super app modül", "Cüzdan modülü mevcut uygulamaya"],
  ["saas", "Billing v2", "Kullanım bazlı faturalandırma"],
  ["finans", "Open banking", "PSD2 AIS/PIS sertifikasyon"],
  ["sağlık", "Telemedicine scale", "10× randevu kapasitesi"],
  ["eğitim", "Sınav güvenliği", "Proctoring modül entegrasyonu"],
  ["tarım", "IoT sensör ağı", "5000 sensör deploy"],
  ["lojistik", "Cross-dock optimizasyon", "Yeni hub operasyonu"],
  ["e-ticaret", "Marketplace genişleme", "3P satıcı onboarding"],
  ["kamu", "Afet iletişim", "SMS/push acil bildirim"],
  ["insan kaynakları", "Performans döngüsü", "OKR modülü global rollout"],
  ["enerji", "Demand response", "Sanayi tesisleri yük kaydırma"],
  ["sigorta", "Dijital poliçe", "Mobil poliçe teslim"],
  ["turizm", "Dinamik fiyatlama", "RevPAR optimizasyon motoru"],
  ["üretim", "Predictive maintenance", "Titreşim sensörü pilot"],
  ["siber güvenlik", "IAM konsolidasyon", "5 legacy IAM → tek platform"],
  ["mobil uygulamalar", "Offline-first saha", "Saha satış offline sync"],
];

const REQ_TOPICS = [
  ["saas", "Çoklu workspace", "Kullanıcılar workspace değiştirmek istiyor"],
  ["finans", "Limit alarm", "Kredi limit %90 uyarı"],
  ["sağlık", "Randevu iptali", "24 saat kuralı ve bekleme listesi"],
  ["eğitim", "Devamsızlık bildirimi", "Veli push bildirimi"],
  ["tarım", "Hasat kaydı", "Tarla bazlı verim girişi"],
  ["lojistik", "POD fotoğraf", "Teslim kanıtı zorunlu"],
  ["e-ticaret", "Stok rezervasyon", "Checkout'ta 15 dk hold"],
  ["kamu", "Şikayet SLA", "72 saat ilk yanıt"],
  ["insan kaynakları", "İzin onayı", "Yönetici mobil onay"],
  ["enerji", "Alarm eşiği", "Trafo yük %85 uyarı"],
  ["sigorta", "Hasar foto", "Minimum 3 açı foto"],
  ["turizm", "İptal politikası", "Esnek iptal paketi"],
  ["üretim", "Andon", "Hat duruşu bildirimi"],
  ["siber güvenlik", "MFA zorunlu", "Admin roller MFA"],
  ["mobil uygulamalar", "Biometrik giriş", "FaceID/TouchID"],
  ["saas", "Webhook retry", "Exponential backoff"],
  ["finans", "Mutabakat", "Günlük banka mutabakat"],
  ["sağlık", "Reçete yenileme", "E-reçete entegrasyon"],
  ["eğitim", "Ödev teslim", "Geç teslim ceza kuralı"],
  ["tarım", "Gübre planı", "Toprak analizine göre öneri"],
  ["lojistik", "Soğuk zincir", "Sıcaklık ihlal alarmı"],
  ["e-ticaret", "Bölünmüş sevkiyat", "Kısmi gönderim bildirimi"],
  ["kamu", "Randevu slot", "Vatandaş online randevu"],
  ["insan kaynakları", "Masraf formu", "Fiş OCR ile doldurma"],
  ["enerji", "Fatura doğrulama", "Sayaç okuma vs fatura"],
  ["sigorta", "Poliçe yenileme", "Otomatik yenileme hatırlatma"],
  ["turizm", "Grup rezervasyon", "10+ kişi grup indirimi"],
  ["üretim", "Lot traceability", "Geriye dönük izlenebilirlik"],
  ["siber güvenlik", "Secret rotation", "90 günde bir otomatik"],
  ["mobil uygulamalar", "Push tercih", "Bildirim kategorisi seçimi"],
];

const TECH_TOPICS = [
  ["saas", "Event outbox", "Transactional outbox pattern"],
  ["finans", "Idempotency API", "Ödeme tekrar koruması"],
  ["sağlık", "FHIR Patient", "Patient resource CRUD"],
  ["eğitim", "LTI 1.3", "LMS tool entegrasyonu"],
  ["tarım", "MQTT gateway", "Sensör telemetri ingest"],
  ["lojistik", "TMS routing", "Rota optimizasyon servisi"],
  ["e-ticaret", "Search index", "Elasticsearch ürün arama"],
  ["kamu", "e-İmza API", "Nitelikli imza entegrasyonu"],
  ["insan kaynakları", "SCIM sync", "Kullanıcı provizyon"],
  ["enerji", "Modbus adapter", "Sayaç okuma servisi"],
  ["sigorta", "Tarife motoru", "Prim hesaplama API"],
  ["turizm", "Channel manager", "OTA fiyat push"],
  ["üretim", "OPC-UA bridge", "PLC veri köprüsü"],
  ["siber güvenlik", "SIEM ingest", "Log forwarder"],
  ["mobil uygulamalar", "Deep link", "Universal link routing"],
  ["saas", "Rate limiter", "Tenant bazlı kota"],
  ["finans", "Ledger service", "Çift kayıt muhasebe"],
  ["sağlık", "Consent API", "Açık rıza yönetimi"],
  ["eğitim", "Proctor webhook", "Sınav olay akışı"],
  ["tarım", "GeoJSON parcel", "Parsel sınır servisi"],
  ["lojistik", "POD storage", "Teslim foto object store"],
  ["e-ticaret", "Cart API", "Sepet birleştirme"],
  ["kamu", "Document archive", "WORM arşiv"],
  ["insan kaynakları", "Payroll export", "Bordro dosya üretici"],
  ["enerji", "Time-series DB", "Yük geçmişi sorgu"],
  ["sigorta", "FNOL API", "İlk hasar bildirimi"],
  ["turizm", "Availability API", "Oda müsaitlik sorgu"],
  ["üretim", "SPC calculator", "X-bar R hesaplama"],
  ["siber güvenlik", "Token introspect", "OAuth introspection"],
  ["mobil uygulamalar", "Attestation", "Device integrity check"],
];

const RISK_TOPICS = [
  ["saas", "Tenant izolasyon ihlali", "Çok kiracılı veri sızıntısı"],
  ["finans", "Yanlış limit güncelleme", "Batch job hatası"],
  ["sağlık", "Yanlış hasta eşleşme", "Kimlik doğrulama zayıf"],
  ["eğitim", "Sınav içerik sızıntısı", "Soru bankası erişimi"],
  ["tarım", "Hava API kesintisi", "Erken uyarı gecikmesi"],
  ["lojistik", "Rota API maliyeti", "Trafik servisi fiyat artışı"],
  ["e-ticaret", "Ödeme sağlayıcı kesinti", "PSP outage"],
  ["kamu", "Kişisel veri ifşası", "Yanlış portal yayını"],
  ["insan kaynakları", "Performans verisi bias", "360 anket güven"],
  ["enerji", "SCADA erişim", "OT ağ güvenliği"],
  ["sigorta", "Fraud ring", "Organize suiistimal"],
  ["turizm", "Overbooking", "Kanal senkron gecikmesi"],
  ["üretim", "Kalite gate bypass", "Operatör override kötüye kullanım"],
  ["siber güvenlik", "Supply chain", "Bağımlılık zafiyeti"],
  ["mobil uygulamalar", "Store red", "App Store policy"],
  ["saas", "Vendor lock-in", "Özel format export zor"],
  ["finans", "Regülasyon değişimi", "Rapor format güncelleme"],
  ["sağlık", "Veri residency", "Yurt dışı sunucu"],
  ["eğitim", "Erişilebilirlik", "WCAG uyumsuz içerik"],
  ["tarım", "Sensör sahteciliği", "Manipüle telemetri"],
  ["lojistik", "Grev/force majeure", "Teslimat gecikmesi"],
  ["e-ticaret", "Bot trafiği", "Stok eritme saldırısı"],
  ["kamu", "Siyasi baskı", "İçerik moderasyon"],
  ["insan kaynakları", "Veri silme talebi", "GDPR/KVKK unutulma"],
  ["enerji", "Siber saldırı", "Ransomware OT"],
  ["sigorta", "Model drift", "Aktüeryal model sapması"],
  ["turizm", "Mevsimsel çöküş", "Talep tahmin hatası"],
  ["üretim", "Tedarik kesintisi", "Single supplier"],
  ["siber güvenlik", "Insider threat", "Toplu veri export"],
  ["mobil uygulamalar", "Batarya tüketimi", "Arka plan konum"],
];

const US_ROLES = [
  ["saas", "Ürün yöneticisi", "release notlarını müşteri portalında yayınlamak", "e-posta trafiğini azaltmak"],
  ["finans", "Hazine uzmanı", "günlük nakit pozisyonunu tek ekranda görmek", "likidite kararını hızlandırmak"],
  ["sağlık", "Hemşire", "kritik lab sonucunda anında uyarı almak", "gecikmeden müdahale etmek"],
  ["eğitim", "Öğretmen", "sınıf devamsızlığını anında kaydetmek", "veli bilgilendirmesini otomatikleştirmek"],
  ["tarım", "Ziraat mühendisi", "parsel bazlı verim raporu almak", "gübre planını optimize etmek"],
  ["lojistik", "Depo operatörü", "pick listesinde lot doğrulaması yapmak", "yanlış sevkiyatı önlemek"],
  ["e-ticaret", "Müşteri", "kargo durumunu haritada izlemek", "teslimat belirsizliğini azaltmak"],
  ["kamu", "Vatandaş", "belediye başvuru durumunu görmek", "tekrar aramaktan kaçınmak"],
  ["insan kaynakları", "Çalışan", "izin bakiyemi mobilde görmek", "planlama yapabilmek"],
  ["enerji", "Santral operatörü", "inverter arızasında work order açmak", "bakım gecikmesini önlemek"],
  ["sigorta", "Hasar uzmanı", "ekspertiz randevusunu sistemden atamak", "SLA ihlalini azaltmak"],
  ["turizm", "Resepsiyonist", "overbooking riskini erken görmek", "misafir taşıma planı yapmak"],
  ["üretim", "Hat şefi", "OEE düşüş nedenini dashboardda görmek", "müdahale önceliği belirlemek"],
  ["siber güvenlik", "SOC analisti", "phishing raporunu tek tık eskalasyon", "olay müdahalesini hızlandırmak"],
  ["mobil uygulamalar", "Saha satış temsilcisi", "offline müşteri ziyareti kaydetmek", "veri kaybını önlemek"],
  ["saas", "Destek temsilcisi", "müşteri ticket geçmişini 360 görünümde açmak", "çözüm süresini kısaltmak"],
  ["finans", "Mutabakat uzmanı", "banka hareketlerini otomatik eşleştirmek", "manuel iş yükünü azaltmak"],
  ["sağlık", "Doktor", "epikrisis taslağını otomatik doldurmak", "taburcu süresini kısaltmak"],
  ["eğitim", "Öğrenci", "sınav takvimini takvime senkronlamak", "çakışmaları önlemek"],
  ["tarım", "Kooperatif yöneticisi", "üye alım hakediş raporu almak", "şeffaf ödeme yapmak"],
  ["lojistik", "Kurye", "teslimatta kapı kodu notunu görmek", "ilk seferde teslim etmek"],
  ["e-ticaret", "Satıcı", "iade talebini foto kanıtla onaylamak", "kötüye kullanımı azaltmak"],
  ["kamu", "Belediye memuru", "şikayet kaydını birimlere yönlendirmek", "SLA takibini kolaylaştırmak"],
  ["insan kaynakları", "Yönetici", "ekibimin izin takvimini görmek", "kapasite planlamak"],
  ["enerji", "Enerji yöneticisi", "anomali tüketim uyarısı almak", "fatura sürprizini önlemek"],
  ["sigorta", "Acente temsilcisi", "poliçe teklif PDF'i oluşturmak", "müşteriye hızlı dönüş yapmak"],
  ["turizm", "Tur operatörü", "grup rezervasyonunu tek formda toplamak", "hata oranını düşürmek"],
  ["üretim", "Kalite mühendisi", "limit dışı ölçümde NCR açmak", "hurda riskini azaltmak"],
  ["siber güvenlik", "Geliştirici", "CI pipeline güvenlik gate sonucunu görmek", "zafiyetli deploy'u engellemek"],
  ["mobil uygulamalar", "Fitness koçu", "müşteri antrenman uyum skorunu görmek", "motivasyon mesajı zamanlamak"],
];

export function generateV2Expansion() {
  throw new Error("generateV2Expansion deprecated — use scenario_engine.generateScenarioV2Expansion");
}
