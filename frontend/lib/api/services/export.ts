const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('prime-finance-token')
}

export const exportService = {
  async downloadCSV(from: string, to: string): Promise<void> {
    const token = getToken()
    const headers: HeadersInit = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${API_URL}/v1/export/csv?from=${from}&to=${to}`, { headers })

    if (!res.ok) {
      throw new Error('Falha ao exportar CSV')
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gastos-${from}-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}
