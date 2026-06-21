export function formatCurrency(value) {
  if (value === null || value === undefined) return "₹0";
  const number = Number(value);
  if (isNaN(number)) return "₹0";
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(number);
}
