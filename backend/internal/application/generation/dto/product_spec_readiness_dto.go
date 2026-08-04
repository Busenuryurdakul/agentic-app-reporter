package dto

// ProductSpecReadinessIssue describes a blocking gap or a non-blocking warning.
type ProductSpecReadinessIssue struct {
	Code    string `json:"code"`
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

// ProductSpecReadinessResult is the pre-generation quality gate for product_spec.
type ProductSpecReadinessResult struct {
	CanGenerate          bool                        `json:"can_generate"`
	ReadinessScore       int                         `json:"readiness_score"`
	BlockingIssues       []ProductSpecReadinessIssue `json:"blocking_issues"`
	Warnings             []ProductSpecReadinessIssue `json:"warnings"`
	MissingRequiredCount int                         `json:"missing_required_count"`
}
