package model

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestQuestionnaireSet_VisibleTo(t *testing.T) {
	orgA := uuid.New()
	orgB := uuid.New()

	assert.True(t, (&QuestionnaireSet{OrganizationID: nil}).VisibleTo(orgA))
	assert.True(t, (&QuestionnaireSet{OrganizationID: &orgA}).VisibleTo(orgA))
	assert.False(t, (&QuestionnaireSet{OrganizationID: &orgB}).VisibleTo(orgA))
	assert.False(t, (*QuestionnaireSet)(nil).VisibleTo(orgA))
}
