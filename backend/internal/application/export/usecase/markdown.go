package usecase

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/domain/document/model"
)

var nonSlug = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func renderMarkdownExport(doc *model.GeneratedDocument, exportedAt time.Time) string {
	var b strings.Builder
	b.WriteString("---\n")
	fmt.Fprintf(&b, "title: %q\n", doc.Title)
	fmt.Fprintf(&b, "language: %q\n", doc.Language)
	fmt.Fprintf(&b, "document_id: %q\n", doc.ID.String())
	fmt.Fprintf(&b, "status: %q\n", doc.Status)
	approval := doc.ApprovalStatus
	if approval == "" {
		approval = model.ApprovalDraft
	}
	fmt.Fprintf(&b, "approval_status: %q\n", approval)
	fmt.Fprintf(&b, "provider_name: %q\n", doc.ProviderName)
	fmt.Fprintf(&b, "model_name: %q\n", doc.ModelName)
	if doc.SourceFingerprint != "" {
		fmt.Fprintf(&b, "source_fingerprint: %q\n", doc.SourceFingerprint)
	}
	fmt.Fprintf(&b, "exported_at: %q\n", exportedAt.UTC().Format(time.RFC3339))
	b.WriteString("---\n\n")
	b.WriteString(doc.MarkdownBody)
	if !strings.HasSuffix(doc.MarkdownBody, "\n") {
		b.WriteByte('\n')
	}
	return b.String()
}

func exportFilename(doc *model.GeneratedDocument, ext string) string {
	slug := strings.ToLower(strings.TrimSpace(doc.Title))
	slug = nonSlug.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-._")
	if slug == "" {
		slug = "document"
	}
	if len(slug) > 48 {
		slug = strings.Trim(slug[:48], "-._")
	}
	idShort := doc.ID.String()
	if len(idShort) > 8 {
		idShort = idShort[:8]
	}
	return fmt.Sprintf("%s-%s.%s", slug, idShort, ext)
}

func packageFilename(docs []*model.GeneratedDocument, contentType string) string {
	if contentType == "text/markdown" && len(docs) == 1 {
		return exportFilename(docs[0], "md")
	}
	return fmt.Sprintf("studio-export-%s.zip", time.Now().UTC().Format("20060102-150405"))
}
