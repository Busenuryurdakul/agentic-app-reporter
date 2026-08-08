/**
 * 180 benzersiz senaryo verisi üretir → scenario_data.mjs
 * Run: node scripts/build_scenario_data.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "scripts", "lib", "scenario_data.mjs");

const DOMAINS = [
  "saas", "finans", "sağlık", "eğitim", "tarım", "lojistik", "e-ticaret", "kamu",
  "insan kaynakları", "enerji", "sigorta", "turizm", "üretim", "siber güvenlik", "mobil uygulamalar",
];

const ORG_TYPES = [
  "120 kişilik B2B SaaS", "Bölgesel ticari banka (340 şube)", "350 yataklı eğitim hastanesi",
  "45.000 öğrencili devlet üniversitesi", "1.200 üyeli buğday kooperatifi", "Ulusal 3PL lojistik operatörü",
  "Omnichannel perakende (180 mağaza)", "Büyükşehir belediyesi dijital hizmetler", "Çok uluslu holding İK",
  "Dağıtım şirketi (2.400 trafo)", "Hayat sigortası şirketi", "12 otellik butik zincir",
  "Otomotiv Tier-1 tedarikçi", "MSSP siber güvenlik firması", "10M indirmeli mobil fintech",
  "Seri B SaaS scale-up", "Katılım bankası dijital kanal", "Özel hastane grubu (6 kampüs)",
  "VET okulu ağı", "Organik tarım ihracatçısı", "Cross-dock hub operatörü", "Marketplace (8.000 satıcı)",
  "Valilik dijital dönüşüm", "Fabrika saha İK (4.000 mavi yaka)", "Yenilenebilir GES portföyü",
  "Kasko dijital asistan", "Charter tur operatörü", "Beyaz eşya fabrikası MES", "Zero-trust danışmanlık",
  "Sağlık wellness super-app",
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function psBase(i) {
  const d = pick(DOMAINS, i);
  const products = [
    "FlowDesk Pro", "RiskLens", "MedTrail", "CampusMatch", "CropLedger", "DepoPulse", "CartShield",
    "PermitOne", "SkillAtlas", "GridWatch", "ClaimFlow", "StayLocal", "LineSight", "TrustGate", "PocketCoach",
    "DocuChain", "TreasuryHub", "LabLink", "ExamForge", "AgroAlert", "FleetGuard", "ReturnEase", "OpenBudget",
    "LeaveSync", "SolarOps", "PolicyGen", "GuideMe", "QualityGate", "PhishSim", "MindPause",
  ];
  const problems = [
    "Destek biletleri dağınık kanallarda; SLA ihlalleri geç fark ediliyor.",
    "Kurumsal kredi limitleri parçalı sistemlerde; aşım geç tespit ediliyor.",
    "Taburcu talimatları kağıt formda; readmission oranı yüksek.",
    "Mentor-mentee eşleştirmesi manuel; memnuniyet düşük.",
    "Mahsul tartım-defter mutabakatı haftalar sürüyor.",
    "Depo pick-path optimizasyonu yok; yürüme mesafesi yüksek.",
    "Sepet terk oranı %72; kurtarma otomasyonu yok.",
    "Ruhsat başvurularında vatandaş fiziksel kuyruk bekliyor.",
    "Yetkinlik matrisi güncel değil; eğitim önerisi manuel.",
    "Trafo aşırı yük geç görülüyor; kesinti riski artıyor.",
    "Hasar evrakı kağıt; ekspertiz SLA ihlali sık.",
    "OTA kanal senkron gecikmesi overbooking riski yaratıyor.",
    "OEE düşüş nedenleri standart değil; müdahale gecikiyor.",
    "VPN tabanlı erişim zero-trust hedefiyle uyumsuz.",
    "Harcama farkındalığı düşük; bütçe aşımı sık.",
    "Sözleşme versiyon karmaşası; e-imza süreci parçalı.",
    "Grup nakit konsolidasyonu Excel'de; hata oranı yüksek.",
    "HL7 lab sonuçları gecikmeli dağıtılıyor.",
    "Soru bankası sızıntı riski; adaptif sınav yok.",
    "Don/dolu uyarısı geç geliyor; hasat kaybı yüksek.",
    "Plansız araç arızası lojistik maliyetini artırıyor.",
    "İade süreci yavaş; müşteri memnuniyeti düşük.",
    "Bütçe verisi vatandaşa açık değil; şeffaflık eksik.",
    "Çok ülkeli izin bakiyesi hatalı hesaplanıyor.",
    "GES PR sapması geç fark ediliyor.",
    "Mikro sigorta ürün çıkış süresi 6 hafta.",
    "Müze ziyaretçisi kalabalıkta kayboluyor.",
    "SPC limit dışı trend geç yakalanıyor.",
    "Phishing tıklama oranı %18; farkındalık düşük.",
    "Kurumsal tükenmişlik erken uyarısı yok.",
  ];
  const processes = [
    "Temsilciler kanallar arası manuel kopyala-yapıştır yapıyor.",
    "Limit güncellemeleri günde bir batch çalışıyor.",
    "Taburcu formu veriliyor; 7 gün sonra telefon hatırlatması.",
    "Koordinatör Excel'de manuel eşleştirme yapıyor.",
    "Kantar tartımı kağıda; akşam Excel'e aktarılıyor.",
    "Pick listesi WMS'ten statik rota ile basılıyor.",
    "Sepet terk e-postası 24 saat sonra tek şablonla gidiyor.",
    "Vatandaş belediye veznesinde sıra numarası alıyor.",
    "Yetkinlik verisi yılda bir anketle toplanıyor.",
    "Trafo yükü SCADA ekranında operatör takibiyle izleniyor.",
    "Hasar bildirimi telefon+faks ile alınıyor.",
    "Rezervasyon kanalları saatte bir CSV ile güncelleniyor.",
    "Duruş kodları operatör serbest metin giriyor.",
    "Uzaktan erişim legacy VPN üzerinden.",
    "Harcama banka SMS'lerinden manuel kategorize ediliyor.",
    "Sözleşme Word+e-posta ile dolaşıyor.",
    "Grup şirketleri Excel dosyası e-posta ile gönderiyor.",
    "Lab cihazı HL7 mesajını dosyaya yazıyor; batch aktarım.",
    "Sınav soruları PDF havuzundan manuel seçiliyor.",
    "Hava istasyonu verisi sabah toplantısında okunuyor.",
    "Bakım takvimi Excel; muayene tarihi kaçırılabiliyor.",
    "İade talebi call center'a telefon ile iletiliyor.",
    "Bütçe PDF yılda bir web'e yükleniyor.",
    "İzin bakiyesi ülke bazlı farklı Excel'lerde.",
    "Inverter verisi portalda günlük CSV export.",
    "Ürün parametreleri actuary Excel'de hesaplanıyor.",
    "Ziyaretçi broşür haritası statik basılı.",
    "Kalite ölçümü kağıt form; SPC gece shift'te giriliyor.",
    "Phishing simülasyonu yılda bir IT tarafından.",
    "Wellness anket yılda bir İK tarafından.",
  ];
  const pains = [
    "Ortalama ilk yanıt 6,2 saat; 3,1 kanal kaydı/müşteri.",
    "Limit aşımı ortalama 18 saat geç tespit.",
    "30 gün readmission %14,2.",
    "Eşleşme memnuniyeti %52.",
    "340 ton kayıt uyuşmazlığı 2024'te.",
    "Pick başına ortalama 1,8 km yürüme.",
    "Sepet terk kurtarma oranı %8.",
    "Ortalama bekleme 47 dakika.",
    "Yetkinlik verisi 14 ay ortalama gecikmeli.",
    "Trafo aşırı yük 2 saat geç alarm.",
    "Hasar dosyası açılış SLA %62 uyum.",
    "Overbooking 3 rezervasyon/ay ortalama.",
    "OEE kaybının %40'ı 'diğer' kodunda.",
    "VPN compromise surface geniş.",
    "Aylık bütçe aşımı kullanıcıların %34'ünde.",
    "Sözleşme versiyon uyuşmazlığı ayda 12 vaka.",
    "Konsolidasyon hatası çeyrekte 2,3M TL sapma.",
    "Lab sonucu dağıtım gecikmesi ortalama 45 dk.",
    "Soru tekrar oranı sınavlarda %12.",
    "Don kaybı sezon başına ortalama 180K TL.",
    "Plansız arıza maliyeti araç/yıl 28K TL.",
    "İade çözüm süresi ortalama 9 gün.",
    "Vatandaş bütçe sorgusu ayda 400+ telefon.",
    "Yanlış izin bakiyesi 340 çalışan/ay.",
    "PR sapması 5 gün geç fark.",
    "Ürün launch 6 hafta actuary döngüsü.",
    "Ziyaretçi kaybolma şikayeti günde 15.",
    "Limit dışı trend 8 saat geç alarm.",
    "Phishing click rate %18.",
    "Burnout bildirimi gecikmesi ortalama 3 ay.",
  ];
  const personas = [
    "Destek operasyon müdürü", "Kredi risk yöneticisi", "Taburcu koordinatör hemşiresi",
    "Kariyer merkezi koordinatörü", "Kooperatif muhasebe sorumlusu", "Depo operasyon müdürü",
    "E-ticaret büyüme yöneticisi", "Belediye dijital hizmetler şefi", "Yetkinlik yönetimi uzmanı",
    "Şebeke operasyon mühendisi", "Hasar operasyon müdürü", "Revenue manager",
    "Hat şefi", "Güvenlik mimarı", "Ürün yöneticisi (mobil)",
    "Hukuk operasyon uzmanı", "Hazine müdürü", "Laboratuvar bilgi sistemleri uzmanı",
    "Ölçme değerlendirme koordinatörü", "Ziraat mühendisi", "Filo yöneticisi",
    "İade operasyon lideri", "Şeffaflık ofisi uzmanı", "Global mobility uzmanı",
    "GES portföy analisti", "Aktüerya ürün uzmanı", "Müze deneyim tasarımcısı",
    "Kalite mühendisi", "Güvenlik farkındalık lideri", "İK wellbeing program sorumlusu",
  ];
  const frTemplates = [
    (idx, d, p) => `FR-${idx}-01: ${d} tenant'ları arasında veri izolasyonu ve ticket birleştirme. FR-${idx}-02: SLA eskalasyon kural motoru (P1 30dk, P2 4sa). FR-${idx}-03: Harici destek aracı webhook ingest. FR-${idx}-04: Müşteri read-only portal.`,
    (idx, d) => `FR-${idx}-01: Core banking limit hareketlerini 30 sn içinde yansıtma. FR-${idx}-02: %85/%90/%95 eşik alarmları. FR-${idx}-03: 4-göz limit artırım onayı. FR-${idx}-04: BDDK formatında günlük rapor.`,
    (idx) => `FR-${idx}-01: HIS ADT taburcu mesajından 15 dk içinde dijital plan. FR-${idx}-02: İlaç doz push hatırlatma. FR-${idx}-03: 48 saat sessiz hasta eskalasyonu. FR-${idx}-04: e-Nabız özet gönderimi.`,
    (idx) => `FR-${idx}-01: Min 5 yetkinlik etiketli öğrenci profili. FR-${idx}-02: Skor >=0,72 otomatik eşleştirme önerisi. FR-${idx}-03: Mentor max 3 mentee limiti. FR-${idx}-04: 4 hafta memnuniyet anketi.`,
    (idx) => `FR-${idx}-01: Kantar RS232 otomatik kayıt 2 sn. FR-${idx}-02: Offline 500 tartım buffer+sync. FR-${idx}-03: Üye günlük alım SMS özeti. FR-${idx}-04: e-Fatura muhasebe onay kapısı.`,
    (idx) => `FR-${idx}-01: Slotting önerisi pick listesine entegre. FR-${idx}-02: Pick-path mesafe optimizasyonu. FR-${idx}-03: Lot/FEFO doğrulama scan. FR-${idx}-04: Shift bazlı verimlilik dashboard.`,
    (idx) => `FR-${idx}-01: Sepet terk 30 dk içinde kişiselleştirilmiş kupon. FR-${idx}-02: Stok rezervasyon 15 dk hold. FR-${idx}-03: Terk nedeni A/B test etiketi. FR-${idx}-04: CRM segment senkron.`,
    (idx) => `FR-${idx}-01: e-Devlet kimlik ile giriş. FR-${idx}-02: Başvuru durumu SMS/push. FR-${idx}-03: Eksik evrak upload. FR-${idx}-04: Birim yönlendirme workflow.`,
    (idx) => `FR-${idx}-01: Yetkinlik matrisi import/export. FR-${idx}-02: Skill gap analizi. FR-${idx}-03: Eğitim katalog eşleştirme. FR-${idx}-04: Yönetici onaylı gelişim planı.`,
    (idx) => `FR-${idx}-01: Trafo yük %85 alarm. FR-${idx}-02: Demand response tetik. FR-${idx}-03: SCADA telemetri ingest. FR-${idx}-04: Kesinti work order otomasyonu.`,
    (idx) => `FR-${idx}-01: FNOL dijital form+foto. FR-${idx}-02: Ekspertiz randevu atama. FR-${idx}-03: Hasar dosya durum portalı. FR-${idx}-04: Fraud skor entegrasyonu.`,
    (idx) => `FR-${idx}-01: OTA fiyat push 5 dk SLA. FR-${idx}-02: Overbooking erken uyarı. FR-${idx}-03: Grup rezervasyon tek form. FR-${idx}-04: Channel manager audit log.`,
    (idx) => `FR-${idx}-01: Standart duruş kodu zorunluluğu. FR-${idx}-02: OEE real-time dashboard. FR-${idx}-03: Andon bildirim entegrasyonu. FR-${idx}-04: MTTR trend raporu.`,
    (idx) => `FR-${idx}-01: Device posture kontrolü. FR-${idx}-02: MFA zorunlu admin. FR-${idx}-03: JIT erişim onay. FR-${idx}-04: Erişim audit export.`,
    (idx) => `FR-${idx}-01: Harcama kategorize OCR. FR-${idx}-02: Bütçe hedef push uyarı. FR-${idx}-03: Biometrik giriş. FR-${idx}-04: Aylık özet PDF.`,
    (idx) => `FR-${idx}-01: Sözleşme versiyon diff. FR-${idx}-02: e-İmza entegrasyon. FR-${idx}-03: Onay workflow. FR-${idx}-04: Arşiv WORM saklama.`,
    (idx) => `FR-${idx}-01: Banka hareketi otomatik eşleştirme. FR-${idx}-02: Grup konsolidasyon dashboard. FR-${idx}-03: FX kur otomatik çekim. FR-${idx}-04: Likidite alarm.`,
    (idx) => `FR-${idx}-01: HL7 ORU^R01 ingest. FR-${idx}-02: FHIR Patient eşleştirme. FR-${idx}-03: Kritik sonuç anlık alert. FR-${idx}-04: Lab cihaz ACK/NACK.`,
    (idx) => `FR-${idx}-01: Soru bankası tag zorunluluğu. FR-${idx}-02: Adaptif zorluk seçimi. FR-${idx}-03: Sınav proctoring webhook. FR-${idx}-04: Sızıntı dedup kontrolü.`,
    (idx) => `FR-${idx}-01: Hava API erken uyarı push. FR-${idx}-02: Parsel bazlı risk haritası. FR-${idx}-03: Kooperatif SMS broadcast. FR-${idx}-04: Hasat kayıt entegrasyonu.`,
    (idx) => `FR-${idx}-01: Bakım km/saat tetik. FR-${idx}-02: Muayene 30 gün önce alarm. FR-${idx}-03: Work order atama. FR-${idx}-04: Yakıt anomali tespiti.`,
    (idx) => `FR-${idx}-01: İade foto kanıt zorunluluğu. FR-${idx}-02: Otomatik iade etiketi. FR-${idx}-03: Kısmi iade split. FR-${idx}-04: Satıcı SLA dashboard.`,
    (idx) => `FR-${idx}-01: Bütçe kalemi arama/filter. FR-${idx}-02: Harcama vs plan grafik. FR-${idx}-03: API açık veri export. FR-${idx}-04: Erişilebilir WCAG rapor.`,
    (idx) => `FR-${idx}-01: Ülke bazlı tatil takvimi. FR-${idx}-02: İzin bakiye gerçek zamanlı. FR-${idx}-03: Yönetici mobil onay. FR-${idx}-04: Payroll export format.`,
    (idx) => `FR-${idx}-01: Inverter telemetri 5 dk. FR-${idx}-02: PR sapma alarm. FR-${idx}-03: Work order otomasyon. FR-${idx}-04: String-level analiz.`,
    (idx) => `FR-${idx}-01: Tarife parametre UI. FR-${idx}-02: Prim hesaplama sandbox. FR-${idx}-03: Poliçe PDF otomasyon. FR-${idx}-04: Onay workflow actuary.`,
    (idx) => `FR-${idx}-01: AR rota önerisi. FR-${idx}-02: Kalabalık yoğunluk heatmap. FR-${idx}-03: Çok dilli içerik. FR-${idx}-04: Offline harita cache.`,
    (idx) => `FR-${idx}-01: X-bar R otomatik hesap. FR-${idx}-02: Limit dışı NCR tetik. FR-${idx}-03: Cpk trend dashboard. FR-${idx}-04: Operatör override audit.`,
    (idx) => `FR-${idx}-01: Phishing sim kampanya. FR-${idx}-02: Tıklayan otomatik eğitim. FR-${idx}-03: Raporlama dashboard. FR-${idx}-04: Whitelist domain kontrolü.`,
    (idx) => `FR-${idx}-01: Mola hatırlatma push. FR-${idx}-02: Stres anketi tetik. FR-${idx}-03: Yönetici aggregate dashboard. FR-${idx}-04: Gizlilik anonimleştirme.`,
  ];
  const idx = 121 + i;
  return {
    domain: d,
    product: products[i],
    orgType: pick(ORG_TYPES, i),
    persona: personas[i],
    secondaryUsers: `İlgili ${d} operasyon ekipleri ve dış paydaşlar`,
    problem: problems[i],
    currentProcess: processes[i],
    painPoint: pains[i],
    businessGoal: `${products[i]} ile ${problems[i].split(";")[0].toLowerCase()} sorununu çözmek ve operasyonel KPI'ları iyileştirmek.`,
    techEnv: pick([
      "AWS EKS + PostgreSQL", "On-prem Oracle + Kafka", "Azure AKS + FHIR gateway",
      "LDAP + Python servis", "Edge PWA + PostgreSQL", "Java WMS + Redis",
      "Next.js + headless CMS", "e-Devlet API + .NET", "SAP SuccessFactors entegrasyon",
      "SCADA + TimescaleDB", ".NET core + blob storage", "Node.js channel manager",
      "OPC-UA + MES", "Okta + service mesh", "React Native + Firebase",
    ], i),
    integrationNeed: pick([
      "Zendesk webhook, Slack Events", "Core banking limit API", "HIS HL7 ADT, e-Nabız",
      "ÖBS LDAP, LMS LTI", "Kantar RS232, e-Fatura", "WMS REST, ERP",
      "Payment PSP, CRM", "e-Devlet, SMS gateway", "HRIS SCIM",
      "SCADA Modbus, GIS", "FNOL portal, fraud API", "OTA channel APIs",
      "PLC OPC-UA, Andon", "SIEM, IdP SAML", "Bank Open Banking API",
    ], i),
    securityNeed: pick([
      "Tenant RLS, PII maskeleme", "4-göz onay, immutable audit", "KVKK açık rıza, encryption at-rest",
      "Öğrenci PII KVKK", "Tartım kaydı değiştirilemez log", "Lot traceability audit",
      "PCI-DSS scope minimizasyon", "e-İmza, WORM arşiv", "RBAC, GDPR export",
      "OT network segmentation", "Hasar foto PII redaksiyon", "Misafir verisi KVKK",
      "Operator override audit", "Zero-trust MFA", "Biometric + device attestation",
    ], i),
    constraint: pick([
      "6 ay Jira workflow korunacak", "Core API günde 4 release penceresi", "App Store onay 4 hafta",
      "Dönem başı 2 hafta yoğun kayıt", "Hasat sezonu internet kesintisi", "Blackout peak sezon deploy yok",
      "PSP sözleşme yenileme Q3", "Belediye seçim dönemi dondurma", "Global rollout fazlı",
      "OT bakım penceresi ayda 1", "Regülasyon rapor deadline 9 ay", "Peak sezon overbooking toleransı sıfır",
      "Hat duruşu max 15 dk", "SOC2 audit 6 ay", "Store policy review gerekli",
    ], i),
    mvpScope: pick([
      "Ticket birleştirme, SLA, audit", "Limit dashboard, alarm, onay", "Taburcu plan, push, hemşire kuyruk",
      "Profil, eşleştirme, mesaj", "Kantar kayıt, mutabakat, e-Fatura", "Slotting, pick-path, lot scan",
      "Sepet kurtarma, kupon, hold", "e-Devlet giriş, başvuru takip", "Yetkinlik matris, gap analiz",
      "Trafo alarm, demand response", "FNOL, ekspertiz, portal", "OTA sync, overbooking uyarı",
      "Duruş kodu, OEE dashboard", "Device posture, JIT erişim", "Harcama OCR, bütçe uyarı",
    ], i),
    outOfScope: pick([
      "AI otomatik yanıt, CTI", "ML skorlama, otomatik limit", "Tele-tıp, wearables",
      "Video görüşme, sertifika", "TMO fiyat tahmin", "AMR robot entegrasyonu",
      "Marketplace 3P", "Blockchain şeffaflık", "OKR modülü",
      "Microgrid optimizasyon", "Blockchain poliçe", "Metaverse tur",
      "Digital twin fabrika", "SOAR otomasyon", "Crypto cüzdan",
    ], i),
    functionalReqs: frTemplates[i](idx, d, products[i]),
    risks: pick([
      "API rate limit; tenant sızıntısı; webhook gecikmesi.",
      "Core gecikme; yanlış eşik; regülasyon uyumsuzluğu.",
      "HIS gecikme; düşük adoption; e-Nabız kesinti.",
      "Algoritma bias; LDAP gecikme; mentor yetersizliği.",
      "Kalibrasyon hatası; offline sync; e-Fatura değişikliği.",
      "WMS API limit; slotting yanlış öneri; eğitim eksikliği.",
      "PSP outage; kupon kötüye kullanım; CRM gecikme.",
      "e-Devlet kesinti; evrak format uyumsuzluğu; birim direnci.",
      "Veri kalitesi düşük; HRIS sync; yönetici direnci.",
      "SCADA kesinti; false positive alarm; OT güvenlik.",
      "Fraud false negative; ekspertiz kapasitesi; foto kalitesi.",
      "OTA API değişikliği; senkron gecikme; fiyat hatası.",
      "Operatör direnci; PLC gecikme; yanlış kod seçimi.",
      "Legacy VPN kalıntısı; MFA bypass; cihaz uyumsuzluğu.",
      "Banka API değişikliği; OCR hata; kullanıcı gizlilik endişesi.",
    ], i),
    successUsers: pick([
      "85 destek temsilcisi", "62 kredi uzmanı", "420 taburcu/ay", "800 mentor-mentee çifti",
      "1.200 kooperatif üyesi", "45 depo operatörü", "12.000 aktif sepet/ay", "3.500 başvuru/ay",
      "2.400 çalışan", "18 trafo operatörü", "220 hasar dosyası/ay", "12 otel resepsiyon",
      "6 hat şefi", "340 uzaktan çalışan", "85.000 MAU",
    ], i),
    successMetric: pick([
      "P1 çözüm 4 saatten 2,5 saate", "Limit tespit 12 dakikaya", "Readmission %10 altı",
      "Memnuniyet >= %75", "Mutabakat 4 saate", "Pick mesafe %22 azalma",
      "Sepet kurtarma %18", "Bekleme 15 dakikaya", "Skill gap kapanma %40",
      "Kesinti öncesi müdahale %90", "Hasar SLA %88", "Overbooking sıfır",
      "OEE +4 puan", "VPN kaldırma %100", "Bütçe aşım %15 azalma",
    ], i),
  };
}

function ppBase(i) {
  const d = pick(DOMAINS, i);
  const titles = [
    "CRM migrasyonu", "Basel III raporlama", "HIS FHIR entegrasyonu", "LMS 15 kampüs rollout",
    "Kooperatif ERP hasat öncesi", "WMS değişimi paralel run", "Headless storefront Black Friday",
    "e-Devlet hizmet katalog", "HRIS post-merger birleşim", "SCADA bulut telemetri",
    "Hasar core replatform", "Rezervasyon motoru peak sezon", "MES 3 hat pilot",
    "SOC2 Type II kapanış", "Super app cüzdan modülü", "Billing v2 usage-based",
    "Open Banking API gateway", "Lab cihaz HL7 modernizasyon", "Proctoring modül entegrasyon",
    "IoT sensör 5000 deploy", "Cross-dock hub optimizasyon", "Marketplace 3P onboarding",
    "Afet iletişim SMS/push", "OKR global rollout", "Demand response sanayi",
    "Dijital poliçe mobil", "RevPAR dinamik fiyatlama", "Predictive maintenance pilot",
    "IAM 5 legacy konsolidasyon", "Offline-first saha satış",
  ];
  const scopes = [
    "Salesforce'tan in-house CRM, 500 kullanıcı", "Yeni regülasyon modülü, 9 ay deadline",
    "Epikrisis modülü HL7 FHIR", "40.000 öğrenci, 15 kampüs", "Hasat sezonu öncesi canlı",
    "Eski WMS ile 4 hafta paralel", "Black Friday 3× trafik hedefi", "Yeni hizmet katalog API",
    "İki şirket birleşmesi HRIS", "Legacy SCADA → bulut", "Anaframe → microservice",
    "Peak sezon öncesi lansman", "3 hat pilot sonra 12 hat", "Kontrol kapanışı 6 ay",
    "Cüzdan mevcut uygulamaya", "Kullanım bazlı faturalandırma", "PSD2 uyum API",
    "15 lab cihazı bağlantısı", "Online sınav güvenliği", "5000 sensör tarla deploy",
    "Yeni hub cross-dock", "3000 yeni satıcı onboarding", "Acil durum bildirim sistemi",
    "OKR 8 ülkede", "Sanayi yük kaydırma programı", "Mobil poliçe teslim",
    "RevPAR motoru 12 otel", "Titreşim sensörü 20 makine", "5 IAM → tek platform",
    "200 saha satış offline sync",
  ];
  const phaseStyles = [
    (t, s, i) => `Keşif (${3 + (i % 2)} hf): ${s} kapsam kilidi, RACI, veri haritası.\nMimari (${4 + (i % 3)} hf): ${t} hedef mimari ADR, güvenlik review.\nMigrasyon (${7 + (i % 4)} hf): Veri ETL, paralel run, regresyon.\nUAT (${2 + (i % 3)} hf): Pilot kullanıcı, performans testi.\nGo-live (${1 + (i % 2)} hf): Kademeli cutover, hypercare. Ref: PP-${121 + i}.`,
    (t, s, i) => `Regülasyon analiz (${4 + (i % 2)} hf): ${s} gap analizi.\nTasarım (${5 + (i % 3)} hf): Rapor veri modeli.\nGeliştirme (${10 + (i % 5)} hf): ${t} modül sprintleri.\nDoğrulama (${3 + (i % 2)} hf): Denetim dry-run.\nCanlı (${2 + (i % 2)} hf): Resmi raporlama. Ref: PP-${121 + i}.`,
    (t, s, i) => `FHIR mapping (${3 + (i % 2)} hf): ${s} resource haritası.\nEntegrasyon (${5 + (i % 4)} hf): HL7 v2 → FHIR adapter.\nKlinik UAT (${3 + (i % 3)} hf): ${t} pilot.\nGüvenlik (${2 + (i % 2)} hf): KVKK DPIA.\nProd (${2 + (i % 2)} hf): Kademeli servis. Ref: PP-${121 + i}.`,
    (t, s, i) => `Kampüs keşif (${2 + (i % 2)} hf×N): ${s} yerel ihtiyaç.\nPlatform (${5 + (i % 3)} hf): LMS core deploy.\nİçerik migrasyon (${6 + (i % 5)} hf): ${t} aktarım.\nEğitim (${2 + (i % 3)} hf): Workshop.\nGo-live (${2 + (i % 2)} hf): Dönem başı. Ref: PP-${121 + i}.`,
    (t, s, i) => `Hasat öncesi (${1 + (i % 2)} hf): ${s} snapshot.\nERP config (${3 + (i % 3)} hf): ${t} parametre.\nEğitim (${2 + (i % 2)} hf): Personel.\nPilot (${2 + (i % 2)} hf): 3 kantar canlı.\nSezon (${8 + (i % 5)} hf): Hypercare. Ref: PP-${121 + i}.`,
    (t, s, i) => `Paralel run (${2 + (i % 2)} hf): ${s} dual-write.\nWMS config (${4 + (i % 3)} hf): ${t} kuralları.\nOperasyon eğitim (${2 + (i % 3)} hf): Shift eğitimi.\nCutover (${1 + (i % 2)} hf): Gece geçiş.\nStabilizasyon (${3 + (i % 4)} hf): Verimlilik izleme. Ref: PP-${121 + i}.`,
    (t, s, i) => `Trafik modelleme (${2 + (i % 2)} hf): ${s} load test.\nHeadless FE (${5 + (i % 4)} hf): ${t} storefront.\nCDN/cache (${2 + (i % 3)} hf): Edge optimizasyon.\nLoad test (${2 + (i % 2)} hf): k6 trafik.\nBlack Friday (${1 + (i % 2)} hf): War room. Ref: PP-${121 + i}.`,
    (t, s, i) => `API tasarım (${3 + (i % 2)} hf): ${s} OpenAPI.\nEntegrasyon (${4 + (i % 4)} hf): e-Devlet test.\nGüvenlik (${2 + (i % 2)} hf): Pen test.\nPilot ilçe (${3 + (i % 3)} hf): ${t} hizmet.\nGenelleme (${3 + (i % 4)} hf): Rollout. Ref: PP-${121 + i}.`,
    (t, s, i) => `Veri harmonizasyon (${5 + (i % 3)} hf): ${s} mapping.\nOrganizasyon (${3 + (i % 3)} hf): ${t} org chart.\nPayroll test (${3 + (i % 4)} hf): Paralel bordro.\nCutover (${2 + (i % 2)} hf): Pay date geçiş.\nStabilizasyon (${5 + (i % 4)} hf): Destek hattı. Ref: PP-${121 + i}.`,
    (t, s, i) => `OT assessment (${3 + (i % 3)} hf): ${s} segmentasyon.\nTelemetri gateway (${5 + (i % 4)} hf): ${t} adapter.\nBulut ingest (${4 + (i % 3)} hf): Pipeline.\nPilot (${2 + (i % 3)} hf): 10 trafo canlı.\nRollout (${6 + (i % 5)} hf): Fazlı genişleme. Ref: PP-${121 + i}.`,
    (t, s, i) => `Vendor seçim (${2 + (i % 2)} hf): ${s} RFP.\nKonfigürasyon (${4 + (i % 3)} hf): ${t} setup.\nEntegrasyon test (${3 + (i % 4)} hf): API doğrulama.\nKabul (${2 + (i % 2)} hf): İş birimi UAT.\nGo-live (${2 + (i % 2)} hf): Kademeli. Ref: PP-${121 + i}.`,
    (t, s, i) => `Veri temizleme (${3 + (i % 3)} hf): ${s} kalite.\nModel eğitim (${4 + (i % 4)} hf): ${t} ML pipeline.\nShadow mode (${3 + (i % 2)} hf): Paralel karşılaştırma.\nCutover (${2 + (i % 2)} hf): Model swap.\nİzleme (${3 + (i % 3)} hf): Drift alarm. Ref: PP-${121 + i}.`,
  ];
  const title = titles[i];
  const scope = scopes[i];
  const phaseFn = phaseStyles[i % phaseStyles.length];
  return {
    domain: d,
    title,
    scopeHint: scope,
    orgType: pick(ORG_TYPES, i),
    phases: phaseFn(title, scope, i),
    deliverables: `${title} (PP-${121 + i}): gereksinim paketi, ${pick(["mimari ADR", "entegrasyon spec", "test planı", "güvenlik değerlendirme", "veri sözlüğü"], i)}, operasyon runbook, eğitim materyali, kabul tutanağı.`,
    dependencies: `${scope}; ${d} onay süreçleri; ${pick(["vendor API SLA", "regülasyon izni", "altyapı provisioning", "veri migrasyon penceresi", "kullanıcı eğitim takvimi"], i + 1)}; kritik yol: ${title}.`,
    stakeholders: `Program: PM-${121 + i}. Teknik: TL-${d.slice(0, 3).toUpperCase()}-${i}. İş: Sponsor-${title.slice(0, 10).replace(/\s/g, "")}. Kalite: QA-${i}. Ops: SRE-${121 + i}.`,
    timeline: `${14 + (i % 8) + (i % 3)} hf toplam; kritik yol ${title}. Buffer %${10 + (i % 6)}. Blackout: ${pick(["peak sezon", "hasat dönemi", "regülasyon deadline", " seçim dönemi", "yılsonu freeze"], i)}.`,
    exitCriteria: `PP-${121 + i} kabul: ${scope} KPI yeşil; SEV1=0; ${pick(["güvenlik gate PASS", "pen test temiz", "DR tatbikatı OK", "rollback test OK", "denetim dry-run PASS"], i)}; paydaş imzalı kabul.`,
  };
}

function reqBase(i) {
  const d = pick(DOMAINS, i);
  const titles = [
    "Çoklu workspace", "Limit alarm", "Randevu iptali", "Devamsızlık bildirimi", "Hasat kaydı",
    "POD fotoğraf", "Stok rezervasyon", "Şikayet SLA", "İzin onayı", "Alarm eşiği",
    "Hasar foto", "İptal politikası", "Andon", "MFA zorunlu", "Biometrik giriş",
    "Webhook retry", "Mutabakat", "Reçete yenileme", "Ödev teslim", "Gübre planı",
    "Soğuk zincir", "Bölünmüş sevkiyat", "Randevu slot", "Masraf formu", "Fatura doğrulama",
    "Poliçe yenileme", "Grup rezervasyon", "Lot traceability", "Secret rotation", "Push tercih",
  ];
  const needs = [
    "Kullanıcılar workspace değiştirmek istiyor", "Kredi limit %90 uyarı", "24 saat kuralı bekleme listesi",
    "Veli push bildirimi anında", "Tarla bazlı verim girişi", "Teslim kanıtı foto zorunlu",
    "Checkout'ta 15 dk stok hold", "72 saat ilk yanıt SLA", "Yönetici mobil izin onayı",
    "Trafo yük %85 uyarı", "Minimum 3 açı hasar foto", "Esnek iptal paketi seçimi",
    "Hat duruşu anında bildirim", "Admin roller MFA zorunlu", "FaceID/TouchID giriş",
    "Webhook exponential backoff", "Günlük banka mutabakat", "E-reçete entegrasyon",
    "Geç teslim ceza kuralı", "Toprak analizine göre gübre", "Sıcaklık ihlal alarmı",
    "Kısmi gönderim müşteri bildirimi", "Vatandaş online randevu slot", "Fiş OCR masraf doldurma",
    "Sayaç okuma vs fatura karşılaştırma", "Otomatik yenileme hatırlatma", "10+ kişi grup indirimi",
    "Geriye dönük lot izlenebilirlik", "90 günde secret rotation", "Bildirim kategori tercihi",
  ];
  const idx = 121 + i;
  const t = titles[i];
  return {
    domain: d,
    title: t,
    businessNeed: needs[i],
    functional: `REQ-${idx}: ${t} — ${needs[i]}\n${pick([
      `Sistem, ${needs[i].toLowerCase()} durumunda ilgili kullanıcıya 60 sn içinde bildirim göndermelidir.`,
      `Kullanıcı, ${t.toLowerCase()} akışını mobil uygulamadan 3 adımda tamamlayabilmelidir.`,
      `${t} işlemi tamamlandığında audit log'a kullanıcı, zaman damgası ve tenant ID yazılmalıdır.`,
      `Geçersiz ${d} girdisi reddedilmeli; alan bazlı Türkçe hata mesajı gösterilmelidir.`,
      `${t} modülü mevcut ${d} SSO ile kimlik doğrulaması kullanmalıdır.`,
    ], i + 1)}\n${pick([
      `Onay bekleyen ${t.toLowerCase()} kayıtları yönetici kuyruğunda listelenmelidir.`,
      `${t} raporu CSV ve PDF formatında export edilebilmelidir.`,
      `Sistem, ${t.toLowerCase()} SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.`,
    ], i + 2)}`,
    nonFunctional: pick([
      `NFR-${idx}-A: p95 API yanıt < 380 ms. NFR-${idx}-B: availability >= %99.93. NFR-${idx}-C: RPO 8 dk, RTO 45 dk. NFR-${idx}-D: 220 eşzamanlı oturum.`,
      `NFR-${idx}-A: p95 < 620 ms. NFR-${idx}-B: %99.87 uptime. NFR-${idx}-C: KVKK veri minimizasyonu. NFR-${idx}-D: Audit 36 ay saklama.`,
      `NFR-${idx}-A: p95 < 290 ms kritik uç. NFR-${idx}-B: %99.98 availability. NFR-${idx}-C: WCAG 2.1 AA. NFR-${idx}-D: 1200 req/s peak.`,
      `NFR-${idx}-A: p95 < 510 ms. NFR-${idx}-B: %99.91 uptime. NFR-${idx}-C: TLS 1.3 zorunlu. NFR-${idx}-D: 450 concurrent user.`,
      `NFR-${idx}-A: p95 < 740 ms batch. NFR-${idx}-B: %99.5 uptime. NFR-${idx}-C: Offline 72 saat buffer. NFR-${idx}-D: Sync conflict UI.`,
    ], i),
    assumptions: `${d} API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk ${t} kapsamını onayladı.`,
    constraints: `${needs[i]} dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; ${d} regülasyon sınırları geçerli.`,
    openQuestions: `${t} veri saklama süresi? ${d} tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-${idx})?`,
  };
}

function techBase(i) {
  const d = pick(DOMAINS, i);
  const components = [
    "Event outbox", "Idempotency API", "FHIR Patient servisi", "LTI 1.3 tool provider", "MQTT telemetri gateway",
    "TMS routing engine", "Elasticsearch arama", "e-İmza API adapter", "SCIM provizyon", "Modbus sayaç okuyucu",
    "Tarife hesaplama motoru", "Channel manager sync", "OPC-UA PLC köprüsü", "SIEM log forwarder", "Deep link router",
    "Tenant rate limiter", "Ledger çift kayıt", "Consent yönetim API", "Proctor webhook ingest", "GeoJSON parsel servisi",
    "POD foto object store", "Cart merge API", "WORM arşiv servisi", "Payroll export generator", "Time-series yük sorgu",
    "FNOL bildirim API", "Müsaitlik sorgu servisi", "SPC X-bar hesaplayıcı", "OAuth introspection", "Device attestation",
  ];
  const focuses = [
    "Transactional outbox pattern", "Ödeme tekrar koruması", "Patient resource CRUD",
    "LMS tool entegrasyonu", "Sensör telemetri ingest", "Rota optimizasyon", "Ürün full-text arama",
    "Nitelikli imza entegrasyonu", "Kullanıcı lifecycle sync", "Sayaç okuma servisi",
    "Prim hesaplama API", "OTA fiyat push", "PLC veri köprüsü", "Log forwarder pipeline",
    "Universal link routing", "Tenant bazlı kota", "Çift kayıt muhasebe", "Açık rıza yönetimi",
    "Sınav olay akışı", "Parsel sınır servisi", "Teslim foto depolama", "Sepet birleştirme",
    "WORM arşiv", "Bordro dosya üretici", "Yük geçmişi sorgu", "İlk hasar bildirimi",
    "Oda müsaitlik sorgu", "X-bar R hesaplama", "Token introspection", "Device integrity check",
  ];
  const archs = [
    (c, f, i) => `Olay güdümlü mimari (ref T-${121 + i}): ${c} → Kafka topic → tüketici servisler. Outbox tablosu PostgreSQL'de; Debezium CDC ile publish. ${f} akışı at-least-once garanti.`,
    (c, f, i) => `REST mikroservis (T-${121 + i}): API Gateway → ${c} (Node.js) → PostgreSQL. ${f} için idempotency-key header zorunlu; Redis dedup cache ${12 + (i % 12)} saat TTL.`,
    (c, f, i) => `GraphQL federasyon (T-${121 + i}): Apollo Router → ${c} subgraph. ${f} FHIR R4 uyumlu; subscription ile canlı güncelleme.`,
    (c, f, i) => `Webhook callback (T-${121 + i}): LMS → ${c} endpoint. ${f} HMAC-SHA256 imza; ${3 + (i % 3)} deneme exponential backoff; DLQ SQS.`,
    (c, f, i) => `Batch ETL (T-${121 + i}): Airflow DAG gece ${String(1 + (i % 4)).padStart(2, "0")}:00 → ${c} transform → data lake. ${f} incremental watermark.`,
    (c, f, i) => `Message queue (T-${121 + i}): RabbitMQ → ${c} worker pool. ${f} prefetch=${5 + (i % 10)}; poison message DLX; retry max ${3 + (i % 2)}.`,
    (c, f, i) => `Stream processing (T-${121 + i}): Kafka → Flink job → ${c} aggregate. ${f} ${3 + (i % 4)} dk tumbling window; late event side output.`,
    (c, f, i) => `Serverless (T-${121 + i}): API Gateway → Lambda (${c}) → DynamoDB. ${f} cold start <${600 + (i % 4) * 50}ms; provisioned concurrency peak saatlerde.`,
    (c, f, i) => `Mobile offline sync (T-${121 + i}): Couchbase Lite ↔ ${c} sync gateway. ${f} conflict resolution last-write-wins + manual merge UI.`,
    (c, f, i) => `Edge processing (T-${121 + i}): Cloudflare Worker → ${c} edge cache. ${f} coğrafi routing; origin shield; stale-while-revalidate ${30 + (i % 30)}s.`,
    (c, f, i) => `gRPC servis mesh (T-${121 + i}): Istio → ${c} pod. ${f} mTLS zorunlu; circuit breaker %${40 + (i % 20)} error threshold.`,
    (c, f, i) => `CQRS + event sourcing (T-${121 + i}): Command → ${c} aggregate → event store. ${f} projection rebuild; snapshot every ${100 + (i % 50)} events.`,
    (c, f, i) => `SOAP legacy adapter (T-${121 + i}): ESB → ${c} wrapper → REST facade. ${f} XSD validation; WS-Security token.`,
    (c, f, i) => `WebSocket canlı akış (T-${121 + i}): Client WS → ${c} hub → Redis pub/sub. ${f} heartbeat ${15 + (i % 15)}s; reconnect backoff.`,
    (c, f, i) => `Scheduled cron pipeline (T-${121 + i}): Cron ${i % 24}/${(i % 50) + 10} → ${c} job. ${f} idempotent run key; overlap guard.`,
    (c, f, i) => `Multi-region active-active (T-${121 + i}): ${c} → global load balancer → regional ${d} cluster. ${f} conflict-free replicated data type.`,
    (c, f, i) => `Saga orchestration (T-${121 + i}): ${c} coordinator → compensating transactions. ${f} choreographed rollback; timeout ${20 + (i % 10)}s per step.`,
    (c, f, i) => `Blue-green deploy (T-${121 + i}): ${c} v1/v2 parallel; ${f} traffic switch via service mesh weight.`,
    (c, f, i) => `Sidecar proxy (T-${121 + i}): Envoy → ${c} container. ${f} mTLS, rate limit, observability sidecar.`,
    (c, f, i) => `Data mesh domain (T-${121 + i}): ${c} data product owner → ${d} domain API. ${f} self-serve analytics contract.`,
    (c, f, i) => `Hybrid cloud bridge (T-${121 + i}): On-prem ${c} ↔ cloud ${d} VPC peering. ${f} encrypted tunnel; latency budget ${80 + (i % 40)}ms.`,
    (c, f, i) => `Plugin/extension (T-${121 + i}): Core platform → ${c} plugin sandbox. ${f} WASM isolation; capability token.`,
    (c, f, i) => `BFF pattern (T-${121 + i}): Mobile/web BFF → ${c} aggregation. ${f} response shaping per client; cache ${5 + (i % 10)} min.`,
    (c, f, i) => `Pub/sub fan-out (T-${121 + i}): ${c} publisher → SNS topic → ${3 + (i % 5)} subscriber. ${f} filter policy per tenant.`,
    (c, f, i) => `Change data capture (T-${121 + i}): DB binlog → ${c} CDC connector → search index. ${f} eventual consistency ${2 + (i % 8)}s SLA.`,
    (c, f, i) => `API composition (T-${121 + i}): ${c} orchestrator calls ${3 + (i % 4)} downstream APIs. ${f} parallel fetch; partial degrade.`,
    (c, f, i) => `File drop integration (T-${121 + i}): SFTP → ${c} ingest → validation → ${d} DB. ${f} virus scan; schema validation.`,
    (c, f, i) => `In-memory grid (T-${121 + i}): Hazelcast ${c} cache grid. ${f} near-cache; partition backup ${1 + (i % 2)}.`,
    (c, f, i) => `Thick client sync (T-${121 + i}): Desktop ${c} agent ↔ cloud sync. ${f} delta sync; bandwidth throttle ${100 + (i % 200)}KB/s.`,
    (c, f, i) => `Zero-trust microsegment (T-${121 + i}): ${c} pod in isolated ${d} namespace. ${f} network policy deny-all default; explicit allow list.`,
  ];
  const c = components[i];
  const f = focuses[i];
  const archFn = archs[i];
  return {
    domain: d,
    component: c,
    focus: f,
    purpose: pick([
      `${c} (T-${121 + i}) ${d} ortamında ${f} sağlar; SLA, sınır ve sahiplik bu dokümanda.`,
      `T-${121 + i} kapsamında ${c}: ${f} — ${d} domain operasyonel gereksinimleri.`,
      `${d} için ${c} servisi (ref T-${121 + i}): ${f} davranış tanımı ve entegrasyon sözleşmesi.`,
      `Bileşen ${c} [T-${121 + i}]: ${f} ihtiyacına yönelik ${d} teknik spesifikasyon.`,
      `${c} modülü T-${121 + i}: ${f}; ${d} ekiplerinin operasyon/runbook beklentileri dahil.`,
    ], i),
    architecture: archFn(c, f, i),
    apiData: pick([
      `REST POST /v1/t${121 + i}/${c.toLowerCase().replace(/\s+/g, "-")}; JSON Schema draft-07; RFC7807 problem+json.`,
      `gRPC proto T${121 + i}${c.replace(/\s+/g, "")}; streaming RPC; max message ${2 + (i % 4)}MB.`,
      `GraphQL mutation T${121 + i}Create; input validated; error extensions code+field.`,
      `Webhook T-${121 + i} {eventId, tenantId, payload, signature}; idempotency index.`,
      `Async Avro T-${121 + i} {correlationId, payload, retryCount}; schema registry v${2 + (i % 3)}.`,
      `SOAP T-${121 + i} WSDL; XSD validated request; MTOM attachment support.`,
      `GraphQL subscription T-${121 + i}; WebSocket transport; auth JWT.`,
      `S3 event trigger T-${121 + i}; object key pattern; lambda processor.`,
    ], i),
    errorHandling: pick([
      `[T-${121 + i}] Idempotent retry yalnızca GET/PUT; POST duplicate key 409 döner; DLQ H-${121 + i}.`,
      `[T-${121 + i}] Validation 422 field array; partial success 207 multi-status; bulkhead pool ${3 + (i % 4)}.`,
      `[T-${121 + i}] Timeout gateway ${20 + (i % 25)}s; fallback stale cache ${5 + (i % 10)} dk TTL.`,
      `[T-${121 + i}] Circuit breaker half-open ${30 + (i % 20)}s; error budget burn alert.`,
      `[T-${121 + i}] Poison message ${4 + (i % 3)} retry sonra DLX; manual replay admin UI.`,
      `[T-${121 + i}] 429 Retry-After header zorunlu; 503 exponential max ${3 + (i % 4)} deneme.`,
      `[T-${121 + i}] Batch partial failure: başarılı satır commit, hatalı reprocess kuyruğu.`,
      `[T-${121 + i}] GraphQL error extensions code; REST RFC7807 problem+json.`,
      `[T-${121 + i}] gRPC status code mapping; deadline exceeded client retry policy.`,
      `[T-${121 + i}] Webhook delivery log; failed callback ${5 + (i % 5)} retry sonra disable.`,
    ], i),
    security: `[T-${121 + i}] ${pick(["OAuth2 client credentials", "SAML SSO federasyon", "mTLS servis mesh", "KVKK veri minimizasyonu", "Zero-trust MFA"], i)}; JWT tenant claim; audit immutable ${90 + (i % 270)} gün; secret rotasyon ${60 + (i % 60)} gün.`,
    observability: pick([
      `[T-${121 + i}] OpenTelemetry trace; Jaeger UI; p95 alert ${200 + (i % 300)}ms.`,
      `[T-${121 + i}] Prometheus histogram; Grafana dashboard T-${121 + i}; SLO burn rate.`,
      `[T-${121 + i}] Structured JSON log; correlationId zorunlu; PII scrub pipeline.`,
      `[T-${121 + i}] CloudWatch metric; anomaly detection; weekly SLA e-posta.`,
      `[T-${121 + i}] Datadog APM; custom business counter; error budget panel.`,
      `[T-${121 + i}] Elastic APM; distributed trace; service map dependency.`,
      `[T-${121 + i}] Loki log aggregation; LogQL alert; retention ${45 + (i % 45)} gün.`,
      `[T-${121 + i}] New Relic transaction trace; throughput baseline regression.`,
    ], i),
    testing: `[T-${121 + i}] Unit coverage >= %${85 + (i % 10)}; integration Testcontainers; load test ${1.5 + (i % 3) * 0.5}× peak; contract test CI gate; ref QA-${121 + i}.`,
  };
}

function riskBase(i) {
  const d = pick(DOMAINS, i);
  const titles = [
    "Tenant izolasyon ihlali", "Yanlış limit güncelleme", "Yanlış hasta eşleşme", "Sınav içerik sızıntısı",
    "Hava API kesintisi", "Rota API maliyet artışı", "PSP outage", "Kişisel veri ifşası",
    "Performans verisi bias", "SCADA erişim ihlali", "Fraud ring", "Overbooking",
    "Kalite gate bypass", "Supply chain zafiyeti", "App Store red",
    "Vendor lock-in", "Regülasyon değişimi", "Veri residency", "WCAG uyumsuzluk",
    "Sensör sahteciliği", "Force majeure grev", "Bot stok eritme", "Siyasi baskı moderasyon",
    "GDPR unutulma hakkı", "OT ransomware", "Model drift", "Mevsimsel talep hatası",
    "Single supplier kesinti", "Insider veri export", "Arka plan konum batarya",
  ];
  const triggers = [
    "Çok kiracılı veri sızıntısı", "Batch job hatası", "Kimlik doğrulama zayıf",
    "Soru bankası erişim kontrolü", "Erken uyarı gecikmesi", "Trafik servisi fiyat artışı",
    "Ödeme sağlayıcı kesinti", "Yanlış portal yayını", "360 anket güven sorunu",
    "OT ağ güvenliği", "Organize suiistimal", "Kanal senkron gecikmesi",
    "Operatör override kötüye kullanım", "Bağımlılık CVE", "Store policy ihlali",
    "Özel format export zor", "Rapor format güncelleme", "Yurt dışı sunucu",
    "Erişilebilir olmayan içerik", "Manipüle telemetri", "Teslimat gecikmesi",
    "Stok eritme saldırısı", "İçerik moderasyon baskısı", "Veri silme talebi",
    "Ransomware OT", "Aktüeryal model sapması", "Talep tahmin hatası",
    "Tek tedarikçi", "Toplu veri export", "Arka plan konum tüketimi",
  ];
  const probPool = [
    "Seyrek (≤1/yıl)", "Ara (2-3/çeyrek)", "Muhtemel (ayda 1-2)", "Sık (haftalık)", "Kritik eşik (günlük izleme)",
    "Düşük (5 yılda 1)", "Orta (yılda 2)", "Yüksek (ayda 3+)", "Çok düşük", "Değişken (mevsimsel)",
  ];
  const impactPool = [
    "KVKK idari para cezası", "Operasyon duruşu 4+ saat", "Finansal kayıp >500K TL",
    "Hasta güvenliği olayı", "Regülasyon rapor ret", "Müşteri churn %5+",
    "Veri bütünlüğü bozulması", "Marka itibarı zedelenmesi", "SLA ceza ödemesi",
    "Üretim hattı duruşu", "Siber olay bildirimi zorunluluğu", "Tedarik zinciri kesintisi",
  ];
  const mitPool = [
    "Haftalık risk review ve erken uyarı paneli", "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere",
    "Otomatik regresyon test paketi ve geri alma runbook", "Pen test bulguları release gate'e bağlandı",
    "Dual-control onay ve immutable audit log", "Chaos engineering tatbikatı çeyrekte bir",
    "Vendor SOC2 raporu yıllık doğrulama", "Veri sınıflandırma ve DLP policy",
    "Pilot kullanıcı programı ve saha destek hattı", "Regülasyon danışmanlık retainer",
    "Checksum doğrulama ve dry-run migrasyon", "Anomaly detection model eğitimi",
    "Incident response tabletop senaryosu", "Config drift detection CI kuralı",
    "Business continuity plan güncelleme",
  ];
  const title = titles[i];
  const trigger = triggers[i];
  const risks = [0, 1, 2, 3, 4].map((j) => ({
    name: pick([
      `${d} ortamında ${title}: ${trigger}`,
      `${title} nedeniyle ${d} operasyonunda servis kesintisi`,
      `${trigger} — ${title} veri hattı tutarsızlığı`,
      `${d} entegrasyonunda ${title} bağımlılık hatası`,
      `${title} regülasyon/denetim bulgusu riski`,
      `${d} kullanıcılarında ${title} kötüye kullanım senaryosu`,
      `${trigger} kaynaklı ${title} finansal exposure`,
      `${title} — ${d} tedarik zinciri zafiyeti`,
    ], i + j * 3),
    probability: probPool[(i + j) % probPool.length],
    impact: impactPool[(i + j * 2) % impactPool.length],
    priority: pick(["P1", "P2", "P3", "P1", "P2"], i + j),
    mitigation: `${mitPool[(i + j) % mitPool.length]} (${d}/${title}, ref R-${121 + i}-${j + 1})`,
  }));
  return {
    domain: d,
    title,
    trigger,
    intro: `${d} sektöründe "${title}" risk değerlendirmesi — tetikleyici: ${trigger}. Paydaş oturumu: ${pick(["IT", "İş", "Hukuk", "Operasyon"], i)} liderliğinde. İnceleme dönemi: Q${(i % 4) + 1}/2026, kayıt R-${121 + i}.`,
    risks,
    footer: `Onay kapısı (${title}): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: ${30 + (i % 45)} gün.`,
  };
}

function usBase(i) {
  const d = pick(DOMAINS, i);
  const roles = [
    "Ürün yöneticisi", "Hazine uzmanı", "Hemşire", "Öğretmen", "Ziraat mühendisi",
    "Depo operatörü", "Müşteri", "Vatandaş", "Çalışan", "Santral operatörü",
    "Hasar uzmanı", "Resepsiyonist", "Hat şefi", "SOC analisti", "Saha satış temsilcisi",
    "Destek temsilcisi", "Mutabakat uzmanı", "Doktor", "Öğrenci", "Kooperatif yöneticisi",
    "Kurye", "Satıcı", "Belediye memuru", "Yönetici", "Enerji yöneticisi",
    "Acente temsilcisi", "Tur operatörü", "Kalite mühendisi", "Geliştirici", "Fitness koçu",
  ];
  const needs = [
    "release notlarını müşteri portalında yayınlamak", "günlük nakit pozisyonunu tek ekranda görmek",
    "kritik lab sonucunda anında uyarı almak", "sınıf devamsızlığını anında kaydetmek",
    "parsel bazlı verim raporu almak", "pick listesinde lot doğrulaması yapmak",
    "kargo durumunu haritada izlemek", "belediye başvuru durumunu görmek",
    "izin bakiyemi mobilde görmek", "inverter arızasında work order açmak",
    "ekspertiz randevusunu sistemden atamak", "overbooking riskini erken görmek",
    "OEE düşüş nedenini dashboardda görmek", "phishing raporunu tek tık eskalasyon",
    "offline müşteri ziyareti kaydetmek", "müşteri ticket geçmişini 360 görünümde açmak",
    "banka hareketlerini otomatik eşleştirmek", "epikriz taslağını otomatik doldurmak",
    "sınav takvimini takvime senkronlamak", "üye alım hakediş raporu almak",
    "teslimatta kapı kodu notunu görmek", "iade talebini foto kanıtla onaylamak",
    "şikayet kaydını birimlere yönlendirmek", "ekibimin izin takvimini görmek",
    "anomali tüketim uyarısı almak", "poliçe teklif PDF'i oluşturmak",
    "grup rezervasyonunu tek formda toplamak", "limit dışı ölçümde NCR açmak",
    "CI pipeline güvenlik gate sonucunu görmek", "müşteri antrenman uyum skorunu görmek",
  ];
  const benefits = [
    "e-posta trafiğini azaltmak", "likidite kararını hızlandırmak", "gecikmeden müdahale etmek",
    "veli bilgilendirmesini otomatikleştirmek", "gübre planını optimize etmek", "yanlış sevkiyatı önlemek",
    "teslimat belirsizliğini azaltmak", "tekrar aramaktan kaçınmak", "planlama yapabilmek",
    "bakım gecikmesini önlemek", "SLA ihlalini azaltmak", "misafir taşıma planı yapmak",
    "müdahale önceliği belirlemek", "olay müdahalesini hızlandırmak", "veri kaybını önlemek",
    "çözüm süresini kısaltmak", "manuel iş yükünü azaltmak", "taburcu süresini kısaltmak",
    "çakışmaları önlemek", "şeffaf ödeme yapmak", "ilk seferde teslim etmek",
    "kötüye kullanımı azaltmak", "SLA takibini kolaylaştırmak", "kapasite planlamak",
    "fatura sürprizini önlemek", "müşteriye hızlı dönüş yapmak", "hata oranını düşürmek",
    "hurda riskini azaltmak", "zafiyetli deploy'u engellemek", "motivasyon mesajı zamanlamak",
  ];
  const role = roles[i];
  const need = needs[i];
  const benefit = benefits[i];
  const idx = 121 + i;
  const acSets = [
    [`Given ${role} ${d} portalında ${need} seçtiğinde When onay verirse Then değişiklik 60 sn içinde yansır (US-${idx})`, `Given yetkisiz rol When işlem denerse Then 403 ve Türkçe hata kodu döner`, `Given audit modu When kayıt sorgulanırsa Then kullanıcı+zaman+IP loglanır`, `Given batch import When 100+ kayıt gelirse Then progress bar ve partial success raporu gösterilir`],
    [`Given ${role} ${need} ekranını açtığında When filtre uygularsa Then sonuçlar 2 sn içinde güncellenir`, `Given boş sonuç When liste gelirse Then "Kayıt bulunamadı" ve filtre temizleme önerisi`, `Given export When PDF oluşturulursa Then şirket logosu ve tarih footer'da`, `Given mobil cihaz When yatay modda açılırsa Then tablo yatay scroll ile okunabilir kalır`],
    [`Given ${role} ${need} tetiklendiğinde When SLA 15 dk aşılırsa Then eskalasyon kuyruğuna düşer`, `Given eşzamanlı 50 istek When yük testi yapılırsa Then p95 < 800 ms kalır`, `Given bakım modu When banner gösterilirse Then write işlemleri 503 döner`, `Given ${d} tenant A When tenant B verisine erişmeye çalışırsa Then erişim reddedilir`],
    [`Given ${role} offline ${need} kaydı yaptığında When ağ gelince Then veri kaybı olmadan senkron olur`, `Given sync çakışması When aynı kayıt iki cihazda değiştiyse Then merge UI açılır`, `Given batarya <%15 When arka plan sync çalışırsa Then sync ertelenir`, `Given 500 kayıt buffer When limit aşılırsa Then kullanıcı uyarılır`],
    [`Given ${role} ${need} formunu doldurduğunda When zorunlu alan boşsa Then alan altında Türkçe validation mesajı`, `Given TC kimlik When hatalı format girilirse Then anında format hatası`, `Given dosya upload When 10MB aşılırsa Then yükleme engellenir`, `Given form submit When başarılı olursa Then onay numarası SMS ile gider`],
  ];
  const acceptanceCriteria = acSets[i % acSets.length].map((line, j) =>
    j === 0 ? line.replace(`(US-${idx})`, `(US-${idx}, ${d})`) : line,
  );
  // Append index-unique criterion
  acceptanceCriteria.push(`Given ${d} iş kuralı US-${idx}-X When ${need.split(" ")[0]} tamamlanırsa Then ${benefit} KPI dashboardda 24 saat içinde güncellenir`);
  return {
    domain: d,
    role: `${role} (${d})`,
    need,
    needHint: need,
    benefit,
    acceptanceCriteria,
  };
}

const PS_BASE = Array.from({ length: 30 }, (_, i) => psBase(i));
const PP_BASE = Array.from({ length: 30 }, (_, i) => ppBase(i));
const REQ_BASE = Array.from({ length: 30 }, (_, i) => reqBase(i));
const TECH_BASE = Array.from({ length: 30 }, (_, i) => techBase(i));
const RISK_BASE = Array.from({ length: 30 }, (_, i) => riskBase(i));
const US_BASE = Array.from({ length: 30 }, (_, i) => usBase(i));

const content = `/** Auto-generated scenario data — do not edit manually. Run: node scripts/build_scenario_data.mjs */
export const PS_BASE = ${JSON.stringify(PS_BASE, null, 2)};
export const PP_BASE = ${JSON.stringify(PP_BASE, null, 2)};
export const REQ_BASE = ${JSON.stringify(REQ_BASE, null, 2)};
export const TECH_BASE = ${JSON.stringify(TECH_BASE, null, 2)};
export const RISK_BASE = ${JSON.stringify(RISK_BASE, null, 2)};
export const US_BASE = ${JSON.stringify(US_BASE, null, 2)};
`;

fs.writeFileSync(outPath, content, "utf8");
console.log("OK — scenario_data.mjs yazıldı:", outPath);
console.log("  PS:", PS_BASE.length, "PP:", PP_BASE.length, "REQ:", REQ_BASE.length);
console.log("  TECH:", TECH_BASE.length, "RISK:", RISK_BASE.length, "US:", US_BASE.length);
