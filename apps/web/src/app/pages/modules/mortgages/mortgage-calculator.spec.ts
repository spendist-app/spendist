import { calculateMortgageSchedule, MortgageCalculationInput } from './mortgage-calculator';

const base: MortgageCalculationInput = {
  principal: 120_000,
  disbursedOn: '2026-01-01',
  firstInstallmentOn: '2026-02-01',
  termMonths: 12,
  installmentType: 'equal',
  margin: 2,
  wiborTenor: '3M',
  ratePeriods: [{ startsOn: '2026-01-01', endsOn: null, type: 'fixed', fixedRate: 6 }],
  overpayments: [],
  holidays: [],
  wiborRates: [],
  asOf: '2026-08-12',
};

describe('calculateMortgageSchedule', () => {
  it('repays the principal and separates interest from capital', () => {
    const rows = calculateMortgageSchedule(base);
    expect(rows).toHaveLength(12);
    expect(rows[0].interest).toBeGreaterThan(0);
    expect(rows[0].payment).toBe(rows[0].principal + rows[0].interest);
    expect(rows.at(-1)?.remainingPrincipal).toBe(0);
  });

  it('uses confirmed and projected WIBOR without inventing future rates', () => {
    const rows = calculateMortgageSchedule({
      ...base,
      ratePeriods: [{ startsOn: '2026-01-01', endsOn: null, type: 'variable', fixedRate: null }],
      wiborRates: [{ rateDate: '2026-01-01', tenor: '3M', value: 4.5 }],
      asOf: '2026-03-01',
    });
    expect(rows[0]).toMatchObject({ annualRate: 6.5, rateStatus: 'confirmed' });
    expect(rows[3]).toMatchObject({ annualRate: 6.5, rateStatus: 'projected' });
  });

  it('extends the schedule for a full payment holiday', () => {
    const rows = calculateMortgageSchedule({ ...base, holidays: [{ startsOn: '2026-04-01', endsOn: '2026-04-30' }] });
    expect(rows).toHaveLength(13);
    expect(rows[2]).toMatchObject({ entryType: 'holiday', payment: 0, interest: 0 });
  });

  it('records an overpayment and shortens the term', () => {
    const rows = calculateMortgageSchedule({
      ...base,
      overpayments: [{ occursOn: '2026-04-01', amount: 50_000, strategy: 'shorten_term' }],
    });
    expect(rows.some((row) => row.entryType === 'overpayment')).toBe(true);
    expect(rows.filter((row) => row.entryType === 'installment').length).toBeLessThan(12);
    expect(rows.at(-1)?.remainingPrincipal).toBe(0);
  });

  it('calculates decreasing principal installments', () => {
    const rows = calculateMortgageSchedule({ ...base, installmentType: 'decreasing' });
    expect(rows[0].payment).toBeGreaterThan(rows[10].payment);
    expect(rows[0].principal).toBe(10_000);
  });
});
