package router

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	projectprofileUC "github.com/masterfabric-go/masterfabric/internal/application/projectprofile/usecase"
	questionnaireUC "github.com/masterfabric-go/masterfabric/internal/application/questionnaire/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	profileModel "github.com/masterfabric-go/masterfabric/internal/domain/projectprofile/model"
	qmodel "github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
	tenantModel "github.com/masterfabric-go/masterfabric/internal/domain/tenant/model"
	projectprofileHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/projectprofile"
	questionnaireHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/questionnaire"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// --- Auth / RBAC stubs ---

type integAuthStub struct {
	tokens map[string]*service.TokenClaims
}

func (s *integAuthStub) HashPassword(password string) (string, error) { return password, nil }
func (s *integAuthStub) VerifyPassword(hashedPassword, password string) error {
	if hashedPassword != password {
		return errors.New("mismatch")
	}
	return nil
}
func (s *integAuthStub) GenerateToken(ctx context.Context, claims service.TokenClaims) (string, error) {
	return "unused", nil
}
func (s *integAuthStub) ValidateToken(ctx context.Context, token string) (*service.TokenClaims, error) {
	claims, ok := s.tokens[token]
	if !ok {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

type integRBACStub struct {
	// key: userID|orgID → set of permissions
	grants map[string]map[string]bool
}

func rbacKey(userID, orgID uuid.UUID) string {
	return userID.String() + "|" + orgID.String()
}

func (s *integRBACStub) grant(userID, orgID uuid.UUID, permissions ...string) {
	if s.grants == nil {
		s.grants = map[string]map[string]bool{}
	}
	key := rbacKey(userID, orgID)
	if s.grants[key] == nil {
		s.grants[key] = map[string]bool{}
	}
	for _, p := range permissions {
		s.grants[key][p] = true
	}
}

func (s *integRBACStub) HasPermission(ctx context.Context, userID, orgID uuid.UUID, permission string) (bool, error) {
	return s.grants[rbacKey(userID, orgID)][permission], nil
}
func (s *integRBACStub) HasAnyPermission(ctx context.Context, userID, orgID uuid.UUID, permissions []string) (bool, error) {
	for _, p := range permissions {
		ok, err := s.HasPermission(ctx, userID, orgID, p)
		if err != nil || ok {
			return ok, err
		}
	}
	return false, nil
}
func (s *integRBACStub) GetUserPermissions(ctx context.Context, userID, orgID uuid.UUID) ([]string, error) {
	m := s.grants[rbacKey(userID, orgID)]
	out := make([]string, 0, len(m))
	for p, ok := range m {
		if ok {
			out = append(out, p)
		}
	}
	return out, nil
}
func (s *integRBACStub) InvalidateCache(ctx context.Context, userID, orgID uuid.UUID) error {
	return nil
}

// --- Repository stubs ---

type integOrgRepo struct{}

func (integOrgRepo) Create(ctx context.Context, org *tenantModel.Organization) error { return nil }
func (integOrgRepo) GetByID(ctx context.Context, id uuid.UUID) (*tenantModel.Organization, error) {
	return &tenantModel.Organization{ID: id}, nil
}
func (integOrgRepo) GetBySlug(ctx context.Context, slug string) (*tenantModel.Organization, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "org not found", nil)
}
func (integOrgRepo) Update(ctx context.Context, org *tenantModel.Organization) error { return nil }
func (integOrgRepo) Delete(ctx context.Context, id uuid.UUID) error                  { return nil }
func (integOrgRepo) List(ctx context.Context, offset, limit int) ([]*tenantModel.Organization, int, error) {
	return nil, 0, nil
}

type integWorkspaceRepo struct {
	byID map[uuid.UUID]*tenantModel.Workspace
}

func (r *integWorkspaceRepo) Create(ctx context.Context, workspace *tenantModel.Workspace) error {
	return nil
}
func (r *integWorkspaceRepo) GetByID(ctx context.Context, id uuid.UUID) (*tenantModel.Workspace, error) {
	ws, ok := r.byID[id]
	if !ok {
		return nil, domainErr.New(domainErr.ErrNotFound, "workspace not found", nil)
	}
	return ws, nil
}
func (r *integWorkspaceRepo) GetBySlug(ctx context.Context, orgID uuid.UUID, slug string) (*tenantModel.Workspace, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "workspace not found", nil)
}
func (r *integWorkspaceRepo) ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*tenantModel.Workspace, error) {
	return nil, nil
}
func (r *integWorkspaceRepo) Update(ctx context.Context, workspace *tenantModel.Workspace) error {
	return nil
}
func (r *integWorkspaceRepo) Delete(ctx context.Context, id uuid.UUID) error { return nil }

type integSetRepo struct {
	byID map[uuid.UUID]*qmodel.QuestionnaireSet
}

func (r *integSetRepo) GetByID(ctx context.Context, id uuid.UUID) (*qmodel.QuestionnaireSet, error) {
	set, ok := r.byID[id]
	if !ok {
		return nil, domainErr.New(domainErr.ErrNotFound, "questionnaire set not found", nil)
	}
	return set, nil
}
func (r *integSetRepo) GetByKey(ctx context.Context, key string) (*qmodel.QuestionnaireSet, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "questionnaire set not found", nil)
}
func (r *integSetRepo) GetDefault(ctx context.Context, orgID uuid.UUID) (*qmodel.QuestionnaireSet, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "no default questionnaire set configured", nil)
}
func (r *integSetRepo) List(ctx context.Context, orgID uuid.UUID) ([]*qmodel.QuestionnaireSet, error) {
	return nil, nil
}

type integQuestionRepo struct{}

func (integQuestionRepo) GetByID(ctx context.Context, id uuid.UUID) (*qmodel.Question, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "question not found", nil)
}
func (integQuestionRepo) ListBySetID(ctx context.Context, setID uuid.UUID) ([]*qmodel.Question, error) {
	return []*qmodel.Question{}, nil
}
func (integQuestionRepo) ListRequiredActiveBySetID(ctx context.Context, setID uuid.UUID) ([]*qmodel.Question, error) {
	return []*qmodel.Question{}, nil
}

type integProfileRepo struct{}

func (integProfileRepo) GetByWorkspaceID(ctx context.Context, workspaceID uuid.UUID) (*profileModel.Profile, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "profile not found", nil)
}
func (integProfileRepo) Upsert(ctx context.Context, profile *profileModel.Profile) error {
	return nil
}

type integAnswerRepo struct{}

func (integAnswerRepo) GetByWorkspaceAndQuestion(ctx context.Context, workspaceID, questionID uuid.UUID) (*qmodel.Answer, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "answer not found", nil)
}
func (integAnswerRepo) ListByWorkspace(ctx context.Context, workspaceID uuid.UUID) ([]*qmodel.Answer, error) {
	return nil, nil
}
func (integAnswerRepo) Upsert(ctx context.Context, answer *qmodel.Answer) error { return nil }
func (integAnswerRepo) BulkUpsert(ctx context.Context, answers []*qmodel.Answer) error {
	return nil
}

type authFixture struct {
	handler http.Handler
	auth    *integAuthStub
	rbac    *integRBACStub

	userID      uuid.UUID
	orgA        uuid.UUID
	orgB        uuid.UUID
	workspaceB  uuid.UUID
	globalSetID uuid.UUID
	privateSetB uuid.UUID
	validToken  string
}

func newAuthFixture(t *testing.T) *authFixture {
	t.Helper()

	userID := uuid.New()
	orgA := uuid.New()
	orgB := uuid.New()
	workspaceB := uuid.New()
	globalSetID := uuid.New()
	privateSetB := uuid.New()
	validToken := "valid-user-token"

	auth := &integAuthStub{
		tokens: map[string]*service.TokenClaims{
			validToken: {
				UserID:         userID,
				Email:          "user@example.com",
				OrganizationID: orgA,
			},
		},
	}
	rbac := &integRBACStub{}
	// Member of org A with Phase 2 read permissions. Not a member of org B.
	rbac.grant(userID, orgA, "profile:read", "questionnaire:read", "answer:read")

	wsRepo := &integWorkspaceRepo{
		byID: map[uuid.UUID]*tenantModel.Workspace{
			workspaceB: {
				ID:             workspaceB,
				OrganizationID: orgB,
				Name:           "Org B Workspace",
				Slug:           "org-b-ws",
				Status:         tenantModel.WorkspaceStatusActive,
				CreatedAt:      time.Now().UTC(),
				UpdatedAt:      time.Now().UTC(),
			},
		},
	}
	setRepo := &integSetRepo{
		byID: map[uuid.UUID]*qmodel.QuestionnaireSet{
			globalSetID: {
				ID:             globalSetID,
				OrganizationID: nil,
				Key:            "studio-default",
				Title:          "Studio Default",
				IsDefault:      true,
				Active:         true,
			},
			privateSetB: {
				ID:             privateSetB,
				OrganizationID: &orgB,
				Key:            "org-b-private",
				Title:          "Org B Private",
				Active:         true,
			},
		},
	}
	questionRepo := integQuestionRepo{}
	profileRepo := integProfileRepo{}
	answerRepo := integAnswerRepo{}

	getProfileUC := projectprofileUC.NewGetProfileUseCase(profileRepo, wsRepo)
	upsertProfileUC := projectprofileUC.NewUpsertProfileUseCase(profileRepo, wsRepo)
	completenessUC := projectprofileUC.NewCompletenessUseCase(profileRepo, wsRepo)

	listSetsUC := questionnaireUC.NewListSetsUseCase(setRepo)
	getSetUC := questionnaireUC.NewGetSetUseCase(setRepo, questionRepo)
	listWorkspaceQuestionsUC := questionnaireUC.NewListWorkspaceQuestionsUseCase(setRepo, questionRepo, answerRepo, wsRepo)
	listAnswersUC := questionnaireUC.NewListAnswersUseCase(answerRepo, wsRepo)
	upsertAnswerUC := questionnaireUC.NewUpsertAnswerUseCase(answerRepo, questionRepo, wsRepo)
	bulkUpsertAnswersUC := questionnaireUC.NewBulkUpsertAnswersUseCase(answerRepo, wsRepo)
	missingInformationUC := questionnaireUC.NewMissingInformationUseCase(setRepo, questionRepo, answerRepo, wsRepo)

	deps := Dependencies{
		Logger:        slog.New(slog.NewTextHandler(io.Discard, nil)),
		AuthService:   auth,
		RBACService:   rbac,
		OrgRepo:       integOrgRepo{},
		WorkspaceRepo: wsRepo,
		ProjectProfileHandler: projectprofileHandler.NewHandler(
			getProfileUC, upsertProfileUC, completenessUC,
		),
		QuestionnaireHandler: questionnaireHandler.NewHandler(
			listSetsUC,
			getSetUC,
			listWorkspaceQuestionsUC,
			listAnswersUC,
			upsertAnswerUC,
			bulkUpsertAnswersUC,
			missingInformationUC,
		),
	}

	return &authFixture{
		handler:     New(deps),
		auth:        auth,
		rbac:        rbac,
		userID:      userID,
		orgA:        orgA,
		orgB:        orgB,
		workspaceB:  workspaceB,
		globalSetID: globalSetID,
		privateSetB: privateSetB,
		validToken:  validToken,
	}
}

func (f *authFixture) do(method, path string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	f.handler.ServeHTTP(rec, req)
	return rec
}

func TestHTTPAuth_MissingAuthorizationHeader_401(t *testing.T) {
	f := newAuthFixture(t)
	rec := f.do(http.MethodGet, "/api/v1/workspaces/"+f.workspaceB.String()+"/profile", map[string]string{
		"X-Organization-ID": f.orgA.String(),
	})
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assert.Contains(t, rec.Body.String(), "missing authorization header")
}

func TestHTTPAuth_InvalidJWT_401(t *testing.T) {
	f := newAuthFixture(t)
	rec := f.do(http.MethodGet, "/api/v1/workspaces/"+f.workspaceB.String()+"/profile", map[string]string{
		"Authorization":     "Bearer totally-invalid",
		"X-Organization-ID": f.orgA.String(),
	})
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assert.Contains(t, rec.Body.String(), "invalid token")
}

func TestHTTPAuth_NonMemberOrganization_403(t *testing.T) {
	f := newAuthFixture(t)
	// Spoof X-Organization-ID for org B where the user has no roles/permissions.
	// TenantResolver accepts the header; RBAC denies because user_roles are empty for org B.
	rec := f.do(http.MethodGet, "/api/v1/questionnaires/"+f.globalSetID.String(), map[string]string{
		"Authorization":     "Bearer " + f.validToken,
		"X-Organization-ID": f.orgB.String(),
	})
	assert.Equal(t, http.StatusForbidden, rec.Code)
	assert.Contains(t, rec.Body.String(), "insufficient permissions")
}

func TestHTTPAuth_ForeignOrganizationWorkspace_403(t *testing.T) {
	f := newAuthFixture(t)
	rec := f.do(http.MethodGet, "/api/v1/workspaces/"+f.workspaceB.String()+"/profile", map[string]string{
		"Authorization":     "Bearer " + f.validToken,
		"X-Organization-ID": f.orgA.String(),
	})
	assert.Equal(t, http.StatusForbidden, rec.Code)

	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Contains(t, body["message"], "workspace does not belong to your organization")
}

func TestHTTPAuth_ForeignOrganizationPrivateQuestionnaireSet_403(t *testing.T) {
	f := newAuthFixture(t)
	rec := f.do(http.MethodGet, "/api/v1/questionnaires/"+f.privateSetB.String(), map[string]string{
		"Authorization":     "Bearer " + f.validToken,
		"X-Organization-ID": f.orgA.String(),
	})
	assert.Equal(t, http.StatusForbidden, rec.Code)

	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Contains(t, body["message"], "questionnaire set is not accessible")
}

func TestHTTPAuth_GlobalQuestionnaireSet_200(t *testing.T) {
	f := newAuthFixture(t)
	rec := f.do(http.MethodGet, "/api/v1/questionnaires/"+f.globalSetID.String(), map[string]string{
		"Authorization":     "Bearer " + f.validToken,
		"X-Organization-ID": f.orgA.String(),
	})
	assert.Equal(t, http.StatusOK, rec.Code)

	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, f.globalSetID.String(), body["id"])
	assert.Equal(t, "studio-default", body["key"])
}
