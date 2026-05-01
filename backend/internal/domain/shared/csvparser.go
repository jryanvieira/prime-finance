package shared

import (
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"math"
	"regexp"
	"strings"
)

// CSVExpenseRow represents a single parsed row from a Nubank CSV export.
type CSVExpenseRow struct {
	Date                string
	Description         string
	AmountCents         int64
	InstallmentIndex    int  // 0 if not an installment
	InstallmentsCount   int  // 0 if not an installment
	InstallmentGroupKey string // shared key for installments of the same purchase
	Ignored             bool
	IgnoreReason        string
}

// installment patterns in Nubank CSVs:
// "KaBuM! - NuPay - Parcela 1/10"
// "Farmacia Sao Joao - Parcela 1/5"
// "Dashskins Servicos Digitais - Ltda - 5/6"
// "Ec *2produtos - Parcela 2/5"
var installmentPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)^(.+?)\s*-\s*Parcela\s+(\d+)/(\d+)$`),
	regexp.MustCompile(`(?i)^(.+?)\s*-\s*(\d+)/(\d+)$`),
	regexp.MustCompile(`(?i)^(.+?)\s+Parcela\s+(\d+)\s+de\s+(\d+)$`),
}

// ignoredDescriptions are rows that should be filtered out.
var ignoredKeywords = []string{
	"limite convertido",
	"pagamento recebido",
}

// ParseNubankCSV parses a Nubank credit card CSV export.
// Expected format: date,title,amount (with header row).
func ParseNubankCSV(reader io.Reader) ([]CSVExpenseRow, error) {
	r := csv.NewReader(reader)
	r.TrimLeadingSpace = true

	header, err := r.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV header: %w", err)
	}

	if len(header) < 3 {
		return nil, errors.New("CSV must have at least 3 columns (date, title, amount)")
	}

	// Validate header
	h0 := strings.TrimSpace(strings.ToLower(header[0]))
	h1 := strings.TrimSpace(strings.ToLower(header[1]))
	h2 := strings.TrimSpace(strings.ToLower(header[2]))
	if h0 != "date" || h1 != "title" || h2 != "amount" {
		return nil, fmt.Errorf("unexpected CSV header: expected [date, title, amount], got [%s, %s, %s]", header[0], header[1], header[2])
	}

	var rows []CSVExpenseRow
	lineNum := 1
	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading CSV line %d: %w", lineNum+1, err)
		}
		lineNum++

		if len(record) < 3 {
			continue
		}

		dateStr := strings.TrimSpace(record[0])
		title := strings.TrimSpace(record[1])
		amountStr := strings.TrimSpace(record[2])

		if dateStr == "" || title == "" || amountStr == "" {
			continue
		}

		// Validate date format
		if _, err := ParseDate(dateStr); err != nil {
			return nil, fmt.Errorf("invalid date on line %d: %q", lineNum, dateStr)
		}

		// Parse amount (float string like "39.50") to cents
		cents, err := parseAmountToCents(amountStr)
		if err != nil {
			return nil, fmt.Errorf("invalid amount on line %d: %q: %w", lineNum, amountStr, err)
		}

		row := CSVExpenseRow{
			Date:        dateStr,
			Description: title,
			AmountCents: cents,
		}

		// Check if should be ignored
		lowerTitle := strings.ToLower(title)
		for _, kw := range ignoredKeywords {
			if strings.Contains(lowerTitle, kw) {
				row.Ignored = true
				row.IgnoreReason = fmt.Sprintf("matches ignored keyword: %s", kw)
				break
			}
		}

		// Parse installment info
		if !row.Ignored {
			for _, pat := range installmentPatterns {
				matches := pat.FindStringSubmatch(title)
				if matches != nil {
					cleanDesc := strings.TrimSpace(matches[1])
					idx := 0
					count := 0
					if _, err := fmt.Sscanf(matches[2], "%d", &idx); err == nil {
						if _, err := fmt.Sscanf(matches[3], "%d", &count); err == nil {
							row.InstallmentIndex = idx
							row.InstallmentsCount = count
							row.Description = cleanDesc
							row.InstallmentGroupKey = cleanDesc
						}
					}
					break
				}
			}
		}

		rows = append(rows, row)
	}

	return rows, nil
}

// FilterIgnoredRows returns only the rows that are not marked as ignored.
func FilterIgnoredRows(rows []CSVExpenseRow) []CSVExpenseRow {
	var out []CSVExpenseRow
	for _, r := range rows {
		if !r.Ignored {
			out = append(out, r)
		}
	}
	return out
}

func parseAmountToCents(s string) (int64, error) {
	s = strings.ReplaceAll(s, ",", ".")
	var f float64
	if _, err := fmt.Sscanf(s, "%f", &f); err != nil {
		return 0, err
	}
	if f < 0 {
		f = -f
	}
	return int64(math.Round(f * 100)), nil
}
