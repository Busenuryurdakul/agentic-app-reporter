/**
 * One-shot: append 78 unique examples (13 per category) to raw_examples.json → 120 total.
 * Run: node scripts/build_expansion_examples.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawPath = path.join(root, "data", "raw_examples.json");

const PS_SECTIONS = [
  "Ürün özeti",
  "Problem",
  "Hedef kullanıcılar",
  "Temel özellikler",
  "Fonksiyonel gereksinimler",
  "Fonksiyonel olmayan gereksinimler",
  "Teknik yaklaşım",
  "Riskler",
  "Başarı kriterleri",
];

function ps(instruction, input, body) {
  const output = PS_SECTIONS.map((title) => {
    const text = body[title];
    if (!text) throw new Error(`Missing section ${title} in: ${instruction}`);
    return `## ${title}\n${text}`;
  }).join("\n\n");
  return { instruction, input, output, category: "product_spec" };
}

function rec(instruction, input, output, category) {
  return { instruction, input, output, category };
}

const expansion = [
  // ── product_spec ×13 ──
  ps(
    "Evde kronik hasta izleme platformu için ürün spesifikasyonu hazırla.",
    "Sağlık: Diyabet ve hipertansiyon hastalarının evde ölçüm cihazlarından veri göndermesi, hemşire panelinde alarm yönetimi.",
    {
      "Ürün özeti":
        "EvdeSağlık Takip, kronik hastaların glukoz ve tansiyon ölçümlerini mobil uygulama üzerinden klinik ekibe aktaran, alarm ve randevu hatırlatmalı sağlık platformudur.",
      Problem:
        "Poliklinik kontrolleri arasında hasta verisi klinikten kopuk kalıyor; geç müdahale gerektiren sapmalar geç fark ediliyor.",
      "Hedef kullanıcılar":
        "Kronik hastalar, evde bakım hemşireleri, aile hekimleri, hastane kronik hastalıklar koordinatörleri.",
      "Temel özellikler":
        "Bluetooth cihaz eşleştirme, eşik tabanlı alarm, hemşire triage paneli, ilaç uyumu anketi, video görüşme yönlendirme.",
      "Fonksiyonel gereksinimler":
        "FR-01: Ölçüm kaydı ve zaman damgası. FR-02: Kritik eşik aşımında SMS/push. FR-03: Hemşire notu ekleme. FR-04: Aylık trend raporu PDF.",
      "Fonksiyonel olmayan gereksinimler":
        "KVKK ve sağlık verisi şifreleme, %99.5 uptime, 3G uyumlu senkron, erişilebilirlik AA, audit log 5 yıl.",
      "Teknik yaklaşım":
        "React Native mobil, FHIR uyumlu API, PostgreSQL, Redis bildirim kuyruğu, HL7 entegrasyon adaptörü.",
      Riskler:
        "Yaşlı kullanıcı cihaz eşleştirme hatası, yanlış alarm yorgunluğu, klinik entegrasyon gecikmesi.",
      "Başarı kriterleri":
        "6 ayda 500 aktif hasta, kritik olay müdahale süresi 30 dk altı, hemşire memnuniyeti NPS > 45.",
    },
  ),
  ps(
    "Akıllı tarla sulama optimizasyon uygulaması spec yaz.",
    "Tarım: Toprak nem sensörleri, hava durumu API, sulama vanalarının otomatik kontrolü.",
    {
      "Ürün özeti":
        "TarlaNem Pro, çiftçilerin parsel bazlı nem ve hava verisine göre sulama vanalarını uzaktan yönetmesini sağlayan IoT destekli tarım platformudur.",
      Problem:
        "Sabit zamanlı sulama su israfına ve verim düşüşüne yol açıyor; sensör verisi ile karar verilemiyor.",
      "Hedef kullanıcılar":
        "Orta ölçekli çiftçiler, tarım kooperatifleri, ziraat mühendisleri, sulama birlikleri.",
      "Temel özellikler":
        "Parsel haritası, nem eşiği kuralları, vana aç/kapa, su tüketim raporu, don uyarısı.",
      "Fonksiyonel gereksinimler":
        "FR-01: Sensör telemetrisi 15 dk aralık. FR-02: Kural motoru ile otomatik sulama. FR-03: Manuel override. FR-04: Sezonluk su maliyeti özeti.",
      "Fonksiyonel olmayan gereksinimler":
        "Offline gateway buffer 24 saat, 500 sensör/tenant, TLS MQTT, pil ömrü uyarısı.",
      "Teknik yaklaşım":
        "LoRaWAN gateway, TimescaleDB, Node.js kural servisi, Vue.js dashboard, OpenWeather entegrasyonu.",
      Riskler:
        "Sensör kalibrasyon sapması, internet kesintisinde senkron gecikmesi, çiftçi dijital adaptasyonu.",
      "Başarı kriterleri":
        "Su tüketiminde %20 azalma, verim artışı %8, 100 aktif parsel ilk yıl.",
    },
  ),
  ps(
    "KOBİ nakit akış tahmin SaaS ürün spesifikasyonu oluştur.",
    "Finans: e-Fatura ve banka ekstre entegrasyonu ile 90 günlük nakit projeksiyonu.",
    {
      "Ürün özeti":
        "NakitAkış360, KOBİ muhasebe verilerinden otomatik nakit akış projeksiyonu üreten finans SaaS çözümüdür.",
      Problem:
        "KOBİ'ler tahsilat ve ödeme takvimini Excel ile yönetiyor; likidite krizi geç fark ediliyor.",
      "Hedef kullanıcılar":
        "KOBİ CFO'ları, muhasebe sorumluları, mali müşavirler, finans danışmanları.",
      "Temel özellikler":
        "Banka/e-Fatura bağlantısı, senaryo simülasyonu, vade uyarıları, dashboard, PDF rapor.",
      "Fonksiyonel gereksinimler":
        "FR-01: Günlük bakiye senkronu. FR-02: 30/60/90 gün projeksiyon. FR-03: Geciken alacak listesi. FR-04: What-if senaryo kaydetme.",
      "Fonksiyonel olmayan gereksinimler":
        "PSD2/Open Banking güvenliği, veri at-rest AES-256, çok kiracılı izolasyon, audit trail.",
      "Teknik yaklaşım":
        "Next.js, Go API, PostgreSQL, Plaid benzeri banka adaptör katmanı, batch ETL gece job.",
      Riskler:
        "Banka API erişim gecikmesi, hatalı fatura eşleme, regülasyon değişikliği.",
      "Başarı kriterleri":
        "Tahmin sapması MAPE <%15, 200 aktif KOBİ, churn <%8 yıllık.",
    },
  ),
  ps(
    "İnsan kaynakları performans değerlendirme modülü spec hazırla.",
    "İK: 360 derece geri bildirim, hedef OKR takibi, kalibrasyon toplantısı desteği.",
    {
      "Ürün özeti":
        "PerformansHub, orta ve büyük ölçekli şirketlerin OKR ve 360 geri bildirim süreçlerini dijitalleştiren İK modülüdür.",
      Problem:
        "Değerlendirme formları e-posta ve Excel ile dağınık; kalibrasyon toplantılarında tutarlı veri yok.",
      "Hedef kullanıcılar":
        "İK business partner'ları, birim yöneticileri, çalışanlar, üst yönetim.",
      "Temel özellikler":
        "OKR hizalama, 360 anket, kalibrasyon matrisi, gelişim planı, dönem kapanış raporu.",
      "Fonksiyonel gereksinimler":
        "FR-01: OKR oluşturma ve ağırlıklandırma. FR-02: Anonim 360 toplama. FR-03: Kalibrasyon oturumu notları. FR-04: PDF performans özeti.",
      "Fonksiyonel olmayan gereksinimler":
        "SSO SAML, rol tabanlı erişim, veri saklama politikası, çoklu dil TR/EN.",
      "Teknik yaklaşım":
        "React SPA, Java Spring API, PostgreSQL, ElasticSearch rapor indeksi.",
      Riskler:
        "Düşük katılım oranı, yönetici bias, gizlilik endişeleri.",
      "Başarı kriterleri":
        "360 tamamlama oranı >%85, değerlendirme döngüsü süresinde %30 kısalma.",
    },
  ),
  ps(
    "Son mil kurye rota optimizasyon uygulaması için spec yaz.",
    "Lojistik: Same-day teslimat, dinamik rota, müşteri canlı takip ekranı.",
    {
      "Ürün özeti":
        "SonMil Rota, e-ticaret fulfillment merkezlerinin kurye filosunu gerçek zamanlı optimize eden lojistik platformudur.",
      Problem:
        "Manuel rota planlama gecikmeli teslimat ve yüksek yakıt maliyetine neden oluyor.",
      "Hedef kullanıcılar":
        "Operasyon planlayıcıları, kuryeler, müşteri hizmetleri, depo yöneticileri.",
      "Temel özellikler":
        "Dinamik rota, POD fotoğraf, müşteri ETA SMS, SLA ihlal alarmı, performans skorboard.",
      "Fonksiyonel gereksinimler":
        "FR-01: Sipariş-kurye eşleme. FR-02: Trafik API ile ETA güncelleme. FR-03: Teslim kanıtı yükleme. FR-04: Günlük SLA raporu.",
      "Fonksiyonel olmayan gereksinimler":
        "500 eşzamanlı kurye, offline POD kuyruğu, harita tile cache, p95 API <400ms.",
      "Teknik yaklaşım":
        "Flutter kurye uygulaması, OSRM routing, Kafka olay akışı, PostgreSQL+PostGIS.",
      Riskler:
        "GPS sapması, adres kalitesi düşüklüğü, yoğun saat kapasite taşması.",
      "Başarı kriterleri":
        "Zamanında teslimat >%92, rota başına paket +%18, yakıt maliyeti -%12.",
    },
  ),
  ps(
    "Uzaktan sınav güvenlik platformu ürün spesifikasyonu oluştur.",
    "Eğitim: Kamera proctoring, kimlik doğrulama, anomali tespiti, sınav salonu yönetimi.",
    {
      "Ürün özeti":
        "SınavGuard, üniversitelerin uzaktan sınavlarında kimlik doğrulama ve davranış analizi ile akademik dürüstlüğü destekleyen platformdur.",
      Problem:
        "Uzaktan sınavlarda kimlik doğrulama zayıf; ihlal incelemesi manuel ve yavaş.",
      "Hedef kullanıcılar":
        "Sınav koordinatörleri, gözetmenler, öğrenciler, akademik kurul.",
      "Temel özellikler":
        "Kimlik + yüz eşleme, sekme değişim uyarısı, kayıt inceleme paneli, ihlal etiketleme.",
      "Fonksiyonel gereksinimler":
        "FR-01: Sınav öncesi kimlik kontrolü. FR-02: Oturum video kaydı. FR-03: Anomali skoru. FR-04: İtiraz workflow.",
      "Fonksiyonel olmayan gereksinimler":
        "KVKK uyumu, kayıt saklama 1 yıl, erişilebilir alternatif sınav modu, %99 uptime.",
      "Teknik yaklaşım":
        "WebRTC streaming, Python ML skor servisi, S3 uyumlu depolama, LMS LTI entegrasyonu.",
      Riskler:
        "Yanlış pozitif ihlal, düşük bant genişliği, öğrenci mahremiyet tartışmaları.",
      "Başarı kriterleri":
        "İnceleme süresi -%40, ihlal doğrulama doğruluğu >%90, 10.000 eşzamanlı oturum.",
    },
  ),
  ps(
    "Mağaza içi gerçek zamanlı stok görünürlük uygulaması spec yaz.",
    "Perakende: RFID ve POS entegrasyonu, reyon stok sapması uyarısı.",
    {
      "Ürün özeti":
        "ReyonCanlı, zincir marketlerin mağaza içi stok doğruluğunu RFID ve POS verisiyle gerçek zamanlı izleyen perakende çözümüdür.",
      Problem:
        "Rafta görünmeyen ürün kaybı satış kaçırıyor; sayım haftada bir yapılıyor.",
      "Hedef kullanıcılar":
        "Mağaza müdürleri, reyon sorumluları, merkez planlama, loss prevention ekipleri.",
      "Temel özellikler":
        "RFID okuma, POS satış eşleme, sapma alarmı, sayım görevi, KPI dashboard.",
      "Fonksiyonel gereksinimler":
        "FR-01: SKU bazlı stok tahmini. FR-02: %5 sapmada görev oluşturma. FR-03: Sayım sonucu mutabakat. FR-04: Haftalık shrink raporu.",
      "Fonksiyonel olmayan gereksinimler":
        "500 mağaza, edge cache, offline sayım sync, PCI DSS POS ayrımı.",
      "Teknik yaklaşım":
        "Edge gateway, Kafka, Snowflake benzeri DWH, React operasyon paneli.",
      Riskler:
        "RFID okuma hatası, promosyon dönemi veri gürültüsü, mağaza Wi-Fi kesintisi.",
      "Başarı kriterleri":
        "Stok doğruluğu %95+, shrink oranı -%15, görev kapanma SLA 4 saat.",
    },
  ),
  ps(
    "Belediye vatandaş şikayet yönetim platformu spec hazırla.",
    "Kamu: Fotoğraflı şikayet, birim yönlendirme, SLA takibi, vatandaş bilgilendirme.",
    {
      "Ürün özeti":
        "VatandaşSes, belediyelerin altyapı ve temizlik şikayetlerini uçtan uca yöneten kamu hizmeti platformudur.",
      Problem:
        "Şikayetler telefon ve e-posta ile kayboluyor; vatandaş geri bildirim alamıyor.",
      "Hedef kullanıcılar":
        "Vatandaşlar, mahalle muhtarları, birim şefleri, belediye başkanlığı.",
      "Temel özellikler":
        "Konumlu şikayet, otomatik birim atama, SLA sayaç, durum bildirimi, istatistik paneli.",
      "Fonksiyonel gereksinimler":
        "FR-01: Şikayet oluşturma ve fotoğraf. FR-02: Birim atama kuralları. FR-03: SLA ihlal eskalasyonu. FR-04: Aylık mahalle raporu.",
      "Fonksiyonel olmayan gereksinimler":
        "E-Devlet hazırlığı, erişilebilirlik, veri anonimleştirme, %99 erişilebilirlik.",
      "Teknik yaklaşım":
        "React Native vatandaş uygulaması, .NET Core API, PostgreSQL, SMS gateway.",
      Riskler:
        "Yoğun dönem ticket birikimi, birimler arası sorumluluk belirsizliği.",
      "Başarı kriterleri":
        "Ortalama çözüm süresi 72 saat altı, vatandaş memnuniyeti >%70, tekrar şikayet -%25.",
    },
  ),
  ps(
    "Güneş enerji santrali izleme dashboard spec oluştur.",
    "Enerji: İnverter telemetrisi, üretim kaybı analizi, bakım work order entegrasyonu.",
    {
      "Ürün özeti":
        "GES Pano, güneş santrali operatörlerinin inverter ve string verilerini izleyip üretim kaybını erken tespit eden enerji platformudur.",
      Problem:
        "Inverter arızaları günler sonra fark ediliyor; manuel Excel raporlama gecikmeli.",
      "Hedef kullanıcılar":
        "Santral operatörleri, bakım ekipleri, yatırımcılar, O&M firmaları.",
      "Temel özellikler":
        "Canlı üretim, PR hesabı, alarm kuralları, work order tetikleme, finansal gelir tahmini.",
      "Fonksiyonel gereksinimler":
        "FR-01: 5 dk telemetri. FR-02: String sapma alarmı. FR-03: CMMS entegrasyonu. FR-04: Aylık PR raporu.",
      "Fonksiyonel olmayan gereksinimler":
        "10 MW+ santral desteği, veri saklama 10 yıl, IEC protokol adaptörleri.",
      "Teknik yaklaşım":
        "TimescaleDB, Grafana embed, Modbus/MQTT collector, Python anomaly job.",
      Riskler:
        "Sensör drift, hava durumu düzeltme hatası, eski inverter protokolü.",
      "Başarı kriterleri":
        "Kayıp tespit süresi 2 saat altı, availability >%98, bakım maliyeti -%10.",
    },
  ),
  ps(
    "Üretim hattı kalite kontrol dijital checklist spec yaz.",
    "Üretim: Operatör tablet checklist, fotoğraflı hata kaydı, SPC trend grafikleri.",
    {
      "Ürün özeti":
        "HatKalite, discrete manufacturing hatlarında dijital checklist ve SPC ile kalite sapmasını erken yakalayan üretim modülüdür.",
      Problem:
        "Kağıt checklist kayboluyor; kalite verisi MES'e geç ulaşıyor.",
      "Hedef kullanıcılar":
        "Hat operatörleri, kalite mühendisleri, üretim müdürleri, sürekli iyileştirme ekipleri.",
      "Temel özellikler":
        "Tablet checklist, barkod lot takibi, fotoğraflı NCR, SPC X-bar grafik, duruş kodu.",
      "Fonksiyonel gereksinimler":
        "FR-01: İstasyon bazlı checklist. FR-02: Limit dışı otomatik duruş önerisi. FR-03: NCR workflow. FR-04: Günlük PPM raporu.",
      "Fonksiyonel olmayan gereksinimler":
        "Offline 8 saat, ATEX uyumlu tablet profili, MES OPC-UA entegrasyonu.",
      "Teknik yaklaşım":
        "Flutter tablet, Go API, PostgreSQL, InfluxDB SPC metrikleri.",
      Riskler:
        "Operatör direnci, yanlış duruş alarmı, MES entegrasyon gecikmesi.",
      "Başarı kriterleri":
        "Kağıt kullanımı sıfır, PPM -%20, checklist tamamlama >%98.",
    },
  ),
  ps(
    "B2B proje yönetim SaaS ürün spesifikasyonu hazırla.",
    "SaaS: Kanban, zaman takibi, müşteri portalı, faturalandırılabilir saat raporu.",
    {
      "Ürün özeti":
        "ProjeFlow B2B, ajans ve yazılım evlerinin proje, zaman ve müşteri iletişimini tek SaaS'ta birleştiren platformdur.",
      Problem:
        "Araç parçalanması (Jira + Toggl + e-posta) faturalandırılabilir saat kaçağına yol açıyor.",
      "Hedef kullanıcılar":
        "Proje yöneticileri, geliştiriciler, müşteri sponsorları, finans.",
      "Temel özellikler":
        "Kanban, zamanlayıcı, müşteri portalı, bütçe burn-down, PDF zaman raporu.",
      "Fonksiyonel gereksinimler":
        "FR-01: Görev ve sprint yönetimi. FR-02: Billable saat işaretleme. FR-03: Müşteri read-only görünüm. FR-04: Aylık faturalama export.",
      "Fonksiyonel olmayan gereksinimler":
        "Multi-tenant izolasyon, SSO, 99.9 SLA, GDPR export/silme.",
      "Teknik yaklaşım":
        "Next.js, NestJS, PostgreSQL, Redis, Stripe billing.",
      Riskler:
        "Feature creep, müşteri portal güvenlik yapılandırması, churn.",
      "Başarı kriterleri":
        "Billable capture +%15, NPS >50, 300 paying teams yıl 1.",
    },
  ),
  ps(
    "Kişiselleştirilmiş fitness koçluk mobil uygulaması spec oluştur.",
    "Mobil: Antrenman planı, beslenme önerisi, giyilebilir cihaz senkronu.",
    {
      "Ürün özeti":
        "FormKoç, giyilebilir cihaz verisiyle kişiselleştirilmiş antrenman ve beslenme planı sunan fitness mobil uygulamasıdır.",
      Problem:
        "Genel antrenman planları hedefe ulaşmada yetersiz; ilerleme takibi dağınık.",
      "Hedef kullanıcılar":
        "Fitness meraklıları, personal trainer'lar, spor salonu üyeleri.",
      "Temel özellikler":
        "Apple Health/Google Fit sync, adaptif plan, form videosu, haftalık check-in.",
      "Fonksiyonel gereksinimler":
        "FR-01: Hedef profil anketi. FR-02: Cihaz adım/kalori sync. FR-03: Plan otomatik güncelleme. FR-04: Trainer mesajlaşma.",
      "Fonksiyonel olmayan gereksinimler":
        "Offline antrenman görüntüleme, video CDN, push bildirim, App Store 4.5+.",
      "Teknik yaklaşım":
        "React Native, Firebase, Node API, recommendation engine batch job.",
      Riskler:
        "Sağlık iddiası regülasyonu, cihaz API değişikliği, churn ilk 30 gün.",
      "Başarı kriterleri":
        "30 gün retention >%40, hedef tamamlama +%25, 50K MAU.",
    },
  ),
  ps(
    "Self-service iş zekası ve raporlama portalı spec yaz.",
    "Veri: Semantic layer, drag-drop dashboard, satır düzeyinde yetki, SQL passthrough.",
    {
      "Ürün özeti":
        "VeriPano Self-Service, iş birimlerinin IT'ye bağımlı kalmadan onaylı veri modelleri üzerinde dashboard oluşturmasını sağlayan BI platformudur.",
      Problem:
        "Rapor talepleri IT kuyruğunda haftalarca bekliyor; shadow IT Excel çoğalıyor.",
      "Hedef kullanıcılar":
        "İş analistleri, departman yöneticileri, veri stewards, BI mühendisleri.",
      "Temel özellikler":
        "Semantic katman, sürükle-bırak chart, RLS, zamanlanmış e-posta rapor, lineage görünümü.",
      "Fonksiyonel gereksinimler":
        "FR-01: Onaylı dataset katalog. FR-02: Dashboard publish/onay. FR-03: RLS rol eşlemesi. FR-04: Export CSV/PDF.",
      "Fonksiyonel olmayan gereksinimler":
        "p95 sorgu <5 sn (10M satır), SSO, audit log, veri maskeleme.",
      "Teknik yaklaşım":
        "React, Trino/Presto sorgu katmanı, dbt semantic models, Kubernetes.",
      Riskler:
        "Yanlış metrik tanımı, RLS bypass hatası, sorgu maliyeti patlaması.",
      "Başarı kriterleri":
        "IT rapor talebi -%50, aktif dashboard 500+, veri güven skoru audit geçiş.",
    },
  ),

  // ── project_planning ×13 ──
  rec(
    "Sağlık yazılımı MVP için kapsam ve kilometre taşı planı oluştur.",
    "6 ay, ekip: 2 backend, 2 frontend, 1 QA, 1 PM. Kapsam: randevu + reçete görüntüleme.",
    "Kapsam: MVP'de randevu CRUD, reçete read-only, SMS hatırlatma. Kapsam dışı: e-reçete yazma, telemedicine. Kilometre taşları: M1 tasarım onay (Ay1), M2 alpha iç test (Ay3), M3 regülasyon review (Ay4), M4 pilot hastane (Ay5), M5 GA (Ay6). Bağımlılıklar: SMS gateway sözleşmesi, HL7 test ortamı. Kaynak: QA Ay3'ten itibaren tam zamanlı. Teslim kriteri: pilot hastanede 100 randevu/hafta hatasız. İletişim: haftalık steering, aylık yönetim özeti. Değişiklik yönetimi: CR formu, PM onayı, sprint buffer %15.",
    "project_planning",
  ),
  rec(
    "Tarım IoT rollout projesi zaman çizelgesi hazırla.",
    "500 parsel, 3 bölge, sensör montajı + yazılım canlı geçiş.",
    "Faz 0 (2 hf): pilot 20 parsel. Faz 1 (8 hf): Bölge A 200 parsel montaj + gateway. Faz 2 (8 hf): Bölge B. Faz 3 (6 hf): Bölge C + optimizasyon. Bağımlılık: LoRaWAN altyapı izni, çiftçi eğitim materyali. Kaynak: 4 saha teknisyeni, 2 backend, 1 PM. Milestone: %95 telemetri uptime bölge başına. Teslim: kullanıcı kabul testi checklist. İletişim: bölge koordinatörleri haftalık. Değişiklik: hava koşulu kaynaklı montaj kayması için 2 hf buffer.",
    "project_planning",
  ),
  rec(
    "Bankacılık mobil yenileme programı master plan yaz.",
    "18 ay, regülasyon onayı gerekli, legacy API kademeli emeklilik.",
    "Kapsam: iOS/Android yeni shell, biometric login, hesap özeti, transfer. Wave 1 (6 ay): login+hesap. Wave 2 (6 ay): transfer+favori. Wave 3 (6 ay): yatırım modülü. Bağımlılıklar: BDDK onay, core banking API v2. Kaynak matrisi: 2 squad mobil, 1 squad API, shared QA pool. Milestone: güvenlik pentest her wave sonu. Teslim kriteri: crash-free >%99.5. İletişim: program board iki haftada bir. Değişiklik yönetimi: CAB toplantısı, acil fix lane ayrı.",
    "project_planning",
  ),
  rec(
    "İK sistem değişimi (HRIS migration) proje planı oluştur.",
    "Eski sistemden yeni buluta geçiş, 8000 çalışan, tek cutover penceresi.",
    "Kapsam: bordro verisi, izin bakiyeleri, organizasyon şeması. Fazlar: veri haritalama (4 hf), temizleme (6 hf), UAT (4 hf), eğitim (3 hf), cutover (1 hf), hypercare (4 hf). Bağımlılık: bordro servis sağlayıcı API. Kaynak: 1 PM, 2 analist, 3 entegrasyon dev, İK vekili. Milestone: UAT sign-off. Teslim: cutover sonrası ilk bordro hatasız. İletişim: haftalık İK steering. Değişiklik: cutover tarihi yalnızca yönetim kurulu onayı ile.",
    "project_planning",
  ),
  rec(
    "Lojistik depo otomasyonu WMS go-live planı yaz.",
    "Yeni WMS, mevcut ERP ile paralel 2 ay, tek depo pilot.",
    "Kapsam: inbound, putaway, picking, shipping. Sprint plan: S1-2 konfig, S3-4 entegrasyon, S5-6 UAT, S7 eğitim, S8 go-live, S9 stabilizasyon. Bağımlılıklar: barkod altyapısı, ERP staging API. Kaynak: 1 WMS uzmanı, 4 dev, 2 depo süper kullanıcı. Milestone: mock go-live tatbikatı. Teslim kriteri: picking doğruluğu >%99.5. İletişim: günlük standup go-live haftası. Değişiklik: scope freeze go-live -4 hf.",
    "project_planning",
  ),
  rec(
    "Üniversite LMS geçiş projesi planı hazırla.",
    "Blackboard'tan yeni LMS'e, 2 dönem kademeli, 40.000 kullanıcı.",
    "Dönem 1: 5 fakülte pilot. Dönem 2: tam geçiş. Aktiviteler: içerik migrasyon, eğitim atölyesi, destek hattı. Bağımlılık: SCORM paket dönüşümü. Kaynak: 1 PM, LMS admin, 3 eğitimci, gece destek ekibi. Milestone: pilot memnuniyet >%80. Teslim: tüm dersler yeni LMS'te. İletişim: fakülte temsilcileri aylık. Değişiklik: akademik takvim dışına çıkılmaz.",
    "project_planning",
  ),
  rec(
    "Perakende omnichannel sipariş yönetimi teslim planı oluştur.",
    "Mağazadan teslim, ship-from-store, 120 mağaza, 9 ay.",
    "Q1: 10 mağaza pilot. Q2: 50 mağaza. Q3: 120 mağaza. Kapsam: OMS kural motoru, mağaza tablet uygulaması. Bağımlılık: e-ticaret platform API. Kaynak: 2 squad, mağaza eğitim L&D. Milestone: pilot NPS mağaza personeli. Teslim: sipariş hazırlama SLA 2 saat. İletişim: mağaza weekly huddle. Değişiklik: mağaza sayısı artışı CAB onaylı.",
    "project_planning",
  ),
  rec(
    "Kamu dijital hizmet portalı faz planı yaz.",
    "15 hizmet dijitalleşecek, e-Devlet entegrasyonu, 12 ay waterfall-karma.",
    "Faz 1 (4 ay): 5 yüksek hacimli hizmet. Faz 2 (4 ay): 5 orta. Faz 3 (4 ay): 5 düşük + optimizasyon. Bağımlılık: e-Devlet test ortamı, KVKK DPIA. Kaynak: kamu PMO, 2 müteahhit squad. Milestone: her faz sonu kabul komisyonu. Teslim kriteri: vatandaş işlem süresi yarıya. İletişim: kamuoyu bilgilendirme aylık. Değişiklik: mevzuat değişikliği change request zorunlu.",
    "project_planning",
  ),
  rec(
    "Enerji SCADA modernizasyon program planı hazırla.",
    "Legacy SCADA değişimi, kesintisiz operasyon, 24 ay.",
    "Yıl 1: yeni SCADA paralel kurulum, shadow mode. Yıl 2: kademeli cutover santral santral. Bağımlılık: OT güvenlik onayı, vendor SLA. Kaynak: OT mühendisleri, SI partner, 7/24 NOC. Milestone: shadow mode 30 gün hatasız. Teslim: eski SCADA emekli. İletişim: operasyon brifingi haftalık. Değişiklik: cutover yalnızca planlı bakım penceresinde.",
    "project_planning",
  ),
  rec(
    "Üretim MES genişletme projesi kaynak ve zaman planı yaz.",
    "3 yeni hat, OEE modülü, ERP entegrasyonu, 10 ay.",
    "Ay1-2: keşif+blueprint. Ay3-6: geliştirme. Ay7-8: UAT+operator training. Ay9: go-live hat 1. Ay10: hat 2-3. Bağımlılık: OPC-UA tag listesi. Kaynak: 1 MES uzmanı, 3 OT dev, plant champion. Milestone: OEE dashboard doğrulama. Teslim: OEE verisi ERP'ye otomatik. İletişim: plant daily tier-2. Değişiklik: üretim duruş penceresi dışında deploy yok.",
    "project_planning",
  ),
  rec(
    "SaaS çok kiracılı faturalandırma modülü release train planı oluştur.",
    "Stripe entegrasyonu, usage-based billing, 6 aylık release train.",
    "RT1: temel abonelik. RT2: usage metering. RT3: fatura PDF+vergi. RT4: self-service plan değişimi. Bağımlılık: Stripe Connect onay. Kaynak: 1 PM, 4 dev, 1 finans analist. Milestone: SOC2 ilgili kontroller. Teslim: MRR raporu otomatik. İletişim: release notes müşteriye. Değişiklik: fiyat değişikliği legal review zorunlu.",
    "project_planning",
  ),
  rec(
    "Mobil uygulama mağaza lansman projesi iletişim ve teslim planı yaz.",
    "iOS+Android eşzamanlı lansman, ASO, 8 hafta.",
    "Hafta 1-2: store asset+legal. 3-4: beta TestFlight/Play. 5: soft launch 1 ülke. 6-7: bugfix. 8: global launch. Bağımlılık: App Store review guideline. Kaynak: PM, 2 mobil dev, marketing, legal. Milestone: beta crash-free %99. Teslim: store rating hedef 4.5. İletişim: launch war room günlük son 2 hf. Değişiklik: review rejection durumunda 1 hf buffer.",
    "project_planning",
  ),
  rec(
    "İç operasyon ITSM platformu devreye alma planı hazırla.",
    "ServiceNow benzeri ITSM, incident+change+asset, 5 ay.",
    "Ay1: süreç tasarım. Ay2-3: konfig+entegrasyon. Ay4: pilot IT+HR. Ay5: tüm şirket. Bağımlılık: AD/LDAP, monitoring webhook. Kaynak: 1 ITSM admin, 2 integrator, change manager. Milestone: MTTR baseline ölçümü. Teslim: SLA raporu otomatik. İletişim: change advisory board iki haftada bir. Değişiklik: acil change prosedürü ayrı.",
    "project_planning",
  ),

  // ── requirement_analysis ×13 ──
  rec(
    "Belirsiz paydaş talebini net fonksiyonel gereksinimlere dönüştür.",
    "Paydaş: 'Sistem akıllı olsun, kullanıcıyı tanısın ve hızlı çalışsın.'",
    "FR-001: Son 3 oturum cihaz parmak izi ile otomatik tanıma (opt-in). FR-002: Ana dashboard p95 yükleme <2 sn (100 eşzamanlı). FR-003: Sık kullanılan 3 aksiyon için kısayol önerisi. NFR-001: Tanıma verisi 90 gün sonra silinir. NFR-002: Yanlış tanıma oranı <%1 test setinde. Edge case: paylaşımlı cihazda opt-out zorunlu. Veri: oturum log, tıklama heatmap anonim.",
    "requirement_analysis",
  ),
  rec(
    "Çelişkili paydaş beklentilerini analiz et ve önceliklendir.",
    "Satış: müşteri verisi toplansın. Legal: minimum veri. UX: kişiselleştirme istiyor.",
    "Çelişki: kişiselleştirme vs veri minimizasyonu. Çözüm: açık rıza ile zorunlu/opsiyonel alan ayrımı; kişiselleştirme yalnızca opsiyonel profil dolu ise. Must: yalnızca e-posta+ad. Should: tercih ve segment (rıza ile). Won't: üçüncü taraf profil birleştirme v1. Kabul: legal sign-off DPIA ile.",
    "requirement_analysis",
  ),
  rec(
    "E-ticaret iade süreci için edge case gereksinimlerini listele.",
    "Kısmi iade, promosyonlu ürün, dijital kupon, mağazadan teslim.",
    "Edge: kısmi iade kalan kalem promosyon uygunluğu yeniden hesaplanır. Edge: dijital kupon kullanılmışsa nakit iade değil kupon restore. Edge: mağazadan iade depo stok lokasyonu farklı ledger. Edge: 30 gün sonrası yönetici onayı. FR: iade durum makinesi 7 durum. Entegrasyon: ödeme gateway partial refund API.",
    "requirement_analysis",
  ),
  rec(
    "Belirsiz NFR ifadelerini ölçülebilir hale getir.",
    "Sistem ölçeklenebilir, güvenilir ve bakımı kolay olmalı.",
    "Ölçek: 5000 eşzamanlı, yatay scale-out 3 node. Güvenilirlik: %99.9 aylık, RTO 1 saat, RPO 15 dk. Bakım: modül başına unit test %80, deploy rollback 10 dk. İzleme: golden signals dashboard zorunlu. Kabul: load test raporu ve DR tatbikatı.",
    "requirement_analysis",
  ),
  rec(
    "API entegrasyon gereksinimlerini detaylandır.",
    "ERP sipariş oluşturma, stok sorgu, fatura durumu; günde 50K çağrı.",
    "INT-001 POST /orders idempotent key. INT-002 GET /stock rate limit 100/s. INT-003 webhook invoice.status. SLA: p95 500ms. Hata: exponential backoff 5 deneme, DLQ. Veri: sipariş kalemi SKU zorunlu, fiyat 2 ondalık. Güvenlik: mTLS+OAuth client credentials.",
    "requirement_analysis",
  ),
  rec(
    "Mobil offline mod kapsamını gereksinim olarak tanımla.",
    "Saha satış ekibi bazen bağlantısız çalışacak; sipariş taslak ve senkron.",
    "FR: offline taslak sipariş oluşturma. FR: bağlantı gelince otomatik sync kuyruğu. FR: çakışmada sunucu kazanır+ kullanıcıya diff. NFR: offline en fazla 500 taslak cihaz başına. Edge: fiyat listesi 24 saatte bir zorunlu refresh online. Kabul: uçak modu test senaryosu geçer.",
    "requirement_analysis",
  ),
  rec(
    "Rol tabanlı erişim gereksinimlerini çıkar.",
    "Roller: admin, editör, görüntüleyici, misafir; kaynak: proje, rapor, ayar.",
    "Admin: tam yetki+ kullanıcı yönetimi. Editör: proje CRUD, rapor oluştur. Görüntüleyici: read-only export yok. Misafir: paylaşılan link 7 gün. NFR: yetki değişikliği audit log. Edge: admin sayısı min 2 (kilitleme önleme). Kabul: RBAC matrisi imzalı.",
    "requirement_analysis",
  ),
  rec(
    "Veri saklama ve silme gereksinimlerini tanımla.",
    "KVKK kapsamında müşteri profili, sipariş, log verisi.",
    "Profil: rıza geri çekilince 30 gün içinde silme. Sipariş: 10 yıl muhasebe. Log: 1 yıl, anonimleştirilmiş analitik 2 yıl. FR: silme talebi self-service. FR: silme onay e-postası. Edge: devam eden iade varsa silme ertelenir. Entegrasyon: backup retention ile uyum.",
    "requirement_analysis",
  ),
  rec(
    "Çok dilli ürün kapsamı için gereksinim analizi yap.",
    "TR, EN, DE; RTL yok; tarih/sayı formatları locale-aware.",
    "FR: UI string katalog yönetimi. FR: kullanıcı dil seçimi profilde. NFR: yeni dil ekleme kod deploy gerektirmesin. Edge: eksik çeviri fallback EN. Kabul: pseudo-locale test, %100 TR/EN kritik akış.",
    "requirement_analysis",
  ),
  rec(
    "Arama ve filtreleme modülü kabul kriterlerini yaz.",
    "1M kayıt katalog, faceted search, autocomplete.",
    "Kabul: autocomplete p95 <200ms 3 karakter sonrası. Kabul: faceted filtre 5 eşzamanlı facet. Kabul: boş sonuç öneri mesajı. NFR: indeks gecikme max 5 dk. Edge: özel karakter ve Türkçe locale stemming.",
    "requirement_analysis",
  ),
  rec(
    "Bildirim sistemi fonksiyonel gereksinimlerini çıkar.",
    "E-posta, SMS, push; kullanıcı tercih matrisi; pazarlama izni ayrı.",
    "FR: kanal bazlı opt-in/out. FR: transactional bypass (OTP). FR: günlük pazarlama limit 1. Edge: SMS undelivered retry 2. Veri: consent timestamp saklanır. Kabul: preference center UI test.",
    "requirement_analysis",
  ),
  rec(
    "Raporlama modülü veri doğruluk gereksinimlerini tanımla.",
    "Gelir raporu ERP ile mutabakat, tolerans 0.01 birim.",
    "FR: günlük mutabakat job. FR: sapma dashboard kırmızı eşik. FR: manuel düzeltme audit. Edge: kur farkı ayrı satır. Entegrasyon: ERP GL export CSV. Kabul: 30 günlük mutabakat sıfır sapma.",
    "requirement_analysis",
  ),
  rec(
    "Onboarding sihirbazı kullanılabilirlik gereksinimlerini netleştir.",
    "B2B SaaS, 5 adım, ilk değer 10 dk içinde.",
    "Kabul: adım başına ilerleme göstergesi. Kabul: taslağı kaydet ve devam et. Kabul: adım atlama yalnızca admin. NFR: mobil uyumlu. Edge: zorunlu entegrasyon adımı hata mesajı actionable. Metrik: onboarding tamamlama >%70.",
    "requirement_analysis",
  ),

  // ── technical_documentation ×13 ──
  rec(
    "Ödeme servisi REST API dokümantasyonu yaz.",
    "POST /payments, GET /payments/{id}, webhook payment.captured.",
    "POST /payments: body amount,currency,method; 201 döner paymentId. Hatalar: 400 validation, 402 insufficient, 409 duplicate idempotency-key. GET: durum enum pending|captured|failed. Webhook: HMAC-SHA256 imza header, retry 5x exponential. Rate limit: 100 req/dk/tenant. Örnek curl ve hata gövdesi şema JSON.",
    "technical_documentation",
  ),
  rec(
    "Mikro servis mimarisi genel bakış dokümanı oluştur.",
    "Servisler: auth, catalog, order, payment, notification; event bus Kafka.",
    "Mimari: API gateway → servisler. Senkron: REST order→payment. Asenkron: order.created→notification. Veri: servis başına DB, shared read replica yok. Gözlemlenebilirlik: trace-id header zorunlu. Deployment: Kubernetes, her servis ayrı helm chart. Hata: circuit breaker 50% hata 30 sn.",
    "technical_documentation",
  ),
  rec(
    "Sipariş fulfillment veri akışı dokümante et.",
    "Kanal: web, mağaza, marketplace → OMS → WMS → kargo.",
    "Akış: web checkout → order.created → OMS allocation → WMS pick task → shipped event → tracking webhook. Schema: Order v3 Avro. Retry: WMS timeout 3x. DLQ: allocation failed manual review. SLA: allocation 5 dk içinde.",
    "technical_documentation",
  ),
  rec(
    "Blue-green deployment runbook yaz.",
    "Kubernetes prod, nginx ingress, health check /ready.",
    "Adımlar: 1) green deploy new tag. 2) smoke test green service. 3) /ready 200 3 ardışık. 4) ingress weight %10→50→100. 5) blue scale 0 bekle 10 dk. Rollback: ingress blue %100, green scale 0. Önkoşul: DB migration geriye uyumlu.",
    "technical_documentation",
  ),
  rec(
    "Global hata kodu standardı dokümante et.",
    "Format: ERR-{DOMAIN}-{CODE}, HTTP status eşlemesi.",
    "Örnek: ERR-PAY-001 → 402, mesaj kullanıcı dostu TR. ERR-ORD-002 → 409 stok. Log: correlation_id zorunlu. Client: retry yalnızca 429,503. Dokümanda domain listesi: AUTH, PAY, ORD, INV.",
    "technical_documentation",
  ),
  rec(
    "OpenTelemetry gözlemlenebilirlik rehberi oluştur.",
    "Trace, metric, log birleşik; Grafana Tempo+Prometheus+Loki.",
    "Her inbound HTTP span oluşturur. Metric: http_server_duration histogram. Log: JSON, trace_id inject. Alert: p95>1s 5dk, error rate >1%. Sampling: prod %10, staging %100.",
    "technical_documentation",
  ),
  rec(
    "Salesforce CRM entegrasyon teknik dokümanı yaz.",
    "Bidirectional lead sync, 15 dk batch, conflict LWW.",
    "Outbound: webhook lead.created → CRM REST. Inbound: CRM polling modified_since. Auth: OAuth refresh token vault. Mapping tablosu: field matrix dokümanda. Hata: dead letter SF limit aşımı.",
    "technical_documentation",
  ),
  rec(
    "Veritabanı yedekleme ve restore runbook hazırla.",
    "PostgreSQL, günlük full+WAL, RPO 15 dk.",
    "Backup: pg_dump 02:00 UTC S3. WAL continuous archive. Restore: PITR adım adım, staging doğrulama zorunlu. Tatbikat: çeyreklik. RTO hedef 4 saat. İletişim: incident commander checklist.",
    "technical_documentation",
  ),
  rec(
    "GraphQL API şema ve sorgu limitleri dokümante et.",
    "Query depth max 5, complexity score 500.",
    "Schema: User, Project, Task tipleri. Pagination: cursor relay spec. Auth: JWT claim role. Rate: 1000 query/dk. Hata: 400 depth exceeded. Örnek sorgu: project tasks first:20.",
    "technical_documentation",
  ),
  rec(
    "Mesaj kuyruğu tüketici hata yönetimi rehberi yaz.",
    "Kafka consumer, poison message, idempotent handler.",
    "Retry: 3x backoff. DLQ topic: orders.dlq. Idempotency: message_id unique index. Monitoring: consumer lag alert >1000. Runbook: DLQ replay prosedürü manuel onaylı.",
    "technical_documentation",
  ),
  rec(
    "CDN ve statik asset dağıtım mimarisi dokümante et.",
    "CloudFront benzeri, cache invalidation, SRI hash.",
    "Origin: S3 bucket. Cache: JS/CSS 1 yıl immutable hash. HTML: no-cache. Invalidation: deploy pipeline otomatik path list. Güvenlik: CSP header dokümanda.",
    "technical_documentation",
  ),
  rec(
    "Feature flag servisi entegrasyon dokümanı oluştur.",
    "LaunchDarkly benzeri SDK, boolean ve yüzde rollout.",
    "SDK init env key. Flag evaluate userId hash. Audit: flag change webhook. Fallback: default false offline. Test: override local config dev only.",
    "technical_documentation",
  ),
  rec(
    "Batch ETL gece işi operasyon runbook yaz.",
    "Airflow DAG, 02:00-05:00 window, bağımlılık 5 kaynak.",
    "DAG: extract→validate→transform→load. SLA: 05:00 öncesi bitmeli. Hata: pager duty on-call. Retry: task level 2. Veri kalitesi: satır sayısı ±%5 alarm.",
    "technical_documentation",
  ),

  // ── risk_analysis ×13 ──
  rec(
    "Yeni arama motoru geçişi teknik risk analizi yap.",
    "Elasticsearch'ten OpenSearch'e, 200M doküman, sıfır downtime hedefi.",
    "R1: indeks uyumsuzluğu (O:Orta, E:Yüksek) — dual-write 2 hf. R2: sorgu latency artışı (O:Düşük, E:Orta) — benchmark gate. R3: snapshot restore süresi (O:Orta, E:Yüksek) — DR test. Mitigasyon planı her R için owner ve tarih.",
    "risk_analysis",
  ),
  rec(
    "OAuth2 social login güvenlik risk değerlendirmesi yaz.",
    "Google+Apple login, session fixation, token theft.",
    "Risk: redirect URI manipulation — whitelist zorunlu. Risk: token localStorage — httpOnly cookie tercih. Risk: account linking duplicate email. Kontrol: PKCE, state nonce, pen test yıllık.",
    "risk_analysis",
  ),
  rec(
    "7/24 e-ticaret operasyon kesinti risk raporu hazırla.",
    "Black Friday, 10x trafik, tek region deployment.",
    "Operasyonel: on-call yetersiz — runbook+ tatbikat. Kapasite: DB connection pool — autoscale öncesi test. Üçüncü taraf: ödeme gateway limit — önceden limit artırımı. Plan: war room, rollback switch, feature flag kill.",
    "risk_analysis",
  ),
  rec(
    "Veri kalitesi risk analizi: müşteri adres master data.",
    "Duplicate, eksik il/ilçe, geocoder hataları.",
    "Risk: yanlış teslimat maliyeti. Risk: raporlama sapması. Kontrol: dedupe batch haftalık, geocoder confidence eşiği, steward onay kuyruğu. KPI: adres doğruluk >%95.",
    "risk_analysis",
  ),
  rec(
    "Performans riski: rapor sorguları production DB üzerinde.",
    "Ağır JOIN raporları OLTP'yi yavaşlatıyor.",
    "Risk: p95 checkout >2sn. Mitigasyon: read replica, materialized view gece, rapor timeout 30sn kill. Acil: rapor modülü maintenance flag.",
    "risk_analysis",
  ),
  rec(
    "Üçüncü taraf harita API bağımlılık riski değerlendir.",
    "Tek sağlayıcı, fiyat artışı, kota aşımı.",
    "Risk: servis kesintisi — static map fallback. Risk: maliyet — cache tile 30 gün. Risk: vendor lock-in — soyutlama katmanı. Çıkış: alternatif provider POC yıllık.",
    "risk_analysis",
  ),
  rec(
    "KVKK ve GDPR çift regülasyon uyum risk analizi yap.",
    "AB+TR müşteri, profil, pazarlama, analytics cookie.",
    "Risk: cross-border transfer — SCC+ TIA. Risk: consent kanıtı eksik — CMP entegrasyon log. Risk: silme talebi SLA — 30 gün workflow. Denetim: yıllık DPO raporu.",
    "risk_analysis",
  ),
  rec(
    "Kullanıcı benimseme riski: yeni ERP arayüzü.",
    "300 kullanıcı, 20 yıllık eski UI alışkanlığı.",
    "Risk: direnç ve workaround Excel. Mitigasyon: champion network, floor walking, hypercare 4 hf. Metrik: aktif kullanım >%90 60 gün. Eğitim: rol bazlı video+ sandbox.",
    "risk_analysis",
  ),
  rec(
    "ML model drift operasyonel risk değerlendirmesi.",
    "Fraud skoru, 6 aydır retrain yok, chargeback artışı.",
    "Risk: precision düşüşü — haftalık KS test. Risk: yanlış blok — manuel review queue. Plan: shadow model, otomatik retrain pipeline quarterly.",
    "risk_analysis",
  ),
  rec(
    "Container platform güvenlik risk analizi.",
    "Kubernetes, privileged pod talepleri, secrets etcd.",
    "Risk: cluster escape — PSP/OPA deny privileged. Risk: secret leak — external vault. Risk: image vulnerability — scan CI gate critical block.",
    "risk_analysis",
  ),
  rec(
    "Tedarik zinciri yazılım bağımlılığı (SBOM) risk raporu.",
    "Log4j benzeri olay için hazırlık.",
    "Risk: bilinmeyen bağımlılık — SBOM her release. Risk: gecikmeli yama — 72 saat critical SLA. Süreç: dependabot+ manuel triage.",
    "risk_analysis",
  ),
  rec(
    "Çok bölgeli felaket kurtarma risk değerlendirmesi.",
    "Tek region AWS, RTO 4 saat hedefi.",
    "Risk: bölgesel outage — cross-region replica pasif. Risk: restore test edilmemiş — quarterly drill. Risk: veri tutarlılığı — async repl lag monitör.",
    "risk_analysis",
  ),
  rec(
    "Insider threat veri sızıntısı risk analizi.",
    "CRM export, PII içeren rapor indirme.",
    "Risk: toplu export — rate limit+ manager onay. Risk: USB — DLP policy. Kontrol: anomaly detection gece büyük export. Audit: kim indirdi 1 yıl.",
    "risk_analysis",
  ),

  // ── user_story ×13 ──
  rec(
    "Depo yöneticisi rolü için user story yaz.",
    "Olumsuz senaryo: hatalı lot ile sevkiyat.",
    "US-DEP-01: Depo yöneticisi olarak, picking listesinde lot doğrulaması istiyorum, böylece yanlış lot sevkiyatını önleyebileyim. Kabul: geçersiz lot picker uyarı verir. Kabul: override yalnızca süpervizör PIN ile. Kabul: override audit loga yazılır. Kabul: doğru lot ile devam 1 tık.",
    "user_story",
  ),
  rec(
    "Hemşire rolü için user story oluştur.",
    "Olumlu senaryo: kritik hasta alarmı.",
    "US-HEM-02: Evde bakım hemşiresi olarak, hastamın kritik eşik aşımında anında bildirim istiyorum, böylece hızlı müdahale edebileyim. Kabul: push 30 sn içinde. Kabul: alarmda son 3 ölçüm grafiği. Kabul: okundu işaretleme. Kabul: escalations 15 dk yanıtsızsa süpervizör.",
    "user_story",
  ),
  rec(
    "Finans analisti user story yaz.",
    "Senaryo: nakit projeksiyon senaryosu.",
    "US-FIN-03: Finans analisti olarak, farklı tahsilat gecikmesi senaryolarını simüle etmek istiyorum, böylece likidite riskini erken görebileyim. Kabul: 3 senaryo kaydedilebilir. Kabul: grafik 90 gün projeksiyon. Kabul: export PDF. Kabul: varsayılan senaryo kopyalanabilir.",
    "user_story",
  ),
  rec(
    "İK uzmanı user story oluştur.",
    "Olumsuz: 360 anket deadline kaçırma.",
    "US-IK-04: İK uzmanı olarak, tamamlanmamış 360 anketler için otomatik hatırlatma istiyorum, böylece değerlendirme döngüsü gecikmesin. Kabul: T-3 gün e-posta. Kabul: yönetici özet dashboard. Kabul: anonimlik korunur. Kabul: deadline uzatma yalnızca admin.",
    "user_story",
  ),
  rec(
    "Kurye user story yaz.",
    "Olumlu: müşteri adres notu.",
    "US-KUR-05: Kurye olarak, teslimat adresindeki kapı kodu notunu görmek istiyorum, böylece ilk seferde teslim edebileyim. Kabul: not 14pt görünür. Kabul: offline cache. Kabul: arama ile not highlight. Kabul: eksik not müşteri hizmeti kısayolu.",
    "user_story",
  ),
  rec(
    "Öğrenci user story oluştur.",
    "Olumsuz: sınav bağlantı kopması.",
    "US-OGRE-06: Öğrenci olarak, internet koptuğunda sınavımın kaydedilmesini istiyorum, böylece bağlantı gelince kaldığım yerden devam edebileyim. Kabul: cevaplar local queue. Kabul: 5 dk grace period. Kabul: proctor bilgilendirme. Kabul: süre duraklatma yalnızca onaylı kopma.",
    "user_story",
  ),
  rec(
    "Mağaza müdürü user story yaz.",
    "Senaryo: reyon stok sapması.",
    "US-MAG-07: Mağaza müdürü olarak, reyon stok sapması görevlerini öncelik sırasına göre görmek istiyorum, böylece kayıp satışı azaltayım. Kabul: sapma yüzdesine göre sıralama. Kabul: görev atama personel. Kabul: tamamlanma foto kanıtı. Kabul: SLA kırmızı etiket.",
    "user_story",
  ),
  rec(
    "Vatandaş user story oluştur.",
    "Olumlu: belediye şikayet takibi.",
    "US-VAT-08: Vatandaş olarak, şikayetimin hangi aşamada olduğunu görmek istiyorum, böylece tekrar aramak zorunda kalmayayım. Kabul: durum timeline. Kabul: push bildirim aşama değişiminde. Kabul: foto ekleme yalnızca açıkken. Kabul: memnuniyet anketi kapanışta.",
    "user_story",
  ),
  rec(
    "Santral operatörü user story yaz.",
    "Olumsuz: inverter arızası.",
    "US-GES-09: Santral operatörü olarak, inverter arıza alarmında work order oluşturmak istiyorum, böylece bakım ekibi gecikmesin. Kabul: tek tık WO. Kabul: alarm detayı WO'ya eklenir. Kabul: SLA timer başlar. Kabul: false alarm kapatma nedeni zorunlu.",
    "user_story",
  ),
  rec(
    "Hat operatörü user story oluştur.",
    "Senaryo: dijital checklist.",
    "US-HT-10: Hat operatörü olarak, vardiya başında tablet checklist'i hızlı tamamlamak istiyorum, böylece üretim gecikmesin. Kabul: barkod ile istasyon seçimi. Kabul: zorunlu alan boş geçilemez. Kabul: offline sync. Kabul: tamamlama süresi <5 dk ortalama.",
    "user_story",
  ),
  rec(
    "Proje yöneticisi user story yaz.",
    "Olumlu: müşteri portal güncellemesi.",
    "US-PM-11: Proje yöneticisi olarak, müşteriye milestone durumunu portalde paylaşmak istiyorum, böylece e-posta trafiği azalsın. Kabul: milestone % otomatik. Kabul: müşteri yorum ekleyebilir. Kabul: dahili not müşteriye görünmez. Kabul: PDF export.",
    "user_story",
  ),
  rec(
    "Personal trainer user story oluştur.",
    "Olumsuz: müşteri antrenmanı atlaması.",
    "US-PT-12: Personal trainer olarak, müşterim antrenmanı atladığında uyarı almak istiyorum, böylece aynı gün check-in yapabileyim. Kabul: atlamada push trainer'a. Kabul: son 7 gün uyum skoru. Kabul: mesaj şablonu. Kabul: müşteri verisi KVKK onaylı.",
    "user_story",
  ),
  rec(
    "İş analisti user story yaz.",
    "Senaryo: self-service dashboard.",
    "US-BI-13: İş analisti olarak, onaylı veri setinden drag-drop dashboard oluşturmak istiyorum, böylece IT beklemek zorunda kalmayayım. Kabul: yalnızca onaylı dataset listelenir. Kabul: publish öncesi preview. Kabul: RLS otomatik uygulanır. Kabul: hatalı sorgu timeout mesajı.",
    "user_story",
  ),
];

if (expansion.length !== 78) {
  console.error(`Expected 78 expansion rows, got ${expansion.length}`);
  process.exit(1);
}

const existing = JSON.parse(fs.readFileSync(rawPath, "utf8"));
const merged = [...existing, ...expansion];

const categories = [
  "product_spec",
  "project_planning",
  "requirement_analysis",
  "technical_documentation",
  "risk_analysis",
  "user_story",
];

const counts = {};
for (const row of merged) {
  counts[row.category] = (counts[row.category] || 0) + 1;
}

for (const cat of categories) {
  if (counts[cat] !== 20) {
    console.error(`Category ${cat}: expected 20, got ${counts[cat] ?? 0}`);
    process.exit(1);
  }
}

const instrSet = new Set();
const assistantSet = new Set();
const promptSet = new Set();
for (const row of merged) {
  const key = `${row.instruction.trim()}\n${(row.input || "").trim()}`;
  if (promptSet.has(key)) {
    console.error("Duplicate instruction+input:", row.instruction.slice(0, 60));
    process.exit(1);
  }
  promptSet.add(key);
  if (assistantSet.has(row.output.trim())) {
    console.error("Duplicate output:", row.instruction.slice(0, 60));
    process.exit(1);
  }
  assistantSet.add(row.output.trim());
}

if (merged.length !== 120) {
  console.error(`Expected 120 total, got ${merged.length}`);
  process.exit(1);
}

fs.writeFileSync(rawPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
console.log("OK merged", merged.length, "records");
console.log("Added", expansion.length, "new records");
console.log(counts);
