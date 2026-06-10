import { describe, expect, it } from 'vitest';

import { KONTOMIERZ_SHEET_NAME, parseKontomierzWorksheet } from './kontomierz-import.parser';

const HEADERS = [
  'Data',
  'Kwota',
  'Waluta',
  'Strona',
  'Tytuł',
  'Grupa kategorii',
  'Kategoria',
  'Rodzaj',
  'Bank',
  'Nazwa konta/portfela',
  'Mój numer konta',
  'Numer konta strony',
  'Data księgowania',
  'Kwota w PLN',
  'Saldo po transakcji',
  'Tagi',
  'Komentarz',
  'Podzielona',
  'Podtransakcja',
  'Transakcja gotówkowa',
  'Istotna',
  'Oryginalna data transakcji',
  'Oryginalna kwota transakcji',
  'Oryginalny tytuł transakcji',
];

describe('parseKontomierzWorksheet', () => {
  it('parses expense and income rows', () => {
    const result = parseKontomierzWorksheet({
      name: KONTOMIERZ_SHEET_NAME,
      rows: [
        HEADERS,
        ['31.12.2025', -51.59, 'PLN', null, 'Pasibus', 'Rozrywka', 'Restauracje', null, null, 'Portfel nr 1'],
        ['30.12.2025', 150, 'PLN', null, 'Zwrot', 'Przychód', 'Zapłata za usługę', null, null, 'Portfel nr 1'],
      ],
    });

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      amount: 51.59,
      amountInDefault: 51.59,
      currency: 'PLN',
      direction: 'expense',
      description: 'Pasibus',
    });
    expect(result.rows[1]).toMatchObject({
      amount: 150,
      direction: 'income',
    });
  });

  it('creates short stable fingerprints for duplicate checks', () => {
    const worksheet = {
      name: KONTOMIERZ_SHEET_NAME,
      rows: [
        HEADERS,
        [
          '30.12.2025',
          -85.14,
          'PLN',
          null,
          'Udon z sosem z czarnego pieprzu. Wieprzowina 39.00 zł opakowanie 2.00 zł Pad Thai 39.00 zł',
          'Rozrywka',
          'Restauracje, puby, kluby',
          null,
          null,
          'Portfel nr 1',
        ],
      ],
    };

    const first = parseKontomierzWorksheet(worksheet).rows[0].fingerprint;
    const second = parseKontomierzWorksheet(worksheet).rows[0].fingerprint;

    expect(first).toBe(second);
    expect(first).toMatch(/^kontomierz:v1:[a-z0-9]+$/);
    expect(first.length).toBeLessThan(40);
  });

  it('deduplicates comma-separated tags and appends comments to description', () => {
    const result = parseKontomierzWorksheet({
      name: KONTOMIERZ_SHEET_NAME,
      rows: [
        HEADERS,
        [
          '21.12.2023',
          -119,
          'PLN',
          null,
          'Research słów kluczowych',
          'Usługi biznesowe',
          'Marketing',
          null,
          null,
          'Portfel nr 1',
          null,
          null,
          null,
          -119,
          0,
          'crkd, crkd',
          'Do Amazon KDP',
        ],
      ],
    });

    expect(result.rows[0].tagNames).toEqual(['crkd']);
    expect(result.rows[0].description).toContain('Research słów kluczowych');
    expect(result.rows[0].description).toContain('Komentarz z Kontomierza: Do Amazon KDP');
  });

  it('uses fallback category names when category cells are empty', () => {
    const result = parseKontomierzWorksheet({
      name: KONTOMIERZ_SHEET_NAME,
      rows: [HEADERS, ['30.12.2023', -5317, 'PLN', null, 'Aldi', null, null, null, null, 'Portfel nr 1']],
    });

    expect(result.rows[0].groupName).toBe('Brak kategorii');
    expect(result.rows[0].categoryName).toBe('Brak kategorii');
  });

  it('skips split parent rows and imports split children', () => {
    const result = parseKontomierzWorksheet({
      name: KONTOMIERZ_SHEET_NAME,
      rows: [
        HEADERS,
        [
          '30.12.2023',
          -5317,
          'PLN',
          null,
          'Aldi',
          null,
          null,
          null,
          null,
          'Portfel nr 1',
          null,
          null,
          null,
          -5317,
          0,
          '',
          null,
          'Tak',
          'Nie',
          'Tak',
          'Tak',
          '30.12.2023',
          -5317,
          'Aldi',
        ],
        [
          '30.12.2023',
          -28.99,
          'PLN',
          null,
          'Żołądkowa gorzka 0.5l',
          'Zakupy',
          'Alkohol',
          null,
          null,
          'Portfel nr 1',
          null,
          null,
          null,
          -28.99,
          0,
          '',
          null,
          'Nie',
          'Tak',
          'Tak',
          'Tak',
          '30.12.2023',
          -5317,
          'Aldi',
        ],
      ],
    });

    expect(result.skippedSplitParents).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      title: 'Żołądkowa gorzka 0.5l',
      isSplitChild: true,
      originalAmount: -5317,
      originalTitle: 'Aldi',
    });
  });

  it('reports invalid headers and invalid dates', () => {
    expect(
      parseKontomierzWorksheet({
        name: KONTOMIERZ_SHEET_NAME,
        rows: [['Data', 'Kwota']],
      }).issues[0].message,
    ).toContain('Missing required columns');

    const result = parseKontomierzWorksheet({
      name: KONTOMIERZ_SHEET_NAME,
      rows: [HEADERS, ['2023-12-30', -10, 'PLN', null, 'Aldi', 'Zakupy', 'Spożywcze', null, null, 'Portfel nr 1']],
    });
    expect(result.issues).toEqual([{ rowNumber: 2, message: 'Invalid transaction date.' }]);
  });
});
