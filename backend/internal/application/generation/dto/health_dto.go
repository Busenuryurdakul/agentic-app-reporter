package dto

// ProviderHealthInfo is the public health payload for LLM provider probes.
type ProviderHealthInfo struct {
	Provider string `json:"provider"`
	Healthy  bool   `json:"healthy"`
	Message  string `json:"message"`
	Enabled  bool   `json:"enabled"`
}
