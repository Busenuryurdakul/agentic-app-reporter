/** Auto-generated scenario data — do not edit manually. Run: node scripts/build_scenario_data.mjs */
export const PS_BASE = [
  {
    "domain": "saas",
    "product": "FlowDesk Pro",
    "orgType": "120 kişilik B2B SaaS",
    "persona": "Destek operasyon müdürü",
    "secondaryUsers": "İlgili saas operasyon ekipleri ve dış paydaşlar",
    "problem": "Destek biletleri dağınık kanallarda; SLA ihlalleri geç fark ediliyor.",
    "currentProcess": "Temsilciler kanallar arası manuel kopyala-yapıştır yapıyor.",
    "painPoint": "Ortalama ilk yanıt 6,2 saat; 3,1 kanal kaydı/müşteri.",
    "businessGoal": "FlowDesk Pro ile destek biletleri dağınık kanallarda sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "AWS EKS + PostgreSQL",
    "integrationNeed": "Zendesk webhook, Slack Events",
    "securityNeed": "Tenant RLS, PII maskeleme",
    "constraint": "6 ay Jira workflow korunacak",
    "mvpScope": "Ticket birleştirme, SLA, audit",
    "outOfScope": "AI otomatik yanıt, CTI",
    "functionalReqs": "FR-121-01: saas tenant'ları arasında veri izolasyonu ve ticket birleştirme. FR-121-02: SLA eskalasyon kural motoru (P1 30dk, P2 4sa). FR-121-03: Harici destek aracı webhook ingest. FR-121-04: Müşteri read-only portal.",
    "risks": "API rate limit; tenant sızıntısı; webhook gecikmesi.",
    "successUsers": "85 destek temsilcisi",
    "successMetric": "P1 çözüm 4 saatten 2,5 saate"
  },
  {
    "domain": "finans",
    "product": "RiskLens",
    "orgType": "Bölgesel ticari banka (340 şube)",
    "persona": "Kredi risk yöneticisi",
    "secondaryUsers": "İlgili finans operasyon ekipleri ve dış paydaşlar",
    "problem": "Kurumsal kredi limitleri parçalı sistemlerde; aşım geç tespit ediliyor.",
    "currentProcess": "Limit güncellemeleri günde bir batch çalışıyor.",
    "painPoint": "Limit aşımı ortalama 18 saat geç tespit.",
    "businessGoal": "RiskLens ile kurumsal kredi limitleri parçalı sistemlerde sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "On-prem Oracle + Kafka",
    "integrationNeed": "Core banking limit API",
    "securityNeed": "4-göz onay, immutable audit",
    "constraint": "Core API günde 4 release penceresi",
    "mvpScope": "Limit dashboard, alarm, onay",
    "outOfScope": "ML skorlama, otomatik limit",
    "functionalReqs": "FR-122-01: Core banking limit hareketlerini 30 sn içinde yansıtma. FR-122-02: %85/%90/%95 eşik alarmları. FR-122-03: 4-göz limit artırım onayı. FR-122-04: BDDK formatında günlük rapor.",
    "risks": "Core gecikme; yanlış eşik; regülasyon uyumsuzluğu.",
    "successUsers": "62 kredi uzmanı",
    "successMetric": "Limit tespit 12 dakikaya"
  },
  {
    "domain": "sağlık",
    "product": "MedTrail",
    "orgType": "350 yataklı eğitim hastanesi",
    "persona": "Taburcu koordinatör hemşiresi",
    "secondaryUsers": "İlgili sağlık operasyon ekipleri ve dış paydaşlar",
    "problem": "Taburcu talimatları kağıt formda; readmission oranı yüksek.",
    "currentProcess": "Taburcu formu veriliyor; 7 gün sonra telefon hatırlatması.",
    "painPoint": "30 gün readmission %14,2.",
    "businessGoal": "MedTrail ile taburcu talimatları kağıt formda sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Azure AKS + FHIR gateway",
    "integrationNeed": "HIS HL7 ADT, e-Nabız",
    "securityNeed": "KVKK açık rıza, encryption at-rest",
    "constraint": "App Store onay 4 hafta",
    "mvpScope": "Taburcu plan, push, hemşire kuyruk",
    "outOfScope": "Tele-tıp, wearables",
    "functionalReqs": "FR-123-01: HIS ADT taburcu mesajından 15 dk içinde dijital plan. FR-123-02: İlaç doz push hatırlatma. FR-123-03: 48 saat sessiz hasta eskalasyonu. FR-123-04: e-Nabız özet gönderimi.",
    "risks": "HIS gecikme; düşük adoption; e-Nabız kesinti.",
    "successUsers": "420 taburcu/ay",
    "successMetric": "Readmission %10 altı"
  },
  {
    "domain": "eğitim",
    "product": "CampusMatch",
    "orgType": "45.000 öğrencili devlet üniversitesi",
    "persona": "Kariyer merkezi koordinatörü",
    "secondaryUsers": "İlgili eğitim operasyon ekipleri ve dış paydaşlar",
    "problem": "Mentor-mentee eşleştirmesi manuel; memnuniyet düşük.",
    "currentProcess": "Koordinatör Excel'de manuel eşleştirme yapıyor.",
    "painPoint": "Eşleşme memnuniyeti %52.",
    "businessGoal": "CampusMatch ile mentor-mentee eşleştirmesi manuel sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "LDAP + Python servis",
    "integrationNeed": "ÖBS LDAP, LMS LTI",
    "securityNeed": "Öğrenci PII KVKK",
    "constraint": "Dönem başı 2 hafta yoğun kayıt",
    "mvpScope": "Profil, eşleştirme, mesaj",
    "outOfScope": "Video görüşme, sertifika",
    "functionalReqs": "FR-124-01: Min 5 yetkinlik etiketli öğrenci profili. FR-124-02: Skor >=0,72 otomatik eşleştirme önerisi. FR-124-03: Mentor max 3 mentee limiti. FR-124-04: 4 hafta memnuniyet anketi.",
    "risks": "Algoritma bias; LDAP gecikme; mentor yetersizliği.",
    "successUsers": "800 mentor-mentee çifti",
    "successMetric": "Memnuniyet >= %75"
  },
  {
    "domain": "tarım",
    "product": "CropLedger",
    "orgType": "1.200 üyeli buğday kooperatifi",
    "persona": "Kooperatif muhasebe sorumlusu",
    "secondaryUsers": "İlgili tarım operasyon ekipleri ve dış paydaşlar",
    "problem": "Mahsul tartım-defter mutabakatı haftalar sürüyor.",
    "currentProcess": "Kantar tartımı kağıda; akşam Excel'e aktarılıyor.",
    "painPoint": "340 ton kayıt uyuşmazlığı 2024'te.",
    "businessGoal": "CropLedger ile mahsul tartım-defter mutabakatı haftalar sürüyor. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Edge PWA + PostgreSQL",
    "integrationNeed": "Kantar RS232, e-Fatura",
    "securityNeed": "Tartım kaydı değiştirilemez log",
    "constraint": "Hasat sezonu internet kesintisi",
    "mvpScope": "Kantar kayıt, mutabakat, e-Fatura",
    "outOfScope": "TMO fiyat tahmin",
    "functionalReqs": "FR-125-01: Kantar RS232 otomatik kayıt 2 sn. FR-125-02: Offline 500 tartım buffer+sync. FR-125-03: Üye günlük alım SMS özeti. FR-125-04: e-Fatura muhasebe onay kapısı.",
    "risks": "Kalibrasyon hatası; offline sync; e-Fatura değişikliği.",
    "successUsers": "1.200 kooperatif üyesi",
    "successMetric": "Mutabakat 4 saate"
  },
  {
    "domain": "lojistik",
    "product": "DepoPulse",
    "orgType": "Ulusal 3PL lojistik operatörü",
    "persona": "Depo operasyon müdürü",
    "secondaryUsers": "İlgili lojistik operasyon ekipleri ve dış paydaşlar",
    "problem": "Depo pick-path optimizasyonu yok; yürüme mesafesi yüksek.",
    "currentProcess": "Pick listesi WMS'ten statik rota ile basılıyor.",
    "painPoint": "Pick başına ortalama 1,8 km yürüme.",
    "businessGoal": "DepoPulse ile depo pick-path optimizasyonu yok sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Java WMS + Redis",
    "integrationNeed": "WMS REST, ERP",
    "securityNeed": "Lot traceability audit",
    "constraint": "Blackout peak sezon deploy yok",
    "mvpScope": "Slotting, pick-path, lot scan",
    "outOfScope": "AMR robot entegrasyonu",
    "functionalReqs": "FR-126-01: Slotting önerisi pick listesine entegre. FR-126-02: Pick-path mesafe optimizasyonu. FR-126-03: Lot/FEFO doğrulama scan. FR-126-04: Shift bazlı verimlilik dashboard.",
    "risks": "WMS API limit; slotting yanlış öneri; eğitim eksikliği.",
    "successUsers": "45 depo operatörü",
    "successMetric": "Pick mesafe %22 azalma"
  },
  {
    "domain": "e-ticaret",
    "product": "CartShield",
    "orgType": "Omnichannel perakende (180 mağaza)",
    "persona": "E-ticaret büyüme yöneticisi",
    "secondaryUsers": "İlgili e-ticaret operasyon ekipleri ve dış paydaşlar",
    "problem": "Sepet terk oranı %72; kurtarma otomasyonu yok.",
    "currentProcess": "Sepet terk e-postası 24 saat sonra tek şablonla gidiyor.",
    "painPoint": "Sepet terk kurtarma oranı %8.",
    "businessGoal": "CartShield ile sepet terk oranı %72 sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Next.js + headless CMS",
    "integrationNeed": "Payment PSP, CRM",
    "securityNeed": "PCI-DSS scope minimizasyon",
    "constraint": "PSP sözleşme yenileme Q3",
    "mvpScope": "Sepet kurtarma, kupon, hold",
    "outOfScope": "Marketplace 3P",
    "functionalReqs": "FR-127-01: Sepet terk 30 dk içinde kişiselleştirilmiş kupon. FR-127-02: Stok rezervasyon 15 dk hold. FR-127-03: Terk nedeni A/B test etiketi. FR-127-04: CRM segment senkron.",
    "risks": "PSP outage; kupon kötüye kullanım; CRM gecikme.",
    "successUsers": "12.000 aktif sepet/ay",
    "successMetric": "Sepet kurtarma %18"
  },
  {
    "domain": "kamu",
    "product": "PermitOne",
    "orgType": "Büyükşehir belediyesi dijital hizmetler",
    "persona": "Belediye dijital hizmetler şefi",
    "secondaryUsers": "İlgili kamu operasyon ekipleri ve dış paydaşlar",
    "problem": "Ruhsat başvurularında vatandaş fiziksel kuyruk bekliyor.",
    "currentProcess": "Vatandaş belediye veznesinde sıra numarası alıyor.",
    "painPoint": "Ortalama bekleme 47 dakika.",
    "businessGoal": "PermitOne ile ruhsat başvurularında vatandaş fiziksel kuyruk bekliyor. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "e-Devlet API + .NET",
    "integrationNeed": "e-Devlet, SMS gateway",
    "securityNeed": "e-İmza, WORM arşiv",
    "constraint": "Belediye seçim dönemi dondurma",
    "mvpScope": "e-Devlet giriş, başvuru takip",
    "outOfScope": "Blockchain şeffaflık",
    "functionalReqs": "FR-128-01: e-Devlet kimlik ile giriş. FR-128-02: Başvuru durumu SMS/push. FR-128-03: Eksik evrak upload. FR-128-04: Birim yönlendirme workflow.",
    "risks": "e-Devlet kesinti; evrak format uyumsuzluğu; birim direnci.",
    "successUsers": "3.500 başvuru/ay",
    "successMetric": "Bekleme 15 dakikaya"
  },
  {
    "domain": "insan kaynakları",
    "product": "SkillAtlas",
    "orgType": "Çok uluslu holding İK",
    "persona": "Yetkinlik yönetimi uzmanı",
    "secondaryUsers": "İlgili insan kaynakları operasyon ekipleri ve dış paydaşlar",
    "problem": "Yetkinlik matrisi güncel değil; eğitim önerisi manuel.",
    "currentProcess": "Yetkinlik verisi yılda bir anketle toplanıyor.",
    "painPoint": "Yetkinlik verisi 14 ay ortalama gecikmeli.",
    "businessGoal": "SkillAtlas ile yetkinlik matrisi güncel değil sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "SAP SuccessFactors entegrasyon",
    "integrationNeed": "HRIS SCIM",
    "securityNeed": "RBAC, GDPR export",
    "constraint": "Global rollout fazlı",
    "mvpScope": "Yetkinlik matris, gap analiz",
    "outOfScope": "OKR modülü",
    "functionalReqs": "FR-129-01: Yetkinlik matrisi import/export. FR-129-02: Skill gap analizi. FR-129-03: Eğitim katalog eşleştirme. FR-129-04: Yönetici onaylı gelişim planı.",
    "risks": "Veri kalitesi düşük; HRIS sync; yönetici direnci.",
    "successUsers": "2.400 çalışan",
    "successMetric": "Skill gap kapanma %40"
  },
  {
    "domain": "enerji",
    "product": "GridWatch",
    "orgType": "Dağıtım şirketi (2.400 trafo)",
    "persona": "Şebeke operasyon mühendisi",
    "secondaryUsers": "İlgili enerji operasyon ekipleri ve dış paydaşlar",
    "problem": "Trafo aşırı yük geç görülüyor; kesinti riski artıyor.",
    "currentProcess": "Trafo yükü SCADA ekranında operatör takibiyle izleniyor.",
    "painPoint": "Trafo aşırı yük 2 saat geç alarm.",
    "businessGoal": "GridWatch ile trafo aşırı yük geç görülüyor sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "SCADA + TimescaleDB",
    "integrationNeed": "SCADA Modbus, GIS",
    "securityNeed": "OT network segmentation",
    "constraint": "OT bakım penceresi ayda 1",
    "mvpScope": "Trafo alarm, demand response",
    "outOfScope": "Microgrid optimizasyon",
    "functionalReqs": "FR-130-01: Trafo yük %85 alarm. FR-130-02: Demand response tetik. FR-130-03: SCADA telemetri ingest. FR-130-04: Kesinti work order otomasyonu.",
    "risks": "SCADA kesinti; false positive alarm; OT güvenlik.",
    "successUsers": "18 trafo operatörü",
    "successMetric": "Kesinti öncesi müdahale %90"
  },
  {
    "domain": "sigorta",
    "product": "ClaimFlow",
    "orgType": "Hayat sigortası şirketi",
    "persona": "Hasar operasyon müdürü",
    "secondaryUsers": "İlgili sigorta operasyon ekipleri ve dış paydaşlar",
    "problem": "Hasar evrakı kağıt; ekspertiz SLA ihlali sık.",
    "currentProcess": "Hasar bildirimi telefon+faks ile alınıyor.",
    "painPoint": "Hasar dosyası açılış SLA %62 uyum.",
    "businessGoal": "ClaimFlow ile hasar evrakı kağıt sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": ".NET core + blob storage",
    "integrationNeed": "FNOL portal, fraud API",
    "securityNeed": "Hasar foto PII redaksiyon",
    "constraint": "Regülasyon rapor deadline 9 ay",
    "mvpScope": "FNOL, ekspertiz, portal",
    "outOfScope": "Blockchain poliçe",
    "functionalReqs": "FR-131-01: FNOL dijital form+foto. FR-131-02: Ekspertiz randevu atama. FR-131-03: Hasar dosya durum portalı. FR-131-04: Fraud skor entegrasyonu.",
    "risks": "Fraud false negative; ekspertiz kapasitesi; foto kalitesi.",
    "successUsers": "220 hasar dosyası/ay",
    "successMetric": "Hasar SLA %88"
  },
  {
    "domain": "turizm",
    "product": "StayLocal",
    "orgType": "12 otellik butik zincir",
    "persona": "Revenue manager",
    "secondaryUsers": "İlgili turizm operasyon ekipleri ve dış paydaşlar",
    "problem": "OTA kanal senkron gecikmesi overbooking riski yaratıyor.",
    "currentProcess": "Rezervasyon kanalları saatte bir CSV ile güncelleniyor.",
    "painPoint": "Overbooking 3 rezervasyon/ay ortalama.",
    "businessGoal": "StayLocal ile ota kanal senkron gecikmesi overbooking riski yaratıyor. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Node.js channel manager",
    "integrationNeed": "OTA channel APIs",
    "securityNeed": "Misafir verisi KVKK",
    "constraint": "Peak sezon overbooking toleransı sıfır",
    "mvpScope": "OTA sync, overbooking uyarı",
    "outOfScope": "Metaverse tur",
    "functionalReqs": "FR-132-01: OTA fiyat push 5 dk SLA. FR-132-02: Overbooking erken uyarı. FR-132-03: Grup rezervasyon tek form. FR-132-04: Channel manager audit log.",
    "risks": "OTA API değişikliği; senkron gecikme; fiyat hatası.",
    "successUsers": "12 otel resepsiyon",
    "successMetric": "Overbooking sıfır"
  },
  {
    "domain": "üretim",
    "product": "LineSight",
    "orgType": "Otomotiv Tier-1 tedarikçi",
    "persona": "Hat şefi",
    "secondaryUsers": "İlgili üretim operasyon ekipleri ve dış paydaşlar",
    "problem": "OEE düşüş nedenleri standart değil; müdahale gecikiyor.",
    "currentProcess": "Duruş kodları operatör serbest metin giriyor.",
    "painPoint": "OEE kaybının %40'ı 'diğer' kodunda.",
    "businessGoal": "LineSight ile oee düşüş nedenleri standart değil sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "OPC-UA + MES",
    "integrationNeed": "PLC OPC-UA, Andon",
    "securityNeed": "Operator override audit",
    "constraint": "Hat duruşu max 15 dk",
    "mvpScope": "Duruş kodu, OEE dashboard",
    "outOfScope": "Digital twin fabrika",
    "functionalReqs": "FR-133-01: Standart duruş kodu zorunluluğu. FR-133-02: OEE real-time dashboard. FR-133-03: Andon bildirim entegrasyonu. FR-133-04: MTTR trend raporu.",
    "risks": "Operatör direnci; PLC gecikme; yanlış kod seçimi.",
    "successUsers": "6 hat şefi",
    "successMetric": "OEE +4 puan"
  },
  {
    "domain": "siber güvenlik",
    "product": "TrustGate",
    "orgType": "MSSP siber güvenlik firması",
    "persona": "Güvenlik mimarı",
    "secondaryUsers": "İlgili siber güvenlik operasyon ekipleri ve dış paydaşlar",
    "problem": "VPN tabanlı erişim zero-trust hedefiyle uyumsuz.",
    "currentProcess": "Uzaktan erişim legacy VPN üzerinden.",
    "painPoint": "VPN compromise surface geniş.",
    "businessGoal": "TrustGate ile vpn tabanlı erişim zero-trust hedefiyle uyumsuz. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Okta + service mesh",
    "integrationNeed": "SIEM, IdP SAML",
    "securityNeed": "Zero-trust MFA",
    "constraint": "SOC2 audit 6 ay",
    "mvpScope": "Device posture, JIT erişim",
    "outOfScope": "SOAR otomasyon",
    "functionalReqs": "FR-134-01: Device posture kontrolü. FR-134-02: MFA zorunlu admin. FR-134-03: JIT erişim onay. FR-134-04: Erişim audit export.",
    "risks": "Legacy VPN kalıntısı; MFA bypass; cihaz uyumsuzluğu.",
    "successUsers": "340 uzaktan çalışan",
    "successMetric": "VPN kaldırma %100"
  },
  {
    "domain": "mobil uygulamalar",
    "product": "PocketCoach",
    "orgType": "10M indirmeli mobil fintech",
    "persona": "Ürün yöneticisi (mobil)",
    "secondaryUsers": "İlgili mobil uygulamalar operasyon ekipleri ve dış paydaşlar",
    "problem": "Harcama farkındalığı düşük; bütçe aşımı sık.",
    "currentProcess": "Harcama banka SMS'lerinden manuel kategorize ediliyor.",
    "painPoint": "Aylık bütçe aşımı kullanıcıların %34'ünde.",
    "businessGoal": "PocketCoach ile harcama farkındalığı düşük sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "React Native + Firebase",
    "integrationNeed": "Bank Open Banking API",
    "securityNeed": "Biometric + device attestation",
    "constraint": "Store policy review gerekli",
    "mvpScope": "Harcama OCR, bütçe uyarı",
    "outOfScope": "Crypto cüzdan",
    "functionalReqs": "FR-135-01: Harcama kategorize OCR. FR-135-02: Bütçe hedef push uyarı. FR-135-03: Biometrik giriş. FR-135-04: Aylık özet PDF.",
    "risks": "Banka API değişikliği; OCR hata; kullanıcı gizlilik endişesi.",
    "successUsers": "85.000 MAU",
    "successMetric": "Bütçe aşım %15 azalma"
  },
  {
    "domain": "saas",
    "product": "DocuChain",
    "orgType": "Seri B SaaS scale-up",
    "persona": "Hukuk operasyon uzmanı",
    "secondaryUsers": "İlgili saas operasyon ekipleri ve dış paydaşlar",
    "problem": "Sözleşme versiyon karmaşası; e-imza süreci parçalı.",
    "currentProcess": "Sözleşme Word+e-posta ile dolaşıyor.",
    "painPoint": "Sözleşme versiyon uyuşmazlığı ayda 12 vaka.",
    "businessGoal": "DocuChain ile sözleşme versiyon karmaşası sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "AWS EKS + PostgreSQL",
    "integrationNeed": "Zendesk webhook, Slack Events",
    "securityNeed": "Tenant RLS, PII maskeleme",
    "constraint": "6 ay Jira workflow korunacak",
    "mvpScope": "Ticket birleştirme, SLA, audit",
    "outOfScope": "AI otomatik yanıt, CTI",
    "functionalReqs": "FR-136-01: Sözleşme versiyon diff. FR-136-02: e-İmza entegrasyon. FR-136-03: Onay workflow. FR-136-04: Arşiv WORM saklama.",
    "risks": "API rate limit; tenant sızıntısı; webhook gecikmesi.",
    "successUsers": "85 destek temsilcisi",
    "successMetric": "P1 çözüm 4 saatten 2,5 saate"
  },
  {
    "domain": "finans",
    "product": "TreasuryHub",
    "orgType": "Katılım bankası dijital kanal",
    "persona": "Hazine müdürü",
    "secondaryUsers": "İlgili finans operasyon ekipleri ve dış paydaşlar",
    "problem": "Grup nakit konsolidasyonu Excel'de; hata oranı yüksek.",
    "currentProcess": "Grup şirketleri Excel dosyası e-posta ile gönderiyor.",
    "painPoint": "Konsolidasyon hatası çeyrekte 2,3M TL sapma.",
    "businessGoal": "TreasuryHub ile grup nakit konsolidasyonu excel'de sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "On-prem Oracle + Kafka",
    "integrationNeed": "Core banking limit API",
    "securityNeed": "4-göz onay, immutable audit",
    "constraint": "Core API günde 4 release penceresi",
    "mvpScope": "Limit dashboard, alarm, onay",
    "outOfScope": "ML skorlama, otomatik limit",
    "functionalReqs": "FR-137-01: Banka hareketi otomatik eşleştirme. FR-137-02: Grup konsolidasyon dashboard. FR-137-03: FX kur otomatik çekim. FR-137-04: Likidite alarm.",
    "risks": "Core gecikme; yanlış eşik; regülasyon uyumsuzluğu.",
    "successUsers": "62 kredi uzmanı",
    "successMetric": "Limit tespit 12 dakikaya"
  },
  {
    "domain": "sağlık",
    "product": "LabLink",
    "orgType": "Özel hastane grubu (6 kampüs)",
    "persona": "Laboratuvar bilgi sistemleri uzmanı",
    "secondaryUsers": "İlgili sağlık operasyon ekipleri ve dış paydaşlar",
    "problem": "HL7 lab sonuçları gecikmeli dağıtılıyor.",
    "currentProcess": "Lab cihazı HL7 mesajını dosyaya yazıyor; batch aktarım.",
    "painPoint": "Lab sonucu dağıtım gecikmesi ortalama 45 dk.",
    "businessGoal": "LabLink ile hl7 lab sonuçları gecikmeli dağıtılıyor. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Azure AKS + FHIR gateway",
    "integrationNeed": "HIS HL7 ADT, e-Nabız",
    "securityNeed": "KVKK açık rıza, encryption at-rest",
    "constraint": "App Store onay 4 hafta",
    "mvpScope": "Taburcu plan, push, hemşire kuyruk",
    "outOfScope": "Tele-tıp, wearables",
    "functionalReqs": "FR-138-01: HL7 ORU^R01 ingest. FR-138-02: FHIR Patient eşleştirme. FR-138-03: Kritik sonuç anlık alert. FR-138-04: Lab cihaz ACK/NACK.",
    "risks": "HIS gecikme; düşük adoption; e-Nabız kesinti.",
    "successUsers": "420 taburcu/ay",
    "successMetric": "Readmission %10 altı"
  },
  {
    "domain": "eğitim",
    "product": "ExamForge",
    "orgType": "VET okulu ağı",
    "persona": "Ölçme değerlendirme koordinatörü",
    "secondaryUsers": "İlgili eğitim operasyon ekipleri ve dış paydaşlar",
    "problem": "Soru bankası sızıntı riski; adaptif sınav yok.",
    "currentProcess": "Sınav soruları PDF havuzundan manuel seçiliyor.",
    "painPoint": "Soru tekrar oranı sınavlarda %12.",
    "businessGoal": "ExamForge ile soru bankası sızıntı riski sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "LDAP + Python servis",
    "integrationNeed": "ÖBS LDAP, LMS LTI",
    "securityNeed": "Öğrenci PII KVKK",
    "constraint": "Dönem başı 2 hafta yoğun kayıt",
    "mvpScope": "Profil, eşleştirme, mesaj",
    "outOfScope": "Video görüşme, sertifika",
    "functionalReqs": "FR-139-01: Soru bankası tag zorunluluğu. FR-139-02: Adaptif zorluk seçimi. FR-139-03: Sınav proctoring webhook. FR-139-04: Sızıntı dedup kontrolü.",
    "risks": "Algoritma bias; LDAP gecikme; mentor yetersizliği.",
    "successUsers": "800 mentor-mentee çifti",
    "successMetric": "Memnuniyet >= %75"
  },
  {
    "domain": "tarım",
    "product": "AgroAlert",
    "orgType": "Organik tarım ihracatçısı",
    "persona": "Ziraat mühendisi",
    "secondaryUsers": "İlgili tarım operasyon ekipleri ve dış paydaşlar",
    "problem": "Don/dolu uyarısı geç geliyor; hasat kaybı yüksek.",
    "currentProcess": "Hava istasyonu verisi sabah toplantısında okunuyor.",
    "painPoint": "Don kaybı sezon başına ortalama 180K TL.",
    "businessGoal": "AgroAlert ile don/dolu uyarısı geç geliyor sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Edge PWA + PostgreSQL",
    "integrationNeed": "Kantar RS232, e-Fatura",
    "securityNeed": "Tartım kaydı değiştirilemez log",
    "constraint": "Hasat sezonu internet kesintisi",
    "mvpScope": "Kantar kayıt, mutabakat, e-Fatura",
    "outOfScope": "TMO fiyat tahmin",
    "functionalReqs": "FR-140-01: Hava API erken uyarı push. FR-140-02: Parsel bazlı risk haritası. FR-140-03: Kooperatif SMS broadcast. FR-140-04: Hasat kayıt entegrasyonu.",
    "risks": "Kalibrasyon hatası; offline sync; e-Fatura değişikliği.",
    "successUsers": "1.200 kooperatif üyesi",
    "successMetric": "Mutabakat 4 saate"
  },
  {
    "domain": "lojistik",
    "product": "FleetGuard",
    "orgType": "Cross-dock hub operatörü",
    "persona": "Filo yöneticisi",
    "secondaryUsers": "İlgili lojistik operasyon ekipleri ve dış paydaşlar",
    "problem": "Plansız araç arızası lojistik maliyetini artırıyor.",
    "currentProcess": "Bakım takvimi Excel; muayene tarihi kaçırılabiliyor.",
    "painPoint": "Plansız arıza maliyeti araç/yıl 28K TL.",
    "businessGoal": "FleetGuard ile plansız araç arızası lojistik maliyetini artırıyor. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Java WMS + Redis",
    "integrationNeed": "WMS REST, ERP",
    "securityNeed": "Lot traceability audit",
    "constraint": "Blackout peak sezon deploy yok",
    "mvpScope": "Slotting, pick-path, lot scan",
    "outOfScope": "AMR robot entegrasyonu",
    "functionalReqs": "FR-141-01: Bakım km/saat tetik. FR-141-02: Muayene 30 gün önce alarm. FR-141-03: Work order atama. FR-141-04: Yakıt anomali tespiti.",
    "risks": "WMS API limit; slotting yanlış öneri; eğitim eksikliği.",
    "successUsers": "45 depo operatörü",
    "successMetric": "Pick mesafe %22 azalma"
  },
  {
    "domain": "e-ticaret",
    "product": "ReturnEase",
    "orgType": "Marketplace (8.000 satıcı)",
    "persona": "İade operasyon lideri",
    "secondaryUsers": "İlgili e-ticaret operasyon ekipleri ve dış paydaşlar",
    "problem": "İade süreci yavaş; müşteri memnuniyeti düşük.",
    "currentProcess": "İade talebi call center'a telefon ile iletiliyor.",
    "painPoint": "İade çözüm süresi ortalama 9 gün.",
    "businessGoal": "ReturnEase ile i̇ade süreci yavaş sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Next.js + headless CMS",
    "integrationNeed": "Payment PSP, CRM",
    "securityNeed": "PCI-DSS scope minimizasyon",
    "constraint": "PSP sözleşme yenileme Q3",
    "mvpScope": "Sepet kurtarma, kupon, hold",
    "outOfScope": "Marketplace 3P",
    "functionalReqs": "FR-142-01: İade foto kanıt zorunluluğu. FR-142-02: Otomatik iade etiketi. FR-142-03: Kısmi iade split. FR-142-04: Satıcı SLA dashboard.",
    "risks": "PSP outage; kupon kötüye kullanım; CRM gecikme.",
    "successUsers": "12.000 aktif sepet/ay",
    "successMetric": "Sepet kurtarma %18"
  },
  {
    "domain": "kamu",
    "product": "OpenBudget",
    "orgType": "Valilik dijital dönüşüm",
    "persona": "Şeffaflık ofisi uzmanı",
    "secondaryUsers": "İlgili kamu operasyon ekipleri ve dış paydaşlar",
    "problem": "Bütçe verisi vatandaşa açık değil; şeffaflık eksik.",
    "currentProcess": "Bütçe PDF yılda bir web'e yükleniyor.",
    "painPoint": "Vatandaş bütçe sorgusu ayda 400+ telefon.",
    "businessGoal": "OpenBudget ile bütçe verisi vatandaşa açık değil sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "e-Devlet API + .NET",
    "integrationNeed": "e-Devlet, SMS gateway",
    "securityNeed": "e-İmza, WORM arşiv",
    "constraint": "Belediye seçim dönemi dondurma",
    "mvpScope": "e-Devlet giriş, başvuru takip",
    "outOfScope": "Blockchain şeffaflık",
    "functionalReqs": "FR-143-01: Bütçe kalemi arama/filter. FR-143-02: Harcama vs plan grafik. FR-143-03: API açık veri export. FR-143-04: Erişilebilir WCAG rapor.",
    "risks": "e-Devlet kesinti; evrak format uyumsuzluğu; birim direnci.",
    "successUsers": "3.500 başvuru/ay",
    "successMetric": "Bekleme 15 dakikaya"
  },
  {
    "domain": "insan kaynakları",
    "product": "LeaveSync",
    "orgType": "Fabrika saha İK (4.000 mavi yaka)",
    "persona": "Global mobility uzmanı",
    "secondaryUsers": "İlgili insan kaynakları operasyon ekipleri ve dış paydaşlar",
    "problem": "Çok ülkeli izin bakiyesi hatalı hesaplanıyor.",
    "currentProcess": "İzin bakiyesi ülke bazlı farklı Excel'lerde.",
    "painPoint": "Yanlış izin bakiyesi 340 çalışan/ay.",
    "businessGoal": "LeaveSync ile çok ülkeli izin bakiyesi hatalı hesaplanıyor. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "SAP SuccessFactors entegrasyon",
    "integrationNeed": "HRIS SCIM",
    "securityNeed": "RBAC, GDPR export",
    "constraint": "Global rollout fazlı",
    "mvpScope": "Yetkinlik matris, gap analiz",
    "outOfScope": "OKR modülü",
    "functionalReqs": "FR-144-01: Ülke bazlı tatil takvimi. FR-144-02: İzin bakiye gerçek zamanlı. FR-144-03: Yönetici mobil onay. FR-144-04: Payroll export format.",
    "risks": "Veri kalitesi düşük; HRIS sync; yönetici direnci.",
    "successUsers": "2.400 çalışan",
    "successMetric": "Skill gap kapanma %40"
  },
  {
    "domain": "enerji",
    "product": "SolarOps",
    "orgType": "Yenilenebilir GES portföyü",
    "persona": "GES portföy analisti",
    "secondaryUsers": "İlgili enerji operasyon ekipleri ve dış paydaşlar",
    "problem": "GES PR sapması geç fark ediliyor.",
    "currentProcess": "Inverter verisi portalda günlük CSV export.",
    "painPoint": "PR sapması 5 gün geç fark.",
    "businessGoal": "SolarOps ile ges pr sapması geç fark ediliyor. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "SCADA + TimescaleDB",
    "integrationNeed": "SCADA Modbus, GIS",
    "securityNeed": "OT network segmentation",
    "constraint": "OT bakım penceresi ayda 1",
    "mvpScope": "Trafo alarm, demand response",
    "outOfScope": "Microgrid optimizasyon",
    "functionalReqs": "FR-145-01: Inverter telemetri 5 dk. FR-145-02: PR sapma alarm. FR-145-03: Work order otomasyon. FR-145-04: String-level analiz.",
    "risks": "SCADA kesinti; false positive alarm; OT güvenlik.",
    "successUsers": "18 trafo operatörü",
    "successMetric": "Kesinti öncesi müdahale %90"
  },
  {
    "domain": "sigorta",
    "product": "PolicyGen",
    "orgType": "Kasko dijital asistan",
    "persona": "Aktüerya ürün uzmanı",
    "secondaryUsers": "İlgili sigorta operasyon ekipleri ve dış paydaşlar",
    "problem": "Mikro sigorta ürün çıkış süresi 6 hafta.",
    "currentProcess": "Ürün parametreleri actuary Excel'de hesaplanıyor.",
    "painPoint": "Ürün launch 6 hafta actuary döngüsü.",
    "businessGoal": "PolicyGen ile mikro sigorta ürün çıkış süresi 6 hafta. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": ".NET core + blob storage",
    "integrationNeed": "FNOL portal, fraud API",
    "securityNeed": "Hasar foto PII redaksiyon",
    "constraint": "Regülasyon rapor deadline 9 ay",
    "mvpScope": "FNOL, ekspertiz, portal",
    "outOfScope": "Blockchain poliçe",
    "functionalReqs": "FR-146-01: Tarife parametre UI. FR-146-02: Prim hesaplama sandbox. FR-146-03: Poliçe PDF otomasyon. FR-146-04: Onay workflow actuary.",
    "risks": "Fraud false negative; ekspertiz kapasitesi; foto kalitesi.",
    "successUsers": "220 hasar dosyası/ay",
    "successMetric": "Hasar SLA %88"
  },
  {
    "domain": "turizm",
    "product": "GuideMe",
    "orgType": "Charter tur operatörü",
    "persona": "Müze deneyim tasarımcısı",
    "secondaryUsers": "İlgili turizm operasyon ekipleri ve dış paydaşlar",
    "problem": "Müze ziyaretçisi kalabalıkta kayboluyor.",
    "currentProcess": "Ziyaretçi broşür haritası statik basılı.",
    "painPoint": "Ziyaretçi kaybolma şikayeti günde 15.",
    "businessGoal": "GuideMe ile müze ziyaretçisi kalabalıkta kayboluyor. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Node.js channel manager",
    "integrationNeed": "OTA channel APIs",
    "securityNeed": "Misafir verisi KVKK",
    "constraint": "Peak sezon overbooking toleransı sıfır",
    "mvpScope": "OTA sync, overbooking uyarı",
    "outOfScope": "Metaverse tur",
    "functionalReqs": "FR-147-01: AR rota önerisi. FR-147-02: Kalabalık yoğunluk heatmap. FR-147-03: Çok dilli içerik. FR-147-04: Offline harita cache.",
    "risks": "OTA API değişikliği; senkron gecikme; fiyat hatası.",
    "successUsers": "12 otel resepsiyon",
    "successMetric": "Overbooking sıfır"
  },
  {
    "domain": "üretim",
    "product": "QualityGate",
    "orgType": "Beyaz eşya fabrikası MES",
    "persona": "Kalite mühendisi",
    "secondaryUsers": "İlgili üretim operasyon ekipleri ve dış paydaşlar",
    "problem": "SPC limit dışı trend geç yakalanıyor.",
    "currentProcess": "Kalite ölçümü kağıt form; SPC gece shift'te giriliyor.",
    "painPoint": "Limit dışı trend 8 saat geç alarm.",
    "businessGoal": "QualityGate ile spc limit dışı trend geç yakalanıyor. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "OPC-UA + MES",
    "integrationNeed": "PLC OPC-UA, Andon",
    "securityNeed": "Operator override audit",
    "constraint": "Hat duruşu max 15 dk",
    "mvpScope": "Duruş kodu, OEE dashboard",
    "outOfScope": "Digital twin fabrika",
    "functionalReqs": "FR-148-01: X-bar R otomatik hesap. FR-148-02: Limit dışı NCR tetik. FR-148-03: Cpk trend dashboard. FR-148-04: Operatör override audit.",
    "risks": "Operatör direnci; PLC gecikme; yanlış kod seçimi.",
    "successUsers": "6 hat şefi",
    "successMetric": "OEE +4 puan"
  },
  {
    "domain": "siber güvenlik",
    "product": "PhishSim",
    "orgType": "Zero-trust danışmanlık",
    "persona": "Güvenlik farkındalık lideri",
    "secondaryUsers": "İlgili siber güvenlik operasyon ekipleri ve dış paydaşlar",
    "problem": "Phishing tıklama oranı %18; farkındalık düşük.",
    "currentProcess": "Phishing simülasyonu yılda bir IT tarafından.",
    "painPoint": "Phishing click rate %18.",
    "businessGoal": "PhishSim ile phishing tıklama oranı %18 sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "Okta + service mesh",
    "integrationNeed": "SIEM, IdP SAML",
    "securityNeed": "Zero-trust MFA",
    "constraint": "SOC2 audit 6 ay",
    "mvpScope": "Device posture, JIT erişim",
    "outOfScope": "SOAR otomasyon",
    "functionalReqs": "FR-149-01: Phishing sim kampanya. FR-149-02: Tıklayan otomatik eğitim. FR-149-03: Raporlama dashboard. FR-149-04: Whitelist domain kontrolü.",
    "risks": "Legacy VPN kalıntısı; MFA bypass; cihaz uyumsuzluğu.",
    "successUsers": "340 uzaktan çalışan",
    "successMetric": "VPN kaldırma %100"
  },
  {
    "domain": "mobil uygulamalar",
    "product": "MindPause",
    "orgType": "Sağlık wellness super-app",
    "persona": "İK wellbeing program sorumlusu",
    "secondaryUsers": "İlgili mobil uygulamalar operasyon ekipleri ve dış paydaşlar",
    "problem": "Kurumsal tükenmişlik erken uyarısı yok.",
    "currentProcess": "Wellness anket yılda bir İK tarafından.",
    "painPoint": "Burnout bildirimi gecikmesi ortalama 3 ay.",
    "businessGoal": "MindPause ile kurumsal tükenmişlik erken uyarısı yok. sorununu çözmek ve operasyonel KPI'ları iyileştirmek.",
    "techEnv": "React Native + Firebase",
    "integrationNeed": "Bank Open Banking API",
    "securityNeed": "Biometric + device attestation",
    "constraint": "Store policy review gerekli",
    "mvpScope": "Harcama OCR, bütçe uyarı",
    "outOfScope": "Crypto cüzdan",
    "functionalReqs": "FR-150-01: Mola hatırlatma push. FR-150-02: Stres anketi tetik. FR-150-03: Yönetici aggregate dashboard. FR-150-04: Gizlilik anonimleştirme.",
    "risks": "Banka API değişikliği; OCR hata; kullanıcı gizlilik endişesi.",
    "successUsers": "85.000 MAU",
    "successMetric": "Bütçe aşım %15 azalma"
  }
];
export const PP_BASE = [
  {
    "domain": "saas",
    "title": "CRM migrasyonu",
    "scopeHint": "Salesforce'tan in-house CRM, 500 kullanıcı",
    "orgType": "120 kişilik B2B SaaS",
    "phases": "Keşif (3 hf): Salesforce'tan in-house CRM, 500 kullanıcı kapsam kilidi, RACI, veri haritası.\nMimari (4 hf): CRM migrasyonu hedef mimari ADR, güvenlik review.\nMigrasyon (7 hf): Veri ETL, paralel run, regresyon.\nUAT (2 hf): Pilot kullanıcı, performans testi.\nGo-live (1 hf): Kademeli cutover, hypercare. Ref: PP-121.",
    "deliverables": "CRM migrasyonu (PP-121): gereksinim paketi, mimari ADR, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Salesforce'tan in-house CRM, 500 kullanıcı; saas onay süreçleri; regülasyon izni; kritik yol: CRM migrasyonu.",
    "stakeholders": "Program: PM-121. Teknik: TL-SAA-0. İş: Sponsor-CRMmigras. Kalite: QA-0. Ops: SRE-121.",
    "timeline": "14 hf toplam; kritik yol CRM migrasyonu. Buffer %10. Blackout: peak sezon.",
    "exitCriteria": "PP-121 kabul: Salesforce'tan in-house CRM, 500 kullanıcı KPI yeşil; SEV1=0; güvenlik gate PASS; paydaş imzalı kabul."
  },
  {
    "domain": "finans",
    "title": "Basel III raporlama",
    "scopeHint": "Yeni regülasyon modülü, 9 ay deadline",
    "orgType": "Bölgesel ticari banka (340 şube)",
    "phases": "Regülasyon analiz (5 hf): Yeni regülasyon modülü, 9 ay deadline gap analizi.\nTasarım (6 hf): Rapor veri modeli.\nGeliştirme (11 hf): Basel III raporlama modül sprintleri.\nDoğrulama (4 hf): Denetim dry-run.\nCanlı (3 hf): Resmi raporlama. Ref: PP-122.",
    "deliverables": "Basel III raporlama (PP-122): gereksinim paketi, entegrasyon spec, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Yeni regülasyon modülü, 9 ay deadline; finans onay süreçleri; altyapı provisioning; kritik yol: Basel III raporlama.",
    "stakeholders": "Program: PM-122. Teknik: TL-FIN-1. İş: Sponsor-BaselIII. Kalite: QA-1. Ops: SRE-122.",
    "timeline": "16 hf toplam; kritik yol Basel III raporlama. Buffer %11. Blackout: hasat dönemi.",
    "exitCriteria": "PP-122 kabul: Yeni regülasyon modülü, 9 ay deadline KPI yeşil; SEV1=0; pen test temiz; paydaş imzalı kabul."
  },
  {
    "domain": "sağlık",
    "title": "HIS FHIR entegrasyonu",
    "scopeHint": "Epikrisis modülü HL7 FHIR",
    "orgType": "350 yataklı eğitim hastanesi",
    "phases": "FHIR mapping (3 hf): Epikrisis modülü HL7 FHIR resource haritası.\nEntegrasyon (7 hf): HL7 v2 → FHIR adapter.\nKlinik UAT (5 hf): HIS FHIR entegrasyonu pilot.\nGüvenlik (2 hf): KVKK DPIA.\nProd (2 hf): Kademeli servis. Ref: PP-123.",
    "deliverables": "HIS FHIR entegrasyonu (PP-123): gereksinim paketi, test planı, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Epikrisis modülü HL7 FHIR; sağlık onay süreçleri; veri migrasyon penceresi; kritik yol: HIS FHIR entegrasyonu.",
    "stakeholders": "Program: PM-123. Teknik: TL-SAĞ-2. İş: Sponsor-HISFHIRe. Kalite: QA-2. Ops: SRE-123.",
    "timeline": "18 hf toplam; kritik yol HIS FHIR entegrasyonu. Buffer %12. Blackout: regülasyon deadline.",
    "exitCriteria": "PP-123 kabul: Epikrisis modülü HL7 FHIR KPI yeşil; SEV1=0; DR tatbikatı OK; paydaş imzalı kabul."
  },
  {
    "domain": "eğitim",
    "title": "LMS 15 kampüs rollout",
    "scopeHint": "40.000 öğrenci, 15 kampüs",
    "orgType": "45.000 öğrencili devlet üniversitesi",
    "phases": "Kampüs keşif (3 hf×N): 40.000 öğrenci, 15 kampüs yerel ihtiyaç.\nPlatform (5 hf): LMS core deploy.\nİçerik migrasyon (9 hf): LMS 15 kampüs rollout aktarım.\nEğitim (2 hf): Workshop.\nGo-live (3 hf): Dönem başı. Ref: PP-124.",
    "deliverables": "LMS 15 kampüs rollout (PP-124): gereksinim paketi, güvenlik değerlendirme, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "40.000 öğrenci, 15 kampüs; eğitim onay süreçleri; kullanıcı eğitim takvimi; kritik yol: LMS 15 kampüs rollout.",
    "stakeholders": "Program: PM-124. Teknik: TL-EĞI-3. İş: Sponsor-LMS15kam. Kalite: QA-3. Ops: SRE-124.",
    "timeline": "17 hf toplam; kritik yol LMS 15 kampüs rollout. Buffer %13. Blackout:  seçim dönemi.",
    "exitCriteria": "PP-124 kabul: 40.000 öğrenci, 15 kampüs KPI yeşil; SEV1=0; rollback test OK; paydaş imzalı kabul."
  },
  {
    "domain": "tarım",
    "title": "Kooperatif ERP hasat öncesi",
    "scopeHint": "Hasat sezonu öncesi canlı",
    "orgType": "1.200 üyeli buğday kooperatifi",
    "phases": "Hasat öncesi (1 hf): Hasat sezonu öncesi canlı snapshot.\nERP config (4 hf): Kooperatif ERP hasat öncesi parametre.\nEğitim (2 hf): Personel.\nPilot (2 hf): 3 kantar canlı.\nSezon (12 hf): Hypercare. Ref: PP-125.",
    "deliverables": "Kooperatif ERP hasat öncesi (PP-125): gereksinim paketi, veri sözlüğü, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Hasat sezonu öncesi canlı; tarım onay süreçleri; vendor API SLA; kritik yol: Kooperatif ERP hasat öncesi.",
    "stakeholders": "Program: PM-125. Teknik: TL-TAR-4. İş: Sponsor-Kooperatif. Kalite: QA-4. Ops: SRE-125.",
    "timeline": "19 hf toplam; kritik yol Kooperatif ERP hasat öncesi. Buffer %14. Blackout: yılsonu freeze.",
    "exitCriteria": "PP-125 kabul: Hasat sezonu öncesi canlı KPI yeşil; SEV1=0; denetim dry-run PASS; paydaş imzalı kabul."
  },
  {
    "domain": "lojistik",
    "title": "WMS değişimi paralel run",
    "scopeHint": "Eski WMS ile 4 hafta paralel",
    "orgType": "Ulusal 3PL lojistik operatörü",
    "phases": "Paralel run (3 hf): Eski WMS ile 4 hafta paralel dual-write.\nWMS config (6 hf): WMS değişimi paralel run kuralları.\nOperasyon eğitim (4 hf): Shift eğitimi.\nCutover (2 hf): Gece geçiş.\nStabilizasyon (4 hf): Verimlilik izleme. Ref: PP-126.",
    "deliverables": "WMS değişimi paralel run (PP-126): gereksinim paketi, mimari ADR, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Eski WMS ile 4 hafta paralel; lojistik onay süreçleri; regülasyon izni; kritik yol: WMS değişimi paralel run.",
    "stakeholders": "Program: PM-126. Teknik: TL-LOJ-5. İş: Sponsor-WMSdeğişi. Kalite: QA-5. Ops: SRE-126.",
    "timeline": "21 hf toplam; kritik yol WMS değişimi paralel run. Buffer %15. Blackout: peak sezon.",
    "exitCriteria": "PP-126 kabul: Eski WMS ile 4 hafta paralel KPI yeşil; SEV1=0; güvenlik gate PASS; paydaş imzalı kabul."
  },
  {
    "domain": "e-ticaret",
    "title": "Headless storefront Black Friday",
    "scopeHint": "Black Friday 3× trafik hedefi",
    "orgType": "Omnichannel perakende (180 mağaza)",
    "phases": "Trafik modelleme (2 hf): Black Friday 3× trafik hedefi load test.\nHeadless FE (7 hf): Headless storefront Black Friday storefront.\nCDN/cache (2 hf): Edge optimizasyon.\nLoad test (2 hf): k6 trafik.\nBlack Friday (1 hf): War room. Ref: PP-127.",
    "deliverables": "Headless storefront Black Friday (PP-127): gereksinim paketi, entegrasyon spec, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Black Friday 3× trafik hedefi; e-ticaret onay süreçleri; altyapı provisioning; kritik yol: Headless storefront Black Friday.",
    "stakeholders": "Program: PM-127. Teknik: TL-E-T-6. İş: Sponsor-Headlesss. Kalite: QA-6. Ops: SRE-127.",
    "timeline": "20 hf toplam; kritik yol Headless storefront Black Friday. Buffer %10. Blackout: hasat dönemi.",
    "exitCriteria": "PP-127 kabul: Black Friday 3× trafik hedefi KPI yeşil; SEV1=0; pen test temiz; paydaş imzalı kabul."
  },
  {
    "domain": "kamu",
    "title": "e-Devlet hizmet katalog",
    "scopeHint": "Yeni hizmet katalog API",
    "orgType": "Büyükşehir belediyesi dijital hizmetler",
    "phases": "API tasarım (4 hf): Yeni hizmet katalog API OpenAPI.\nEntegrasyon (7 hf): e-Devlet test.\nGüvenlik (3 hf): Pen test.\nPilot ilçe (4 hf): e-Devlet hizmet katalog hizmet.\nGenelleme (6 hf): Rollout. Ref: PP-128.",
    "deliverables": "e-Devlet hizmet katalog (PP-128): gereksinim paketi, test planı, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Yeni hizmet katalog API; kamu onay süreçleri; veri migrasyon penceresi; kritik yol: e-Devlet hizmet katalog.",
    "stakeholders": "Program: PM-128. Teknik: TL-KAM-7. İş: Sponsor-e-Devleth. Kalite: QA-7. Ops: SRE-128.",
    "timeline": "22 hf toplam; kritik yol e-Devlet hizmet katalog. Buffer %11. Blackout: regülasyon deadline.",
    "exitCriteria": "PP-128 kabul: Yeni hizmet katalog API KPI yeşil; SEV1=0; DR tatbikatı OK; paydaş imzalı kabul."
  },
  {
    "domain": "insan kaynakları",
    "title": "HRIS post-merger birleşim",
    "scopeHint": "İki şirket birleşmesi HRIS",
    "orgType": "Çok uluslu holding İK",
    "phases": "Veri harmonizasyon (7 hf): İki şirket birleşmesi HRIS mapping.\nOrganizasyon (5 hf): HRIS post-merger birleşim org chart.\nPayroll test (3 hf): Paralel bordro.\nCutover (2 hf): Pay date geçiş.\nStabilizasyon (5 hf): Destek hattı. Ref: PP-129.",
    "deliverables": "HRIS post-merger birleşim (PP-129): gereksinim paketi, güvenlik değerlendirme, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "İki şirket birleşmesi HRIS; insan kaynakları onay süreçleri; kullanıcı eğitim takvimi; kritik yol: HRIS post-merger birleşim.",
    "stakeholders": "Program: PM-129. Teknik: TL-INS-8. İş: Sponsor-HRISpost-. Kalite: QA-8. Ops: SRE-129.",
    "timeline": "16 hf toplam; kritik yol HRIS post-merger birleşim. Buffer %12. Blackout:  seçim dönemi.",
    "exitCriteria": "PP-129 kabul: İki şirket birleşmesi HRIS KPI yeşil; SEV1=0; rollback test OK; paydaş imzalı kabul."
  },
  {
    "domain": "enerji",
    "title": "SCADA bulut telemetri",
    "scopeHint": "Legacy SCADA → bulut",
    "orgType": "Dağıtım şirketi (2.400 trafo)",
    "phases": "OT assessment (3 hf): Legacy SCADA → bulut segmentasyon.\nTelemetri gateway (6 hf): SCADA bulut telemetri adapter.\nBulut ingest (4 hf): Pipeline.\nPilot (2 hf): 10 trafo canlı.\nRollout (10 hf): Fazlı genişleme. Ref: PP-130.",
    "deliverables": "SCADA bulut telemetri (PP-130): gereksinim paketi, veri sözlüğü, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Legacy SCADA → bulut; enerji onay süreçleri; vendor API SLA; kritik yol: SCADA bulut telemetri.",
    "stakeholders": "Program: PM-130. Teknik: TL-ENE-9. İş: Sponsor-SCADAbulu. Kalite: QA-9. Ops: SRE-130.",
    "timeline": "15 hf toplam; kritik yol SCADA bulut telemetri. Buffer %13. Blackout: yılsonu freeze.",
    "exitCriteria": "PP-130 kabul: Legacy SCADA → bulut KPI yeşil; SEV1=0; denetim dry-run PASS; paydaş imzalı kabul."
  },
  {
    "domain": "sigorta",
    "title": "Hasar core replatform",
    "scopeHint": "Anaframe → microservice",
    "orgType": "Hayat sigortası şirketi",
    "phases": "Vendor seçim (2 hf): Anaframe → microservice RFP.\nKonfigürasyon (5 hf): Hasar core replatform setup.\nEntegrasyon test (5 hf): API doğrulama.\nKabul (2 hf): İş birimi UAT.\nGo-live (2 hf): Kademeli. Ref: PP-131.",
    "deliverables": "Hasar core replatform (PP-131): gereksinim paketi, mimari ADR, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Anaframe → microservice; sigorta onay süreçleri; regülasyon izni; kritik yol: Hasar core replatform.",
    "stakeholders": "Program: PM-131. Teknik: TL-SIG-10. İş: Sponsor-Hasarcore. Kalite: QA-10. Ops: SRE-131.",
    "timeline": "17 hf toplam; kritik yol Hasar core replatform. Buffer %14. Blackout: peak sezon.",
    "exitCriteria": "PP-131 kabul: Anaframe → microservice KPI yeşil; SEV1=0; güvenlik gate PASS; paydaş imzalı kabul."
  },
  {
    "domain": "turizm",
    "title": "Rezervasyon motoru peak sezon",
    "scopeHint": "Peak sezon öncesi lansman",
    "orgType": "12 otellik butik zincir",
    "phases": "Veri temizleme (5 hf): Peak sezon öncesi lansman kalite.\nModel eğitim (7 hf): Rezervasyon motoru peak sezon ML pipeline.\nShadow mode (4 hf): Paralel karşılaştırma.\nCutover (3 hf): Model swap.\nİzleme (5 hf): Drift alarm. Ref: PP-132.",
    "deliverables": "Rezervasyon motoru peak sezon (PP-132): gereksinim paketi, entegrasyon spec, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Peak sezon öncesi lansman; turizm onay süreçleri; altyapı provisioning; kritik yol: Rezervasyon motoru peak sezon.",
    "stakeholders": "Program: PM-132. Teknik: TL-TUR-11. İş: Sponsor-Rezervasyo. Kalite: QA-11. Ops: SRE-132.",
    "timeline": "19 hf toplam; kritik yol Rezervasyon motoru peak sezon. Buffer %15. Blackout: hasat dönemi.",
    "exitCriteria": "PP-132 kabul: Peak sezon öncesi lansman KPI yeşil; SEV1=0; pen test temiz; paydaş imzalı kabul."
  },
  {
    "domain": "üretim",
    "title": "MES 3 hat pilot",
    "scopeHint": "3 hat pilot sonra 12 hat",
    "orgType": "Otomotiv Tier-1 tedarikçi",
    "phases": "Keşif (3 hf): 3 hat pilot sonra 12 hat kapsam kilidi, RACI, veri haritası.\nMimari (4 hf): MES 3 hat pilot hedef mimari ADR, güvenlik review.\nMigrasyon (7 hf): Veri ETL, paralel run, regresyon.\nUAT (2 hf): Pilot kullanıcı, performans testi.\nGo-live (1 hf): Kademeli cutover, hypercare. Ref: PP-133.",
    "deliverables": "MES 3 hat pilot (PP-133): gereksinim paketi, test planı, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "3 hat pilot sonra 12 hat; üretim onay süreçleri; veri migrasyon penceresi; kritik yol: MES 3 hat pilot.",
    "stakeholders": "Program: PM-133. Teknik: TL-ÜRE-12. İş: Sponsor-MES3hat. Kalite: QA-12. Ops: SRE-133.",
    "timeline": "18 hf toplam; kritik yol MES 3 hat pilot. Buffer %10. Blackout: regülasyon deadline.",
    "exitCriteria": "PP-133 kabul: 3 hat pilot sonra 12 hat KPI yeşil; SEV1=0; DR tatbikatı OK; paydaş imzalı kabul."
  },
  {
    "domain": "siber güvenlik",
    "title": "SOC2 Type II kapanış",
    "scopeHint": "Kontrol kapanışı 6 ay",
    "orgType": "MSSP siber güvenlik firması",
    "phases": "Regülasyon analiz (5 hf): Kontrol kapanışı 6 ay gap analizi.\nTasarım (6 hf): Rapor veri modeli.\nGeliştirme (13 hf): SOC2 Type II kapanış modül sprintleri.\nDoğrulama (4 hf): Denetim dry-run.\nCanlı (3 hf): Resmi raporlama. Ref: PP-134.",
    "deliverables": "SOC2 Type II kapanış (PP-134): gereksinim paketi, güvenlik değerlendirme, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Kontrol kapanışı 6 ay; siber güvenlik onay süreçleri; kullanıcı eğitim takvimi; kritik yol: SOC2 Type II kapanış.",
    "stakeholders": "Program: PM-134. Teknik: TL-SIB-13. İş: Sponsor-SOC2Type. Kalite: QA-13. Ops: SRE-134.",
    "timeline": "20 hf toplam; kritik yol SOC2 Type II kapanış. Buffer %11. Blackout:  seçim dönemi.",
    "exitCriteria": "PP-134 kabul: Kontrol kapanışı 6 ay KPI yeşil; SEV1=0; rollback test OK; paydaş imzalı kabul."
  },
  {
    "domain": "mobil uygulamalar",
    "title": "Super app cüzdan modülü",
    "scopeHint": "Cüzdan mevcut uygulamaya",
    "orgType": "10M indirmeli mobil fintech",
    "phases": "FHIR mapping (3 hf): Cüzdan mevcut uygulamaya resource haritası.\nEntegrasyon (7 hf): HL7 v2 → FHIR adapter.\nKlinik UAT (5 hf): Super app cüzdan modülü pilot.\nGüvenlik (2 hf): KVKK DPIA.\nProd (2 hf): Kademeli servis. Ref: PP-135.",
    "deliverables": "Super app cüzdan modülü (PP-135): gereksinim paketi, veri sözlüğü, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Cüzdan mevcut uygulamaya; mobil uygulamalar onay süreçleri; vendor API SLA; kritik yol: Super app cüzdan modülü.",
    "stakeholders": "Program: PM-135. Teknik: TL-MOB-14. İş: Sponsor-Superapp. Kalite: QA-14. Ops: SRE-135.",
    "timeline": "22 hf toplam; kritik yol Super app cüzdan modülü. Buffer %12. Blackout: yılsonu freeze.",
    "exitCriteria": "PP-135 kabul: Cüzdan mevcut uygulamaya KPI yeşil; SEV1=0; denetim dry-run PASS; paydaş imzalı kabul."
  },
  {
    "domain": "saas",
    "title": "Billing v2 usage-based",
    "scopeHint": "Kullanım bazlı faturalandırma",
    "orgType": "Seri B SaaS scale-up",
    "phases": "Kampüs keşif (3 hf×N): Kullanım bazlı faturalandırma yerel ihtiyaç.\nPlatform (5 hf): LMS core deploy.\nİçerik migrasyon (6 hf): Billing v2 usage-based aktarım.\nEğitim (2 hf): Workshop.\nGo-live (3 hf): Dönem başı. Ref: PP-136.",
    "deliverables": "Billing v2 usage-based (PP-136): gereksinim paketi, mimari ADR, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Kullanım bazlı faturalandırma; saas onay süreçleri; regülasyon izni; kritik yol: Billing v2 usage-based.",
    "stakeholders": "Program: PM-136. Teknik: TL-SAA-15. İş: Sponsor-Billingv2. Kalite: QA-15. Ops: SRE-136.",
    "timeline": "21 hf toplam; kritik yol Billing v2 usage-based. Buffer %13. Blackout: peak sezon.",
    "exitCriteria": "PP-136 kabul: Kullanım bazlı faturalandırma KPI yeşil; SEV1=0; güvenlik gate PASS; paydaş imzalı kabul."
  },
  {
    "domain": "finans",
    "title": "Open Banking API gateway",
    "scopeHint": "PSD2 uyum API",
    "orgType": "Katılım bankası dijital kanal",
    "phases": "Hasat öncesi (1 hf): PSD2 uyum API snapshot.\nERP config (4 hf): Open Banking API gateway parametre.\nEğitim (2 hf): Personel.\nPilot (2 hf): 3 kantar canlı.\nSezon (9 hf): Hypercare. Ref: PP-137.",
    "deliverables": "Open Banking API gateway (PP-137): gereksinim paketi, entegrasyon spec, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "PSD2 uyum API; finans onay süreçleri; altyapı provisioning; kritik yol: Open Banking API gateway.",
    "stakeholders": "Program: PM-137. Teknik: TL-FIN-16. İş: Sponsor-OpenBanki. Kalite: QA-16. Ops: SRE-137.",
    "timeline": "15 hf toplam; kritik yol Open Banking API gateway. Buffer %14. Blackout: hasat dönemi.",
    "exitCriteria": "PP-137 kabul: PSD2 uyum API KPI yeşil; SEV1=0; pen test temiz; paydaş imzalı kabul."
  },
  {
    "domain": "sağlık",
    "title": "Lab cihaz HL7 modernizasyon",
    "scopeHint": "15 lab cihazı bağlantısı",
    "orgType": "Özel hastane grubu (6 kampüs)",
    "phases": "Paralel run (3 hf): 15 lab cihazı bağlantısı dual-write.\nWMS config (6 hf): Lab cihaz HL7 modernizasyon kuralları.\nOperasyon eğitim (4 hf): Shift eğitimi.\nCutover (2 hf): Gece geçiş.\nStabilizasyon (4 hf): Verimlilik izleme. Ref: PP-138.",
    "deliverables": "Lab cihaz HL7 modernizasyon (PP-138): gereksinim paketi, test planı, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "15 lab cihazı bağlantısı; sağlık onay süreçleri; veri migrasyon penceresi; kritik yol: Lab cihaz HL7 modernizasyon.",
    "stakeholders": "Program: PM-138. Teknik: TL-SAĞ-17. İş: Sponsor-Labcihaz. Kalite: QA-17. Ops: SRE-138.",
    "timeline": "17 hf toplam; kritik yol Lab cihaz HL7 modernizasyon. Buffer %15. Blackout: regülasyon deadline.",
    "exitCriteria": "PP-138 kabul: 15 lab cihazı bağlantısı KPI yeşil; SEV1=0; DR tatbikatı OK; paydaş imzalı kabul."
  },
  {
    "domain": "eğitim",
    "title": "Proctoring modül entegrasyon",
    "scopeHint": "Online sınav güvenliği",
    "orgType": "VET okulu ağı",
    "phases": "Trafik modelleme (2 hf): Online sınav güvenliği load test.\nHeadless FE (7 hf): Proctoring modül entegrasyon storefront.\nCDN/cache (2 hf): Edge optimizasyon.\nLoad test (2 hf): k6 trafik.\nBlack Friday (1 hf): War room. Ref: PP-139.",
    "deliverables": "Proctoring modül entegrasyon (PP-139): gereksinim paketi, güvenlik değerlendirme, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Online sınav güvenliği; eğitim onay süreçleri; kullanıcı eğitim takvimi; kritik yol: Proctoring modül entegrasyon.",
    "stakeholders": "Program: PM-139. Teknik: TL-EĞI-18. İş: Sponsor-Proctoring. Kalite: QA-18. Ops: SRE-139.",
    "timeline": "16 hf toplam; kritik yol Proctoring modül entegrasyon. Buffer %10. Blackout:  seçim dönemi.",
    "exitCriteria": "PP-139 kabul: Online sınav güvenliği KPI yeşil; SEV1=0; rollback test OK; paydaş imzalı kabul."
  },
  {
    "domain": "tarım",
    "title": "IoT sensör 5000 deploy",
    "scopeHint": "5000 sensör tarla deploy",
    "orgType": "Organik tarım ihracatçısı",
    "phases": "API tasarım (4 hf): 5000 sensör tarla deploy OpenAPI.\nEntegrasyon (7 hf): e-Devlet test.\nGüvenlik (3 hf): Pen test.\nPilot ilçe (4 hf): IoT sensör 5000 deploy hizmet.\nGenelleme (6 hf): Rollout. Ref: PP-140.",
    "deliverables": "IoT sensör 5000 deploy (PP-140): gereksinim paketi, veri sözlüğü, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "5000 sensör tarla deploy; tarım onay süreçleri; vendor API SLA; kritik yol: IoT sensör 5000 deploy.",
    "stakeholders": "Program: PM-140. Teknik: TL-TAR-19. İş: Sponsor-IoTsensör. Kalite: QA-19. Ops: SRE-140.",
    "timeline": "18 hf toplam; kritik yol IoT sensör 5000 deploy. Buffer %11. Blackout: yılsonu freeze.",
    "exitCriteria": "PP-140 kabul: 5000 sensör tarla deploy KPI yeşil; SEV1=0; denetim dry-run PASS; paydaş imzalı kabul."
  },
  {
    "domain": "lojistik",
    "title": "Cross-dock hub optimizasyon",
    "scopeHint": "Yeni hub cross-dock",
    "orgType": "Cross-dock hub operatörü",
    "phases": "Veri harmonizasyon (7 hf): Yeni hub cross-dock mapping.\nOrganizasyon (5 hf): Cross-dock hub optimizasyon org chart.\nPayroll test (3 hf): Paralel bordro.\nCutover (2 hf): Pay date geçiş.\nStabilizasyon (5 hf): Destek hattı. Ref: PP-141.",
    "deliverables": "Cross-dock hub optimizasyon (PP-141): gereksinim paketi, mimari ADR, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Yeni hub cross-dock; lojistik onay süreçleri; regülasyon izni; kritik yol: Cross-dock hub optimizasyon.",
    "stakeholders": "Program: PM-141. Teknik: TL-LOJ-20. İş: Sponsor-Cross-dock. Kalite: QA-20. Ops: SRE-141.",
    "timeline": "20 hf toplam; kritik yol Cross-dock hub optimizasyon. Buffer %12. Blackout: peak sezon.",
    "exitCriteria": "PP-141 kabul: Yeni hub cross-dock KPI yeşil; SEV1=0; güvenlik gate PASS; paydaş imzalı kabul."
  },
  {
    "domain": "e-ticaret",
    "title": "Marketplace 3P onboarding",
    "scopeHint": "3000 yeni satıcı onboarding",
    "orgType": "Marketplace (8.000 satıcı)",
    "phases": "OT assessment (3 hf): 3000 yeni satıcı onboarding segmentasyon.\nTelemetri gateway (6 hf): Marketplace 3P onboarding adapter.\nBulut ingest (4 hf): Pipeline.\nPilot (2 hf): 10 trafo canlı.\nRollout (7 hf): Fazlı genişleme. Ref: PP-142.",
    "deliverables": "Marketplace 3P onboarding (PP-142): gereksinim paketi, entegrasyon spec, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "3000 yeni satıcı onboarding; e-ticaret onay süreçleri; altyapı provisioning; kritik yol: Marketplace 3P onboarding.",
    "stakeholders": "Program: PM-142. Teknik: TL-E-T-21. İş: Sponsor-Marketplac. Kalite: QA-21. Ops: SRE-142.",
    "timeline": "19 hf toplam; kritik yol Marketplace 3P onboarding. Buffer %13. Blackout: hasat dönemi.",
    "exitCriteria": "PP-142 kabul: 3000 yeni satıcı onboarding KPI yeşil; SEV1=0; pen test temiz; paydaş imzalı kabul."
  },
  {
    "domain": "kamu",
    "title": "Afet iletişim SMS/push",
    "scopeHint": "Acil durum bildirim sistemi",
    "orgType": "Valilik dijital dönüşüm",
    "phases": "Vendor seçim (2 hf): Acil durum bildirim sistemi RFP.\nKonfigürasyon (5 hf): Afet iletişim SMS/push setup.\nEntegrasyon test (5 hf): API doğrulama.\nKabul (2 hf): İş birimi UAT.\nGo-live (2 hf): Kademeli. Ref: PP-143.",
    "deliverables": "Afet iletişim SMS/push (PP-143): gereksinim paketi, test planı, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Acil durum bildirim sistemi; kamu onay süreçleri; veri migrasyon penceresi; kritik yol: Afet iletişim SMS/push.",
    "stakeholders": "Program: PM-143. Teknik: TL-KAM-22. İş: Sponsor-Afetileti. Kalite: QA-22. Ops: SRE-143.",
    "timeline": "21 hf toplam; kritik yol Afet iletişim SMS/push. Buffer %14. Blackout: regülasyon deadline.",
    "exitCriteria": "PP-143 kabul: Acil durum bildirim sistemi KPI yeşil; SEV1=0; DR tatbikatı OK; paydaş imzalı kabul."
  },
  {
    "domain": "insan kaynakları",
    "title": "OKR global rollout",
    "scopeHint": "OKR 8 ülkede",
    "orgType": "Fabrika saha İK (4.000 mavi yaka)",
    "phases": "Veri temizleme (5 hf): OKR 8 ülkede kalite.\nModel eğitim (7 hf): OKR global rollout ML pipeline.\nShadow mode (4 hf): Paralel karşılaştırma.\nCutover (3 hf): Model swap.\nİzleme (5 hf): Drift alarm. Ref: PP-144.",
    "deliverables": "OKR global rollout (PP-144): gereksinim paketi, güvenlik değerlendirme, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "OKR 8 ülkede; insan kaynakları onay süreçleri; kullanıcı eğitim takvimi; kritik yol: OKR global rollout.",
    "stakeholders": "Program: PM-144. Teknik: TL-INS-23. İş: Sponsor-OKRglobal. Kalite: QA-23. Ops: SRE-144.",
    "timeline": "23 hf toplam; kritik yol OKR global rollout. Buffer %15. Blackout:  seçim dönemi.",
    "exitCriteria": "PP-144 kabul: OKR 8 ülkede KPI yeşil; SEV1=0; rollback test OK; paydaş imzalı kabul."
  },
  {
    "domain": "enerji",
    "title": "Demand response sanayi",
    "scopeHint": "Sanayi yük kaydırma programı",
    "orgType": "Yenilenebilir GES portföyü",
    "phases": "Keşif (3 hf): Sanayi yük kaydırma programı kapsam kilidi, RACI, veri haritası.\nMimari (4 hf): Demand response sanayi hedef mimari ADR, güvenlik review.\nMigrasyon (7 hf): Veri ETL, paralel run, regresyon.\nUAT (2 hf): Pilot kullanıcı, performans testi.\nGo-live (1 hf): Kademeli cutover, hypercare. Ref: PP-145.",
    "deliverables": "Demand response sanayi (PP-145): gereksinim paketi, veri sözlüğü, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Sanayi yük kaydırma programı; enerji onay süreçleri; vendor API SLA; kritik yol: Demand response sanayi.",
    "stakeholders": "Program: PM-145. Teknik: TL-ENE-24. İş: Sponsor-Demandres. Kalite: QA-24. Ops: SRE-145.",
    "timeline": "14 hf toplam; kritik yol Demand response sanayi. Buffer %10. Blackout: yılsonu freeze.",
    "exitCriteria": "PP-145 kabul: Sanayi yük kaydırma programı KPI yeşil; SEV1=0; denetim dry-run PASS; paydaş imzalı kabul."
  },
  {
    "domain": "sigorta",
    "title": "Dijital poliçe mobil",
    "scopeHint": "Mobil poliçe teslim",
    "orgType": "Kasko dijital asistan",
    "phases": "Regülasyon analiz (5 hf): Mobil poliçe teslim gap analizi.\nTasarım (6 hf): Rapor veri modeli.\nGeliştirme (10 hf): Dijital poliçe mobil modül sprintleri.\nDoğrulama (4 hf): Denetim dry-run.\nCanlı (3 hf): Resmi raporlama. Ref: PP-146.",
    "deliverables": "Dijital poliçe mobil (PP-146): gereksinim paketi, mimari ADR, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Mobil poliçe teslim; sigorta onay süreçleri; regülasyon izni; kritik yol: Dijital poliçe mobil.",
    "stakeholders": "Program: PM-146. Teknik: TL-SIG-25. İş: Sponsor-Dijitalpo. Kalite: QA-25. Ops: SRE-146.",
    "timeline": "16 hf toplam; kritik yol Dijital poliçe mobil. Buffer %11. Blackout: peak sezon.",
    "exitCriteria": "PP-146 kabul: Mobil poliçe teslim KPI yeşil; SEV1=0; güvenlik gate PASS; paydaş imzalı kabul."
  },
  {
    "domain": "turizm",
    "title": "RevPAR dinamik fiyatlama",
    "scopeHint": "RevPAR motoru 12 otel",
    "orgType": "Charter tur operatörü",
    "phases": "FHIR mapping (3 hf): RevPAR motoru 12 otel resource haritası.\nEntegrasyon (7 hf): HL7 v2 → FHIR adapter.\nKlinik UAT (5 hf): RevPAR dinamik fiyatlama pilot.\nGüvenlik (2 hf): KVKK DPIA.\nProd (2 hf): Kademeli servis. Ref: PP-147.",
    "deliverables": "RevPAR dinamik fiyatlama (PP-147): gereksinim paketi, entegrasyon spec, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "RevPAR motoru 12 otel; turizm onay süreçleri; altyapı provisioning; kritik yol: RevPAR dinamik fiyatlama.",
    "stakeholders": "Program: PM-147. Teknik: TL-TUR-26. İş: Sponsor-RevPARdin. Kalite: QA-26. Ops: SRE-147.",
    "timeline": "18 hf toplam; kritik yol RevPAR dinamik fiyatlama. Buffer %12. Blackout: hasat dönemi.",
    "exitCriteria": "PP-147 kabul: RevPAR motoru 12 otel KPI yeşil; SEV1=0; pen test temiz; paydaş imzalı kabul."
  },
  {
    "domain": "üretim",
    "title": "Predictive maintenance pilot",
    "scopeHint": "Titreşim sensörü 20 makine",
    "orgType": "Beyaz eşya fabrikası MES",
    "phases": "Kampüs keşif (3 hf×N): Titreşim sensörü 20 makine yerel ihtiyaç.\nPlatform (5 hf): LMS core deploy.\nİçerik migrasyon (8 hf): Predictive maintenance pilot aktarım.\nEğitim (2 hf): Workshop.\nGo-live (3 hf): Dönem başı. Ref: PP-148.",
    "deliverables": "Predictive maintenance pilot (PP-148): gereksinim paketi, test planı, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "Titreşim sensörü 20 makine; üretim onay süreçleri; veri migrasyon penceresi; kritik yol: Predictive maintenance pilot.",
    "stakeholders": "Program: PM-148. Teknik: TL-ÜRE-27. İş: Sponsor-Predictive. Kalite: QA-27. Ops: SRE-148.",
    "timeline": "17 hf toplam; kritik yol Predictive maintenance pilot. Buffer %13. Blackout: regülasyon deadline.",
    "exitCriteria": "PP-148 kabul: Titreşim sensörü 20 makine KPI yeşil; SEV1=0; DR tatbikatı OK; paydaş imzalı kabul."
  },
  {
    "domain": "siber güvenlik",
    "title": "IAM 5 legacy konsolidasyon",
    "scopeHint": "5 IAM → tek platform",
    "orgType": "Zero-trust danışmanlık",
    "phases": "Hasat öncesi (1 hf): 5 IAM → tek platform snapshot.\nERP config (4 hf): IAM 5 legacy konsolidasyon parametre.\nEğitim (2 hf): Personel.\nPilot (2 hf): 3 kantar canlı.\nSezon (11 hf): Hypercare. Ref: PP-149.",
    "deliverables": "IAM 5 legacy konsolidasyon (PP-149): gereksinim paketi, güvenlik değerlendirme, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "5 IAM → tek platform; siber güvenlik onay süreçleri; kullanıcı eğitim takvimi; kritik yol: IAM 5 legacy konsolidasyon.",
    "stakeholders": "Program: PM-149. Teknik: TL-SIB-28. İş: Sponsor-IAM5lega. Kalite: QA-28. Ops: SRE-149.",
    "timeline": "19 hf toplam; kritik yol IAM 5 legacy konsolidasyon. Buffer %14. Blackout:  seçim dönemi.",
    "exitCriteria": "PP-149 kabul: 5 IAM → tek platform KPI yeşil; SEV1=0; rollback test OK; paydaş imzalı kabul."
  },
  {
    "domain": "mobil uygulamalar",
    "title": "Offline-first saha satış",
    "scopeHint": "200 saha satış offline sync",
    "orgType": "Sağlık wellness super-app",
    "phases": "Paralel run (3 hf): 200 saha satış offline sync dual-write.\nWMS config (6 hf): Offline-first saha satış kuralları.\nOperasyon eğitim (4 hf): Shift eğitimi.\nCutover (2 hf): Gece geçiş.\nStabilizasyon (4 hf): Verimlilik izleme. Ref: PP-150.",
    "deliverables": "Offline-first saha satış (PP-150): gereksinim paketi, veri sözlüğü, operasyon runbook, eğitim materyali, kabul tutanağı.",
    "dependencies": "200 saha satış offline sync; mobil uygulamalar onay süreçleri; vendor API SLA; kritik yol: Offline-first saha satış.",
    "stakeholders": "Program: PM-150. Teknik: TL-MOB-29. İş: Sponsor-Offline-fi. Kalite: QA-29. Ops: SRE-150.",
    "timeline": "21 hf toplam; kritik yol Offline-first saha satış. Buffer %15. Blackout: yılsonu freeze.",
    "exitCriteria": "PP-150 kabul: 200 saha satış offline sync KPI yeşil; SEV1=0; denetim dry-run PASS; paydaş imzalı kabul."
  }
];
export const REQ_BASE = [
  {
    "domain": "saas",
    "title": "Çoklu workspace",
    "businessNeed": "Kullanıcılar workspace değiştirmek istiyor",
    "functional": "REQ-121: Çoklu workspace — Kullanıcılar workspace değiştirmek istiyor\nKullanıcı, çoklu workspace akışını mobil uygulamadan 3 adımda tamamlayabilmelidir.\nSistem, çoklu workspace SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-121-A: p95 API yanıt < 380 ms. NFR-121-B: availability >= %99.93. NFR-121-C: RPO 8 dk, RTO 45 dk. NFR-121-D: 220 eşzamanlı oturum.",
    "assumptions": "saas API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Çoklu workspace kapsamını onayladı.",
    "constraints": "Kullanıcılar workspace değiştirmek istiyor dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; saas regülasyon sınırları geçerli.",
    "openQuestions": "Çoklu workspace veri saklama süresi? saas tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-121)?"
  },
  {
    "domain": "finans",
    "title": "Limit alarm",
    "businessNeed": "Kredi limit %90 uyarı",
    "functional": "REQ-122: Limit alarm — Kredi limit %90 uyarı\nLimit alarm işlemi tamamlandığında audit log'a kullanıcı, zaman damgası ve tenant ID yazılmalıdır.\nOnay bekleyen limit alarm kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-122-A: p95 < 620 ms. NFR-122-B: %99.87 uptime. NFR-122-C: KVKK veri minimizasyonu. NFR-122-D: Audit 36 ay saklama.",
    "assumptions": "finans API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Limit alarm kapsamını onayladı.",
    "constraints": "Kredi limit %90 uyarı dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; finans regülasyon sınırları geçerli.",
    "openQuestions": "Limit alarm veri saklama süresi? finans tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-122)?"
  },
  {
    "domain": "sağlık",
    "title": "Randevu iptali",
    "businessNeed": "24 saat kuralı bekleme listesi",
    "functional": "REQ-123: Randevu iptali — 24 saat kuralı bekleme listesi\nGeçersiz sağlık girdisi reddedilmeli; alan bazlı Türkçe hata mesajı gösterilmelidir.\nRandevu iptali raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-123-A: p95 < 290 ms kritik uç. NFR-123-B: %99.98 availability. NFR-123-C: WCAG 2.1 AA. NFR-123-D: 1200 req/s peak.",
    "assumptions": "sağlık API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Randevu iptali kapsamını onayladı.",
    "constraints": "24 saat kuralı bekleme listesi dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; sağlık regülasyon sınırları geçerli.",
    "openQuestions": "Randevu iptali veri saklama süresi? sağlık tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-123)?"
  },
  {
    "domain": "eğitim",
    "title": "Devamsızlık bildirimi",
    "businessNeed": "Veli push bildirimi anında",
    "functional": "REQ-124: Devamsızlık bildirimi — Veli push bildirimi anında\nDevamsızlık bildirimi modülü mevcut eğitim SSO ile kimlik doğrulaması kullanmalıdır.\nSistem, devamsızlık bildirimi SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-124-A: p95 < 510 ms. NFR-124-B: %99.91 uptime. NFR-124-C: TLS 1.3 zorunlu. NFR-124-D: 450 concurrent user.",
    "assumptions": "eğitim API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Devamsızlık bildirimi kapsamını onayladı.",
    "constraints": "Veli push bildirimi anında dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; eğitim regülasyon sınırları geçerli.",
    "openQuestions": "Devamsızlık bildirimi veri saklama süresi? eğitim tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-124)?"
  },
  {
    "domain": "tarım",
    "title": "Hasat kaydı",
    "businessNeed": "Tarla bazlı verim girişi",
    "functional": "REQ-125: Hasat kaydı — Tarla bazlı verim girişi\nSistem, tarla bazlı verim girişi durumunda ilgili kullanıcıya 60 sn içinde bildirim göndermelidir.\nOnay bekleyen hasat kaydı kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-125-A: p95 < 740 ms batch. NFR-125-B: %99.5 uptime. NFR-125-C: Offline 72 saat buffer. NFR-125-D: Sync conflict UI.",
    "assumptions": "tarım API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Hasat kaydı kapsamını onayladı.",
    "constraints": "Tarla bazlı verim girişi dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; tarım regülasyon sınırları geçerli.",
    "openQuestions": "Hasat kaydı veri saklama süresi? tarım tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-125)?"
  },
  {
    "domain": "lojistik",
    "title": "POD fotoğraf",
    "businessNeed": "Teslim kanıtı foto zorunlu",
    "functional": "REQ-126: POD fotoğraf — Teslim kanıtı foto zorunlu\nKullanıcı, pod fotoğraf akışını mobil uygulamadan 3 adımda tamamlayabilmelidir.\nPOD fotoğraf raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-126-A: p95 API yanıt < 380 ms. NFR-126-B: availability >= %99.93. NFR-126-C: RPO 8 dk, RTO 45 dk. NFR-126-D: 220 eşzamanlı oturum.",
    "assumptions": "lojistik API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk POD fotoğraf kapsamını onayladı.",
    "constraints": "Teslim kanıtı foto zorunlu dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; lojistik regülasyon sınırları geçerli.",
    "openQuestions": "POD fotoğraf veri saklama süresi? lojistik tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-126)?"
  },
  {
    "domain": "e-ticaret",
    "title": "Stok rezervasyon",
    "businessNeed": "Checkout'ta 15 dk stok hold",
    "functional": "REQ-127: Stok rezervasyon — Checkout'ta 15 dk stok hold\nStok rezervasyon işlemi tamamlandığında audit log'a kullanıcı, zaman damgası ve tenant ID yazılmalıdır.\nSistem, stok rezervasyon SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-127-A: p95 < 620 ms. NFR-127-B: %99.87 uptime. NFR-127-C: KVKK veri minimizasyonu. NFR-127-D: Audit 36 ay saklama.",
    "assumptions": "e-ticaret API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Stok rezervasyon kapsamını onayladı.",
    "constraints": "Checkout'ta 15 dk stok hold dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; e-ticaret regülasyon sınırları geçerli.",
    "openQuestions": "Stok rezervasyon veri saklama süresi? e-ticaret tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-127)?"
  },
  {
    "domain": "kamu",
    "title": "Şikayet SLA",
    "businessNeed": "72 saat ilk yanıt SLA",
    "functional": "REQ-128: Şikayet SLA — 72 saat ilk yanıt SLA\nGeçersiz kamu girdisi reddedilmeli; alan bazlı Türkçe hata mesajı gösterilmelidir.\nOnay bekleyen şikayet sla kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-128-A: p95 < 290 ms kritik uç. NFR-128-B: %99.98 availability. NFR-128-C: WCAG 2.1 AA. NFR-128-D: 1200 req/s peak.",
    "assumptions": "kamu API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Şikayet SLA kapsamını onayladı.",
    "constraints": "72 saat ilk yanıt SLA dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; kamu regülasyon sınırları geçerli.",
    "openQuestions": "Şikayet SLA veri saklama süresi? kamu tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-128)?"
  },
  {
    "domain": "insan kaynakları",
    "title": "İzin onayı",
    "businessNeed": "Yönetici mobil izin onayı",
    "functional": "REQ-129: İzin onayı — Yönetici mobil izin onayı\nİzin onayı modülü mevcut insan kaynakları SSO ile kimlik doğrulaması kullanmalıdır.\nİzin onayı raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-129-A: p95 < 510 ms. NFR-129-B: %99.91 uptime. NFR-129-C: TLS 1.3 zorunlu. NFR-129-D: 450 concurrent user.",
    "assumptions": "insan kaynakları API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk İzin onayı kapsamını onayladı.",
    "constraints": "Yönetici mobil izin onayı dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; insan kaynakları regülasyon sınırları geçerli.",
    "openQuestions": "İzin onayı veri saklama süresi? insan kaynakları tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-129)?"
  },
  {
    "domain": "enerji",
    "title": "Alarm eşiği",
    "businessNeed": "Trafo yük %85 uyarı",
    "functional": "REQ-130: Alarm eşiği — Trafo yük %85 uyarı\nSistem, trafo yük %85 uyarı durumunda ilgili kullanıcıya 60 sn içinde bildirim göndermelidir.\nSistem, alarm eşiği SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-130-A: p95 < 740 ms batch. NFR-130-B: %99.5 uptime. NFR-130-C: Offline 72 saat buffer. NFR-130-D: Sync conflict UI.",
    "assumptions": "enerji API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Alarm eşiği kapsamını onayladı.",
    "constraints": "Trafo yük %85 uyarı dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; enerji regülasyon sınırları geçerli.",
    "openQuestions": "Alarm eşiği veri saklama süresi? enerji tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-130)?"
  },
  {
    "domain": "sigorta",
    "title": "Hasar foto",
    "businessNeed": "Minimum 3 açı hasar foto",
    "functional": "REQ-131: Hasar foto — Minimum 3 açı hasar foto\nKullanıcı, hasar foto akışını mobil uygulamadan 3 adımda tamamlayabilmelidir.\nOnay bekleyen hasar foto kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-131-A: p95 API yanıt < 380 ms. NFR-131-B: availability >= %99.93. NFR-131-C: RPO 8 dk, RTO 45 dk. NFR-131-D: 220 eşzamanlı oturum.",
    "assumptions": "sigorta API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Hasar foto kapsamını onayladı.",
    "constraints": "Minimum 3 açı hasar foto dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; sigorta regülasyon sınırları geçerli.",
    "openQuestions": "Hasar foto veri saklama süresi? sigorta tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-131)?"
  },
  {
    "domain": "turizm",
    "title": "İptal politikası",
    "businessNeed": "Esnek iptal paketi seçimi",
    "functional": "REQ-132: İptal politikası — Esnek iptal paketi seçimi\nİptal politikası işlemi tamamlandığında audit log'a kullanıcı, zaman damgası ve tenant ID yazılmalıdır.\nİptal politikası raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-132-A: p95 < 620 ms. NFR-132-B: %99.87 uptime. NFR-132-C: KVKK veri minimizasyonu. NFR-132-D: Audit 36 ay saklama.",
    "assumptions": "turizm API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk İptal politikası kapsamını onayladı.",
    "constraints": "Esnek iptal paketi seçimi dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; turizm regülasyon sınırları geçerli.",
    "openQuestions": "İptal politikası veri saklama süresi? turizm tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-132)?"
  },
  {
    "domain": "üretim",
    "title": "Andon",
    "businessNeed": "Hat duruşu anında bildirim",
    "functional": "REQ-133: Andon — Hat duruşu anında bildirim\nGeçersiz üretim girdisi reddedilmeli; alan bazlı Türkçe hata mesajı gösterilmelidir.\nSistem, andon SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-133-A: p95 < 290 ms kritik uç. NFR-133-B: %99.98 availability. NFR-133-C: WCAG 2.1 AA. NFR-133-D: 1200 req/s peak.",
    "assumptions": "üretim API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Andon kapsamını onayladı.",
    "constraints": "Hat duruşu anında bildirim dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; üretim regülasyon sınırları geçerli.",
    "openQuestions": "Andon veri saklama süresi? üretim tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-133)?"
  },
  {
    "domain": "siber güvenlik",
    "title": "MFA zorunlu",
    "businessNeed": "Admin roller MFA zorunlu",
    "functional": "REQ-134: MFA zorunlu — Admin roller MFA zorunlu\nMFA zorunlu modülü mevcut siber güvenlik SSO ile kimlik doğrulaması kullanmalıdır.\nOnay bekleyen mfa zorunlu kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-134-A: p95 < 510 ms. NFR-134-B: %99.91 uptime. NFR-134-C: TLS 1.3 zorunlu. NFR-134-D: 450 concurrent user.",
    "assumptions": "siber güvenlik API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk MFA zorunlu kapsamını onayladı.",
    "constraints": "Admin roller MFA zorunlu dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; siber güvenlik regülasyon sınırları geçerli.",
    "openQuestions": "MFA zorunlu veri saklama süresi? siber güvenlik tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-134)?"
  },
  {
    "domain": "mobil uygulamalar",
    "title": "Biometrik giriş",
    "businessNeed": "FaceID/TouchID giriş",
    "functional": "REQ-135: Biometrik giriş — FaceID/TouchID giriş\nSistem, faceid/touchid giriş durumunda ilgili kullanıcıya 60 sn içinde bildirim göndermelidir.\nBiometrik giriş raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-135-A: p95 < 740 ms batch. NFR-135-B: %99.5 uptime. NFR-135-C: Offline 72 saat buffer. NFR-135-D: Sync conflict UI.",
    "assumptions": "mobil uygulamalar API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Biometrik giriş kapsamını onayladı.",
    "constraints": "FaceID/TouchID giriş dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; mobil uygulamalar regülasyon sınırları geçerli.",
    "openQuestions": "Biometrik giriş veri saklama süresi? mobil uygulamalar tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-135)?"
  },
  {
    "domain": "saas",
    "title": "Webhook retry",
    "businessNeed": "Webhook exponential backoff",
    "functional": "REQ-136: Webhook retry — Webhook exponential backoff\nKullanıcı, webhook retry akışını mobil uygulamadan 3 adımda tamamlayabilmelidir.\nSistem, webhook retry SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-136-A: p95 API yanıt < 380 ms. NFR-136-B: availability >= %99.93. NFR-136-C: RPO 8 dk, RTO 45 dk. NFR-136-D: 220 eşzamanlı oturum.",
    "assumptions": "saas API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Webhook retry kapsamını onayladı.",
    "constraints": "Webhook exponential backoff dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; saas regülasyon sınırları geçerli.",
    "openQuestions": "Webhook retry veri saklama süresi? saas tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-136)?"
  },
  {
    "domain": "finans",
    "title": "Mutabakat",
    "businessNeed": "Günlük banka mutabakat",
    "functional": "REQ-137: Mutabakat — Günlük banka mutabakat\nMutabakat işlemi tamamlandığında audit log'a kullanıcı, zaman damgası ve tenant ID yazılmalıdır.\nOnay bekleyen mutabakat kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-137-A: p95 < 620 ms. NFR-137-B: %99.87 uptime. NFR-137-C: KVKK veri minimizasyonu. NFR-137-D: Audit 36 ay saklama.",
    "assumptions": "finans API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Mutabakat kapsamını onayladı.",
    "constraints": "Günlük banka mutabakat dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; finans regülasyon sınırları geçerli.",
    "openQuestions": "Mutabakat veri saklama süresi? finans tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-137)?"
  },
  {
    "domain": "sağlık",
    "title": "Reçete yenileme",
    "businessNeed": "E-reçete entegrasyon",
    "functional": "REQ-138: Reçete yenileme — E-reçete entegrasyon\nGeçersiz sağlık girdisi reddedilmeli; alan bazlı Türkçe hata mesajı gösterilmelidir.\nReçete yenileme raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-138-A: p95 < 290 ms kritik uç. NFR-138-B: %99.98 availability. NFR-138-C: WCAG 2.1 AA. NFR-138-D: 1200 req/s peak.",
    "assumptions": "sağlık API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Reçete yenileme kapsamını onayladı.",
    "constraints": "E-reçete entegrasyon dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; sağlık regülasyon sınırları geçerli.",
    "openQuestions": "Reçete yenileme veri saklama süresi? sağlık tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-138)?"
  },
  {
    "domain": "eğitim",
    "title": "Ödev teslim",
    "businessNeed": "Geç teslim ceza kuralı",
    "functional": "REQ-139: Ödev teslim — Geç teslim ceza kuralı\nÖdev teslim modülü mevcut eğitim SSO ile kimlik doğrulaması kullanmalıdır.\nSistem, ödev teslim SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-139-A: p95 < 510 ms. NFR-139-B: %99.91 uptime. NFR-139-C: TLS 1.3 zorunlu. NFR-139-D: 450 concurrent user.",
    "assumptions": "eğitim API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Ödev teslim kapsamını onayladı.",
    "constraints": "Geç teslim ceza kuralı dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; eğitim regülasyon sınırları geçerli.",
    "openQuestions": "Ödev teslim veri saklama süresi? eğitim tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-139)?"
  },
  {
    "domain": "tarım",
    "title": "Gübre planı",
    "businessNeed": "Toprak analizine göre gübre",
    "functional": "REQ-140: Gübre planı — Toprak analizine göre gübre\nSistem, toprak analizine göre gübre durumunda ilgili kullanıcıya 60 sn içinde bildirim göndermelidir.\nOnay bekleyen gübre planı kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-140-A: p95 < 740 ms batch. NFR-140-B: %99.5 uptime. NFR-140-C: Offline 72 saat buffer. NFR-140-D: Sync conflict UI.",
    "assumptions": "tarım API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Gübre planı kapsamını onayladı.",
    "constraints": "Toprak analizine göre gübre dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; tarım regülasyon sınırları geçerli.",
    "openQuestions": "Gübre planı veri saklama süresi? tarım tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-140)?"
  },
  {
    "domain": "lojistik",
    "title": "Soğuk zincir",
    "businessNeed": "Sıcaklık ihlal alarmı",
    "functional": "REQ-141: Soğuk zincir — Sıcaklık ihlal alarmı\nKullanıcı, soğuk zincir akışını mobil uygulamadan 3 adımda tamamlayabilmelidir.\nSoğuk zincir raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-141-A: p95 API yanıt < 380 ms. NFR-141-B: availability >= %99.93. NFR-141-C: RPO 8 dk, RTO 45 dk. NFR-141-D: 220 eşzamanlı oturum.",
    "assumptions": "lojistik API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Soğuk zincir kapsamını onayladı.",
    "constraints": "Sıcaklık ihlal alarmı dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; lojistik regülasyon sınırları geçerli.",
    "openQuestions": "Soğuk zincir veri saklama süresi? lojistik tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-141)?"
  },
  {
    "domain": "e-ticaret",
    "title": "Bölünmüş sevkiyat",
    "businessNeed": "Kısmi gönderim müşteri bildirimi",
    "functional": "REQ-142: Bölünmüş sevkiyat — Kısmi gönderim müşteri bildirimi\nBölünmüş sevkiyat işlemi tamamlandığında audit log'a kullanıcı, zaman damgası ve tenant ID yazılmalıdır.\nSistem, bölünmüş sevkiyat SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-142-A: p95 < 620 ms. NFR-142-B: %99.87 uptime. NFR-142-C: KVKK veri minimizasyonu. NFR-142-D: Audit 36 ay saklama.",
    "assumptions": "e-ticaret API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Bölünmüş sevkiyat kapsamını onayladı.",
    "constraints": "Kısmi gönderim müşteri bildirimi dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; e-ticaret regülasyon sınırları geçerli.",
    "openQuestions": "Bölünmüş sevkiyat veri saklama süresi? e-ticaret tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-142)?"
  },
  {
    "domain": "kamu",
    "title": "Randevu slot",
    "businessNeed": "Vatandaş online randevu slot",
    "functional": "REQ-143: Randevu slot — Vatandaş online randevu slot\nGeçersiz kamu girdisi reddedilmeli; alan bazlı Türkçe hata mesajı gösterilmelidir.\nOnay bekleyen randevu slot kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-143-A: p95 < 290 ms kritik uç. NFR-143-B: %99.98 availability. NFR-143-C: WCAG 2.1 AA. NFR-143-D: 1200 req/s peak.",
    "assumptions": "kamu API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Randevu slot kapsamını onayladı.",
    "constraints": "Vatandaş online randevu slot dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; kamu regülasyon sınırları geçerli.",
    "openQuestions": "Randevu slot veri saklama süresi? kamu tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-143)?"
  },
  {
    "domain": "insan kaynakları",
    "title": "Masraf formu",
    "businessNeed": "Fiş OCR masraf doldurma",
    "functional": "REQ-144: Masraf formu — Fiş OCR masraf doldurma\nMasraf formu modülü mevcut insan kaynakları SSO ile kimlik doğrulaması kullanmalıdır.\nMasraf formu raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-144-A: p95 < 510 ms. NFR-144-B: %99.91 uptime. NFR-144-C: TLS 1.3 zorunlu. NFR-144-D: 450 concurrent user.",
    "assumptions": "insan kaynakları API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Masraf formu kapsamını onayladı.",
    "constraints": "Fiş OCR masraf doldurma dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; insan kaynakları regülasyon sınırları geçerli.",
    "openQuestions": "Masraf formu veri saklama süresi? insan kaynakları tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-144)?"
  },
  {
    "domain": "enerji",
    "title": "Fatura doğrulama",
    "businessNeed": "Sayaç okuma vs fatura karşılaştırma",
    "functional": "REQ-145: Fatura doğrulama — Sayaç okuma vs fatura karşılaştırma\nSistem, sayaç okuma vs fatura karşılaştırma durumunda ilgili kullanıcıya 60 sn içinde bildirim göndermelidir.\nSistem, fatura doğrulama SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-145-A: p95 < 740 ms batch. NFR-145-B: %99.5 uptime. NFR-145-C: Offline 72 saat buffer. NFR-145-D: Sync conflict UI.",
    "assumptions": "enerji API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Fatura doğrulama kapsamını onayladı.",
    "constraints": "Sayaç okuma vs fatura karşılaştırma dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; enerji regülasyon sınırları geçerli.",
    "openQuestions": "Fatura doğrulama veri saklama süresi? enerji tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-145)?"
  },
  {
    "domain": "sigorta",
    "title": "Poliçe yenileme",
    "businessNeed": "Otomatik yenileme hatırlatma",
    "functional": "REQ-146: Poliçe yenileme — Otomatik yenileme hatırlatma\nKullanıcı, poliçe yenileme akışını mobil uygulamadan 3 adımda tamamlayabilmelidir.\nOnay bekleyen poliçe yenileme kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-146-A: p95 API yanıt < 380 ms. NFR-146-B: availability >= %99.93. NFR-146-C: RPO 8 dk, RTO 45 dk. NFR-146-D: 220 eşzamanlı oturum.",
    "assumptions": "sigorta API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Poliçe yenileme kapsamını onayladı.",
    "constraints": "Otomatik yenileme hatırlatma dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; sigorta regülasyon sınırları geçerli.",
    "openQuestions": "Poliçe yenileme veri saklama süresi? sigorta tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-146)?"
  },
  {
    "domain": "turizm",
    "title": "Grup rezervasyon",
    "businessNeed": "10+ kişi grup indirimi",
    "functional": "REQ-147: Grup rezervasyon — 10+ kişi grup indirimi\nGrup rezervasyon işlemi tamamlandığında audit log'a kullanıcı, zaman damgası ve tenant ID yazılmalıdır.\nGrup rezervasyon raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-147-A: p95 < 620 ms. NFR-147-B: %99.87 uptime. NFR-147-C: KVKK veri minimizasyonu. NFR-147-D: Audit 36 ay saklama.",
    "assumptions": "turizm API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Grup rezervasyon kapsamını onayladı.",
    "constraints": "10+ kişi grup indirimi dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; turizm regülasyon sınırları geçerli.",
    "openQuestions": "Grup rezervasyon veri saklama süresi? turizm tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-147)?"
  },
  {
    "domain": "üretim",
    "title": "Lot traceability",
    "businessNeed": "Geriye dönük lot izlenebilirlik",
    "functional": "REQ-148: Lot traceability — Geriye dönük lot izlenebilirlik\nGeçersiz üretim girdisi reddedilmeli; alan bazlı Türkçe hata mesajı gösterilmelidir.\nSistem, lot traceability SLA ihlalini 5 dk içinde eskalasyon kuralına düşürmelidir.",
    "nonFunctional": "NFR-148-A: p95 < 290 ms kritik uç. NFR-148-B: %99.98 availability. NFR-148-C: WCAG 2.1 AA. NFR-148-D: 1200 req/s peak.",
    "assumptions": "üretim API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Lot traceability kapsamını onayladı.",
    "constraints": "Geriye dönük lot izlenebilirlik dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; üretim regülasyon sınırları geçerli.",
    "openQuestions": "Lot traceability veri saklama süresi? üretim tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-148)?"
  },
  {
    "domain": "siber güvenlik",
    "title": "Secret rotation",
    "businessNeed": "90 günde secret rotation",
    "functional": "REQ-149: Secret rotation — 90 günde secret rotation\nSecret rotation modülü mevcut siber güvenlik SSO ile kimlik doğrulaması kullanmalıdır.\nOnay bekleyen secret rotation kayıtları yönetici kuyruğunda listelenmelidir.",
    "nonFunctional": "NFR-149-A: p95 < 510 ms. NFR-149-B: %99.91 uptime. NFR-149-C: TLS 1.3 zorunlu. NFR-149-D: 450 concurrent user.",
    "assumptions": "siber güvenlik API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Secret rotation kapsamını onayladı.",
    "constraints": "90 günde secret rotation dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; siber güvenlik regülasyon sınırları geçerli.",
    "openQuestions": "Secret rotation veri saklama süresi? siber güvenlik tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-149)?"
  },
  {
    "domain": "mobil uygulamalar",
    "title": "Push tercih",
    "businessNeed": "Bildirim kategori tercihi",
    "functional": "REQ-150: Push tercih — Bildirim kategori tercihi\nSistem, bildirim kategori tercihi durumunda ilgili kullanıcıya 60 sn içinde bildirim göndermelidir.\nPush tercih raporu CSV ve PDF formatında export edilebilmelidir.",
    "nonFunctional": "NFR-150-A: p95 < 740 ms batch. NFR-150-B: %99.5 uptime. NFR-150-C: Offline 72 saat buffer. NFR-150-D: Sync conflict UI.",
    "assumptions": "mobil uygulamalar API dokümantasyonu erişilebilir; pilot kullanıcı eğitimi tamamlanacak; test/staging ortamı sürekli açık; hukuk Push tercih kapsamını onayladı.",
    "constraints": "Bildirim kategori tercihi dışında legacy migrasyon bu fazda yok; bütçe/kadro sabit; tek bölge MVP; mobil uygulamalar regülasyon sınırları geçerli.",
    "openQuestions": "Push tercih veri saklama süresi? mobil uygulamalar tenant izolasyon modeli? Offline kapsam dahil mi? SLA sahibi kim (REQ-150)?"
  }
];
export const TECH_BASE = [
  {
    "domain": "saas",
    "component": "Event outbox",
    "focus": "Transactional outbox pattern",
    "purpose": "Event outbox (T-121) saas ortamında Transactional outbox pattern sağlar; SLA, sınır ve sahiplik bu dokümanda.",
    "architecture": "Olay güdümlü mimari (ref T-121): Event outbox → Kafka topic → tüketici servisler. Outbox tablosu PostgreSQL'de; Debezium CDC ile publish. Transactional outbox pattern akışı at-least-once garanti.",
    "apiData": "REST POST /v1/t121/event-outbox; JSON Schema draft-07; RFC7807 problem+json.",
    "errorHandling": "[T-121] Idempotent retry yalnızca GET/PUT; POST duplicate key 409 döner; DLQ H-121.",
    "security": "[T-121] OAuth2 client credentials; JWT tenant claim; audit immutable 90 gün; secret rotasyon 60 gün.",
    "observability": "[T-121] OpenTelemetry trace; Jaeger UI; p95 alert 200ms.",
    "testing": "[T-121] Unit coverage >= %85; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-121."
  },
  {
    "domain": "finans",
    "component": "Idempotency API",
    "focus": "Ödeme tekrar koruması",
    "purpose": "T-122 kapsamında Idempotency API: Ödeme tekrar koruması — finans domain operasyonel gereksinimleri.",
    "architecture": "REST mikroservis (T-122): API Gateway → Idempotency API (Node.js) → PostgreSQL. Ödeme tekrar koruması için idempotency-key header zorunlu; Redis dedup cache 13 saat TTL.",
    "apiData": "gRPC proto T122IdempotencyAPI; streaming RPC; max message 3MB.",
    "errorHandling": "[T-122] Validation 422 field array; partial success 207 multi-status; bulkhead pool 4.",
    "security": "[T-122] SAML SSO federasyon; JWT tenant claim; audit immutable 91 gün; secret rotasyon 61 gün.",
    "observability": "[T-122] Prometheus histogram; Grafana dashboard T-122; SLO burn rate.",
    "testing": "[T-122] Unit coverage >= %86; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-122."
  },
  {
    "domain": "sağlık",
    "component": "FHIR Patient servisi",
    "focus": "Patient resource CRUD",
    "purpose": "sağlık için FHIR Patient servisi servisi (ref T-123): Patient resource CRUD davranış tanımı ve entegrasyon sözleşmesi.",
    "architecture": "GraphQL federasyon (T-123): Apollo Router → FHIR Patient servisi subgraph. Patient resource CRUD FHIR R4 uyumlu; subscription ile canlı güncelleme.",
    "apiData": "GraphQL mutation T123Create; input validated; error extensions code+field.",
    "errorHandling": "[T-123] Timeout gateway 22s; fallback stale cache 7 dk TTL.",
    "security": "[T-123] mTLS servis mesh; JWT tenant claim; audit immutable 92 gün; secret rotasyon 62 gün.",
    "observability": "[T-123] Structured JSON log; correlationId zorunlu; PII scrub pipeline.",
    "testing": "[T-123] Unit coverage >= %87; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-123."
  },
  {
    "domain": "eğitim",
    "component": "LTI 1.3 tool provider",
    "focus": "LMS tool entegrasyonu",
    "purpose": "Bileşen LTI 1.3 tool provider [T-124]: LMS tool entegrasyonu ihtiyacına yönelik eğitim teknik spesifikasyon.",
    "architecture": "Webhook callback (T-124): LMS → LTI 1.3 tool provider endpoint. LMS tool entegrasyonu HMAC-SHA256 imza; 3 deneme exponential backoff; DLQ SQS.",
    "apiData": "Webhook T-124 {eventId, tenantId, payload, signature}; idempotency index.",
    "errorHandling": "[T-124] Circuit breaker half-open 33s; error budget burn alert.",
    "security": "[T-124] KVKK veri minimizasyonu; JWT tenant claim; audit immutable 93 gün; secret rotasyon 63 gün.",
    "observability": "[T-124] CloudWatch metric; anomaly detection; weekly SLA e-posta.",
    "testing": "[T-124] Unit coverage >= %88; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-124."
  },
  {
    "domain": "tarım",
    "component": "MQTT telemetri gateway",
    "focus": "Sensör telemetri ingest",
    "purpose": "MQTT telemetri gateway modülü T-125: Sensör telemetri ingest; tarım ekiplerinin operasyon/runbook beklentileri dahil.",
    "architecture": "Batch ETL (T-125): Airflow DAG gece 01:00 → MQTT telemetri gateway transform → data lake. Sensör telemetri ingest incremental watermark.",
    "apiData": "Async Avro T-125 {correlationId, payload, retryCount}; schema registry v3.",
    "errorHandling": "[T-125] Poison message 5 retry sonra DLX; manual replay admin UI.",
    "security": "[T-125] Zero-trust MFA; JWT tenant claim; audit immutable 94 gün; secret rotasyon 64 gün.",
    "observability": "[T-125] Datadog APM; custom business counter; error budget panel.",
    "testing": "[T-125] Unit coverage >= %89; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-125."
  },
  {
    "domain": "lojistik",
    "component": "TMS routing engine",
    "focus": "Rota optimizasyon",
    "purpose": "TMS routing engine (T-126) lojistik ortamında Rota optimizasyon sağlar; SLA, sınır ve sahiplik bu dokümanda.",
    "architecture": "Message queue (T-126): RabbitMQ → TMS routing engine worker pool. Rota optimizasyon prefetch=10; poison message DLX; retry max 4.",
    "apiData": "SOAP T-126 WSDL; XSD validated request; MTOM attachment support.",
    "errorHandling": "[T-126] 429 Retry-After header zorunlu; 503 exponential max 4 deneme.",
    "security": "[T-126] OAuth2 client credentials; JWT tenant claim; audit immutable 95 gün; secret rotasyon 65 gün.",
    "observability": "[T-126] Elastic APM; distributed trace; service map dependency.",
    "testing": "[T-126] Unit coverage >= %90; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-126."
  },
  {
    "domain": "e-ticaret",
    "component": "Elasticsearch arama",
    "focus": "Ürün full-text arama",
    "purpose": "T-127 kapsamında Elasticsearch arama: Ürün full-text arama — e-ticaret domain operasyonel gereksinimleri.",
    "architecture": "Stream processing (T-127): Kafka → Flink job → Elasticsearch arama aggregate. Ürün full-text arama 5 dk tumbling window; late event side output.",
    "apiData": "GraphQL subscription T-127; WebSocket transport; auth JWT.",
    "errorHandling": "[T-127] Batch partial failure: başarılı satır commit, hatalı reprocess kuyruğu.",
    "security": "[T-127] SAML SSO federasyon; JWT tenant claim; audit immutable 96 gün; secret rotasyon 66 gün.",
    "observability": "[T-127] Loki log aggregation; LogQL alert; retention 51 gün.",
    "testing": "[T-127] Unit coverage >= %91; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-127."
  },
  {
    "domain": "kamu",
    "component": "e-İmza API adapter",
    "focus": "Nitelikli imza entegrasyonu",
    "purpose": "kamu için e-İmza API adapter servisi (ref T-128): Nitelikli imza entegrasyonu davranış tanımı ve entegrasyon sözleşmesi.",
    "architecture": "Serverless (T-128): API Gateway → Lambda (e-İmza API adapter) → DynamoDB. Nitelikli imza entegrasyonu cold start <750ms; provisioned concurrency peak saatlerde.",
    "apiData": "S3 event trigger T-128; object key pattern; lambda processor.",
    "errorHandling": "[T-128] GraphQL error extensions code; REST RFC7807 problem+json.",
    "security": "[T-128] mTLS servis mesh; JWT tenant claim; audit immutable 97 gün; secret rotasyon 67 gün.",
    "observability": "[T-128] New Relic transaction trace; throughput baseline regression.",
    "testing": "[T-128] Unit coverage >= %92; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-128."
  },
  {
    "domain": "insan kaynakları",
    "component": "SCIM provizyon",
    "focus": "Kullanıcı lifecycle sync",
    "purpose": "Bileşen SCIM provizyon [T-129]: Kullanıcı lifecycle sync ihtiyacına yönelik insan kaynakları teknik spesifikasyon.",
    "architecture": "Mobile offline sync (T-129): Couchbase Lite ↔ SCIM provizyon sync gateway. Kullanıcı lifecycle sync conflict resolution last-write-wins + manual merge UI.",
    "apiData": "REST POST /v1/t129/scim-provizyon; JSON Schema draft-07; RFC7807 problem+json.",
    "errorHandling": "[T-129] gRPC status code mapping; deadline exceeded client retry policy.",
    "security": "[T-129] KVKK veri minimizasyonu; JWT tenant claim; audit immutable 98 gün; secret rotasyon 68 gün.",
    "observability": "[T-129] OpenTelemetry trace; Jaeger UI; p95 alert 208ms.",
    "testing": "[T-129] Unit coverage >= %93; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-129."
  },
  {
    "domain": "enerji",
    "component": "Modbus sayaç okuyucu",
    "focus": "Sayaç okuma servisi",
    "purpose": "Modbus sayaç okuyucu modülü T-130: Sayaç okuma servisi; enerji ekiplerinin operasyon/runbook beklentileri dahil.",
    "architecture": "Edge processing (T-130): Cloudflare Worker → Modbus sayaç okuyucu edge cache. Sayaç okuma servisi coğrafi routing; origin shield; stale-while-revalidate 39s.",
    "apiData": "gRPC proto T130Modbussayaçokuyucu; streaming RPC; max message 3MB.",
    "errorHandling": "[T-130] Webhook delivery log; failed callback 9 retry sonra disable.",
    "security": "[T-130] Zero-trust MFA; JWT tenant claim; audit immutable 99 gün; secret rotasyon 69 gün.",
    "observability": "[T-130] Prometheus histogram; Grafana dashboard T-130; SLO burn rate.",
    "testing": "[T-130] Unit coverage >= %94; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-130."
  },
  {
    "domain": "sigorta",
    "component": "Tarife hesaplama motoru",
    "focus": "Prim hesaplama API",
    "purpose": "Tarife hesaplama motoru (T-131) sigorta ortamında Prim hesaplama API sağlar; SLA, sınır ve sahiplik bu dokümanda.",
    "architecture": "gRPC servis mesh (T-131): Istio → Tarife hesaplama motoru pod. Prim hesaplama API mTLS zorunlu; circuit breaker %50 error threshold.",
    "apiData": "GraphQL mutation T131Create; input validated; error extensions code+field.",
    "errorHandling": "[T-131] Idempotent retry yalnızca GET/PUT; POST duplicate key 409 döner; DLQ H-131.",
    "security": "[T-131] OAuth2 client credentials; JWT tenant claim; audit immutable 100 gün; secret rotasyon 70 gün.",
    "observability": "[T-131] Structured JSON log; correlationId zorunlu; PII scrub pipeline.",
    "testing": "[T-131] Unit coverage >= %85; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-131."
  },
  {
    "domain": "turizm",
    "component": "Channel manager sync",
    "focus": "OTA fiyat push",
    "purpose": "T-132 kapsamında Channel manager sync: OTA fiyat push — turizm domain operasyonel gereksinimleri.",
    "architecture": "CQRS + event sourcing (T-132): Command → Channel manager sync aggregate → event store. OTA fiyat push projection rebuild; snapshot every 111 events.",
    "apiData": "Webhook T-132 {eventId, tenantId, payload, signature}; idempotency index.",
    "errorHandling": "[T-132] Validation 422 field array; partial success 207 multi-status; bulkhead pool 6.",
    "security": "[T-132] SAML SSO federasyon; JWT tenant claim; audit immutable 101 gün; secret rotasyon 71 gün.",
    "observability": "[T-132] CloudWatch metric; anomaly detection; weekly SLA e-posta.",
    "testing": "[T-132] Unit coverage >= %86; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-132."
  },
  {
    "domain": "üretim",
    "component": "OPC-UA PLC köprüsü",
    "focus": "PLC veri köprüsü",
    "purpose": "üretim için OPC-UA PLC köprüsü servisi (ref T-133): PLC veri köprüsü davranış tanımı ve entegrasyon sözleşmesi.",
    "architecture": "SOAP legacy adapter (T-133): ESB → OPC-UA PLC köprüsü wrapper → REST facade. PLC veri köprüsü XSD validation; WS-Security token.",
    "apiData": "Async Avro T-133 {correlationId, payload, retryCount}; schema registry v2.",
    "errorHandling": "[T-133] Timeout gateway 32s; fallback stale cache 7 dk TTL.",
    "security": "[T-133] mTLS servis mesh; JWT tenant claim; audit immutable 102 gün; secret rotasyon 72 gün.",
    "observability": "[T-133] Datadog APM; custom business counter; error budget panel.",
    "testing": "[T-133] Unit coverage >= %87; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-133."
  },
  {
    "domain": "siber güvenlik",
    "component": "SIEM log forwarder",
    "focus": "Log forwarder pipeline",
    "purpose": "Bileşen SIEM log forwarder [T-134]: Log forwarder pipeline ihtiyacına yönelik siber güvenlik teknik spesifikasyon.",
    "architecture": "WebSocket canlı akış (T-134): Client WS → SIEM log forwarder hub → Redis pub/sub. Log forwarder pipeline heartbeat 28s; reconnect backoff.",
    "apiData": "SOAP T-134 WSDL; XSD validated request; MTOM attachment support.",
    "errorHandling": "[T-134] Circuit breaker half-open 43s; error budget burn alert.",
    "security": "[T-134] KVKK veri minimizasyonu; JWT tenant claim; audit immutable 103 gün; secret rotasyon 73 gün.",
    "observability": "[T-134] Elastic APM; distributed trace; service map dependency.",
    "testing": "[T-134] Unit coverage >= %88; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-134."
  },
  {
    "domain": "mobil uygulamalar",
    "component": "Deep link router",
    "focus": "Universal link routing",
    "purpose": "Deep link router modülü T-135: Universal link routing; mobil uygulamalar ekiplerinin operasyon/runbook beklentileri dahil.",
    "architecture": "Scheduled cron pipeline (T-135): Cron 14/24 → Deep link router job. Universal link routing idempotent run key; overlap guard.",
    "apiData": "GraphQL subscription T-135; WebSocket transport; auth JWT.",
    "errorHandling": "[T-135] Poison message 6 retry sonra DLX; manual replay admin UI.",
    "security": "[T-135] Zero-trust MFA; JWT tenant claim; audit immutable 104 gün; secret rotasyon 74 gün.",
    "observability": "[T-135] Loki log aggregation; LogQL alert; retention 59 gün.",
    "testing": "[T-135] Unit coverage >= %89; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-135."
  },
  {
    "domain": "saas",
    "component": "Tenant rate limiter",
    "focus": "Tenant bazlı kota",
    "purpose": "Tenant rate limiter (T-136) saas ortamında Tenant bazlı kota sağlar; SLA, sınır ve sahiplik bu dokümanda.",
    "architecture": "Multi-region active-active (T-136): Tenant rate limiter → global load balancer → regional saas cluster. Tenant bazlı kota conflict-free replicated data type.",
    "apiData": "S3 event trigger T-136; object key pattern; lambda processor.",
    "errorHandling": "[T-136] 429 Retry-After header zorunlu; 503 exponential max 6 deneme.",
    "security": "[T-136] OAuth2 client credentials; JWT tenant claim; audit immutable 105 gün; secret rotasyon 75 gün.",
    "observability": "[T-136] New Relic transaction trace; throughput baseline regression.",
    "testing": "[T-136] Unit coverage >= %90; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-136."
  },
  {
    "domain": "finans",
    "component": "Ledger çift kayıt",
    "focus": "Çift kayıt muhasebe",
    "purpose": "T-137 kapsamında Ledger çift kayıt: Çift kayıt muhasebe — finans domain operasyonel gereksinimleri.",
    "architecture": "Saga orchestration (T-137): Ledger çift kayıt coordinator → compensating transactions. Çift kayıt muhasebe choreographed rollback; timeout 26s per step.",
    "apiData": "REST POST /v1/t137/ledger-çift-kayıt; JSON Schema draft-07; RFC7807 problem+json.",
    "errorHandling": "[T-137] Batch partial failure: başarılı satır commit, hatalı reprocess kuyruğu.",
    "security": "[T-137] SAML SSO federasyon; JWT tenant claim; audit immutable 106 gün; secret rotasyon 76 gün.",
    "observability": "[T-137] OpenTelemetry trace; Jaeger UI; p95 alert 216ms.",
    "testing": "[T-137] Unit coverage >= %91; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-137."
  },
  {
    "domain": "sağlık",
    "component": "Consent yönetim API",
    "focus": "Açık rıza yönetimi",
    "purpose": "sağlık için Consent yönetim API servisi (ref T-138): Açık rıza yönetimi davranış tanımı ve entegrasyon sözleşmesi.",
    "architecture": "Blue-green deploy (T-138): Consent yönetim API v1/v2 parallel; Açık rıza yönetimi traffic switch via service mesh weight.",
    "apiData": "gRPC proto T138ConsentyönetimAPI; streaming RPC; max message 3MB.",
    "errorHandling": "[T-138] GraphQL error extensions code; REST RFC7807 problem+json.",
    "security": "[T-138] mTLS servis mesh; JWT tenant claim; audit immutable 107 gün; secret rotasyon 77 gün.",
    "observability": "[T-138] Prometheus histogram; Grafana dashboard T-138; SLO burn rate.",
    "testing": "[T-138] Unit coverage >= %92; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-138."
  },
  {
    "domain": "eğitim",
    "component": "Proctor webhook ingest",
    "focus": "Sınav olay akışı",
    "purpose": "Bileşen Proctor webhook ingest [T-139]: Sınav olay akışı ihtiyacına yönelik eğitim teknik spesifikasyon.",
    "architecture": "Sidecar proxy (T-139): Envoy → Proctor webhook ingest container. Sınav olay akışı mTLS, rate limit, observability sidecar.",
    "apiData": "GraphQL mutation T139Create; input validated; error extensions code+field.",
    "errorHandling": "[T-139] gRPC status code mapping; deadline exceeded client retry policy.",
    "security": "[T-139] KVKK veri minimizasyonu; JWT tenant claim; audit immutable 108 gün; secret rotasyon 78 gün.",
    "observability": "[T-139] Structured JSON log; correlationId zorunlu; PII scrub pipeline.",
    "testing": "[T-139] Unit coverage >= %93; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-139."
  },
  {
    "domain": "tarım",
    "component": "GeoJSON parsel servisi",
    "focus": "Parsel sınır servisi",
    "purpose": "GeoJSON parsel servisi modülü T-140: Parsel sınır servisi; tarım ekiplerinin operasyon/runbook beklentileri dahil.",
    "architecture": "Data mesh domain (T-140): GeoJSON parsel servisi data product owner → tarım domain API. Parsel sınır servisi self-serve analytics contract.",
    "apiData": "Webhook T-140 {eventId, tenantId, payload, signature}; idempotency index.",
    "errorHandling": "[T-140] Webhook delivery log; failed callback 9 retry sonra disable.",
    "security": "[T-140] Zero-trust MFA; JWT tenant claim; audit immutable 109 gün; secret rotasyon 79 gün.",
    "observability": "[T-140] CloudWatch metric; anomaly detection; weekly SLA e-posta.",
    "testing": "[T-140] Unit coverage >= %94; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-140."
  },
  {
    "domain": "lojistik",
    "component": "POD foto object store",
    "focus": "Teslim foto depolama",
    "purpose": "POD foto object store (T-141) lojistik ortamında Teslim foto depolama sağlar; SLA, sınır ve sahiplik bu dokümanda.",
    "architecture": "Hybrid cloud bridge (T-141): On-prem POD foto object store ↔ cloud lojistik VPC peering. Teslim foto depolama encrypted tunnel; latency budget 100ms.",
    "apiData": "Async Avro T-141 {correlationId, payload, retryCount}; schema registry v4.",
    "errorHandling": "[T-141] Idempotent retry yalnızca GET/PUT; POST duplicate key 409 döner; DLQ H-141.",
    "security": "[T-141] OAuth2 client credentials; JWT tenant claim; audit immutable 110 gün; secret rotasyon 80 gün.",
    "observability": "[T-141] Datadog APM; custom business counter; error budget panel.",
    "testing": "[T-141] Unit coverage >= %85; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-141."
  },
  {
    "domain": "e-ticaret",
    "component": "Cart merge API",
    "focus": "Sepet birleştirme",
    "purpose": "T-142 kapsamında Cart merge API: Sepet birleştirme — e-ticaret domain operasyonel gereksinimleri.",
    "architecture": "Plugin/extension (T-142): Core platform → Cart merge API plugin sandbox. Sepet birleştirme WASM isolation; capability token.",
    "apiData": "SOAP T-142 WSDL; XSD validated request; MTOM attachment support.",
    "errorHandling": "[T-142] Validation 422 field array; partial success 207 multi-status; bulkhead pool 4.",
    "security": "[T-142] SAML SSO federasyon; JWT tenant claim; audit immutable 111 gün; secret rotasyon 81 gün.",
    "observability": "[T-142] Elastic APM; distributed trace; service map dependency.",
    "testing": "[T-142] Unit coverage >= %86; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-142."
  },
  {
    "domain": "kamu",
    "component": "WORM arşiv servisi",
    "focus": "WORM arşiv",
    "purpose": "kamu için WORM arşiv servisi servisi (ref T-143): WORM arşiv davranış tanımı ve entegrasyon sözleşmesi.",
    "architecture": "BFF pattern (T-143): Mobile/web BFF → WORM arşiv servisi aggregation. WORM arşiv response shaping per client; cache 7 min.",
    "apiData": "GraphQL subscription T-143; WebSocket transport; auth JWT.",
    "errorHandling": "[T-143] Timeout gateway 42s; fallback stale cache 7 dk TTL.",
    "security": "[T-143] mTLS servis mesh; JWT tenant claim; audit immutable 112 gün; secret rotasyon 82 gün.",
    "observability": "[T-143] Loki log aggregation; LogQL alert; retention 67 gün.",
    "testing": "[T-143] Unit coverage >= %87; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-143."
  },
  {
    "domain": "insan kaynakları",
    "component": "Payroll export generator",
    "focus": "Bordro dosya üretici",
    "purpose": "Bileşen Payroll export generator [T-144]: Bordro dosya üretici ihtiyacına yönelik insan kaynakları teknik spesifikasyon.",
    "architecture": "Pub/sub fan-out (T-144): Payroll export generator publisher → SNS topic → 6 subscriber. Bordro dosya üretici filter policy per tenant.",
    "apiData": "S3 event trigger T-144; object key pattern; lambda processor.",
    "errorHandling": "[T-144] Circuit breaker half-open 33s; error budget burn alert.",
    "security": "[T-144] KVKK veri minimizasyonu; JWT tenant claim; audit immutable 113 gün; secret rotasyon 83 gün.",
    "observability": "[T-144] New Relic transaction trace; throughput baseline regression.",
    "testing": "[T-144] Unit coverage >= %88; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-144."
  },
  {
    "domain": "enerji",
    "component": "Time-series yük sorgu",
    "focus": "Yük geçmişi sorgu",
    "purpose": "Time-series yük sorgu modülü T-145: Yük geçmişi sorgu; enerji ekiplerinin operasyon/runbook beklentileri dahil.",
    "architecture": "Change data capture (T-145): DB binlog → Time-series yük sorgu CDC connector → search index. Yük geçmişi sorgu eventual consistency 2s SLA.",
    "apiData": "REST POST /v1/t145/time-series-yük-sorgu; JSON Schema draft-07; RFC7807 problem+json.",
    "errorHandling": "[T-145] Poison message 4 retry sonra DLX; manual replay admin UI.",
    "security": "[T-145] Zero-trust MFA; JWT tenant claim; audit immutable 114 gün; secret rotasyon 84 gün.",
    "observability": "[T-145] OpenTelemetry trace; Jaeger UI; p95 alert 224ms.",
    "testing": "[T-145] Unit coverage >= %89; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-145."
  },
  {
    "domain": "sigorta",
    "component": "FNOL bildirim API",
    "focus": "İlk hasar bildirimi",
    "purpose": "FNOL bildirim API (T-146) sigorta ortamında İlk hasar bildirimi sağlar; SLA, sınır ve sahiplik bu dokümanda.",
    "architecture": "API composition (T-146): FNOL bildirim API orchestrator calls 4 downstream APIs. İlk hasar bildirimi parallel fetch; partial degrade.",
    "apiData": "gRPC proto T146FNOLbildirimAPI; streaming RPC; max message 3MB.",
    "errorHandling": "[T-146] 429 Retry-After header zorunlu; 503 exponential max 4 deneme.",
    "security": "[T-146] OAuth2 client credentials; JWT tenant claim; audit immutable 115 gün; secret rotasyon 85 gün.",
    "observability": "[T-146] Prometheus histogram; Grafana dashboard T-146; SLO burn rate.",
    "testing": "[T-146] Unit coverage >= %90; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-146."
  },
  {
    "domain": "turizm",
    "component": "Müsaitlik sorgu servisi",
    "focus": "Oda müsaitlik sorgu",
    "purpose": "T-147 kapsamında Müsaitlik sorgu servisi: Oda müsaitlik sorgu — turizm domain operasyonel gereksinimleri.",
    "architecture": "File drop integration (T-147): SFTP → Müsaitlik sorgu servisi ingest → validation → turizm DB. Oda müsaitlik sorgu virus scan; schema validation.",
    "apiData": "GraphQL mutation T147Create; input validated; error extensions code+field.",
    "errorHandling": "[T-147] Batch partial failure: başarılı satır commit, hatalı reprocess kuyruğu.",
    "security": "[T-147] SAML SSO federasyon; JWT tenant claim; audit immutable 116 gün; secret rotasyon 86 gün.",
    "observability": "[T-147] Structured JSON log; correlationId zorunlu; PII scrub pipeline.",
    "testing": "[T-147] Unit coverage >= %91; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-147."
  },
  {
    "domain": "üretim",
    "component": "SPC X-bar hesaplayıcı",
    "focus": "X-bar R hesaplama",
    "purpose": "üretim için SPC X-bar hesaplayıcı servisi (ref T-148): X-bar R hesaplama davranış tanımı ve entegrasyon sözleşmesi.",
    "architecture": "In-memory grid (T-148): Hazelcast SPC X-bar hesaplayıcı cache grid. X-bar R hesaplama near-cache; partition backup 2.",
    "apiData": "Webhook T-148 {eventId, tenantId, payload, signature}; idempotency index.",
    "errorHandling": "[T-148] GraphQL error extensions code; REST RFC7807 problem+json.",
    "security": "[T-148] mTLS servis mesh; JWT tenant claim; audit immutable 117 gün; secret rotasyon 87 gün.",
    "observability": "[T-148] CloudWatch metric; anomaly detection; weekly SLA e-posta.",
    "testing": "[T-148] Unit coverage >= %92; integration Testcontainers; load test 1.5× peak; contract test CI gate; ref QA-148."
  },
  {
    "domain": "siber güvenlik",
    "component": "OAuth introspection",
    "focus": "Token introspection",
    "purpose": "Bileşen OAuth introspection [T-149]: Token introspection ihtiyacına yönelik siber güvenlik teknik spesifikasyon.",
    "architecture": "Thick client sync (T-149): Desktop OAuth introspection agent ↔ cloud sync. Token introspection delta sync; bandwidth throttle 128KB/s.",
    "apiData": "Async Avro T-149 {correlationId, payload, retryCount}; schema registry v3.",
    "errorHandling": "[T-149] gRPC status code mapping; deadline exceeded client retry policy.",
    "security": "[T-149] KVKK veri minimizasyonu; JWT tenant claim; audit immutable 118 gün; secret rotasyon 88 gün.",
    "observability": "[T-149] Datadog APM; custom business counter; error budget panel.",
    "testing": "[T-149] Unit coverage >= %93; integration Testcontainers; load test 2× peak; contract test CI gate; ref QA-149."
  },
  {
    "domain": "mobil uygulamalar",
    "component": "Device attestation",
    "focus": "Device integrity check",
    "purpose": "Device attestation modülü T-150: Device integrity check; mobil uygulamalar ekiplerinin operasyon/runbook beklentileri dahil.",
    "architecture": "Zero-trust microsegment (T-150): Device attestation pod in isolated mobil uygulamalar namespace. Device integrity check network policy deny-all default; explicit allow list.",
    "apiData": "SOAP T-150 WSDL; XSD validated request; MTOM attachment support.",
    "errorHandling": "[T-150] Webhook delivery log; failed callback 9 retry sonra disable.",
    "security": "[T-150] Zero-trust MFA; JWT tenant claim; audit immutable 119 gün; secret rotasyon 89 gün.",
    "observability": "[T-150] Elastic APM; distributed trace; service map dependency.",
    "testing": "[T-150] Unit coverage >= %94; integration Testcontainers; load test 2.5× peak; contract test CI gate; ref QA-150."
  }
];
export const RISK_BASE = [
  {
    "domain": "saas",
    "title": "Tenant izolasyon ihlali",
    "trigger": "Çok kiracılı veri sızıntısı",
    "intro": "saas sektöründe \"Tenant izolasyon ihlali\" risk değerlendirmesi — tetikleyici: Çok kiracılı veri sızıntısı. Paydaş oturumu: IT liderliğinde. İnceleme dönemi: Q1/2026, kayıt R-121.",
    "risks": [
      {
        "name": "saas ortamında Tenant izolasyon ihlali: Çok kiracılı veri sızıntısı",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "KVKK idari para cezası",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (saas/Tenant izolasyon ihlali, ref R-121-1)"
      },
      {
        "name": "saas entegrasyonunda Tenant izolasyon ihlali bağımlılık hatası",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (saas/Tenant izolasyon ihlali, ref R-121-2)"
      },
      {
        "name": "Çok kiracılı veri sızıntısı kaynaklı Tenant izolasyon ihlali finansal exposure",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Regülasyon rapor ret",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (saas/Tenant izolasyon ihlali, ref R-121-3)"
      },
      {
        "name": "Tenant izolasyon ihlali nedeniyle saas operasyonunda servis kesintisi",
        "probability": "Sık (haftalık)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (saas/Tenant izolasyon ihlali, ref R-121-4)"
      },
      {
        "name": "Tenant izolasyon ihlali regülasyon/denetim bulgusu riski",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "SLA ceza ödemesi",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (saas/Tenant izolasyon ihlali, ref R-121-5)"
      }
    ],
    "footer": "Onay kapısı (Tenant izolasyon ihlali): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 30 gün."
  },
  {
    "domain": "finans",
    "title": "Yanlış limit güncelleme",
    "trigger": "Batch job hatası",
    "intro": "finans sektöründe \"Yanlış limit güncelleme\" risk değerlendirmesi — tetikleyici: Batch job hatası. Paydaş oturumu: İş liderliğinde. İnceleme dönemi: Q2/2026, kayıt R-122.",
    "risks": [
      {
        "name": "Yanlış limit güncelleme nedeniyle finans operasyonunda servis kesintisi",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (finans/Yanlış limit güncelleme, ref R-122-1)"
      },
      {
        "name": "Yanlış limit güncelleme regülasyon/denetim bulgusu riski",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (finans/Yanlış limit güncelleme, ref R-122-2)"
      },
      {
        "name": "Yanlış limit güncelleme — finans tedarik zinciri zafiyeti",
        "probability": "Sık (haftalık)",
        "impact": "Müşteri churn %5+",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (finans/Yanlış limit güncelleme, ref R-122-3)"
      },
      {
        "name": "Batch job hatası — Yanlış limit güncelleme veri hattı tutarsızlığı",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (finans/Yanlış limit güncelleme, ref R-122-4)"
      },
      {
        "name": "finans kullanıcılarında Yanlış limit güncelleme kötüye kullanım senaryosu",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Üretim hattı duruşu",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (finans/Yanlış limit güncelleme, ref R-122-5)"
      }
    ],
    "footer": "Onay kapısı (Yanlış limit güncelleme): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 31 gün."
  },
  {
    "domain": "sağlık",
    "title": "Yanlış hasta eşleşme",
    "trigger": "Kimlik doğrulama zayıf",
    "intro": "sağlık sektöründe \"Yanlış hasta eşleşme\" risk değerlendirmesi — tetikleyici: Kimlik doğrulama zayıf. Paydaş oturumu: Hukuk liderliğinde. İnceleme dönemi: Q3/2026, kayıt R-123.",
    "risks": [
      {
        "name": "Kimlik doğrulama zayıf — Yanlış hasta eşleşme veri hattı tutarsızlığı",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (sağlık/Yanlış hasta eşleşme, ref R-123-1)"
      },
      {
        "name": "sağlık kullanıcılarında Yanlış hasta eşleşme kötüye kullanım senaryosu",
        "probability": "Sık (haftalık)",
        "impact": "Regülasyon rapor ret",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (sağlık/Yanlış hasta eşleşme, ref R-123-2)"
      },
      {
        "name": "sağlık ortamında Yanlış hasta eşleşme: Kimlik doğrulama zayıf",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (sağlık/Yanlış hasta eşleşme, ref R-123-3)"
      },
      {
        "name": "sağlık entegrasyonunda Yanlış hasta eşleşme bağımlılık hatası",
        "probability": "Düşük (5 yılda 1)",
        "impact": "SLA ceza ödemesi",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (sağlık/Yanlış hasta eşleşme, ref R-123-4)"
      },
      {
        "name": "Kimlik doğrulama zayıf kaynaklı Yanlış hasta eşleşme finansal exposure",
        "probability": "Orta (yılda 2)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (sağlık/Yanlış hasta eşleşme, ref R-123-5)"
      }
    ],
    "footer": "Onay kapısı (Yanlış hasta eşleşme): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 32 gün."
  },
  {
    "domain": "eğitim",
    "title": "Sınav içerik sızıntısı",
    "trigger": "Soru bankası erişim kontrolü",
    "intro": "eğitim sektöründe \"Sınav içerik sızıntısı\" risk değerlendirmesi — tetikleyici: Soru bankası erişim kontrolü. Paydaş oturumu: Operasyon liderliğinde. İnceleme dönemi: Q4/2026, kayıt R-124.",
    "risks": [
      {
        "name": "eğitim entegrasyonunda Sınav içerik sızıntısı bağımlılık hatası",
        "probability": "Sık (haftalık)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (eğitim/Sınav içerik sızıntısı, ref R-124-1)"
      },
      {
        "name": "Soru bankası erişim kontrolü kaynaklı Sınav içerik sızıntısı finansal exposure",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Müşteri churn %5+",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (eğitim/Sınav içerik sızıntısı, ref R-124-2)"
      },
      {
        "name": "Sınav içerik sızıntısı nedeniyle eğitim operasyonunda servis kesintisi",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (eğitim/Sınav içerik sızıntısı, ref R-124-3)"
      },
      {
        "name": "Sınav içerik sızıntısı regülasyon/denetim bulgusu riski",
        "probability": "Orta (yılda 2)",
        "impact": "Üretim hattı duruşu",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (eğitim/Sınav içerik sızıntısı, ref R-124-4)"
      },
      {
        "name": "Sınav içerik sızıntısı — eğitim tedarik zinciri zafiyeti",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (eğitim/Sınav içerik sızıntısı, ref R-124-5)"
      }
    ],
    "footer": "Onay kapısı (Sınav içerik sızıntısı): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 33 gün."
  },
  {
    "domain": "tarım",
    "title": "Hava API kesintisi",
    "trigger": "Erken uyarı gecikmesi",
    "intro": "tarım sektöründe \"Hava API kesintisi\" risk değerlendirmesi — tetikleyici: Erken uyarı gecikmesi. Paydaş oturumu: IT liderliğinde. İnceleme dönemi: Q1/2026, kayıt R-125.",
    "risks": [
      {
        "name": "Hava API kesintisi regülasyon/denetim bulgusu riski",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Regülasyon rapor ret",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (tarım/Hava API kesintisi, ref R-125-1)"
      },
      {
        "name": "Hava API kesintisi — tarım tedarik zinciri zafiyeti",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (tarım/Hava API kesintisi, ref R-125-2)"
      },
      {
        "name": "Erken uyarı gecikmesi — Hava API kesintisi veri hattı tutarsızlığı",
        "probability": "Orta (yılda 2)",
        "impact": "SLA ceza ödemesi",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (tarım/Hava API kesintisi, ref R-125-3)"
      },
      {
        "name": "tarım kullanıcılarında Hava API kesintisi kötüye kullanım senaryosu",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (tarım/Hava API kesintisi, ref R-125-4)"
      },
      {
        "name": "tarım ortamında Hava API kesintisi: Erken uyarı gecikmesi",
        "probability": "Çok düşük",
        "impact": "KVKK idari para cezası",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (tarım/Hava API kesintisi, ref R-125-5)"
      }
    ],
    "footer": "Onay kapısı (Hava API kesintisi): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 34 gün."
  },
  {
    "domain": "lojistik",
    "title": "Rota API maliyet artışı",
    "trigger": "Trafik servisi fiyat artışı",
    "intro": "lojistik sektöründe \"Rota API maliyet artışı\" risk değerlendirmesi — tetikleyici: Trafik servisi fiyat artışı. Paydaş oturumu: İş liderliğinde. İnceleme dönemi: Q2/2026, kayıt R-126.",
    "risks": [
      {
        "name": "lojistik kullanıcılarında Rota API maliyet artışı kötüye kullanım senaryosu",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Müşteri churn %5+",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (lojistik/Rota API maliyet artışı, ref R-126-1)"
      },
      {
        "name": "lojistik ortamında Rota API maliyet artışı: Trafik servisi fiyat artışı",
        "probability": "Orta (yılda 2)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (lojistik/Rota API maliyet artışı, ref R-126-2)"
      },
      {
        "name": "lojistik entegrasyonunda Rota API maliyet artışı bağımlılık hatası",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Üretim hattı duruşu",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (lojistik/Rota API maliyet artışı, ref R-126-3)"
      },
      {
        "name": "Trafik servisi fiyat artışı kaynaklı Rota API maliyet artışı finansal exposure",
        "probability": "Çok düşük",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (lojistik/Rota API maliyet artışı, ref R-126-4)"
      },
      {
        "name": "Rota API maliyet artışı nedeniyle lojistik operasyonunda servis kesintisi",
        "probability": "Değişken (mevsimsel)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (lojistik/Rota API maliyet artışı, ref R-126-5)"
      }
    ],
    "footer": "Onay kapısı (Rota API maliyet artışı): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 35 gün."
  },
  {
    "domain": "e-ticaret",
    "title": "PSP outage",
    "trigger": "Ödeme sağlayıcı kesinti",
    "intro": "e-ticaret sektöründe \"PSP outage\" risk değerlendirmesi — tetikleyici: Ödeme sağlayıcı kesinti. Paydaş oturumu: Hukuk liderliğinde. İnceleme dönemi: Q3/2026, kayıt R-127.",
    "risks": [
      {
        "name": "Ödeme sağlayıcı kesinti kaynaklı PSP outage finansal exposure",
        "probability": "Orta (yılda 2)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (e-ticaret/PSP outage, ref R-127-1)"
      },
      {
        "name": "PSP outage nedeniyle e-ticaret operasyonunda servis kesintisi",
        "probability": "Yüksek (ayda 3+)",
        "impact": "SLA ceza ödemesi",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (e-ticaret/PSP outage, ref R-127-2)"
      },
      {
        "name": "PSP outage regülasyon/denetim bulgusu riski",
        "probability": "Çok düşük",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (e-ticaret/PSP outage, ref R-127-3)"
      },
      {
        "name": "PSP outage — e-ticaret tedarik zinciri zafiyeti",
        "probability": "Değişken (mevsimsel)",
        "impact": "KVKK idari para cezası",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (e-ticaret/PSP outage, ref R-127-4)"
      },
      {
        "name": "Ödeme sağlayıcı kesinti — PSP outage veri hattı tutarsızlığı",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (e-ticaret/PSP outage, ref R-127-5)"
      }
    ],
    "footer": "Onay kapısı (PSP outage): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 36 gün."
  },
  {
    "domain": "kamu",
    "title": "Kişisel veri ifşası",
    "trigger": "Yanlış portal yayını",
    "intro": "kamu sektöründe \"Kişisel veri ifşası\" risk değerlendirmesi — tetikleyici: Yanlış portal yayını. Paydaş oturumu: Operasyon liderliğinde. İnceleme dönemi: Q4/2026, kayıt R-128.",
    "risks": [
      {
        "name": "Kişisel veri ifşası — kamu tedarik zinciri zafiyeti",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (kamu/Kişisel veri ifşası, ref R-128-1)"
      },
      {
        "name": "Yanlış portal yayını — Kişisel veri ifşası veri hattı tutarsızlığı",
        "probability": "Çok düşük",
        "impact": "Üretim hattı duruşu",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (kamu/Kişisel veri ifşası, ref R-128-2)"
      },
      {
        "name": "kamu kullanıcılarında Kişisel veri ifşası kötüye kullanım senaryosu",
        "probability": "Değişken (mevsimsel)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (kamu/Kişisel veri ifşası, ref R-128-3)"
      },
      {
        "name": "kamu ortamında Kişisel veri ifşası: Yanlış portal yayını",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (kamu/Kişisel veri ifşası, ref R-128-4)"
      },
      {
        "name": "kamu entegrasyonunda Kişisel veri ifşası bağımlılık hatası",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (kamu/Kişisel veri ifşası, ref R-128-5)"
      }
    ],
    "footer": "Onay kapısı (Kişisel veri ifşası): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 37 gün."
  },
  {
    "domain": "insan kaynakları",
    "title": "Performans verisi bias",
    "trigger": "360 anket güven sorunu",
    "intro": "insan kaynakları sektöründe \"Performans verisi bias\" risk değerlendirmesi — tetikleyici: 360 anket güven sorunu. Paydaş oturumu: IT liderliğinde. İnceleme dönemi: Q1/2026, kayıt R-129.",
    "risks": [
      {
        "name": "insan kaynakları ortamında Performans verisi bias: 360 anket güven sorunu",
        "probability": "Çok düşük",
        "impact": "SLA ceza ödemesi",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (insan kaynakları/Performans verisi bias, ref R-129-1)"
      },
      {
        "name": "insan kaynakları entegrasyonunda Performans verisi bias bağımlılık hatası",
        "probability": "Değişken (mevsimsel)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (insan kaynakları/Performans verisi bias, ref R-129-2)"
      },
      {
        "name": "360 anket güven sorunu kaynaklı Performans verisi bias finansal exposure",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "KVKK idari para cezası",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (insan kaynakları/Performans verisi bias, ref R-129-3)"
      },
      {
        "name": "Performans verisi bias nedeniyle insan kaynakları operasyonunda servis kesintisi",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (insan kaynakları/Performans verisi bias, ref R-129-4)"
      },
      {
        "name": "Performans verisi bias regülasyon/denetim bulgusu riski",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Regülasyon rapor ret",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (insan kaynakları/Performans verisi bias, ref R-129-5)"
      }
    ],
    "footer": "Onay kapısı (Performans verisi bias): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 38 gün."
  },
  {
    "domain": "enerji",
    "title": "SCADA erişim ihlali",
    "trigger": "OT ağ güvenliği",
    "intro": "enerji sektöründe \"SCADA erişim ihlali\" risk değerlendirmesi — tetikleyici: OT ağ güvenliği. Paydaş oturumu: İş liderliğinde. İnceleme dönemi: Q2/2026, kayıt R-130.",
    "risks": [
      {
        "name": "SCADA erişim ihlali nedeniyle enerji operasyonunda servis kesintisi",
        "probability": "Değişken (mevsimsel)",
        "impact": "Üretim hattı duruşu",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (enerji/SCADA erişim ihlali, ref R-130-1)"
      },
      {
        "name": "SCADA erişim ihlali regülasyon/denetim bulgusu riski",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (enerji/SCADA erişim ihlali, ref R-130-2)"
      },
      {
        "name": "SCADA erişim ihlali — enerji tedarik zinciri zafiyeti",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (enerji/SCADA erişim ihlali, ref R-130-3)"
      },
      {
        "name": "OT ağ güvenliği — SCADA erişim ihlali veri hattı tutarsızlığı",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (enerji/SCADA erişim ihlali, ref R-130-4)"
      },
      {
        "name": "enerji kullanıcılarında SCADA erişim ihlali kötüye kullanım senaryosu",
        "probability": "Sık (haftalık)",
        "impact": "Müşteri churn %5+",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (enerji/SCADA erişim ihlali, ref R-130-5)"
      }
    ],
    "footer": "Onay kapısı (SCADA erişim ihlali): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 39 gün."
  },
  {
    "domain": "sigorta",
    "title": "Fraud ring",
    "trigger": "Organize suiistimal",
    "intro": "sigorta sektöründe \"Fraud ring\" risk değerlendirmesi — tetikleyici: Organize suiistimal. Paydaş oturumu: Hukuk liderliğinde. İnceleme dönemi: Q3/2026, kayıt R-131.",
    "risks": [
      {
        "name": "Organize suiistimal — Fraud ring veri hattı tutarsızlığı",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (sigorta/Fraud ring, ref R-131-1)"
      },
      {
        "name": "sigorta kullanıcılarında Fraud ring kötüye kullanım senaryosu",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "KVKK idari para cezası",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (sigorta/Fraud ring, ref R-131-2)"
      },
      {
        "name": "sigorta ortamında Fraud ring: Organize suiistimal",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (sigorta/Fraud ring, ref R-131-3)"
      },
      {
        "name": "sigorta entegrasyonunda Fraud ring bağımlılık hatası",
        "probability": "Sık (haftalık)",
        "impact": "Regülasyon rapor ret",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (sigorta/Fraud ring, ref R-131-4)"
      },
      {
        "name": "Organize suiistimal kaynaklı Fraud ring finansal exposure",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (sigorta/Fraud ring, ref R-131-5)"
      }
    ],
    "footer": "Onay kapısı (Fraud ring): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 40 gün."
  },
  {
    "domain": "turizm",
    "title": "Overbooking",
    "trigger": "Kanal senkron gecikmesi",
    "intro": "turizm sektöründe \"Overbooking\" risk değerlendirmesi — tetikleyici: Kanal senkron gecikmesi. Paydaş oturumu: Operasyon liderliğinde. İnceleme dönemi: Q4/2026, kayıt R-132.",
    "risks": [
      {
        "name": "turizm entegrasyonunda Overbooking bağımlılık hatası",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (turizm/Overbooking, ref R-132-1)"
      },
      {
        "name": "Kanal senkron gecikmesi kaynaklı Overbooking finansal exposure",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (turizm/Overbooking, ref R-132-2)"
      },
      {
        "name": "Overbooking nedeniyle turizm operasyonunda servis kesintisi",
        "probability": "Sık (haftalık)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (turizm/Overbooking, ref R-132-3)"
      },
      {
        "name": "Overbooking regülasyon/denetim bulgusu riski",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Müşteri churn %5+",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (turizm/Overbooking, ref R-132-4)"
      },
      {
        "name": "Overbooking — turizm tedarik zinciri zafiyeti",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (turizm/Overbooking, ref R-132-5)"
      }
    ],
    "footer": "Onay kapısı (Overbooking): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 41 gün."
  },
  {
    "domain": "üretim",
    "title": "Kalite gate bypass",
    "trigger": "Operatör override kötüye kullanım",
    "intro": "üretim sektöründe \"Kalite gate bypass\" risk değerlendirmesi — tetikleyici: Operatör override kötüye kullanım. Paydaş oturumu: IT liderliğinde. İnceleme dönemi: Q1/2026, kayıt R-133.",
    "risks": [
      {
        "name": "Kalite gate bypass regülasyon/denetim bulgusu riski",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "KVKK idari para cezası",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (üretim/Kalite gate bypass, ref R-133-1)"
      },
      {
        "name": "Kalite gate bypass — üretim tedarik zinciri zafiyeti",
        "probability": "Sık (haftalık)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (üretim/Kalite gate bypass, ref R-133-2)"
      },
      {
        "name": "Operatör override kötüye kullanım — Kalite gate bypass veri hattı tutarsızlığı",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Regülasyon rapor ret",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (üretim/Kalite gate bypass, ref R-133-3)"
      },
      {
        "name": "üretim kullanıcılarında Kalite gate bypass kötüye kullanım senaryosu",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (üretim/Kalite gate bypass, ref R-133-4)"
      },
      {
        "name": "üretim ortamında Kalite gate bypass: Operatör override kötüye kullanım",
        "probability": "Orta (yılda 2)",
        "impact": "SLA ceza ödemesi",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (üretim/Kalite gate bypass, ref R-133-5)"
      }
    ],
    "footer": "Onay kapısı (Kalite gate bypass): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 42 gün."
  },
  {
    "domain": "siber güvenlik",
    "title": "Supply chain zafiyeti",
    "trigger": "Bağımlılık CVE",
    "intro": "siber güvenlik sektöründe \"Supply chain zafiyeti\" risk değerlendirmesi — tetikleyici: Bağımlılık CVE. Paydaş oturumu: İş liderliğinde. İnceleme dönemi: Q2/2026, kayıt R-134.",
    "risks": [
      {
        "name": "siber güvenlik kullanıcılarında Supply chain zafiyeti kötüye kullanım senaryosu",
        "probability": "Sık (haftalık)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (siber güvenlik/Supply chain zafiyeti, ref R-134-1)"
      },
      {
        "name": "siber güvenlik ortamında Supply chain zafiyeti: Bağımlılık CVE",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (siber güvenlik/Supply chain zafiyeti, ref R-134-2)"
      },
      {
        "name": "siber güvenlik entegrasyonunda Supply chain zafiyeti bağımlılık hatası",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Müşteri churn %5+",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (siber güvenlik/Supply chain zafiyeti, ref R-134-3)"
      },
      {
        "name": "Bağımlılık CVE kaynaklı Supply chain zafiyeti finansal exposure",
        "probability": "Orta (yılda 2)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (siber güvenlik/Supply chain zafiyeti, ref R-134-4)"
      },
      {
        "name": "Supply chain zafiyeti nedeniyle siber güvenlik operasyonunda servis kesintisi",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Üretim hattı duruşu",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (siber güvenlik/Supply chain zafiyeti, ref R-134-5)"
      }
    ],
    "footer": "Onay kapısı (Supply chain zafiyeti): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 43 gün."
  },
  {
    "domain": "mobil uygulamalar",
    "title": "App Store red",
    "trigger": "Store policy ihlali",
    "intro": "mobil uygulamalar sektöründe \"App Store red\" risk değerlendirmesi — tetikleyici: Store policy ihlali. Paydaş oturumu: Hukuk liderliğinde. İnceleme dönemi: Q3/2026, kayıt R-135.",
    "risks": [
      {
        "name": "Store policy ihlali kaynaklı App Store red finansal exposure",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (mobil uygulamalar/App Store red, ref R-135-1)"
      },
      {
        "name": "App Store red nedeniyle mobil uygulamalar operasyonunda servis kesintisi",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Regülasyon rapor ret",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (mobil uygulamalar/App Store red, ref R-135-2)"
      },
      {
        "name": "App Store red regülasyon/denetim bulgusu riski",
        "probability": "Orta (yılda 2)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (mobil uygulamalar/App Store red, ref R-135-3)"
      },
      {
        "name": "App Store red — mobil uygulamalar tedarik zinciri zafiyeti",
        "probability": "Yüksek (ayda 3+)",
        "impact": "SLA ceza ödemesi",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (mobil uygulamalar/App Store red, ref R-135-4)"
      },
      {
        "name": "Store policy ihlali — App Store red veri hattı tutarsızlığı",
        "probability": "Çok düşük",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (mobil uygulamalar/App Store red, ref R-135-5)"
      }
    ],
    "footer": "Onay kapısı (App Store red): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 44 gün."
  },
  {
    "domain": "saas",
    "title": "Vendor lock-in",
    "trigger": "Özel format export zor",
    "intro": "saas sektöründe \"Vendor lock-in\" risk değerlendirmesi — tetikleyici: Özel format export zor. Paydaş oturumu: Operasyon liderliğinde. İnceleme dönemi: Q4/2026, kayıt R-136.",
    "risks": [
      {
        "name": "Vendor lock-in — saas tedarik zinciri zafiyeti",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (saas/Vendor lock-in, ref R-136-1)"
      },
      {
        "name": "Özel format export zor — Vendor lock-in veri hattı tutarsızlığı",
        "probability": "Orta (yılda 2)",
        "impact": "Müşteri churn %5+",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (saas/Vendor lock-in, ref R-136-2)"
      },
      {
        "name": "saas kullanıcılarında Vendor lock-in kötüye kullanım senaryosu",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (saas/Vendor lock-in, ref R-136-3)"
      },
      {
        "name": "saas ortamında Vendor lock-in: Özel format export zor",
        "probability": "Çok düşük",
        "impact": "Üretim hattı duruşu",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (saas/Vendor lock-in, ref R-136-4)"
      },
      {
        "name": "saas entegrasyonunda Vendor lock-in bağımlılık hatası",
        "probability": "Değişken (mevsimsel)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (saas/Vendor lock-in, ref R-136-5)"
      }
    ],
    "footer": "Onay kapısı (Vendor lock-in): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 45 gün."
  },
  {
    "domain": "finans",
    "title": "Regülasyon değişimi",
    "trigger": "Rapor format güncelleme",
    "intro": "finans sektöründe \"Regülasyon değişimi\" risk değerlendirmesi — tetikleyici: Rapor format güncelleme. Paydaş oturumu: IT liderliğinde. İnceleme dönemi: Q1/2026, kayıt R-137.",
    "risks": [
      {
        "name": "finans ortamında Regülasyon değişimi: Rapor format güncelleme",
        "probability": "Orta (yılda 2)",
        "impact": "Regülasyon rapor ret",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (finans/Regülasyon değişimi, ref R-137-1)"
      },
      {
        "name": "finans entegrasyonunda Regülasyon değişimi bağımlılık hatası",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (finans/Regülasyon değişimi, ref R-137-2)"
      },
      {
        "name": "Rapor format güncelleme kaynaklı Regülasyon değişimi finansal exposure",
        "probability": "Çok düşük",
        "impact": "SLA ceza ödemesi",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (finans/Regülasyon değişimi, ref R-137-3)"
      },
      {
        "name": "Regülasyon değişimi nedeniyle finans operasyonunda servis kesintisi",
        "probability": "Değişken (mevsimsel)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (finans/Regülasyon değişimi, ref R-137-4)"
      },
      {
        "name": "Regülasyon değişimi regülasyon/denetim bulgusu riski",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "KVKK idari para cezası",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (finans/Regülasyon değişimi, ref R-137-5)"
      }
    ],
    "footer": "Onay kapısı (Regülasyon değişimi): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 46 gün."
  },
  {
    "domain": "sağlık",
    "title": "Veri residency",
    "trigger": "Yurt dışı sunucu",
    "intro": "sağlık sektöründe \"Veri residency\" risk değerlendirmesi — tetikleyici: Yurt dışı sunucu. Paydaş oturumu: İş liderliğinde. İnceleme dönemi: Q2/2026, kayıt R-138.",
    "risks": [
      {
        "name": "Veri residency nedeniyle sağlık operasyonunda servis kesintisi",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Müşteri churn %5+",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (sağlık/Veri residency, ref R-138-1)"
      },
      {
        "name": "Veri residency regülasyon/denetim bulgusu riski",
        "probability": "Çok düşük",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (sağlık/Veri residency, ref R-138-2)"
      },
      {
        "name": "Veri residency — sağlık tedarik zinciri zafiyeti",
        "probability": "Değişken (mevsimsel)",
        "impact": "Üretim hattı duruşu",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (sağlık/Veri residency, ref R-138-3)"
      },
      {
        "name": "Yurt dışı sunucu — Veri residency veri hattı tutarsızlığı",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (sağlık/Veri residency, ref R-138-4)"
      },
      {
        "name": "sağlık kullanıcılarında Veri residency kötüye kullanım senaryosu",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (sağlık/Veri residency, ref R-138-5)"
      }
    ],
    "footer": "Onay kapısı (Veri residency): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 47 gün."
  },
  {
    "domain": "eğitim",
    "title": "WCAG uyumsuzluk",
    "trigger": "Erişilebilir olmayan içerik",
    "intro": "eğitim sektöründe \"WCAG uyumsuzluk\" risk değerlendirmesi — tetikleyici: Erişilebilir olmayan içerik. Paydaş oturumu: Hukuk liderliğinde. İnceleme dönemi: Q3/2026, kayıt R-139.",
    "risks": [
      {
        "name": "Erişilebilir olmayan içerik — WCAG uyumsuzluk veri hattı tutarsızlığı",
        "probability": "Çok düşük",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (eğitim/WCAG uyumsuzluk, ref R-139-1)"
      },
      {
        "name": "eğitim kullanıcılarında WCAG uyumsuzluk kötüye kullanım senaryosu",
        "probability": "Değişken (mevsimsel)",
        "impact": "SLA ceza ödemesi",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (eğitim/WCAG uyumsuzluk, ref R-139-2)"
      },
      {
        "name": "eğitim ortamında WCAG uyumsuzluk: Erişilebilir olmayan içerik",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (eğitim/WCAG uyumsuzluk, ref R-139-3)"
      },
      {
        "name": "eğitim entegrasyonunda WCAG uyumsuzluk bağımlılık hatası",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "KVKK idari para cezası",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (eğitim/WCAG uyumsuzluk, ref R-139-4)"
      },
      {
        "name": "Erişilebilir olmayan içerik kaynaklı WCAG uyumsuzluk finansal exposure",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (eğitim/WCAG uyumsuzluk, ref R-139-5)"
      }
    ],
    "footer": "Onay kapısı (WCAG uyumsuzluk): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 48 gün."
  },
  {
    "domain": "tarım",
    "title": "Sensör sahteciliği",
    "trigger": "Manipüle telemetri",
    "intro": "tarım sektöründe \"Sensör sahteciliği\" risk değerlendirmesi — tetikleyici: Manipüle telemetri. Paydaş oturumu: Operasyon liderliğinde. İnceleme dönemi: Q4/2026, kayıt R-140.",
    "risks": [
      {
        "name": "tarım entegrasyonunda Sensör sahteciliği bağımlılık hatası",
        "probability": "Değişken (mevsimsel)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P2",
        "mitigation": "Dual-control onay ve immutable audit log (tarım/Sensör sahteciliği, ref R-140-1)"
      },
      {
        "name": "Manipüle telemetri kaynaklı Sensör sahteciliği finansal exposure",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Üretim hattı duruşu",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (tarım/Sensör sahteciliği, ref R-140-2)"
      },
      {
        "name": "Sensör sahteciliği nedeniyle tarım operasyonunda servis kesintisi",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (tarım/Sensör sahteciliği, ref R-140-3)"
      },
      {
        "name": "Sensör sahteciliği regülasyon/denetim bulgusu riski",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (tarım/Sensör sahteciliği, ref R-140-4)"
      },
      {
        "name": "Sensör sahteciliği — tarım tedarik zinciri zafiyeti",
        "probability": "Sık (haftalık)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (tarım/Sensör sahteciliği, ref R-140-5)"
      }
    ],
    "footer": "Onay kapısı (Sensör sahteciliği): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 49 gün."
  },
  {
    "domain": "lojistik",
    "title": "Force majeure grev",
    "trigger": "Teslimat gecikmesi",
    "intro": "lojistik sektöründe \"Force majeure grev\" risk değerlendirmesi — tetikleyici: Teslimat gecikmesi. Paydaş oturumu: IT liderliğinde. İnceleme dönemi: Q1/2026, kayıt R-141.",
    "risks": [
      {
        "name": "Force majeure grev regülasyon/denetim bulgusu riski",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "SLA ceza ödemesi",
        "priority": "P1",
        "mitigation": "Chaos engineering tatbikatı çeyrekte bir (lojistik/Force majeure grev, ref R-141-1)"
      },
      {
        "name": "Force majeure grev — lojistik tedarik zinciri zafiyeti",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (lojistik/Force majeure grev, ref R-141-2)"
      },
      {
        "name": "Teslimat gecikmesi — Force majeure grev veri hattı tutarsızlığı",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "KVKK idari para cezası",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (lojistik/Force majeure grev, ref R-141-3)"
      },
      {
        "name": "lojistik kullanıcılarında Force majeure grev kötüye kullanım senaryosu",
        "probability": "Sık (haftalık)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (lojistik/Force majeure grev, ref R-141-4)"
      },
      {
        "name": "lojistik ortamında Force majeure grev: Teslimat gecikmesi",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Regülasyon rapor ret",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (lojistik/Force majeure grev, ref R-141-5)"
      }
    ],
    "footer": "Onay kapısı (Force majeure grev): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 50 gün."
  },
  {
    "domain": "e-ticaret",
    "title": "Bot stok eritme",
    "trigger": "Stok eritme saldırısı",
    "intro": "e-ticaret sektöründe \"Bot stok eritme\" risk değerlendirmesi — tetikleyici: Stok eritme saldırısı. Paydaş oturumu: İş liderliğinde. İnceleme dönemi: Q2/2026, kayıt R-142.",
    "risks": [
      {
        "name": "e-ticaret kullanıcılarında Bot stok eritme kötüye kullanım senaryosu",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Üretim hattı duruşu",
        "priority": "P2",
        "mitigation": "Vendor SOC2 raporu yıllık doğrulama (e-ticaret/Bot stok eritme, ref R-142-1)"
      },
      {
        "name": "e-ticaret ortamında Bot stok eritme: Stok eritme saldırısı",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (e-ticaret/Bot stok eritme, ref R-142-2)"
      },
      {
        "name": "e-ticaret entegrasyonunda Bot stok eritme bağımlılık hatası",
        "probability": "Sık (haftalık)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (e-ticaret/Bot stok eritme, ref R-142-3)"
      },
      {
        "name": "Stok eritme saldırısı kaynaklı Bot stok eritme finansal exposure",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (e-ticaret/Bot stok eritme, ref R-142-4)"
      },
      {
        "name": "Bot stok eritme nedeniyle e-ticaret operasyonunda servis kesintisi",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Müşteri churn %5+",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (e-ticaret/Bot stok eritme, ref R-142-5)"
      }
    ],
    "footer": "Onay kapısı (Bot stok eritme): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 51 gün."
  },
  {
    "domain": "kamu",
    "title": "Siyasi baskı moderasyon",
    "trigger": "İçerik moderasyon baskısı",
    "intro": "kamu sektöründe \"Siyasi baskı moderasyon\" risk değerlendirmesi — tetikleyici: İçerik moderasyon baskısı. Paydaş oturumu: Hukuk liderliğinde. İnceleme dönemi: Q3/2026, kayıt R-143.",
    "risks": [
      {
        "name": "İçerik moderasyon baskısı kaynaklı Siyasi baskı moderasyon finansal exposure",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P3",
        "mitigation": "Veri sınıflandırma ve DLP policy (kamu/Siyasi baskı moderasyon, ref R-143-1)"
      },
      {
        "name": "Siyasi baskı moderasyon nedeniyle kamu operasyonunda servis kesintisi",
        "probability": "Sık (haftalık)",
        "impact": "KVKK idari para cezası",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (kamu/Siyasi baskı moderasyon, ref R-143-2)"
      },
      {
        "name": "Siyasi baskı moderasyon regülasyon/denetim bulgusu riski",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (kamu/Siyasi baskı moderasyon, ref R-143-3)"
      },
      {
        "name": "Siyasi baskı moderasyon — kamu tedarik zinciri zafiyeti",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Regülasyon rapor ret",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (kamu/Siyasi baskı moderasyon, ref R-143-4)"
      },
      {
        "name": "İçerik moderasyon baskısı — Siyasi baskı moderasyon veri hattı tutarsızlığı",
        "probability": "Orta (yılda 2)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (kamu/Siyasi baskı moderasyon, ref R-143-5)"
      }
    ],
    "footer": "Onay kapısı (Siyasi baskı moderasyon): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 52 gün."
  },
  {
    "domain": "insan kaynakları",
    "title": "GDPR unutulma hakkı",
    "trigger": "Veri silme talebi",
    "intro": "insan kaynakları sektöründe \"GDPR unutulma hakkı\" risk değerlendirmesi — tetikleyici: Veri silme talebi. Paydaş oturumu: Operasyon liderliğinde. İnceleme dönemi: Q4/2026, kayıt R-144.",
    "risks": [
      {
        "name": "GDPR unutulma hakkı — insan kaynakları tedarik zinciri zafiyeti",
        "probability": "Sık (haftalık)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P1",
        "mitigation": "Pilot kullanıcı programı ve saha destek hattı (insan kaynakları/GDPR unutulma hakkı, ref R-144-1)"
      },
      {
        "name": "Veri silme talebi — GDPR unutulma hakkı veri hattı tutarsızlığı",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (insan kaynakları/GDPR unutulma hakkı, ref R-144-2)"
      },
      {
        "name": "insan kaynakları kullanıcılarında GDPR unutulma hakkı kötüye kullanım senaryosu",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (insan kaynakları/GDPR unutulma hakkı, ref R-144-3)"
      },
      {
        "name": "insan kaynakları ortamında GDPR unutulma hakkı: Veri silme talebi",
        "probability": "Orta (yılda 2)",
        "impact": "Müşteri churn %5+",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (insan kaynakları/GDPR unutulma hakkı, ref R-144-4)"
      },
      {
        "name": "insan kaynakları entegrasyonunda GDPR unutulma hakkı bağımlılık hatası",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (insan kaynakları/GDPR unutulma hakkı, ref R-144-5)"
      }
    ],
    "footer": "Onay kapısı (GDPR unutulma hakkı): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 53 gün."
  },
  {
    "domain": "enerji",
    "title": "OT ransomware",
    "trigger": "Ransomware OT",
    "intro": "enerji sektöründe \"OT ransomware\" risk değerlendirmesi — tetikleyici: Ransomware OT. Paydaş oturumu: IT liderliğinde. İnceleme dönemi: Q1/2026, kayıt R-145.",
    "risks": [
      {
        "name": "enerji ortamında OT ransomware: Ransomware OT",
        "probability": "Kritik eşik (günlük izleme)",
        "impact": "KVKK idari para cezası",
        "priority": "P2",
        "mitigation": "Regülasyon danışmanlık retainer (enerji/OT ransomware, ref R-145-1)"
      },
      {
        "name": "enerji entegrasyonunda OT ransomware bağımlılık hatası",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (enerji/OT ransomware, ref R-145-2)"
      },
      {
        "name": "Ransomware OT kaynaklı OT ransomware finansal exposure",
        "probability": "Orta (yılda 2)",
        "impact": "Regülasyon rapor ret",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (enerji/OT ransomware, ref R-145-3)"
      },
      {
        "name": "OT ransomware nedeniyle enerji operasyonunda servis kesintisi",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (enerji/OT ransomware, ref R-145-4)"
      },
      {
        "name": "OT ransomware regülasyon/denetim bulgusu riski",
        "probability": "Çok düşük",
        "impact": "SLA ceza ödemesi",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (enerji/OT ransomware, ref R-145-5)"
      }
    ],
    "footer": "Onay kapısı (OT ransomware): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 54 gün."
  },
  {
    "domain": "sigorta",
    "title": "Model drift",
    "trigger": "Aktüeryal model sapması",
    "intro": "sigorta sektöründe \"Model drift\" risk değerlendirmesi — tetikleyici: Aktüeryal model sapması. Paydaş oturumu: İş liderliğinde. İnceleme dönemi: Q2/2026, kayıt R-146.",
    "risks": [
      {
        "name": "Model drift nedeniyle sigorta operasyonunda servis kesintisi",
        "probability": "Düşük (5 yılda 1)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P1",
        "mitigation": "Checksum doğrulama ve dry-run migrasyon (sigorta/Model drift, ref R-146-1)"
      },
      {
        "name": "Model drift regülasyon/denetim bulgusu riski",
        "probability": "Orta (yılda 2)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (sigorta/Model drift, ref R-146-2)"
      },
      {
        "name": "Model drift — sigorta tedarik zinciri zafiyeti",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Müşteri churn %5+",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (sigorta/Model drift, ref R-146-3)"
      },
      {
        "name": "Aktüeryal model sapması — Model drift veri hattı tutarsızlığı",
        "probability": "Çok düşük",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (sigorta/Model drift, ref R-146-4)"
      },
      {
        "name": "sigorta kullanıcılarında Model drift kötüye kullanım senaryosu",
        "probability": "Değişken (mevsimsel)",
        "impact": "Üretim hattı duruşu",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (sigorta/Model drift, ref R-146-5)"
      }
    ],
    "footer": "Onay kapısı (Model drift): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 55 gün."
  },
  {
    "domain": "turizm",
    "title": "Mevsimsel talep hatası",
    "trigger": "Talep tahmin hatası",
    "intro": "turizm sektöründe \"Mevsimsel talep hatası\" risk değerlendirmesi — tetikleyici: Talep tahmin hatası. Paydaş oturumu: Hukuk liderliğinde. İnceleme dönemi: Q3/2026, kayıt R-147.",
    "risks": [
      {
        "name": "Talep tahmin hatası — Mevsimsel talep hatası veri hattı tutarsızlığı",
        "probability": "Orta (yılda 2)",
        "impact": "Finansal kayıp >500K TL",
        "priority": "P2",
        "mitigation": "Anomaly detection model eğitimi (turizm/Mevsimsel talep hatası, ref R-147-1)"
      },
      {
        "name": "turizm kullanıcılarında Mevsimsel talep hatası kötüye kullanım senaryosu",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Regülasyon rapor ret",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (turizm/Mevsimsel talep hatası, ref R-147-2)"
      },
      {
        "name": "turizm ortamında Mevsimsel talep hatası: Talep tahmin hatası",
        "probability": "Çok düşük",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (turizm/Mevsimsel talep hatası, ref R-147-3)"
      },
      {
        "name": "turizm entegrasyonunda Mevsimsel talep hatası bağımlılık hatası",
        "probability": "Değişken (mevsimsel)",
        "impact": "SLA ceza ödemesi",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (turizm/Mevsimsel talep hatası, ref R-147-4)"
      },
      {
        "name": "Talep tahmin hatası kaynaklı Mevsimsel talep hatası finansal exposure",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (turizm/Mevsimsel talep hatası, ref R-147-5)"
      }
    ],
    "footer": "Onay kapısı (Mevsimsel talep hatası): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 56 gün."
  },
  {
    "domain": "üretim",
    "title": "Single supplier kesinti",
    "trigger": "Tek tedarikçi",
    "intro": "üretim sektöründe \"Single supplier kesinti\" risk değerlendirmesi — tetikleyici: Tek tedarikçi. Paydaş oturumu: Operasyon liderliğinde. İnceleme dönemi: Q4/2026, kayıt R-148.",
    "risks": [
      {
        "name": "üretim entegrasyonunda Single supplier kesinti bağımlılık hatası",
        "probability": "Yüksek (ayda 3+)",
        "impact": "Hasta güvenliği olayı",
        "priority": "P3",
        "mitigation": "Incident response tabletop senaryosu (üretim/Single supplier kesinti, ref R-148-1)"
      },
      {
        "name": "Tek tedarikçi kaynaklı Single supplier kesinti finansal exposure",
        "probability": "Çok düşük",
        "impact": "Müşteri churn %5+",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (üretim/Single supplier kesinti, ref R-148-2)"
      },
      {
        "name": "Single supplier kesinti nedeniyle üretim operasyonunda servis kesintisi",
        "probability": "Değişken (mevsimsel)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (üretim/Single supplier kesinti, ref R-148-3)"
      },
      {
        "name": "Single supplier kesinti regülasyon/denetim bulgusu riski",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Üretim hattı duruşu",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (üretim/Single supplier kesinti, ref R-148-4)"
      },
      {
        "name": "Single supplier kesinti — üretim tedarik zinciri zafiyeti",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (üretim/Single supplier kesinti, ref R-148-5)"
      }
    ],
    "footer": "Onay kapısı (Single supplier kesinti): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 57 gün."
  },
  {
    "domain": "siber güvenlik",
    "title": "Insider veri export",
    "trigger": "Toplu veri export",
    "intro": "siber güvenlik sektöründe \"Insider veri export\" risk değerlendirmesi — tetikleyici: Toplu veri export. Paydaş oturumu: IT liderliğinde. İnceleme dönemi: Q1/2026, kayıt R-149.",
    "risks": [
      {
        "name": "Insider veri export regülasyon/denetim bulgusu riski",
        "probability": "Çok düşük",
        "impact": "Regülasyon rapor ret",
        "priority": "P1",
        "mitigation": "Config drift detection CI kuralı (siber güvenlik/Insider veri export, ref R-149-1)"
      },
      {
        "name": "Insider veri export — siber güvenlik tedarik zinciri zafiyeti",
        "probability": "Değişken (mevsimsel)",
        "impact": "Veri bütünlüğü bozulması",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (siber güvenlik/Insider veri export, ref R-149-2)"
      },
      {
        "name": "Toplu veri export — Insider veri export veri hattı tutarsızlığı",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "SLA ceza ödemesi",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (siber güvenlik/Insider veri export, ref R-149-3)"
      },
      {
        "name": "siber güvenlik kullanıcılarında Insider veri export kötüye kullanım senaryosu",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Siber olay bildirimi zorunluluğu",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (siber güvenlik/Insider veri export, ref R-149-4)"
      },
      {
        "name": "siber güvenlik ortamında Insider veri export: Toplu veri export",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "KVKK idari para cezası",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (siber güvenlik/Insider veri export, ref R-149-5)"
      }
    ],
    "footer": "Onay kapısı (Insider veri export): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 58 gün."
  },
  {
    "domain": "mobil uygulamalar",
    "title": "Arka plan konum batarya",
    "trigger": "Arka plan konum tüketimi",
    "intro": "mobil uygulamalar sektöründe \"Arka plan konum batarya\" risk değerlendirmesi — tetikleyici: Arka plan konum tüketimi. Paydaş oturumu: İş liderliğinde. İnceleme dönemi: Q2/2026, kayıt R-150.",
    "risks": [
      {
        "name": "mobil uygulamalar kullanıcılarında Arka plan konum batarya kötüye kullanım senaryosu",
        "probability": "Değişken (mevsimsel)",
        "impact": "Müşteri churn %5+",
        "priority": "P2",
        "mitigation": "Business continuity plan güncelleme (mobil uygulamalar/Arka plan konum batarya, ref R-150-1)"
      },
      {
        "name": "mobil uygulamalar ortamında Arka plan konum batarya: Arka plan konum tüketimi",
        "probability": "Seyrek (≤1/yıl)",
        "impact": "Marka itibarı zedelenmesi",
        "priority": "P1",
        "mitigation": "Haftalık risk review ve erken uyarı paneli (mobil uygulamalar/Arka plan konum batarya, ref R-150-2)"
      },
      {
        "name": "mobil uygulamalar entegrasyonunda Arka plan konum batarya bağımlılık hatası",
        "probability": "Ara (2-3/çeyrek)",
        "impact": "Üretim hattı duruşu",
        "priority": "P2",
        "mitigation": "Yedek tedarikçi sözleşmesi ve SLA yeniden müzakere (mobil uygulamalar/Arka plan konum batarya, ref R-150-3)"
      },
      {
        "name": "Arka plan konum tüketimi kaynaklı Arka plan konum batarya finansal exposure",
        "probability": "Muhtemel (ayda 1-2)",
        "impact": "Tedarik zinciri kesintisi",
        "priority": "P3",
        "mitigation": "Otomatik regresyon test paketi ve geri alma runbook (mobil uygulamalar/Arka plan konum batarya, ref R-150-4)"
      },
      {
        "name": "Arka plan konum batarya nedeniyle mobil uygulamalar operasyonunda servis kesintisi",
        "probability": "Sık (haftalık)",
        "impact": "Operasyon duruşu 4+ saat",
        "priority": "P1",
        "mitigation": "Pen test bulguları release gate'e bağlandı (mobil uygulamalar/Arka plan konum batarya, ref R-150-5)"
      }
    ],
    "footer": "Onay kapısı (Arka plan konum batarya): Canlı geçiş öncesi P1=0, P2 mitigasyon planı onaylı. Sonraki review: 59 gün."
  }
];
export const US_BASE = [
  {
    "domain": "saas",
    "role": "Ürün yöneticisi (saas)",
    "need": "release notlarını müşteri portalında yayınlamak",
    "needHint": "release notlarını müşteri portalında yayınlamak",
    "benefit": "e-posta trafiğini azaltmak",
    "acceptanceCriteria": [
      "Given Ürün yöneticisi saas portalında release notlarını müşteri portalında yayınlamak seçtiğinde When onay verirse Then değişiklik 60 sn içinde yansır (US-121, saas)",
      "Given yetkisiz rol When işlem denerse Then 403 ve Türkçe hata kodu döner",
      "Given audit modu When kayıt sorgulanırsa Then kullanıcı+zaman+IP loglanır",
      "Given batch import When 100+ kayıt gelirse Then progress bar ve partial success raporu gösterilir",
      "Given saas iş kuralı US-121-X When release tamamlanırsa Then e-posta trafiğini azaltmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "finans",
    "role": "Hazine uzmanı (finans)",
    "need": "günlük nakit pozisyonunu tek ekranda görmek",
    "needHint": "günlük nakit pozisyonunu tek ekranda görmek",
    "benefit": "likidite kararını hızlandırmak",
    "acceptanceCriteria": [
      "Given Hazine uzmanı günlük nakit pozisyonunu tek ekranda görmek ekranını açtığında When filtre uygularsa Then sonuçlar 2 sn içinde güncellenir",
      "Given boş sonuç When liste gelirse Then \"Kayıt bulunamadı\" ve filtre temizleme önerisi",
      "Given export When PDF oluşturulursa Then şirket logosu ve tarih footer'da",
      "Given mobil cihaz When yatay modda açılırsa Then tablo yatay scroll ile okunabilir kalır",
      "Given finans iş kuralı US-122-X When günlük tamamlanırsa Then likidite kararını hızlandırmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "sağlık",
    "role": "Hemşire (sağlık)",
    "need": "kritik lab sonucunda anında uyarı almak",
    "needHint": "kritik lab sonucunda anında uyarı almak",
    "benefit": "gecikmeden müdahale etmek",
    "acceptanceCriteria": [
      "Given Hemşire kritik lab sonucunda anında uyarı almak tetiklendiğinde When SLA 15 dk aşılırsa Then eskalasyon kuyruğuna düşer",
      "Given eşzamanlı 50 istek When yük testi yapılırsa Then p95 < 800 ms kalır",
      "Given bakım modu When banner gösterilirse Then write işlemleri 503 döner",
      "Given sağlık tenant A When tenant B verisine erişmeye çalışırsa Then erişim reddedilir",
      "Given sağlık iş kuralı US-123-X When kritik tamamlanırsa Then gecikmeden müdahale etmek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "eğitim",
    "role": "Öğretmen (eğitim)",
    "need": "sınıf devamsızlığını anında kaydetmek",
    "needHint": "sınıf devamsızlığını anında kaydetmek",
    "benefit": "veli bilgilendirmesini otomatikleştirmek",
    "acceptanceCriteria": [
      "Given Öğretmen offline sınıf devamsızlığını anında kaydetmek kaydı yaptığında When ağ gelince Then veri kaybı olmadan senkron olur",
      "Given sync çakışması When aynı kayıt iki cihazda değiştiyse Then merge UI açılır",
      "Given batarya <%15 When arka plan sync çalışırsa Then sync ertelenir",
      "Given 500 kayıt buffer When limit aşılırsa Then kullanıcı uyarılır",
      "Given eğitim iş kuralı US-124-X When sınıf tamamlanırsa Then veli bilgilendirmesini otomatikleştirmek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "tarım",
    "role": "Ziraat mühendisi (tarım)",
    "need": "parsel bazlı verim raporu almak",
    "needHint": "parsel bazlı verim raporu almak",
    "benefit": "gübre planını optimize etmek",
    "acceptanceCriteria": [
      "Given Ziraat mühendisi parsel bazlı verim raporu almak formunu doldurduğunda When zorunlu alan boşsa Then alan altında Türkçe validation mesajı",
      "Given TC kimlik When hatalı format girilirse Then anında format hatası",
      "Given dosya upload When 10MB aşılırsa Then yükleme engellenir",
      "Given form submit When başarılı olursa Then onay numarası SMS ile gider",
      "Given tarım iş kuralı US-125-X When parsel tamamlanırsa Then gübre planını optimize etmek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "lojistik",
    "role": "Depo operatörü (lojistik)",
    "need": "pick listesinde lot doğrulaması yapmak",
    "needHint": "pick listesinde lot doğrulaması yapmak",
    "benefit": "yanlış sevkiyatı önlemek",
    "acceptanceCriteria": [
      "Given Depo operatörü lojistik portalında pick listesinde lot doğrulaması yapmak seçtiğinde When onay verirse Then değişiklik 60 sn içinde yansır (US-126, lojistik)",
      "Given yetkisiz rol When işlem denerse Then 403 ve Türkçe hata kodu döner",
      "Given audit modu When kayıt sorgulanırsa Then kullanıcı+zaman+IP loglanır",
      "Given batch import When 100+ kayıt gelirse Then progress bar ve partial success raporu gösterilir",
      "Given lojistik iş kuralı US-126-X When pick tamamlanırsa Then yanlış sevkiyatı önlemek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "e-ticaret",
    "role": "Müşteri (e-ticaret)",
    "need": "kargo durumunu haritada izlemek",
    "needHint": "kargo durumunu haritada izlemek",
    "benefit": "teslimat belirsizliğini azaltmak",
    "acceptanceCriteria": [
      "Given Müşteri kargo durumunu haritada izlemek ekranını açtığında When filtre uygularsa Then sonuçlar 2 sn içinde güncellenir",
      "Given boş sonuç When liste gelirse Then \"Kayıt bulunamadı\" ve filtre temizleme önerisi",
      "Given export When PDF oluşturulursa Then şirket logosu ve tarih footer'da",
      "Given mobil cihaz When yatay modda açılırsa Then tablo yatay scroll ile okunabilir kalır",
      "Given e-ticaret iş kuralı US-127-X When kargo tamamlanırsa Then teslimat belirsizliğini azaltmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "kamu",
    "role": "Vatandaş (kamu)",
    "need": "belediye başvuru durumunu görmek",
    "needHint": "belediye başvuru durumunu görmek",
    "benefit": "tekrar aramaktan kaçınmak",
    "acceptanceCriteria": [
      "Given Vatandaş belediye başvuru durumunu görmek tetiklendiğinde When SLA 15 dk aşılırsa Then eskalasyon kuyruğuna düşer",
      "Given eşzamanlı 50 istek When yük testi yapılırsa Then p95 < 800 ms kalır",
      "Given bakım modu When banner gösterilirse Then write işlemleri 503 döner",
      "Given kamu tenant A When tenant B verisine erişmeye çalışırsa Then erişim reddedilir",
      "Given kamu iş kuralı US-128-X When belediye tamamlanırsa Then tekrar aramaktan kaçınmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "insan kaynakları",
    "role": "Çalışan (insan kaynakları)",
    "need": "izin bakiyemi mobilde görmek",
    "needHint": "izin bakiyemi mobilde görmek",
    "benefit": "planlama yapabilmek",
    "acceptanceCriteria": [
      "Given Çalışan offline izin bakiyemi mobilde görmek kaydı yaptığında When ağ gelince Then veri kaybı olmadan senkron olur",
      "Given sync çakışması When aynı kayıt iki cihazda değiştiyse Then merge UI açılır",
      "Given batarya <%15 When arka plan sync çalışırsa Then sync ertelenir",
      "Given 500 kayıt buffer When limit aşılırsa Then kullanıcı uyarılır",
      "Given insan kaynakları iş kuralı US-129-X When izin tamamlanırsa Then planlama yapabilmek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "enerji",
    "role": "Santral operatörü (enerji)",
    "need": "inverter arızasında work order açmak",
    "needHint": "inverter arızasında work order açmak",
    "benefit": "bakım gecikmesini önlemek",
    "acceptanceCriteria": [
      "Given Santral operatörü inverter arızasında work order açmak formunu doldurduğunda When zorunlu alan boşsa Then alan altında Türkçe validation mesajı",
      "Given TC kimlik When hatalı format girilirse Then anında format hatası",
      "Given dosya upload When 10MB aşılırsa Then yükleme engellenir",
      "Given form submit When başarılı olursa Then onay numarası SMS ile gider",
      "Given enerji iş kuralı US-130-X When inverter tamamlanırsa Then bakım gecikmesini önlemek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "sigorta",
    "role": "Hasar uzmanı (sigorta)",
    "need": "ekspertiz randevusunu sistemden atamak",
    "needHint": "ekspertiz randevusunu sistemden atamak",
    "benefit": "SLA ihlalini azaltmak",
    "acceptanceCriteria": [
      "Given Hasar uzmanı sigorta portalında ekspertiz randevusunu sistemden atamak seçtiğinde When onay verirse Then değişiklik 60 sn içinde yansır (US-131, sigorta)",
      "Given yetkisiz rol When işlem denerse Then 403 ve Türkçe hata kodu döner",
      "Given audit modu When kayıt sorgulanırsa Then kullanıcı+zaman+IP loglanır",
      "Given batch import When 100+ kayıt gelirse Then progress bar ve partial success raporu gösterilir",
      "Given sigorta iş kuralı US-131-X When ekspertiz tamamlanırsa Then SLA ihlalini azaltmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "turizm",
    "role": "Resepsiyonist (turizm)",
    "need": "overbooking riskini erken görmek",
    "needHint": "overbooking riskini erken görmek",
    "benefit": "misafir taşıma planı yapmak",
    "acceptanceCriteria": [
      "Given Resepsiyonist overbooking riskini erken görmek ekranını açtığında When filtre uygularsa Then sonuçlar 2 sn içinde güncellenir",
      "Given boş sonuç When liste gelirse Then \"Kayıt bulunamadı\" ve filtre temizleme önerisi",
      "Given export When PDF oluşturulursa Then şirket logosu ve tarih footer'da",
      "Given mobil cihaz When yatay modda açılırsa Then tablo yatay scroll ile okunabilir kalır",
      "Given turizm iş kuralı US-132-X When overbooking tamamlanırsa Then misafir taşıma planı yapmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "üretim",
    "role": "Hat şefi (üretim)",
    "need": "OEE düşüş nedenini dashboardda görmek",
    "needHint": "OEE düşüş nedenini dashboardda görmek",
    "benefit": "müdahale önceliği belirlemek",
    "acceptanceCriteria": [
      "Given Hat şefi OEE düşüş nedenini dashboardda görmek tetiklendiğinde When SLA 15 dk aşılırsa Then eskalasyon kuyruğuna düşer",
      "Given eşzamanlı 50 istek When yük testi yapılırsa Then p95 < 800 ms kalır",
      "Given bakım modu When banner gösterilirse Then write işlemleri 503 döner",
      "Given üretim tenant A When tenant B verisine erişmeye çalışırsa Then erişim reddedilir",
      "Given üretim iş kuralı US-133-X When OEE tamamlanırsa Then müdahale önceliği belirlemek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "siber güvenlik",
    "role": "SOC analisti (siber güvenlik)",
    "need": "phishing raporunu tek tık eskalasyon",
    "needHint": "phishing raporunu tek tık eskalasyon",
    "benefit": "olay müdahalesini hızlandırmak",
    "acceptanceCriteria": [
      "Given SOC analisti offline phishing raporunu tek tık eskalasyon kaydı yaptığında When ağ gelince Then veri kaybı olmadan senkron olur",
      "Given sync çakışması When aynı kayıt iki cihazda değiştiyse Then merge UI açılır",
      "Given batarya <%15 When arka plan sync çalışırsa Then sync ertelenir",
      "Given 500 kayıt buffer When limit aşılırsa Then kullanıcı uyarılır",
      "Given siber güvenlik iş kuralı US-134-X When phishing tamamlanırsa Then olay müdahalesini hızlandırmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "mobil uygulamalar",
    "role": "Saha satış temsilcisi (mobil uygulamalar)",
    "need": "offline müşteri ziyareti kaydetmek",
    "needHint": "offline müşteri ziyareti kaydetmek",
    "benefit": "veri kaybını önlemek",
    "acceptanceCriteria": [
      "Given Saha satış temsilcisi offline müşteri ziyareti kaydetmek formunu doldurduğunda When zorunlu alan boşsa Then alan altında Türkçe validation mesajı",
      "Given TC kimlik When hatalı format girilirse Then anında format hatası",
      "Given dosya upload When 10MB aşılırsa Then yükleme engellenir",
      "Given form submit When başarılı olursa Then onay numarası SMS ile gider",
      "Given mobil uygulamalar iş kuralı US-135-X When offline tamamlanırsa Then veri kaybını önlemek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "saas",
    "role": "Destek temsilcisi (saas)",
    "need": "müşteri ticket geçmişini 360 görünümde açmak",
    "needHint": "müşteri ticket geçmişini 360 görünümde açmak",
    "benefit": "çözüm süresini kısaltmak",
    "acceptanceCriteria": [
      "Given Destek temsilcisi saas portalında müşteri ticket geçmişini 360 görünümde açmak seçtiğinde When onay verirse Then değişiklik 60 sn içinde yansır (US-136, saas)",
      "Given yetkisiz rol When işlem denerse Then 403 ve Türkçe hata kodu döner",
      "Given audit modu When kayıt sorgulanırsa Then kullanıcı+zaman+IP loglanır",
      "Given batch import When 100+ kayıt gelirse Then progress bar ve partial success raporu gösterilir",
      "Given saas iş kuralı US-136-X When müşteri tamamlanırsa Then çözüm süresini kısaltmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "finans",
    "role": "Mutabakat uzmanı (finans)",
    "need": "banka hareketlerini otomatik eşleştirmek",
    "needHint": "banka hareketlerini otomatik eşleştirmek",
    "benefit": "manuel iş yükünü azaltmak",
    "acceptanceCriteria": [
      "Given Mutabakat uzmanı banka hareketlerini otomatik eşleştirmek ekranını açtığında When filtre uygularsa Then sonuçlar 2 sn içinde güncellenir",
      "Given boş sonuç When liste gelirse Then \"Kayıt bulunamadı\" ve filtre temizleme önerisi",
      "Given export When PDF oluşturulursa Then şirket logosu ve tarih footer'da",
      "Given mobil cihaz When yatay modda açılırsa Then tablo yatay scroll ile okunabilir kalır",
      "Given finans iş kuralı US-137-X When banka tamamlanırsa Then manuel iş yükünü azaltmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "sağlık",
    "role": "Doktor (sağlık)",
    "need": "epikriz taslağını otomatik doldurmak",
    "needHint": "epikriz taslağını otomatik doldurmak",
    "benefit": "taburcu süresini kısaltmak",
    "acceptanceCriteria": [
      "Given Doktor epikriz taslağını otomatik doldurmak tetiklendiğinde When SLA 15 dk aşılırsa Then eskalasyon kuyruğuna düşer",
      "Given eşzamanlı 50 istek When yük testi yapılırsa Then p95 < 800 ms kalır",
      "Given bakım modu When banner gösterilirse Then write işlemleri 503 döner",
      "Given sağlık tenant A When tenant B verisine erişmeye çalışırsa Then erişim reddedilir",
      "Given sağlık iş kuralı US-138-X When epikriz tamamlanırsa Then taburcu süresini kısaltmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "eğitim",
    "role": "Öğrenci (eğitim)",
    "need": "sınav takvimini takvime senkronlamak",
    "needHint": "sınav takvimini takvime senkronlamak",
    "benefit": "çakışmaları önlemek",
    "acceptanceCriteria": [
      "Given Öğrenci offline sınav takvimini takvime senkronlamak kaydı yaptığında When ağ gelince Then veri kaybı olmadan senkron olur",
      "Given sync çakışması When aynı kayıt iki cihazda değiştiyse Then merge UI açılır",
      "Given batarya <%15 When arka plan sync çalışırsa Then sync ertelenir",
      "Given 500 kayıt buffer When limit aşılırsa Then kullanıcı uyarılır",
      "Given eğitim iş kuralı US-139-X When sınav tamamlanırsa Then çakışmaları önlemek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "tarım",
    "role": "Kooperatif yöneticisi (tarım)",
    "need": "üye alım hakediş raporu almak",
    "needHint": "üye alım hakediş raporu almak",
    "benefit": "şeffaf ödeme yapmak",
    "acceptanceCriteria": [
      "Given Kooperatif yöneticisi üye alım hakediş raporu almak formunu doldurduğunda When zorunlu alan boşsa Then alan altında Türkçe validation mesajı",
      "Given TC kimlik When hatalı format girilirse Then anında format hatası",
      "Given dosya upload When 10MB aşılırsa Then yükleme engellenir",
      "Given form submit When başarılı olursa Then onay numarası SMS ile gider",
      "Given tarım iş kuralı US-140-X When üye tamamlanırsa Then şeffaf ödeme yapmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "lojistik",
    "role": "Kurye (lojistik)",
    "need": "teslimatta kapı kodu notunu görmek",
    "needHint": "teslimatta kapı kodu notunu görmek",
    "benefit": "ilk seferde teslim etmek",
    "acceptanceCriteria": [
      "Given Kurye lojistik portalında teslimatta kapı kodu notunu görmek seçtiğinde When onay verirse Then değişiklik 60 sn içinde yansır (US-141, lojistik)",
      "Given yetkisiz rol When işlem denerse Then 403 ve Türkçe hata kodu döner",
      "Given audit modu When kayıt sorgulanırsa Then kullanıcı+zaman+IP loglanır",
      "Given batch import When 100+ kayıt gelirse Then progress bar ve partial success raporu gösterilir",
      "Given lojistik iş kuralı US-141-X When teslimatta tamamlanırsa Then ilk seferde teslim etmek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "e-ticaret",
    "role": "Satıcı (e-ticaret)",
    "need": "iade talebini foto kanıtla onaylamak",
    "needHint": "iade talebini foto kanıtla onaylamak",
    "benefit": "kötüye kullanımı azaltmak",
    "acceptanceCriteria": [
      "Given Satıcı iade talebini foto kanıtla onaylamak ekranını açtığında When filtre uygularsa Then sonuçlar 2 sn içinde güncellenir",
      "Given boş sonuç When liste gelirse Then \"Kayıt bulunamadı\" ve filtre temizleme önerisi",
      "Given export When PDF oluşturulursa Then şirket logosu ve tarih footer'da",
      "Given mobil cihaz When yatay modda açılırsa Then tablo yatay scroll ile okunabilir kalır",
      "Given e-ticaret iş kuralı US-142-X When iade tamamlanırsa Then kötüye kullanımı azaltmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "kamu",
    "role": "Belediye memuru (kamu)",
    "need": "şikayet kaydını birimlere yönlendirmek",
    "needHint": "şikayet kaydını birimlere yönlendirmek",
    "benefit": "SLA takibini kolaylaştırmak",
    "acceptanceCriteria": [
      "Given Belediye memuru şikayet kaydını birimlere yönlendirmek tetiklendiğinde When SLA 15 dk aşılırsa Then eskalasyon kuyruğuna düşer",
      "Given eşzamanlı 50 istek When yük testi yapılırsa Then p95 < 800 ms kalır",
      "Given bakım modu When banner gösterilirse Then write işlemleri 503 döner",
      "Given kamu tenant A When tenant B verisine erişmeye çalışırsa Then erişim reddedilir",
      "Given kamu iş kuralı US-143-X When şikayet tamamlanırsa Then SLA takibini kolaylaştırmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "insan kaynakları",
    "role": "Yönetici (insan kaynakları)",
    "need": "ekibimin izin takvimini görmek",
    "needHint": "ekibimin izin takvimini görmek",
    "benefit": "kapasite planlamak",
    "acceptanceCriteria": [
      "Given Yönetici offline ekibimin izin takvimini görmek kaydı yaptığında When ağ gelince Then veri kaybı olmadan senkron olur",
      "Given sync çakışması When aynı kayıt iki cihazda değiştiyse Then merge UI açılır",
      "Given batarya <%15 When arka plan sync çalışırsa Then sync ertelenir",
      "Given 500 kayıt buffer When limit aşılırsa Then kullanıcı uyarılır",
      "Given insan kaynakları iş kuralı US-144-X When ekibimin tamamlanırsa Then kapasite planlamak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "enerji",
    "role": "Enerji yöneticisi (enerji)",
    "need": "anomali tüketim uyarısı almak",
    "needHint": "anomali tüketim uyarısı almak",
    "benefit": "fatura sürprizini önlemek",
    "acceptanceCriteria": [
      "Given Enerji yöneticisi anomali tüketim uyarısı almak formunu doldurduğunda When zorunlu alan boşsa Then alan altında Türkçe validation mesajı",
      "Given TC kimlik When hatalı format girilirse Then anında format hatası",
      "Given dosya upload When 10MB aşılırsa Then yükleme engellenir",
      "Given form submit When başarılı olursa Then onay numarası SMS ile gider",
      "Given enerji iş kuralı US-145-X When anomali tamamlanırsa Then fatura sürprizini önlemek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "sigorta",
    "role": "Acente temsilcisi (sigorta)",
    "need": "poliçe teklif PDF'i oluşturmak",
    "needHint": "poliçe teklif PDF'i oluşturmak",
    "benefit": "müşteriye hızlı dönüş yapmak",
    "acceptanceCriteria": [
      "Given Acente temsilcisi sigorta portalında poliçe teklif PDF'i oluşturmak seçtiğinde When onay verirse Then değişiklik 60 sn içinde yansır (US-146, sigorta)",
      "Given yetkisiz rol When işlem denerse Then 403 ve Türkçe hata kodu döner",
      "Given audit modu When kayıt sorgulanırsa Then kullanıcı+zaman+IP loglanır",
      "Given batch import When 100+ kayıt gelirse Then progress bar ve partial success raporu gösterilir",
      "Given sigorta iş kuralı US-146-X When poliçe tamamlanırsa Then müşteriye hızlı dönüş yapmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "turizm",
    "role": "Tur operatörü (turizm)",
    "need": "grup rezervasyonunu tek formda toplamak",
    "needHint": "grup rezervasyonunu tek formda toplamak",
    "benefit": "hata oranını düşürmek",
    "acceptanceCriteria": [
      "Given Tur operatörü grup rezervasyonunu tek formda toplamak ekranını açtığında When filtre uygularsa Then sonuçlar 2 sn içinde güncellenir",
      "Given boş sonuç When liste gelirse Then \"Kayıt bulunamadı\" ve filtre temizleme önerisi",
      "Given export When PDF oluşturulursa Then şirket logosu ve tarih footer'da",
      "Given mobil cihaz When yatay modda açılırsa Then tablo yatay scroll ile okunabilir kalır",
      "Given turizm iş kuralı US-147-X When grup tamamlanırsa Then hata oranını düşürmek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "üretim",
    "role": "Kalite mühendisi (üretim)",
    "need": "limit dışı ölçümde NCR açmak",
    "needHint": "limit dışı ölçümde NCR açmak",
    "benefit": "hurda riskini azaltmak",
    "acceptanceCriteria": [
      "Given Kalite mühendisi limit dışı ölçümde NCR açmak tetiklendiğinde When SLA 15 dk aşılırsa Then eskalasyon kuyruğuna düşer",
      "Given eşzamanlı 50 istek When yük testi yapılırsa Then p95 < 800 ms kalır",
      "Given bakım modu When banner gösterilirse Then write işlemleri 503 döner",
      "Given üretim tenant A When tenant B verisine erişmeye çalışırsa Then erişim reddedilir",
      "Given üretim iş kuralı US-148-X When limit tamamlanırsa Then hurda riskini azaltmak KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "siber güvenlik",
    "role": "Geliştirici (siber güvenlik)",
    "need": "CI pipeline güvenlik gate sonucunu görmek",
    "needHint": "CI pipeline güvenlik gate sonucunu görmek",
    "benefit": "zafiyetli deploy'u engellemek",
    "acceptanceCriteria": [
      "Given Geliştirici offline CI pipeline güvenlik gate sonucunu görmek kaydı yaptığında When ağ gelince Then veri kaybı olmadan senkron olur",
      "Given sync çakışması When aynı kayıt iki cihazda değiştiyse Then merge UI açılır",
      "Given batarya <%15 When arka plan sync çalışırsa Then sync ertelenir",
      "Given 500 kayıt buffer When limit aşılırsa Then kullanıcı uyarılır",
      "Given siber güvenlik iş kuralı US-149-X When CI tamamlanırsa Then zafiyetli deploy'u engellemek KPI dashboardda 24 saat içinde güncellenir"
    ]
  },
  {
    "domain": "mobil uygulamalar",
    "role": "Fitness koçu (mobil uygulamalar)",
    "need": "müşteri antrenman uyum skorunu görmek",
    "needHint": "müşteri antrenman uyum skorunu görmek",
    "benefit": "motivasyon mesajı zamanlamak",
    "acceptanceCriteria": [
      "Given Fitness koçu müşteri antrenman uyum skorunu görmek formunu doldurduğunda When zorunlu alan boşsa Then alan altında Türkçe validation mesajı",
      "Given TC kimlik When hatalı format girilirse Then anında format hatası",
      "Given dosya upload When 10MB aşılırsa Then yükleme engellenir",
      "Given form submit When başarılı olursa Then onay numarası SMS ile gider",
      "Given mobil uygulamalar iş kuralı US-150-X When müşteri tamamlanırsa Then motivasyon mesajı zamanlamak KPI dashboardda 24 saat içinde güncellenir"
    ]
  }
];
