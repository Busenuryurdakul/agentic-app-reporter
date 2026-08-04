package dto

// SmokeDatasetMarker tags isolated smoke/seed rows. Keep in sync with:
//   - backend/scripts/smoke_peft_seed.mjs
//   - backend/deployments/finetune/analysis.py
const SmokeDatasetMarker = "[[PEFT_SMOKE_TEST]]"
