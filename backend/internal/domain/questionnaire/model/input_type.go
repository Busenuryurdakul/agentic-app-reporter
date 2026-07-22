package model

// InputType represents the kind of input widget/value a question expects.
// These values must match the `questions.input_type` CHECK constraint in
// migration 00014_project_profiles_and_questionnaires.sql.
type InputType string

const (
	InputTypeShortText    InputType = "short_text"
	InputTypeLongText     InputType = "long_text"
	InputTypeSingleSelect InputType = "single_select"
	InputTypeMultiSelect  InputType = "multi_select"
	InputTypeBoolean      InputType = "boolean"
	InputTypeNumber       InputType = "number"
	InputTypeURL          InputType = "url"
	InputTypeCode         InputType = "code"
	InputTypeJSON         InputType = "json"
	InputTypeKeyValue     InputType = "key_value"
)

// IsValidInputType reports whether the given string is a supported input type.
func IsValidInputType(v string) bool {
	switch InputType(v) {
	case InputTypeShortText, InputTypeLongText, InputTypeSingleSelect, InputTypeMultiSelect,
		InputTypeBoolean, InputTypeNumber, InputTypeURL, InputTypeCode, InputTypeJSON, InputTypeKeyValue:
		return true
	default:
		return false
	}
}
