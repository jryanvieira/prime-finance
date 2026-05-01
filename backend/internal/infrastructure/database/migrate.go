package database

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Migrate runs all pending SQL migrations from the given directory.
func Migrate(ctx context.Context, db *sql.DB, migrationsDir string) error {
	if err := ensureSchemaMigrations(ctx, db); err != nil {
		return err
	}

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return err
	}

	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasSuffix(name, ".sql") {
			files = append(files, name)
		}
	}
	sort.Strings(files)

	for _, name := range files {
		full := filepath.Join(migrationsDir, name)
		raw, err := os.ReadFile(full)
		if err != nil {
			return err
		}
		sum := sha256.Sum256(raw)
		hash := hex.EncodeToString(sum[:])

		applied, err := isApplied(ctx, db, name, hash)
		if err != nil {
			return err
		}
		if applied {
			continue
		}

		mctx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()

		tx, err := db.BeginTx(mctx, &sql.TxOptions{})
		if err != nil {
			return err
		}

		if _, err := tx.ExecContext(mctx, string(raw)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("migration %s failed: %w", name, err)
		}
		if _, err := tx.ExecContext(mctx, `INSERT INTO schema_migrations (filename, sha256) VALUES (?, ?);`, name, hash); err != nil {
			_ = tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}

	return nil
}

func ensureSchemaMigrations(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`)
	return err
}

func isApplied(ctx context.Context, db *sql.DB, filename, sha256Hash string) (bool, error) {
	var existingHash string
	err := db.QueryRowContext(ctx, `SELECT sha256 FROM schema_migrations WHERE filename = ?;`, filename).Scan(&existingHash)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if existingHash != sha256Hash {
		return false, fmt.Errorf("migration %s was modified after apply (sha mismatch)", filename)
	}
	return true, nil
}
