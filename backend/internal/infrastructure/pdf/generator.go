package pdf

import (
	"bytes"
	"fmt"

	"github.com/jung-kurt/gofpdf"

	"dash-fin/internal/application/cashflow"
)

// ExpenseRow é um DTO interno deste package para cada linha da tabela de despesas.
type ExpenseRow struct {
	Date        string
	Description string
	Category    string
	AmountCents int64
}

// Generator define a interface para geração de PDFs de extrato mensal.
type Generator interface {
	Generate(data *cashflow.MonthlySummaryResponse, expenses []ExpenseRow) ([]byte, error)
}

// PDFGenerator implementa Generator usando gofpdf.
type PDFGenerator struct{}

func NewPDFGenerator() *PDFGenerator {
	return &PDFGenerator{}
}

// formatCents converte centavos int64 para string "R$ X,XX".
func formatCents(cents int64) string {
	reais := cents / 100
	centavos := cents % 100
	if centavos < 0 {
		centavos = -centavos
	}
	return fmt.Sprintf("R$ %d,%02d", reais, centavos)
}

// truncate trunca a string para no máximo n caracteres.
func truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n])
}

func (g *PDFGenerator) Generate(data *cashflow.MonthlySummaryResponse, expenses []ExpenseRow) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// --- Cabeçalho ---
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(0, 10, "Extrato Mensal — "+data.Month, "", 1, "C", false, 0, "")
	pdf.Ln(4)

	// --- Tabela de despesas ---
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(220, 220, 220)

	colWidths := [4]float64{25, 80, 45, 30}
	headers := [4]string{"Data", "Descrição", "Categoria", "Valor"}
	for i, h := range headers {
		pdf.CellFormat(colWidths[i], 7, h, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetFont("Arial", "", 9)
	pdf.SetFillColor(255, 255, 255)

	for _, row := range expenses {
		desc := truncate(row.Description, 40)
		cat := truncate(row.Category, 22)
		pdf.CellFormat(colWidths[0], 6, row.Date, "1", 0, "C", false, 0, "")
		pdf.CellFormat(colWidths[1], 6, desc, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colWidths[2], 6, cat, "1", 0, "L", false, 0, "")
		pdf.CellFormat(colWidths[3], 6, formatCents(row.AmountCents), "1", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}

	if len(expenses) == 0 {
		pdf.SetFont("Arial", "I", 9)
		pdf.CellFormat(0, 6, "Nenhuma despesa no período.", "1", 1, "C", false, 0, "")
	}

	pdf.Ln(6)

	// --- Resumo por categoria ---
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(0, 8, "Resumo por Categoria", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(220, 220, 220)
	pdf.CellFormat(100, 7, "Categoria", "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 7, "Total", "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 7, "Transações", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 9)
	for _, cs := range data.CategorySummary {
		pdf.CellFormat(100, 6, truncate(cs.Category, 50), "1", 0, "L", false, 0, "")
		pdf.CellFormat(30, 6, formatCents(cs.TotalCents), "1", 0, "R", false, 0, "")
		pdf.CellFormat(30, 6, fmt.Sprintf("%d", cs.TransactionCount), "1", 1, "C", false, 0, "")
	}

	if len(data.CategorySummary) == 0 {
		pdf.SetFont("Arial", "I", 9)
		pdf.CellFormat(0, 6, "Sem dados de categoria.", "1", 1, "C", false, 0, "")
	}

	pdf.Ln(6)

	// --- Totais gerais ---
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(0, 8, "Totais", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 10)
	totals := [][2]string{
		{"Total de Despesas", formatCents(data.TotalExpensesCents)},
		{"Total de Receitas", formatCents(data.TotalIncomeCents)},
		{"Total de Recorrentes", formatCents(data.TotalRecurringCents)},
		{"Saldo Líquido", formatCents(data.BalanceCents)},
	}
	for _, t := range totals {
		pdf.CellFormat(100, 7, t[0], "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 7, t[1], "1", 1, "R", false, 0, "")
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
