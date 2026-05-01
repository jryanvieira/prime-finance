package shared

import (
	"strings"
	"testing"
)

func TestParseNubankCSV_ValidFile(t *testing.T) {
	csv := "date,title,amount\n2025-01-15,Supermercado,150.50\n2025-01-16,Farmacia,32.00\n"
	rows, err := ParseNubankCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}
	if rows[0].AmountCents != 15050 {
		t.Errorf("expected 15050, got %d", rows[0].AmountCents)
	}
}

func TestParseNubankCSV_Installments(t *testing.T) {
	csv := "date,title,amount\n2025-01-15,KaBuM! - NuPay - Parcela 1/10,100.00\n"
	rows, err := ParseNubankCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(rows))
	}
	if rows[0].InstallmentIndex != 1 {
		t.Errorf("expected installment index 1, got %d", rows[0].InstallmentIndex)
	}
	if rows[0].InstallmentsCount != 10 {
		t.Errorf("expected installment count 10, got %d", rows[0].InstallmentsCount)
	}
	if rows[0].Description != "KaBuM! - NuPay" {
		t.Errorf("expected description 'KaBuM! - NuPay', got %q", rows[0].Description)
	}
}

func TestParseNubankCSV_IgnoredRows(t *testing.T) {
	csv := "date,title,amount\n2025-01-15,Pagamento Recebido,500.00\n2025-01-16,Cafe,5.00\n"
	rows, err := ParseNubankCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}
	if !rows[0].Ignored {
		t.Error("expected first row to be ignored")
	}
	filtered := FilterIgnoredRows(rows)
	if len(filtered) != 1 {
		t.Errorf("expected 1 filtered row, got %d", len(filtered))
	}
}

func TestSplitTotalIntoInstallments(t *testing.T) {
	parts, err := SplitTotalIntoInstallments(1001, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(parts) != 3 {
		t.Fatalf("expected 3 parts, got %d", len(parts))
	}
	// 1001 / 3 = 333 remainder 2 → [334, 334, 333]
	if parts[0] != 334 || parts[1] != 334 || parts[2] != 333 {
		t.Errorf("unexpected split: %v", parts)
	}
}
