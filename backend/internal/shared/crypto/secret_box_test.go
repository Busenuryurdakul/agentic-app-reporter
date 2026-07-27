package crypto_test

import (
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/shared/crypto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEncryptDecryptString(t *testing.T) {
	keyMaterial := "test-encryption-key-material"
	plain := "hf_test_secret_key_value"

	enc, err := crypto.EncryptString(plain, keyMaterial)
	require.NoError(t, err)
	assert.NotEmpty(t, enc)
	assert.NotEqual(t, plain, enc)

	out, err := crypto.DecryptString(enc, keyMaterial)
	require.NoError(t, err)
	assert.Equal(t, plain, out)
}

func TestEncryptString_EmptyPlaintext(t *testing.T) {
	enc, err := crypto.EncryptString("", "key")
	require.NoError(t, err)
	assert.Empty(t, enc)
}

func TestDecryptString_WrongKey(t *testing.T) {
	enc, err := crypto.EncryptString("secret", "key-a")
	require.NoError(t, err)
	_, err = crypto.DecryptString(enc, "key-b")
	assert.Error(t, err)
}
