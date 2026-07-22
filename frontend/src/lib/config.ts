function requirePublicApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL ayarlı değil. .env.example dosyasını .env.local olarak kopyalayın ve backend URL'sini tanımlayın.",
    );
  }

  return value.replace(/\/$/, "");
}

export const appConfig = {
  get apiBaseUrl() {
    return requirePublicApiBaseUrl();
  },
  appName: "AI Geliştirme Yapılandırma Stüdyosu",
  appShortName: "Yapılandırma Stüdyosu",
  locale: "tr",
} as const;
