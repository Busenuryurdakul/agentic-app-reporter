package usecase

import (
	"encoding/json"
	"fmt"

	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

func NormalizeUserAPIKeyScopes(requested []string) ([]string, error) {
	if len(requested) == 0 {
		out := make([]string, len(model.DefaultUserAPIKeyScopes))
		copy(out, model.DefaultUserAPIKeyScopes)
		return out, nil
	}

	seen := make(map[string]struct{}, len(requested))
	out := make([]string, 0, len(requested))
	for _, scope := range requested {
		if scope == "" {
			continue
		}
		if _, ok := model.ValidUserAPIKeyScopes[scope]; !ok {
			return nil, domainErr.New(domainErr.ErrBadRequest, fmt.Sprintf("invalid scope: %s", scope), nil)
		}
		if _, dup := seen[scope]; dup {
			continue
		}
		seen[scope] = struct{}{}
		out = append(out, scope)
	}
	if len(out) == 0 {
		return nil, domainErr.New(domainErr.ErrBadRequest, "at least one scope is required", nil)
	}
	return out, nil
}

func encodeUserAPIKeyScopes(scopes []string) ([]byte, error) {
	if len(scopes) == 0 {
		return nil, nil
	}
	raw, err := json.Marshal(scopes)
	if err != nil {
		return nil, fmt.Errorf("encode api key scopes: %w", err)
	}
	return raw, nil
}

func decodeUserAPIKeyScopes(raw []byte) []string {
	if len(raw) == 0 {
		return nil
	}
	var scopes []string
	if err := json.Unmarshal(raw, &scopes); err != nil {
		return nil
	}
	return scopes
}
