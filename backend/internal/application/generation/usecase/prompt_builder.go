package usecase

import (
	"fmt"
	"sort"
	"strings"

	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/document/productspec"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
)

const maxMissingRequiredInPrompt = 20

type PromptBuilder struct{}

// NewPromptBuilder creates a PromptBuilder.
func NewPromptBuilder() *PromptBuilder {
	return &PromptBuilder{}
}

// Build produces system + user prompts. It never logs prompt bodies.
func (b *PromptBuilder) Build(ctx *WorkspaceLLMContext, documentType string) (llm.GenerateRequest, error) {
	if ctx == nil {
		return llm.GenerateRequest{}, fmt.Errorf("workspace LLM context is required")
	}

	lang := normalizeDocumentLanguage(ctx.Language)
	if docModel.NormalizeDocumentType(documentType) == docModel.DocumentTypeProductSpec {
		return llm.GenerateRequest{
			SystemPrompt: buildProductSpecSystemPrompt(lang),
			UserPrompt:   buildProductSpecUserPrompt(ctx, lang),
		}, nil
	}

	return llm.GenerateRequest{
		SystemPrompt: buildSystemPrompt(lang),
		UserPrompt:   buildUserPrompt(ctx, lang),
	}, nil
}

func buildSystemPrompt(lang string) string {
	if lang == "en" {
		return strings.TrimSpace(`
You are a technical documentation assistant for AI Development Configuration Studio.
Write a clear, platform-independent Markdown document from the provided workspace context.
Rules:
- Output Markdown only. No surrounding code fences unless needed inside the document.
- Do not invent secrets, API keys, tokens, or credentials.
- Prefer concrete guidance based on answered fields; mark gaps briefly when listed as missing.
- Keep the document useful for engineering teams (architecture, AI usage, standards).
`)
	}

	return strings.TrimSpace(`
Sen AI Development Configuration Studio için teknik dokümantasyon asistanısın.
Verilen çalışma alanı bağlamından platform bağımsız, net bir Markdown belge yaz.
Kurallar:
- Yalnızca Markdown üret. Belge dışında kod çiti kullanma.
- Gizli anahtar, token, API key veya kimlik bilgisi uydurma.
- Cevaplanmış alanlara dayan; eksik zorunlu bilgiler listelenmişse kısaca belirt.
- Mühendislik ekipleri için kullanışlı olsun (mimari, AI kullanımı, standartlar).
`)
}

func buildUserPrompt(ctx *WorkspaceLLMContext, lang string) string {
	var b strings.Builder

	if lang == "en" {
		b.WriteString("# Workspace context\n\n")
		b.WriteString(fmt.Sprintf("- Workspace: %s (%s)\n", ctx.WorkspaceName, ctx.WorkspaceSlug))
		b.WriteString(fmt.Sprintf("- Document language: %s\n", lang))
		b.WriteString(fmt.Sprintf("- Questionnaire set: %s\n\n", ctx.QuestionnaireSet))
		b.WriteString("## Project profile\n\n")
	} else {
		b.WriteString("# Çalışma alanı bağlamı\n\n")
		b.WriteString(fmt.Sprintf("- Çalışma alanı: %s (%s)\n", ctx.WorkspaceName, ctx.WorkspaceSlug))
		b.WriteString(fmt.Sprintf("- Belge dili: %s\n", lang))
		b.WriteString(fmt.Sprintf("- Anket seti: %s\n\n", ctx.QuestionnaireSet))
		b.WriteString("## Proje profili\n\n")
	}

	p := ctx.Profile
	writeKV(&b, label(lang, "Proje adı", "Project name"), p.ProjectName)
	writeKV(&b, label(lang, "Açıklama", "Description"), p.ProjectDescription)
	writeKV(&b, label(lang, "Ürün tipi", "Product type"), p.ProductType)
	writeKV(&b, label(lang, "Hedef kullanıcılar", "Target users"), p.TargetUsers)
	writeKV(&b, label(lang, "Ana problem", "Main problem"), p.MainProblem)
	writeKV(&b, label(lang, "Ana kullanım senaryoları", "Main use cases"), p.MainUseCases)
	writeKV(&b, label(lang, "Durum", "Status"), p.ProjectStatus)

	sectionKeys := make([]string, 0, len(p.Sections))
	for k := range p.Sections {
		sectionKeys = append(sectionKeys, k)
	}
	sort.Strings(sectionKeys)
	if len(sectionKeys) > 0 {
		b.WriteString("\n")
		b.WriteString(label(lang, "### Profil bölümleri\n\n", "### Profile sections\n\n"))
		for _, k := range sectionKeys {
			raw := p.Sections[k]
			compact := compactJSON(raw)
			if compact == "" || compact == "{}" || compact == "null" {
				continue
			}
			b.WriteString(fmt.Sprintf("- %s: %s\n", k, compact))
		}
	}

	b.WriteString("\n")
	b.WriteString(label(lang, "## Anket cevapları (görünür)\n\n", "## Questionnaire answers (visible)\n\n"))

	byCategory := map[string][]VisibleAnswer{}
	categories := make([]string, 0)
	skippedOptional := 0
	for _, a := range ctx.Answers {
		if !a.Answered {
			if !a.Required {
				skippedOptional++
			}
			continue
		}
		cat := a.Category
		if cat == "" {
			cat = label(lang, "Genel", "General")
		}
		if _, ok := byCategory[cat]; !ok {
			categories = append(categories, cat)
		}
		byCategory[cat] = append(byCategory[cat], a)
	}
	sort.Strings(categories)

	if len(categories) == 0 {
		b.WriteString(label(lang, "_Görünür cevap yok._\n", "_No visible answers._\n"))
	} else {
		for _, cat := range categories {
			b.WriteString(fmt.Sprintf("### %s\n\n", cat))
			items := byCategory[cat]
			sort.Slice(items, func(i, j int) bool { return items[i].Key < items[j].Key })
			for _, a := range items {
				val := compactJSON(a.Value)
				if val == "" {
					val = label(lang, "(boş)", "(empty)")
				}
				req := ""
				if a.Required {
					req = label(lang, " [zorunlu]", " [required]")
				}
				b.WriteString(fmt.Sprintf("- `%s`%s — %s: %s\n", a.Key, req, a.Title, val))
			}
			b.WriteString("\n")
		}
	}

	if skippedOptional > 0 {
		b.WriteString(label(lang,
			fmt.Sprintf("_%d isteğe bağlı cevapsız soru bağlam dışı bırakıldı._\n\n", skippedOptional),
			fmt.Sprintf("_%d optional unanswered questions omitted from context._\n\n", skippedOptional),
		))
	}

	if len(ctx.MissingRequired) > 0 {
		b.WriteString(label(lang, "## Eksik zorunlu bilgiler\n\n", "## Missing required information\n\n"))
		show := ctx.MissingRequired
		extra := 0
		if len(show) > maxMissingRequiredInPrompt {
			extra = len(show) - maxMissingRequiredInPrompt
			show = show[:maxMissingRequiredInPrompt]
		}
		for _, m := range show {
			b.WriteString(fmt.Sprintf("- `%s` (%s): %s\n", m.Key, m.Category, m.Title))
		}
		if extra > 0 {
			b.WriteString(label(lang,
				fmt.Sprintf("- ... ve %d zorunlu alan daha\n", extra),
				fmt.Sprintf("- ... and %d more required fields\n", extra),
			))
		}
		b.WriteString("\n")
	}

	b.WriteString(label(lang,
		"Bu bağlama göre tek bir Markdown yapılandırma belgesi üret.\n",
		"Produce a single Markdown configuration document from this context.\n",
	))

	return b.String()
}

func buildProductSpecSystemPrompt(lang string) string {
	if lang == "en" {
		return strings.TrimSpace(`
You are a product specification assistant for AI Development Configuration Studio.
Write a structured Markdown product spec from the provided workspace context.
Rules:
- Output Markdown only. Use the required numbered H2 sections exactly as listed in the user message.
- Do not invent secrets, API keys, tokens, or credentials.
- Ground content in profile and questionnaire answers (e.g. uses_mcp, uses_ai); mark gaps when missing.
- Keep decisions platform-independent and useful for product and engineering teams.
`)
	}

	return strings.TrimSpace(`
Sen AI Development Configuration Studio için ürün spesifikasyonu asistanısın.
Verilen çalışma alanı bağlamından yapılandırılmış bir Markdown ürün spesifikasyonu yaz.
Kurallar:
- Yalnızca Markdown üret. Kullanıcı mesajındaki numaralı H2 bölümlerini aynen kullan.
- Gizli anahtar, token, API key veya kimlik bilgisi uydurma.
- Profil ve anket cevaplarına dayan (ör. uses_mcp, uses_ai); eksik bilgileri belirt.
- Kararları platform bağımsız tut; ürün ve mühendislik ekipleri için kullanışlı olsun.
`)
}

func buildProductSpecUserPrompt(ctx *WorkspaceLLMContext, lang string) string {
	base := buildUserPrompt(ctx, lang)
	var b strings.Builder
	b.WriteString(base)
	b.WriteString("\n")
	if lang == "en" {
		b.WriteString("Document type: product_spec\n\n")
		b.WriteString("## Required sections (use these H2 headings in order)\n\n")
	} else {
		b.WriteString("Belge tipi: product_spec\n\n")
		b.WriteString("## Zorunlu bölümler (bu H2 başlıklarını sırayla kullan)\n\n")
	}
	for _, heading := range productspec.AllHeadings(lang) {
		b.WriteString(heading)
		b.WriteString("\n")
	}
	b.WriteString("\n")
	b.WriteString(label(lang,
		"Bu bağlama göre tek bir ürün spesifikasyonu Markdown belgesi üret.\n",
		"Produce a single product specification Markdown document from this context.\n",
	))
	return b.String()
}

func label(lang, tr, en string) string {
	if lang == "en" {
		return en
	}
	return tr
}

func writeKV(b *strings.Builder, key, value string) {
	value = strings.TrimSpace(value)
	if value == "" {
		return
	}
	b.WriteString(fmt.Sprintf("- %s: %s\n", key, value))
}
