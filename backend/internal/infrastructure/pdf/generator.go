package pdf

import (
	"bytes"
	"fmt"

	"github.com/jung-kurt/gofpdf"
)

type ExpenseRow struct {
	Date        string
	Description string
	Category    string
	AmountCents int64
}

type CategorySummaryItem struct {
	Category         string
	TotalCents       int64
	TransactionCount int
}

type SummaryData struct {
	Month               string
	TotalExpensesCents  int64
	TotalIncomeCents    int64
	TotalRecurringCents int64
	BalanceCents        int64
	CategorySummary     []CategorySummaryItem
}

type Generator interface {
	Generate(data *SummaryData, expenses []ExpenseRow) ([]byte, error)
}

type PDFGenerator struct{}

func NewPDFGenerator() *PDFGenerator {
	return &PDFGenerator{}
}

func formatCents(cents int64) string {
	reais := cents / 100
	centavos := cents % 100
	if centavos < 0 {
		centavos = -centavos
	}
	return fmt.Sprintf("R$ %d,%02d", reais, centavos)
}

func truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n])
}

func (g *PDFGenerator) Generate(data *SummaryData, expenses []ExpenseRow) ([]byte, error) {
	p := gofpdf.New("P", "mm", "A4", "")
	p.SetMargins(15, 15, 15)
	p.AddPage()

	p.SetFont("Arial", "B", 16)
	p.CellFormat(0, 10, "Extrato Mensal — "+data.Month, "", 1, "C", false, 0, "")
	p.Ln(4)

	p.SetFont("Arial", "B", 10)
	p.SetFillColor(220, 220, 220)

	colWidths := [4]float64{25, 80, 45, 30}
	headers := [4]string{"Data", "Descrição", "Categoria", "Valor"}
	for i, h := range headers {
		p.CellFormat(colWidths[i], 7, h, "1", 0, "C", true, 0, "")
	}
	p.Ln(-1)

	p.SetFont("Arial", "", 9)
	p.SetFillColor(255, 255, 255)

	for _, row := range expenses {
		p.CellFormat(colWidths[0], 6, row.Date, "1", 0, "C", false, 0, "")
		p.CellFormat(colWidths[1], 6, truncate(row.Description, 40), "1", 0, "L", false, 0, "")
		p.CellFormat(colWidths[2], 6, truncate(row.Category, 22), "1", 0, "L", false, 0, "")
		p.CellFormat(colWidths[3], 6, formatCents(row.AmountCents), "1", 0, "R", false, 0, "")
		p.Ln(-1)
	}

	if len(expenses) == 0 {
		p.SetFont("Arial", "I", 9)
		p.CellFormat(0, 6, "Nenhuma despesa no período.", "1", 1, "C", false, 0, "")
	}

	p.Ln(6)

	p.SetFont("Arial", "B", 11)
	p.CellFormat(0, 8, "Resumo por Categoria", "", 1, "L", false, 0, "")

	p.SetFont("Arial", "B", 10)
	p.SetFillColor(220, 220, 220)
	p.CellFormat(100, 7, "Categoria", "1", 0, "C", true, 0, "")
	p.CellFormat(30, 7, "Total", "1", 0, "C", true, 0, "")
	p.CellFormat(30, 7, "Transações", "1", 1, "C", true, 0, "")

	p.SetFont("Arial", "", 9)
	for _, cs := range data.CategorySummary {
		p.CellFormat(100, 6, truncate(cs.Category, 50), "1", 0, "L", false, 0, "")
		p.CellFormat(30, 6, formatCents(cs.TotalCents), "1", 0, "R", false, 0, "")
		p.CellFormat(30, 6, fmt.Sprintf("%d", cs.TransactionCount), "1", 1, "C", false, 0, "")
	}

	if len(data.CategorySummary) == 0 {
		p.SetFont("Arial", "I", 9)
		p.CellFormat(0, 6, "Sem dados de categoria.", "1", 1, "C", false, 0, "")
	}

	p.Ln(6)

	p.SetFont("Arial", "B", 11)
	p.CellFormat(0, 8, "Totais", "", 1, "L", false, 0, "")

	p.SetFont("Arial", "", 10)
	totals := [][2]string{
		{"Total de Despesas", formatCents(data.TotalExpensesCents)},
		{"Total de Receitas", formatCents(data.TotalIncomeCents)},
		{"Total de Recorrentes", formatCents(data.TotalRecurringCents)},
		{"Saldo Líquido", formatCents(data.BalanceCents)},
	}
	for _, t := range totals {
		p.CellFormat(100, 7, t[0], "1", 0, "L", false, 0, "")
		p.CellFormat(40, 7, t[1], "1", 1, "R", false, 0, "")
	}

	var buf bytes.Buffer
	if err := p.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
