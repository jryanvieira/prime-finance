package expense

type CategoryHistoryRaw struct {
	Category   string
	Month      string // "YYYY-MM"
	TotalCents int64
}

type MonthTotal struct {
	Month      string `json:"month"`
	TotalCents int64  `json:"total_cents"`
}

type CategoryHistoryItem struct {
	Category string       `json:"category"`
	History  []MonthTotal `json:"history"`
}

type CategoryHistoryResponse struct {
	Months []string              `json:"months"`
	Items  []CategoryHistoryItem `json:"items"`
}
