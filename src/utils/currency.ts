export function currencySymbol(currency: string) {
  switch (currency) {
    case "USD": return "$";
    case "CNY": return "¥";
    case "EUR": return "€";
    case "GBP": return "£";
    default: return currency;
  }
}
