package usecase

import (
	"github.com/masterfabric-go/masterfabric/internal/application/questionnaire/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/questionnaire/model"
)

func toSetInfo(s *model.QuestionnaireSet) dto.QuestionnaireSetInfo {
	return dto.QuestionnaireSetInfo{
		ID:             s.ID,
		OrganizationID: s.OrganizationID,
		Key:            s.Key,
		Title:          s.Title,
		Description:    s.Description,
		IsDefault:      s.IsDefault,
		Active:         s.Active,
		CreatedAt:      s.CreatedAt,
		UpdatedAt:      s.UpdatedAt,
	}
}

func toQuestionInfo(q *model.Question) dto.QuestionInfo {
	info := dto.QuestionInfo{
		ID:              q.ID,
		SetID:           q.SetID,
		Key:             q.Key,
		Category:        q.Category,
		Title:           q.Title,
		Description:     q.Description,
		InputType:       q.InputType,
		Required:        q.Required,
		DisplayOrder:    q.DisplayOrder,
		ValidationRules: q.ValidationRules,
		VisibilityRules: q.VisibilityRules,
		HelpText:        q.HelpText,
		ExampleAnswer:   q.ExampleAnswer,
		Active:          q.Active,
	}
	if len(q.Options) > 0 {
		info.Options = make([]dto.QuestionOptionInfo, 0, len(q.Options))
		for _, opt := range q.Options {
			info.Options = append(info.Options, dto.QuestionOptionInfo{
				ID:           opt.ID,
				Value:        opt.Value,
				Label:        opt.Label,
				DisplayOrder: opt.DisplayOrder,
			})
		}
	}
	return info
}

func toAnswerInfo(a *model.Answer) dto.AnswerInfo {
	return dto.AnswerInfo{
		ID:             a.ID,
		OrganizationID: a.OrganizationID,
		WorkspaceID:    a.WorkspaceID,
		QuestionID:     a.QuestionID,
		Value:          a.Value,
		CreatedAt:      a.CreatedAt,
		UpdatedAt:      a.UpdatedAt,
	}
}
