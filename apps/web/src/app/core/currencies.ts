export interface CurrencyOption {
  readonly id: number;
  readonly symbol: string;
}

export const SUPPORTED_CURRENCIES: readonly CurrencyOption[] = [
  { id: 1, symbol: 'PLN' },
  { id: 2, symbol: 'USD' },
  { id: 3, symbol: 'EUR' },
  { id: 4, symbol: 'GBP' },
  { id: 5, symbol: 'CHF' },
  { id: 6, symbol: 'JPY' },
  { id: 7, symbol: 'CNY' },
  { id: 8, symbol: 'AUD' },
  { id: 9, symbol: 'CAD' },
  { id: 10, symbol: 'SEK' },
  { id: 11, symbol: 'NOK' },
  { id: 12, symbol: 'DKK' },
  { id: 13, symbol: 'CZK' },
  { id: 14, symbol: 'INR' },
  { id: 15, symbol: 'NZD' },
] as const;

const FALLBACK_CURRENCY_ID = 2;

const REGION_CURRENCY: Readonly<Record<string, string>> = {
  AU: 'AUD',
  CA: 'CAD',
  CH: 'CHF',
  CN: 'CNY',
  CZ: 'CZK',
  DK: 'DKK',
  GB: 'GBP',
  IN: 'INR',
  JP: 'JPY',
  NO: 'NOK',
  NZ: 'NZD',
  PL: 'PLN',
  SE: 'SEK',
  US: 'USD',
};

const LANGUAGE_CURRENCY: Readonly<Record<string, string>> = {
  pl: 'PLN',
  en: 'USD',
};

export function resolveCurrencyIdBySymbol(symbol: string): number | null {
  const normalized = symbol.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.find((currency) => currency.symbol === normalized)?.id ?? null;
}

export function detectPreferredCurrencyId(language: string, locales: readonly string[] = []): number {
  for (const locale of locales) {
    const region = extractRegion(locale);
    const currency = region ? REGION_CURRENCY[region] : null;
    if (currency) {
      return resolveCurrencyIdBySymbol(currency) ?? FALLBACK_CURRENCY_ID;
    }
  }

  const languageCode = language.trim().toLowerCase().split('-')[0] ?? '';
  const currency = LANGUAGE_CURRENCY[languageCode];
  return currency ? resolveCurrencyIdBySymbol(currency) ?? FALLBACK_CURRENCY_ID : FALLBACK_CURRENCY_ID;
}

function extractRegion(locale: string): string | null {
  try {
    const region = new Intl.Locale(locale).region;
    return region ? region.toUpperCase() : null;
  } catch {
    const parts = locale.split(/[-_]/);
    const region = parts.find((part) => /^[a-z]{2}$/i.test(part));
    return region ? region.toUpperCase() : null;
  }
}
