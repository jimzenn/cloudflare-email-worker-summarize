const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  USD: "$",
  CNY: "¥",
  EUR: "€",
  GBP: "£",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}
