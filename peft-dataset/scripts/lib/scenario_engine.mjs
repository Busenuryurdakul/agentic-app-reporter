/**
 * Training v2 Quality Fix — senaryo tabanlı 180 kayıt üretici.
 */

import { ps, rec, PS_V2_SECTIONS } from "./v2_generators.mjs";
import { PS_BASE, PP_BASE, REQ_BASE, TECH_BASE, RISK_BASE, US_BASE } from "./scenario_data.mjs";

const NFR_LATENCY = [420, 680, 350, 890, 520, 740, 310, 950, 480, 620, 390, 810, 550, 720, 440, 580, 460, 830, 370, 670, 510, 790, 400, 710, 530, 880, 490, 650, 430, 760];
const NFR_UPTIME = [99.92, 99.85, 99.97, 99.5, 99.99, 99.88, 99.95, 99.7, 99.93, 99.82, 99.96, 99.75, 99.91, 99.89, 99.94, 99.86, 99.98, 99.73, 99.9, 99.84, 99.95, 99.78, 99.92, 99.81, 99.96, 99.74, 99.88, 99.91, 99.87, 99.93];
const RPO_MIN = [5, 15, 30, 10, 20, 45, 8, 60, 12, 25, 7, 35, 18, 50, 9, 22, 14, 40, 6, 28, 11, 55, 16, 33, 13, 48, 19, 38, 17, 42];
const RTO_MIN = [30, 60, 120, 45, 90, 180, 40, 240, 55, 75, 35, 150, 70, 200, 50, 85, 65, 160, 38, 95, 72, 210, 58, 130, 48, 175, 62, 110, 44, 145];
const CONCURRENT = [180, 420, 850, 1200, 65, 2400, 340, 5200, 95, 780, 1600, 210, 960, 3100, 140, 520, 890, 1450, 75, 680, 1100, 280, 740, 1900, 320, 870, 560, 1250, 410, 990];
const PILOT_DAYS = [60, 90, 120, 45, 75, 100, 55, 85, 110, 70, 95, 50, 130, 80, 65, 88, 72, 105, 58, 92, 78, 115, 63, 98, 68, 108, 82, 73, 102, 86];
const ERROR_RED = [18, 35, 42, 28, 55, 22, 48, 31, 38, 26, 44, 33, 51, 29, 40, 37, 46, 24, 53, 27, 41, 32, 49, 23, 36, 45, 30, 50, 34, 39];
const NPS = [32, 48, 55, 41, 62, 36, 52, 45, 58, 39, 47, 54, 43, 60, 37, 50, 44, 57, 35, 46, 53, 38, 59, 42, 51, 40, 56, 33, 49, 43];

function enrichPs(s, i) {
  return {
    ...s,
    idx: 121 + i,
    nfrLatency: NFR_LATENCY[i],
    nfrUptime: NFR_UPTIME[i],
    rpoMin: RPO_MIN[i],
    rtoMin: RTO_MIN[i],
    concurrentUsers: CONCURRENT[i],
    pilotDays: PILOT_DAYS[i],
    errorReduction: ERROR_RED[i],
    npsTarget: NPS[i],
  };
}

function psBody(s) {
  return {
    "Ürün özeti": `${s.product}, ${s.orgType} bünyesinde ${s.persona} için geliştirilen ${s.domain} odaklı çözümdür. ${s.techEnv} üzerinde çalışır; ${s.integrationNeed} ile entegre olur.`,
    Problem: `${s.problem} Mevcut süreç: ${s.currentProcess} Pain point: ${s.painPoint}`,
    "Hedef kullanıcılar": `${s.persona}; ${s.secondaryUsers}. Organizasyon: ${s.orgType}.`,
    Amaçlar: s.businessGoal,
    Kapsam: `MVP: ${s.mvpScope}. MVP dışı: ${s.outOfScope}. Kısıt: ${s.constraint}.`,
    "Fonksiyonel gereksinimler": s.functionalReqs,
    "Fonksiyonel olmayan gereksinimler": `Performans: kritik uçlarda p95 latency < ${s.nfrLatency} ms. Erişilebilirlik: aylık availability >= %${s.nfrUptime}. Felaket kurtarma: RPO <= ${s.rpoMin} dk, RTO <= ${s.rtoMin} dk. Eşzamanlılık: ${s.concurrentUsers} aktif oturum. Güvenlik: ${s.securityNeed}.`,
    Riskler: s.risks,
    "Başarı ölçütleri": `${s.pilotDays} günlük pilot sonunda ${s.successUsers} aktif kullanıcı; ${s.domain} operasyonunda işlem hatasında en az %${s.errorReduction} azalma; NPS >= ${s.npsTarget}; ${s.successMetric}.`,
  };
}

function ppOutput(s) {
  return `## Fazlar
${s.phases}

## Teslimatlar
${s.deliverables}

## Bağımlılıklar
${s.dependencies}

## Sorumlular
${s.stakeholders}

## Süre tahmini
${s.timeline}

## Çıkış kriterleri
${s.exitCriteria}`;
}

function reqOutput(s) {
  return `## Fonksiyonel gereksinimler
${s.functional}

## Fonksiyonel olmayan gereksinimler
${s.nonFunctional}

## Varsayımlar
${s.assumptions}

## Kısıtlar
${s.constraints}

## Açık sorular
${s.openQuestions}`;
}

function techOutput(s) {
  return `## Amaç
${s.purpose}

## Mimari veya akış
${s.architecture}

## API/veri yapısı
${s.apiData}

## Hata yönetimi
${s.errorHandling}

## Güvenlik
${s.security}

## Gözlemlenebilirlik
${s.observability}

## Test yaklaşımı
${s.testing}`;
}

function riskOutput(s) {
  const header = "| Risk | Olasılık | Etki | Öncelik | Azaltma planı |\n|---|---|---|---|---|";
  const rows = s.risks.map((r) => `| ${r.name} | ${r.probability} | ${r.impact} | ${r.priority} | ${r.mitigation} |`).join("\n");
  return `${s.intro}\n\n${header}\n${rows}\n\n${s.footer}`;
}

function usOutput(s) {
  const criteria = s.acceptanceCriteria.map((c, j) => `- AK-${s.idx}-${j + 1}: ${c}`).join("\n");
  return `## Rol
${s.role}

## İhtiyaç
${s.need}

## Fayda
${s.benefit}

## Kabul kriterleri
${criteria}`;
}

export function generateScenarioV2Expansion() {
  const rows = [];

  for (let i = 0; i < 30; i += 1) {
    const s = enrichPs(PS_BASE[i], i);
    rows.push(
      ps(
        `${s.product} için kapsamlı ürün spesifikasyonu hazırla.`,
        `Domain: ${s.domain}. Organizasyon: ${s.orgType}. Problem: ${s.problem}`,
        psBody(s),
        s.domain,
      ),
    );
  }

  for (let i = 0; i < 30; i += 1) {
    const s = { ...PP_BASE[i], idx: 121 + i };
    rows.push(
      rec(
        `${s.title} projesi için faz planı oluştur.`,
        `Domain: ${s.domain}. Kapsam: ${s.scopeHint}. Organizasyon: ${s.orgType}.`,
        ppOutput(s),
        "project_planning",
        s.domain,
      ),
    );
  }

  for (let i = 0; i < 30; i += 1) {
    const s = { ...REQ_BASE[i], idx: 121 + i };
    rows.push(
      rec(
        `${s.title} konusunda gereksinim analizi yap.`,
        `Domain: ${s.domain}. İş ihtiyacı: ${s.businessNeed}.`,
        reqOutput(s),
        "requirement_analysis",
        s.domain,
      ),
    );
  }

  for (let i = 0; i < 30; i += 1) {
    const s = { ...TECH_BASE[i], idx: 121 + i };
    rows.push(
      rec(
        `${s.component} bileşeni için teknik dokümantasyon yaz.`,
        `Domain: ${s.domain}. Odak: ${s.focus}.`,
        techOutput(s),
        "technical_documentation",
        s.domain,
      ),
    );
  }

  for (let i = 0; i < 30; i += 1) {
    const s = { ...RISK_BASE[i], idx: 121 + i };
    rows.push(
      rec(
        `${s.title} risk analizi hazırla.`,
        `Domain: ${s.domain}. Senaryo: ${s.trigger}.`,
        riskOutput(s),
        "risk_analysis",
        s.domain,
      ),
    );
  }

  for (let i = 0; i < 30; i += 1) {
    const s = { ...US_BASE[i], idx: 121 + i };
    rows.push(
      rec(
        `${s.role.split(" (")[0]} için user story yaz.`,
        `Domain: ${s.domain}. İhtiyaç: ${s.needHint}.`,
        usOutput(s),
        "user_story",
        s.domain,
      ),
    );
  }

  return rows;
}
