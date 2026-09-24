/** Dollar input string ("35" or "35.50") -> integer cents. Returns 0 for invalid input. */
export function dollarsToCents(value: string): number {
  const dollars = Number.parseFloat(value)
  if (Number.isNaN(dollars) || dollars < 0) return 0
  return Math.round(dollars * 100)
}

export function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
