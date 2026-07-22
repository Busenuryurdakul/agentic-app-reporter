package usecase

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCalculateReadinessScore(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		profile     int
		answered    int
		total       int
		succeeded   int
		wantOverall int
		wantProfile int
		wantQuest   int
		wantDocs    int
	}{
		{
			name:        "all zero without docs",
			profile:     0,
			answered:    0,
			total:       0,
			succeeded:   0,
			wantOverall: 40, // 0.4*0 + 0.4*100 + 0.2*0
			wantProfile: 0,
			wantQuest:   100,
			wantDocs:    0,
		},
		{
			name:        "full score with docs",
			profile:     100,
			answered:    5,
			total:       5,
			succeeded:   2,
			wantOverall: 100,
			wantProfile: 100,
			wantQuest:   100,
			wantDocs:    100,
		},
		{
			name:        "plan example weights",
			profile:     80,
			answered:    13,
			total:       20, // 65%
			succeeded:   1,  // documents=100
			wantOverall: 78, // round(0.4*80 + 0.4*65 + 0.2*100) = round(32+26+20)=78
			wantProfile: 80,
			wantQuest:   65,
			wantDocs:    100,
		},
		{
			name:        "no succeeded documents",
			profile:     50,
			answered:    1,
			total:       2,
			succeeded:   0,
			wantOverall: 40, // round(20 + 20 + 0)
			wantProfile: 50,
			wantQuest:   50,
			wantDocs:    0,
		},
		{
			name:        "clamps profile above 100",
			profile:     150,
			answered:    0,
			total:       1,
			succeeded:   0,
			wantOverall: 40, // 0.4*100 + 0 + 0
			wantProfile: 100,
			wantQuest:   0,
			wantDocs:    0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			overall, c := CalculateReadinessScore(tt.profile, tt.answered, tt.total, tt.succeeded)
			assert.Equal(t, tt.wantOverall, overall)
			assert.Equal(t, tt.wantProfile, c.Profile)
			assert.Equal(t, tt.wantQuest, c.Questionnaire)
			assert.Equal(t, tt.wantDocs, c.Documents)
		})
	}
}
