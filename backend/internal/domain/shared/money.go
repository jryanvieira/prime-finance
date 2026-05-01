package shared

import "errors"

// SplitTotalIntoInstallments splits total cents into n monthly cents,
// distributing the remainder to the first months.
func SplitTotalIntoInstallments(totalCents int64, n int) ([]int64, error) {
	if n < 2 {
		return nil, errors.New("installments must be >= 2")
	}
	if totalCents <= 0 {
		return nil, errors.New("total must be positive")
	}
	base := totalCents / int64(n)
	rem := totalCents % int64(n)
	out := make([]int64, n)
	for i := 0; i < n; i++ {
		out[i] = base
		if int64(i) < rem {
			out[i]++
		}
	}
	return out, nil
}
