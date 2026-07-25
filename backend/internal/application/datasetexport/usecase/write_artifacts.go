package usecase

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	exportdto "github.com/masterfabric-go/masterfabric/internal/application/datasetexport/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/datasetexport/serializer"
)

// WriteArtifactsOptions controls filesystem output for an export run.
type WriteArtifactsOptions struct {
	Force        bool
	DryRun       bool
	WriteSkipped bool
}

// WriteExportArtifacts persists train/val JSONL, manifest, and optional skipped log.
func WriteExportArtifacts(outDir string, result *exportdto.ExportResult, opts WriteArtifactsOptions) error {
	if result == nil {
		return errors.New("export result is required")
	}
	if outDir == "" {
		return errors.New("out-dir is required")
	}

	if err := prepareOutDir(outDir, opts.Force); err != nil {
		return err
	}

	if err := writeManifest(filepath.Join(outDir, "manifest.json"), result.Manifest); err != nil {
		return err
	}

	if opts.DryRun {
		return nil
	}

	if err := writeJSONLRows(filepath.Join(outDir, "train.jsonl"), result.Train); err != nil {
		return err
	}
	if err := writeJSONLRows(filepath.Join(outDir, "val.jsonl"), result.Val); err != nil {
		return err
	}

	if opts.WriteSkipped && len(result.Skipped) > 0 {
		if err := writeSkippedJSONL(filepath.Join(outDir, "skipped.jsonl"), result.Skipped); err != nil {
			return err
		}
	}
	return nil
}

func prepareOutDir(outDir string, force bool) error {
	info, err := os.Stat(outDir)
	if err != nil {
		if os.IsNotExist(err) {
			return os.MkdirAll(outDir, 0o750)
		}
		return fmt.Errorf("stat out-dir: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("out-dir is not a directory: %s", outDir)
	}
	if !force {
		entries, err := os.ReadDir(outDir)
		if err != nil {
			return fmt.Errorf("read out-dir: %w", err)
		}
		if len(entries) > 0 {
			return fmt.Errorf("out-dir is not empty (use --force to overwrite): %s", outDir)
		}
	}
	return nil
}

func writeManifest(path string, manifest exportdto.ExportManifest) error {
	b, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal manifest: %w", err)
	}
	b = append(b, '\n')
	return os.WriteFile(path, b, 0o640)
}

func writeJSONLRows(path string, rows []exportdto.DatasetRow) error {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o640)
	if err != nil {
		return fmt.Errorf("open %s: %w", path, err)
	}
	defer f.Close()

	for _, row := range rows {
		line, err := serializer.EncodeLine(row)
		if err != nil {
			return fmt.Errorf("encode row for %s: %w", path, err)
		}
		if _, err := f.Write(line); err != nil {
			return fmt.Errorf("write %s: %w", path, err)
		}
	}
	return nil
}

func writeSkippedJSONL(path string, skipped []exportdto.SkippedRow) error {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o640)
	if err != nil {
		return fmt.Errorf("open %s: %w", path, err)
	}
	defer f.Close()

	for _, row := range skipped {
		b, err := json.Marshal(row)
		if err != nil {
			return fmt.Errorf("marshal skipped row: %w", err)
		}
		b = append(b, '\n')
		if _, err := f.Write(b); err != nil {
			return fmt.Errorf("write %s: %w", path, err)
		}
	}
	return nil
}
