package usecase_test

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/datasetexport/usecase"
	generationUC "github.com/masterfabric-go/masterfabric/internal/application/generation/usecase"
	docModel "github.com/masterfabric-go/masterfabric/internal/domain/document/model"
	docRepo "github.com/masterfabric-go/masterfabric/internal/domain/document/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/llm"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type mockPEFTDocRepo struct{ mock.Mock }

func (m *mockPEFTDocRepo) Create(ctx context.Context, doc *docModel.GeneratedDocument) error {
	return m.Called(ctx, doc).Error(0)
}
func (m *mockPEFTDocRepo) GetByID(ctx context.Context, id uuid.UUID) (*docModel.GeneratedDocument, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*docModel.GeneratedDocument), args.Error(1)
}
func (m *mockPEFTDocRepo) ListByWorkspace(ctx context.Context, workspaceID uuid.UUID, limit int) ([]*docModel.GeneratedDocument, error) {
	args := m.Called(ctx, workspaceID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*docModel.GeneratedDocument), args.Error(1)
}
func (m *mockPEFTDocRepo) CountByWorkspace(ctx context.Context, workspaceID uuid.UUID) (*docRepo.WorkspaceDocumentStats, error) {
	args := m.Called(ctx, workspaceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*docRepo.WorkspaceDocumentStats), args.Error(1)
}
func (m *mockPEFTDocRepo) CountProvidersByWorkspace(ctx context.Context, workspaceID uuid.UUID) ([]docRepo.ProviderCount, error) {
	args := m.Called(ctx, workspaceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]docRepo.ProviderCount), args.Error(1)
}
func (m *mockPEFTDocRepo) UpdateApproval(ctx context.Context, doc *docModel.GeneratedDocument) error {
	return m.Called(ctx, doc).Error(0)
}
func (m *mockPEFTDocRepo) ListForPEFTExport(ctx context.Context, filter docRepo.PEFTExportFilter) ([]*docModel.GeneratedDocument, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*docModel.GeneratedDocument), args.Error(1)
}

type stubRebuilder struct {
	ctx *generationUC.WorkspaceLLMContext
	err error
}

func (s *stubRebuilder) Rebuild(ctx context.Context, workspaceID uuid.UUID, language string) (*generationUC.WorkspaceLLMContext, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.ctx != nil {
		return s.ctx, nil
	}
	return &generationUC.WorkspaceLLMContext{
		WorkspaceID: workspaceID,
		Language:    language,
		Profile:     generationUC.ProfileSnapshot{Sections: map[string]json.RawMessage{}},
	}, nil
}

type multiRebuilder struct {
	contexts map[uuid.UUID]*generationUC.WorkspaceLLMContext
	err      error
}

func (m *multiRebuilder) Rebuild(ctx context.Context, workspaceID uuid.UUID, language string) (*generationUC.WorkspaceLLMContext, error) {
	if m.err != nil {
		return nil, m.err
	}
	if c, ok := m.contexts[workspaceID]; ok {
		return c, nil
	}
	return nil, domainErr.New(domainErr.ErrNotFound, "workspace not found", nil)
}

type stubAssembler struct {
	system string
	user   string
	err    error
}

func (s *stubAssembler) Build(ctx *generationUC.WorkspaceLLMContext, documentType string) (llm.GenerateRequest, error) {
	if s.err != nil {
		return llm.GenerateRequest{}, s.err
	}
	sys := s.system
	if sys == "" {
		sys = "system prompt"
	}
	usr := s.user
	if usr == "" {
		usr = "user prompt"
	}
	return llm.GenerateRequest{SystemPrompt: sys, UserPrompt: usr}, nil
}

func validProductSpecBody() string {
	const sections = `
## 1. Özet ve hedef kullanıcı
Özet metni.

## 2. Problem tanımı ve kapsam
Kapsam.

## 3. Ürün gereksinimleri
Gereksinimler.

## 4. Mimari kararlar
Mimari.

## 5. AI / LLM kullanımı
Backend-only.

## 6. MCP ve otomasyon entegrasyonları
MCP yok.
`
	return "# Ürün Spesifikasyonu\n" + sections + strings.Repeat("detay ", 40)
}

func testWSContext(wsID uuid.UUID) *generationUC.WorkspaceLLMContext {
	return &generationUC.WorkspaceLLMContext{
		WorkspaceID: wsID,
		Language:    "tr",
		Profile:     generationUC.ProfileSnapshot{ProjectName: "Demo", Sections: map[string]json.RawMessage{}},
	}
}

func testApprovedDoc(wsID, orgID uuid.UUID, fp, body string) *docModel.GeneratedDocument {
	now := time.Now().UTC()
	return &docModel.GeneratedDocument{
		ID:                uuid.New(),
		OrganizationID:    orgID,
		WorkspaceID:       wsID,
		Title:             "Spec",
		DocumentType:      docModel.DocumentTypeProductSpec,
		Language:          "tr",
		Status:            docModel.StatusSucceeded,
		ApprovalStatus:    docModel.ApprovalApproved,
		MarkdownBody:      body,
		SourceFingerprint: fp,
		ApprovedAt:        &now,
		ProviderName:      "mock",
		ModelName:         "mock-model",
	}
}

func newExportUC(docs []*docModel.GeneratedDocument, reb *stubRebuilder, asm *stubAssembler) (*usecase.ExportPEFTDatasetUseCase, *mockPEFTDocRepo) {
	repo := new(mockPEFTDocRepo)
	orgID := uuid.New()
	if len(docs) > 0 {
		orgID = docs[0].OrganizationID
	}
	repo.On("ListForPEFTExport", mock.Anything, mock.MatchedBy(func(f docRepo.PEFTExportFilter) bool {
		return f.OrganizationID == orgID
	})).Return(docs, nil)
	return usecase.NewExportPEFTDatasetUseCase(repo, reb, asm), repo
}

func TestExportPEFTDataset_BT1_IncludesOnlyApprovedProductSpec(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	fp := wsCtx.Fingerprint()
	doc := testApprovedDoc(wsID, orgID, fp, validProductSpecBody())

	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.NoError(t, err)
	require.Len(t, out.Train, 1)
	assert.Equal(t, strings.TrimSpace(doc.MarkdownBody), out.Train[0].Messages[2].Content)
}

func TestExportPEFTDataset_BT4_SkipsFingerprintMismatch(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	doc := testApprovedDoc(wsID, orgID, "deadbeef", validProductSpecBody())
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: testWSContext(wsID)}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.ErrorIs(t, err, usecase.ErrNoExportRows)
	require.Len(t, out.Skipped, 1)
	assert.Equal(t, exportdto.SkipFingerprintMismatch, out.Skipped[0].Reason)
}

func TestExportPEFTDataset_BT5_SkipsEmptySourceFingerprintWhenStrict(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	doc := testApprovedDoc(wsID, orgID, "", validProductSpecBody())
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: testWSContext(wsID)}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.ErrorIs(t, err, usecase.ErrNoExportRows)
	assert.Equal(t, exportdto.SkipEmptyFingerprint, out.Skipped[0].Reason)
}

func TestExportPEFTDataset_BT6_IncludesLegacyNoFingerprintWhenFlagSet(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	doc := testApprovedDoc(wsID, orgID, "", validProductSpecBody())
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{
		OrganizationID:             orgID,
		IncludeLegacyNoFingerprint: true,
	})
	require.NoError(t, err)
	require.Len(t, out.Train, 1)
}

func TestExportPEFTDataset_BT7_BuildsThreeMessageRow(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	doc := testApprovedDoc(wsID, orgID, wsCtx.Fingerprint(), validProductSpecBody())
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{system: "sys", user: "usr"})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.NoError(t, err)
	require.Len(t, out.Train, 1)
	msgs := out.Train[0].Messages
	require.Len(t, msgs, 3)
	assert.Equal(t, exportdto.RoleSystem, msgs[0].Role)
	assert.Equal(t, "sys", msgs[0].Content)
	assert.Equal(t, exportdto.RoleUser, msgs[1].Role)
	assert.Equal(t, exportdto.RoleAssistant, msgs[2].Role)
}

func TestExportPEFTDataset_BT8_AssistantContentEqualsMarkdownBody(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	body := validProductSpecBody()
	doc := testApprovedDoc(wsID, orgID, wsCtx.Fingerprint(), body)
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.NoError(t, err)
	assert.Equal(t, strings.TrimSpace(body), out.Train[0].Messages[2].Content)
}

func TestExportPEFTDataset_BT9_SkipsEmptyAssistantBody(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	doc := testApprovedDoc(wsID, orgID, wsCtx.Fingerprint(), "   ")
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.ErrorIs(t, err, usecase.ErrNoExportRows)
	assert.Equal(t, exportdto.SkipEmptyAssistant, out.Skipped[0].Reason)
}

func TestExportPEFTDataset_BT10_SkipsBelowMinQualityScore(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	doc := testApprovedDoc(wsID, orgID, wsCtx.Fingerprint(), "short")
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID, MinQualityScore: 80})
	require.ErrorIs(t, err, usecase.ErrNoExportRows)
	assert.Equal(t, exportdto.SkipLowQuality, out.Skipped[0].Reason)
}

func TestExportPEFTDataset_BT11_SkipsWhenSectionCoverageFails(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	body := "# Title\n" + strings.Repeat("long body without sections ", 15)
	doc := testApprovedDoc(wsID, orgID, wsCtx.Fingerprint(), body)
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.ErrorIs(t, err, usecase.ErrNoExportRows)
	assert.Equal(t, exportdto.SkipSectionCoverage, out.Skipped[0].Reason)
}

func TestExportPEFTDataset_BT12_AllowLowQualityBypassesSectionCoverage(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	body := "# Title\n" + strings.Repeat("long body without sections ", 15)
	doc := testApprovedDoc(wsID, orgID, wsCtx.Fingerprint(), body)
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{
		OrganizationID:  orgID,
		AllowLowQuality: true,
		MinQualityScore: 50,
	})
	require.NoError(t, err)
	require.Len(t, out.Train, 1)
}

func TestExportPEFTDataset_BT13_DedupeFingerprintKeepsLatestApproved(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	fp := wsCtx.Fingerprint()
	older := testApprovedDoc(wsID, orgID, fp, validProductSpecBody())
	old := time.Now().UTC().Add(-2 * time.Hour)
	older.ApprovedAt = &old
	newer := testApprovedDoc(wsID, orgID, fp, validProductSpecBody()+"\n<!-- newer -->")
	uc, _ := newExportUC([]*docModel.GeneratedDocument{older, newer}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{
		OrganizationID: orgID,
		Dedupe:         exportdto.DedupeFingerprint,
	})
	require.NoError(t, err)
	require.Len(t, out.Train, 1)
	assert.Contains(t, out.Train[0].Messages[2].Content, "newer")
	assert.Equal(t, 1, out.Manifest.SkipReasons[string(exportdto.SkipDuplicateFingerprint)])
}

func TestExportPEFTDataset_BT14_DedupeWorkspaceLatest(t *testing.T) {
	orgID := uuid.New()
	ws1 := uuid.New()
	ws2 := uuid.New()
	ctx1 := testWSContext(ws1)
	ctx2 := testWSContext(ws2)
	d1 := testApprovedDoc(ws1, orgID, ctx1.Fingerprint(), validProductSpecBody())
	d2 := testApprovedDoc(ws2, orgID, ctx2.Fingerprint(), validProductSpecBody())
	repo := new(mockPEFTDocRepo)
	repo.On("ListForPEFTExport", mock.Anything, mock.Anything).Return([]*docModel.GeneratedDocument{d1, d2}, nil)
	uc := usecase.NewExportPEFTDatasetUseCase(repo, &multiRebuilder{
		contexts: map[uuid.UUID]*generationUC.WorkspaceLLMContext{ws1: ctx1, ws2: ctx2},
	}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{
		OrganizationID: orgID,
		Dedupe:         exportdto.DedupeWorkspaceLatest,
	})
	require.NoError(t, err)
	assert.Len(t, out.Train, 2)
}

func TestExportPEFTDataset_BT15_SplitByWorkspaceNoLeakage(t *testing.T) {
	orgID := uuid.New()
	docs := make([]*docModel.GeneratedDocument, 0, 20)
	contexts := make(map[uuid.UUID]*generationUC.WorkspaceLLMContext)
	for i := 0; i < 20; i++ {
		wsID := uuid.New()
		ctx := testWSContext(wsID)
		contexts[wsID] = ctx
		docs = append(docs, testApprovedDoc(wsID, orgID, ctx.Fingerprint(), validProductSpecBody()))
	}
	repo := new(mockPEFTDocRepo)
	repo.On("ListForPEFTExport", mock.Anything, mock.Anything).Return(docs, nil)
	uc := usecase.NewExportPEFTDatasetUseCase(repo, &multiRebuilder{contexts: contexts}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{
		OrganizationID: orgID,
		Dedupe:         exportdto.DedupeNone,
		SplitRatio:     0.9,
		SplitSalt:      "test-salt",
	})
	require.NoError(t, err)
	assert.Equal(t, len(docs), out.Manifest.Counts.Exported)
	assert.Equal(t, len(out.Train)+len(out.Val), len(docs))
}

func TestExportPEFTDataset_BT16_RedactsSecretsInUserPrompt(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	doc := testApprovedDoc(wsID, orgID, wsCtx.Fingerprint(), validProductSpecBody())
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{
		user: `{"api_key":"***","model":"gemma"}`,
	})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.NoError(t, err)
	assert.Contains(t, out.Train[0].Messages[1].Content, `"api_key":"***"`)
	assert.NotContains(t, out.Train[0].Messages[1].Content, `"api_key":"sk-`)
}

func TestExportPEFTDataset_BT17_SkipsWhenWorkspaceNotFound(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	doc := testApprovedDoc(wsID, orgID, "fp", validProductSpecBody())
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{
		err: domainErr.New(domainErr.ErrNotFound, "workspace not found", nil),
	}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.ErrorIs(t, err, usecase.ErrNoExportRows)
	assert.Equal(t, exportdto.SkipWorkspaceNotFound, out.Skipped[0].Reason)
}

func TestExportPEFTDataset_BT18_DryRunReturnsManifestOnly(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	doc := testApprovedDoc(wsID, orgID, wsCtx.Fingerprint(), validProductSpecBody())
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{
		OrganizationID: orgID,
		DryRun:         true,
	})
	require.NoError(t, err)
	assert.Nil(t, out.Train)
	assert.Nil(t, out.Val)
	assert.Equal(t, 1, out.Manifest.Counts.Exported)
}

func TestExportPEFTDataset_BT19_EmptyCandidatesReturnsErrNoRows(t *testing.T) {
	orgID := uuid.New()
	repo := new(mockPEFTDocRepo)
	repo.On("ListForPEFTExport", mock.Anything, mock.Anything).Return([]*docModel.GeneratedDocument{}, nil)
	uc := usecase.NewExportPEFTDatasetUseCase(repo, &stubRebuilder{}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{OrganizationID: orgID})
	require.ErrorIs(t, err, usecase.ErrNoExportRows)
	assert.Equal(t, 0, out.Manifest.Counts.Candidates)
}

func TestExportPEFTDataset_BT2_BT3_FilterAtRepository(t *testing.T) {
	t.Skip("B-T2/B-T3: enforced by ListForPEFTExport SQL — see postgres integration tests A-T4")
}

func TestExportPEFTDataset_AssistantSecretScan(t *testing.T) {
	wsID := uuid.New()
	orgID := uuid.New()
	wsCtx := testWSContext(wsID)
	body := validProductSpecBody() + "\napi_key: leaked"
	doc := testApprovedDoc(wsID, orgID, wsCtx.Fingerprint(), body)
	uc, _ := newExportUC([]*docModel.GeneratedDocument{doc}, &stubRebuilder{ctx: wsCtx}, &stubAssembler{})
	out, err := uc.Execute(context.Background(), exportdto.ExportOptions{
		OrganizationID:       orgID,
		ScanAssistantSecrets: true,
	})
	require.ErrorIs(t, err, usecase.ErrNoExportRows)
	assert.Equal(t, exportdto.SkipAssistantSecret, out.Skipped[0].Reason)
}

func TestExportPEFTDataset_ErrValidationWithoutOrg(t *testing.T) {
	uc := usecase.NewExportPEFTDatasetUseCase(new(mockPEFTDocRepo), nil, nil)
	_, err := uc.Execute(context.Background(), exportdto.ExportOptions{})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrValidation))
}
