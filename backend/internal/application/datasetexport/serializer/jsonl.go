package serializer

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
)

// ValidateRow checks the PEFT JSONL row contract (3 non-empty messages, fixed roles).
func ValidateRow(row exportdto.DatasetRow) error {
	if len(row.Messages) != 3 {
		return fmt.Errorf("expected 3 messages, got %d", len(row.Messages))
	}
	expected := []exportdto.ChatRole{
		exportdto.RoleSystem,
		exportdto.RoleUser,
		exportdto.RoleAssistant,
	}
	for i, msg := range row.Messages {
		if msg.Role != expected[i] {
			return fmt.Errorf("message %d: expected role %q, got %q", i, expected[i], msg.Role)
		}
		if strings.TrimSpace(msg.Content) == "" {
			return fmt.Errorf("message %d: content is empty", i)
		}
	}
	if row.Metadata.ExportVersion == "" {
		return errors.New("metadata.export_version is required")
	}
	return nil
}

// EncodeLine serializes one DatasetRow as a single JSONL line (UTF-8 + trailing newline).
func EncodeLine(row exportdto.DatasetRow) ([]byte, error) {
	if err := ValidateRow(row); err != nil {
		return nil, err
	}
	b, err := json.Marshal(row)
	if err != nil {
		return nil, fmt.Errorf("marshal dataset row: %w", err)
	}
	b = append(b, '\n')
	return b, nil
}
