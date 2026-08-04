/** Map scenario data to questionnaire answers using question keys. */

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickOptionValue(question, preferredValues = []) {
  const options = question.options || [];
  if (!options.length) return preferredValues[0] || "other";
  for (const pref of preferredValues) {
    const hit = options.find(
      (o) => o.value === pref || String(o.label).toLowerCase().includes(String(pref).toLowerCase()),
    );
    if (hit) return hit.value;
  }
  return options[0].value;
}

function inferProductType(scenario) {
  const cat = scenario.category.toLowerCase();
  if (cat.includes("mobil")) return "mobile_app";
  if (cat.includes("e-ticaret")) return "web_app";
  if (cat.includes("agent") || cat.includes("yapay")) return "api_service";
  if (cat.includes("kurumsal")) return "internal_tool";
  if (scenario.platforms?.includes("api")) return "api_service";
  return "web_app";
}

function scenarioUsesAI(scenario) {
  return (
    scenario.category.includes("Yapay zekâ") ||
    scenario.integrations?.some((i) => /llm|ai|mcp|openai|ollama/i.test(i)) ||
    scenario.features?.some((f) => /llm|ai|agent|rag/i.test(f))
  );
}

function inferAiUseCases(scenario) {
  const hay = [
    scenario.description,
    scenario.category,
    ...(scenario.features || []),
    ...(scenario.integrations || []),
  ]
    .join(" ")
    .toLowerCase();
  const prefs = [];
  if (/rag|kb sync|bilgi taban|knowledge base|pgvector/i.test(hay)) prefs.push("rag");
  if (/agent|pipeline|workflow|ivr|sesli|voice/i.test(hay)) prefs.push("agents");
  if (/tarif|meal plan|market listesi|recipe recommendation/i.test(hay)) {
    prefs.push("other");
  } else if (/chat|assistant|müşteri hizmet|support agent|ticket assist|yanıt|ticket|öneri|suggested reply/i.test(hay)) {
    prefs.push("chat");
  }
  if (/kod|code review|pr diff|policy check/i.test(hay)) prefs.push("codegen");
  if (/özet|summar/i.test(hay)) prefs.push("summarization");
  if (/intent|sınıfl|classification|routing/i.test(hay)) prefs.push("classification");
  if (/çıkar|extract|madde|citation|pdf|sözleşme analiz/i.test(hay)) prefs.push("extraction");
  if (/embedding|semantic search/i.test(hay)) prefs.push("embedding_search");
  if (/gözlem|observability|trace|prompt|token maliyet|latency/i.test(hay)) prefs.push("other");
  if (!prefs.length) prefs.push("other");
  return [...new Set(prefs)];
}

function inferLlmProviders(scenario) {
  const hay = [
    scenario.description,
    ...(scenario.integrations || []),
    ...(scenario.infrastructure || []),
    ...(scenario.features || []),
  ]
    .join(" ")
    .toLowerCase();
  const prefs = [];
  if (/ollama|vllm|local.?oss|open-source|açık kaynak|gpu inference host/i.test(hay)) {
    prefs.push("local_oss");
  }
  if (/openai|gpt|openai-compatible/i.test(hay)) prefs.push("openai");
  if (/anthropic|claude/i.test(hay)) prefs.push("anthropic");
  if (/google|gemini|vertex/i.test(hay)) prefs.push("google");
  if (/azure/i.test(hay)) prefs.push("azure_openai");
  if (/bedrock|aws/i.test(hay)) prefs.push("aws_bedrock");
  if (/mistral/i.test(hay)) prefs.push("mistral");
  if (!prefs.length) prefs.push("local_oss");
  return [...new Set(prefs)];
}

function isEmptyAnswerValue(inputType, value) {
  if (value === null || value === undefined || value === "") return true;
  if (inputType === "multi_select" && Array.isArray(value) && value.length === 0) return true;
  return false;
}

function formatValue(inputType, value) {
  switch (inputType) {
    case "boolean":
      return Boolean(value);
    case "multi_select":
      return Array.isArray(value) ? value : value ? [value] : [];
    case "number": {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    }
    default:
      return value == null ? "" : String(value);
  }
}

function getDevOpsPreferences(scenario) {
  const cat = String(scenario.category || "").toLowerCase();
  const desc = String(scenario.description || "").toLowerCase();
  const isFin = /finans|finops|hassas|kvkk|sağlık|health|pii/i.test(
    [...(scenario.security_requirements || []), desc, cat].join(" "),
  );
  const isMobile = cat.includes("mobil") || scenario.platforms?.some((p) =>
    ["ios", "android", "mobile_web"].includes(p),
  );

  return {
    api_styles: ["rest"],
    ci_tests_required: true,
    ci_cd_platform: ["github_actions"],
    environments: isMobile || isFin ? ["dev", "staging", "prod"] : ["dev", "staging", "prod"],
    logging_approach: isFin ? ["centralized", "both"] : ["centralized", "both", "stdout"],
    vcs_platform: ["github", "gitlab"],
    branching_strategy: isFin
      ? ["github_flow", "release_branches", "trunk_based"]
      : ["trunk_based", "github_flow"],
    code_review_required: true,
  };
}

function pickMulti(question, preferredValues, fallbackValues) {
  const options = question.options || [];
  const valid = new Set(options.map((o) => o.value));
  const chosen = [];
  for (const pref of preferredValues.length ? preferredValues : fallbackValues) {
    if (valid.has(pref) && !chosen.includes(pref)) chosen.push(pref);
  }
  if (chosen.length) return chosen;
  return options.length ? [options[0].value] : fallbackValues;
}

function inferFrontendFramework(scenario) {
  const raw = (scenario.frontend?.[0] || "").toLowerCase();
  if (/next/i.test(raw)) return "nextjs";
  if (/react native|react/i.test(raw)) return "react";
  if (/vue/i.test(raw)) return "vue";
  if (/angular/i.test(raw)) return "angular";
  if (/svelte/i.test(raw)) return "svelte";
  if (/flutter/i.test(raw)) return "other";
  if (scenario.platforms?.some((p) => ["ios", "android"].includes(p))) return "react";
  return "react";
}

function inferBackendLanguage(scenario) {
  const raw = (scenario.backend?.[0] || "go").toLowerCase();
  if (/go\b|golang/i.test(raw)) return "go";
  if (/python|django|fastapi/i.test(raw)) return "python";
  if (/typescript|nestjs/i.test(raw)) return "typescript";
  if (/javascript|node/i.test(raw)) return "javascript";
  if (/java|spring/i.test(raw)) return "java";
  if (/rust/i.test(raw)) return "rust";
  if (/kotlin/i.test(raw)) return "kotlin";
  return "other";
}

function buildAnswerForKey(key, question, scenario, language) {
  const k = key || normalizeTitle(question.title);
  const devOps = getDevOpsPreferences(scenario);
  const map = {
    project_name: scenario.project_name,
    project_summary: scenario.description,
    product_type: pickOptionValue(question, [inferProductType(scenario), "web_app", "other"]),
    project_stage: pickOptionValue(question, ["development", "mvp", "planned", "idea"]),
    primary_users: (scenario.target_users || []).join(", "),
    business_domain: scenario.category,
    success_metrics: (scenario.reporting_requirements || []).join("; ") || "Kullanıcı memnuniyeti ve iş KPI'ları",
    constraints: (scenario.special_constraints || []).join("; "),
    preferred_doc_language: language === "en" ? "en" : "tr",
    has_multi_tenant: scenario.scale_expectation?.includes("org") || /çok kirac/i.test(scenario.description),
    user_roles: "Admin, Editor, Viewer, Operator",
    permission_model: pickOptionValue(question, ["rbac", "abac", "simple_roles"]),
    has_frontend: scenario.platforms?.some((p) => ["web", "ios", "android", "mobile_web", "tablet"].includes(p)),
    has_backend: true,
    frontend_framework: pickOptionValue(question, [inferFrontendFramework(scenario), "react", "other"]),
    backend_language: pickOptionValue(question, [inferBackendLanguage(scenario), "go", "python", "other"]),
    has_public_api: scenario.platforms?.includes("api") || scenarioUsesAI(scenario),
    primary_database: pickOptionValue(question, [
      (scenario.database?.[0] || "postgresql").toLowerCase().replace(/\s+/g, "_"),
      "postgresql",
      "mysql",
    ]),
    pii_storage: /pii|kvkk|hassas|sağlık|finans/i.test(
      [...(scenario.security_requirements || []), scenario.description].join(" "),
    ),
    auth_required: true,
    auth_methods: ["password", "oauth2"],
    architecture_style: pickOptionValue(question, ["modular_monolith", "microservices", "monolith"]),
    threat_model_exists: true,
    secrets_management: pickOptionValue(question, ["vault", "env_vars", "cloud_secret_manager"]),
    encryption_in_transit: true,
    test_types: pickOptionValue(question, ["unit", "integration", "e2e"], true),
    uses_ai: scenarioUsesAI(scenario),
    uses_mcp: scenario.integrations?.some((i) => /mcp/i.test(i)),
    ai_use_cases: pickMulti(question, inferAiUseCases(scenario), ["other"]),
    llm_providers: pickMulti(question, inferLlmProviders(scenario), ["local_oss"]),
    hosting_model: pickOptionValue(question, ["cloud", "hybrid", "on_prem"]),
    offline_support: Boolean(scenario.offline_requirement && !/yok/i.test(scenario.offline_requirement)),
    api_styles: pickMulti(question, devOps.api_styles, devOps.api_styles),
    ci_tests_required: devOps.ci_tests_required,
    ci_cd_platform: pickMulti(question, devOps.ci_cd_platform, devOps.ci_cd_platform),
    environments: pickMulti(question, devOps.environments, devOps.environments),
    logging_approach: pickOptionValue(question, devOps.logging_approach),
    vcs_platform: pickOptionValue(question, devOps.vcs_platform),
    branching_strategy: pickOptionValue(question, devOps.branching_strategy),
    code_review_required: devOps.code_review_required,
  };

  if (Object.prototype.hasOwnProperty.call(map, k)) {
    return formatValue(question.input_type, map[k]);
  }

  // Title-based heuristics
  const title = normalizeTitle(question.title);
  if (title.includes("framework") && question.input_type === "single_select") {
    const fw = scenario.frontend?.[0] || scenario.backend?.[0] || "other";
    return pickOptionValue(question, [fw.toLowerCase().replace(/\s+/g, "_"), "other"]);
  }
  if (title.includes("dil") || title.includes("language")) {
    return language === "en" ? "en" : "tr";
  }
  if (title.includes("entegrasyon") || title.includes("integration")) {
    return formatValue(question.input_type, (scenario.integrations || []).join(", "));
  }
  if (title.includes("güvenlik") || title.includes("security")) {
    return formatValue(question.input_type, (scenario.security_requirements || []).join(", "));
  }
  if (title.includes("ölçek") || title.includes("scale")) {
    return scenario.scale_expectation || "Orta ölçek";
  }

  return null;
}

function fallbackAnswer(question, scenario, language) {
  const base = `${scenario.project_name}: ${question.title}`;
  switch (question.input_type) {
    case "boolean":
      return true;
    case "multi_select": {
      const opts = question.options || [];
      return opts.length ? [opts[0].value] : [];
    }
    case "single_select":
      return pickOptionValue(question, []);
    case "number":
      return 1;
    case "long_text":
      return `${base}. ${scenario.description}`.slice(0, 1200);
    default:
      return `${base} — ${scenario.category}`.slice(0, 500);
  }
}

function normalizeVisibilityRules(rules) {
  if (rules == null) return null;
  if (typeof rules === "string") {
    const trimmed = rules.trim();
    if (!trimmed || trimmed === "null" || trimmed === "{}") return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (typeof rules === "object" && !Object.keys(rules).length) return null;
  return rules;
}

export function isQuestionVisible(question, answersByKey) {
  const rules = normalizeVisibilityRules(question.visibility_rules);
  if (!rules) return true;
  const showIf = rules.show_if || rules.showIf;
  if (!showIf) return true;
  const dep = answersByKey[showIf.question_key];
  const expected = showIf.value;
  const op = (showIf.op || "equals").toLowerCase();
  if (op === "equals" || op === "eq") {
    return JSON.stringify(dep) === JSON.stringify(expected);
  }
  return true;
}

export function buildProfilePayload(scenario, language) {
  const frontendTech = scenario.frontend?.[0] || "Next.js";
  const backendTech = scenario.backend?.[0] || "Go";
  const db = scenario.database?.[0] || "PostgreSQL";
  return {
    project_name: scenario.project_name,
    project_description: scenario.description,
    product_type: inferProductType(scenario) === "mobile_app" ? "Mobil uygulama" : "Web uygulaması",
    target_users: (scenario.target_users || []).join(", "),
    main_problem: scenario.description.split(".")[0] || scenario.description,
    main_use_cases: (scenario.features || []).slice(0, 5).join("; "),
    project_status: "planned",
    preferred_document_language: language,
    frontend: {
      framework: frontendTech,
      language: language === "en" ? "en" : "tr",
      ui_library: "shadcn/ui",
    },
    backend: {
      framework: backendTech,
      language: backendTech,
      database: db,
    },
    data: {
      primary_db: db,
    },
    infrastructure: {
      hosting_provider: scenario.infrastructure?.[0] || "Cloud",
      ci_cd: "GitHub Actions",
      containerization: "Docker",
    },
    ai: {
      uses_ai: scenarioUsesAI(scenario),
      llm_provider: scenarioUsesAI(scenario) ? "ollama" : "",
    },
    development_standards: {
      testing: "unit, integration",
      code_review: "required",
    },
  };
}

/**
 * Build bulk answer items for visible questions.
 * Returns { answers: BulkAnswerItem[], fallbackKeys: string[] }
 */
function hasConditionalVisibility(question) {
  return Boolean(normalizeVisibilityRules(question.visibility_rules)?.show_if || normalizeVisibilityRules(question.visibility_rules)?.showIf);
}

export function buildAnswersForQuestions(questions, scenario, language) {
  const answersByKey = {};
  const direct = new Map();
  const fallbackKeys = [];

  for (const q of questions) {
    if (!q.active) continue;
    if (hasConditionalVisibility(q)) continue;
    const val = buildAnswerForKey(q.key, q, scenario, language);
    if (!isEmptyAnswerValue(q.input_type, val)) {
      direct.set(q.id, { question: q, value: val, fromFallback: false });
      if (q.key) answersByKey[q.key] = val;
    }
  }

  // visibility passes
  for (let pass = 0; pass < 3; pass++) {
    for (const q of questions) {
      if (!q.active) continue;
      if (!isQuestionVisible(q, answersByKey)) continue;
      if (direct.has(q.id)) continue;
      const val = buildAnswerForKey(q.key, q, scenario, language);
      if (!isEmptyAnswerValue(q.input_type, val)) {
        direct.set(q.id, { question: q, value: val, fromFallback: false });
        if (q.key) answersByKey[q.key] = val;
      }
    }
  }

  for (const q of questions) {
    if (!q.active || !q.required) continue;
    if (!isQuestionVisible(q, answersByKey)) continue;
    if (direct.has(q.id)) continue;
    const val = fallbackAnswer(q, scenario, language);
    direct.set(q.id, { question: q, value: val, fromFallback: true });
    if (q.key) {
      answersByKey[q.key] = val;
      fallbackKeys.push(q.key);
    }
  }

  const answers = [...direct.values()].map(({ question, value }) => ({
    question_id: question.id,
    value,
  }));

  return { answers, fallbackKeys: [...new Set(fallbackKeys)] };
}

export function buildDocumentTitle(scenario) {
  return `Ürün Spesifikasyonu — ${scenario.project_name}`;
}

export { getDevOpsPreferences, pickOptionValue, buildAnswerForKey, normalizeTitle, inferAiUseCases, inferLlmProviders, scenarioUsesAI };
