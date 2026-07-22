package usecase

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

// WorkspaceLLMContext is the backend-assembled LLM input snapshot.
// It is not an HTTP DTO; handlers must not accept client-built equivalents.
type WorkspaceLLMContext struct {
	OrganizationID   uuid.UUID
	WorkspaceID      uuid.UUID
	WorkspaceName    string
	WorkspaceSlug    string
	Language         string // tr | en
	Profile          ProfileSnapshot
	Answers          []VisibleAnswer
	MissingRequired  []MissingRequiredItem
	QuestionnaireSet string // set key, e.g. studio-default
	GeneratedAt      time.Time
}

// ProfileSnapshot is a sanitized, prompt-safe view of the project profile.
type ProfileSnapshot struct {
	ProjectName               string
	ProjectDescription        string
	ProductType               string
	TargetUsers               string
	MainProblem               string
	MainUseCases              string
	ProjectStatus             string
	PreferredDocumentLanguage string
	Sections                  map[string]json.RawMessage
}

// VisibleAnswer is one active + visible questionnaire answer included in context.
type VisibleAnswer struct {
	Key      string
	Category string
	Title    string
	Value    json.RawMessage
	Required bool
	Answered bool
}

// MissingRequiredItem lists a visible required question that still lacks an answer.
type MissingRequiredItem struct {
	Key      string
	Category string
	Title    string
}

// Fingerprint returns a stable hash of language, profile scalars, and visible answers.
// Used later for regenerate metadata; never includes secrets beyond stored answer values.
func (c *WorkspaceLLMContext) Fingerprint() string {
	if c == nil {
		return ""
	}
	h := sha256.New()
	_, _ = h.Write([]byte(c.Language))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(c.WorkspaceID.String()))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(c.Profile.ProjectName))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(c.Profile.ProjectDescription))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(c.Profile.ProductType))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(c.Profile.TargetUsers))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(c.Profile.MainProblem))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(c.Profile.MainUseCases))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(c.Profile.ProjectStatus))
	_, _ = h.Write([]byte{0})

	sectionKeys := make([]string, 0, len(c.Profile.Sections))
	for k := range c.Profile.Sections {
		sectionKeys = append(sectionKeys, k)
	}
	sort.Strings(sectionKeys)
	for _, k := range sectionKeys {
		_, _ = h.Write([]byte(k))
		_, _ = h.Write([]byte{0})
		_, _ = h.Write(c.Profile.Sections[k])
		_, _ = h.Write([]byte{0})
	}

	answers := append([]VisibleAnswer(nil), c.Answers...)
	sort.Slice(answers, func(i, j int) bool { return answers[i].Key < answers[j].Key })
	for _, a := range answers {
		_, _ = h.Write([]byte(a.Key))
		_, _ = h.Write([]byte{0})
		_, _ = h.Write(a.Value)
		_, _ = h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

func normalizeDocumentLanguage(lang string) string {
	switch strings.ToLower(strings.TrimSpace(lang)) {
	case "en":
		return "en"
	default:
		return "tr"
	}
}
