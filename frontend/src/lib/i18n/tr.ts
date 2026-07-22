export const tr = {
  appName: "AI Geliştirme Yapılandırma Stüdyosu",
  appShortName: "Yapılandırma Stüdyosu",
  brandEyebrow: "AI Geliştirme Yapılandırma Stüdyosu",
  brandTitle: "Yapılandırma Stüdyosu",
  brandSidebar: "Yapılandırma Stüdyosu",
  brandSidebarSub: "AI Geliştirme Yapılandırması",
  brandFooter:
    "Aracı geliştirme araçları için platformdan bağımsız Markdown üretimi.",

  nav: {
    workspaces: "Çalışma Alanları",
    plan: "Plan",
    questionnaires: "Anketler",
    generate: "Üret",
    observe: "Gözlemle",
    settings: "Ayarlar",
  },

  auth: {
    signInTitle: "Giriş yap",
    signInDescription:
      "Yapılandırma çalışma alanlarınıza ve üretilen Markdown paketlerinize erişin.",
    email: "E-posta",
    password: "Şifre",
    signingIn: "Giriş yapılıyor…",
    signIn: "Giriş yap",
    noAccount: "Hesabınız yok mu?",
    createOne: "Oluşturun",
    signedIn: "Giriş başarılı",
    signInFailed: "Giriş yapılamadı",
    registerTitle: "Hesap oluştur",
    registerDescription:
      "Yapılandırılmış proje bağlamı toplamak ve geliştirme yapılandırma belgelerini üretmek için kaydolun.",
    firstName: "Ad",
    lastName: "Soyad",
    creatingAccount: "Hesap oluşturuluyor…",
    createAccount: "Hesap oluştur",
    alreadyRegistered: "Zaten kayıtlı mısınız?",
    accountCreated: "Hesap oluşturuldu",
    registerFailed: "Hesap oluşturulamadı",
    signOut: "Çıkış yap",
    account: "Hesap",
    signedOut: "Oturum kapalı",
  },

  org: {
    title: "Organizasyonlar",
    description:
      "Şirket veya ekip sınırını seçin. Proje profilleri, anketler ve üretilen belgeler seçilen organizasyon içinde kalır.",
    new: "Yeni organizasyon",
    createTitle: "Organizasyon oluştur",
    createDescription:
      "Organizasyonlar çalışma alanlarını, üyeleri, rolleri ve üretilen yapılandırma paketlerini yönetir.",
    name: "Ad",
    slug: "Kısa ad (slug)",
    cancel: "İptal",
    creating: "Oluşturuluyor…",
    create: "Oluştur",
    created: "Organizasyon oluşturuldu",
    createFailed: "Organizasyon oluşturulamadı",
    loadFailed: "Organizasyonlar yüklenemedi",
    retry: "Yeniden dene",
    emptyTitle: "Henüz organizasyon yok",
    emptyDescription:
      "Geliştirme çalışma alanlarını yapılandırmaya başlamak için ilk organizasyonunuzu oluşturun.",
    createdAt: "Oluşturulma",
    switch: "Organizasyon değiştir",
    organization: "Organizasyon",
  },

  workspace: {
    title: "Çalışma Alanları",
    description:
      "Her çalışma alanı bir proje profili, anket yanıtları, araçlar, üretilen belgeler ve hazırlık skorlarını barındırır.",
    loadFailed: "Çalışma alanları yüklenemedi",
    loadFailedHint:
      "Backend organizasyon bağlamı gerektirebilir. X-Organization-ID ve RBAC izinlerini doğrulayın.",
    emptyTitle: "Henüz çalışma alanı yok",
    emptyDescription:
      "Proje profili ve anket akışına başlamak için bir çalışma alanı oluşturun.",
    newTitle: "Yeni çalışma alanı",
    newDescription:
      "Yeni veya mevcut bir yazılım projesi için yapılandırma çalışma alanı başlatın.",
    name: "Ad",
    slug: "Kısa ad (slug)",
    descriptionLabel: "Açıklama",
    descriptionPlaceholder: "Bu proje ne hakkında?",
    creating: "Oluşturuluyor…",
    create: "Çalışma alanı oluştur",
    created: "Çalışma alanı oluşturuldu",
    createFailed: "Çalışma alanı oluşturulamadı",
    noDescription: "Henüz açıklama yok",
    overviewTitle: "Çalışma alanı özeti",
  },

  placeholder: {
    planTitle: "Plan",
    planDescription:
      "Yapılandırılmış proje bilgilerini toplayın: profil, teknoloji yığını, mimari, standartlar, dağıtım ve dış araçlar.",
    questionnairesTitle: "Anketler",
    questionnairesDescription:
      "Yönlendirmeli soruları yanıtlayın ve üretimden önce eksik bilgileri gözden geçirin.",
    generateTitle: "Üret",
    generateDescription:
      "Platformdan bağımsız Markdown belgelerini üretin, düzenleyin, sürümlendirin ve dışa aktarın.",
    observeTitle: "Gözlemle",
    observeDescription:
      "Gemma üretim koşularını, hazırlık skorlarını, belge kalitesini ve denetim etkinliğini izleyin.",
    settingsTitle: "Ayarlar",
    settingsDescription:
      "Organizasyon üyelerini, rolleri, model yapılandırmasını, skor eşiklerini ve entegrasyonları yönetin.",
    arrivesIn: (title: string, phase: string) =>
      `${title} ${phase} aşamasında gelecek`,
    wired:
      "Bu gezinme hedefi ürün bilgi mimarisi için bağlandı. Uygulama sonraki aşamalarda devam eder.",
  },

  common: {
    dashboard: "Kontrol paneli",
    organizations: "Organizasyonlar",
    workspaces: "Çalışma Alanları",
    overview: "Özet",
    retry: "Yeniden dene",
  },
} as const;
