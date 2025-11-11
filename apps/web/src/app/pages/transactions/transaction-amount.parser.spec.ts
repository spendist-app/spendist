import { describe, expect, it } from 'vitest';

import { parseAmountInput } from './transaction-amount.parser';

describe('parseAmountInput', () => {
  it('parses simple decimal strings with dot or comma separators', () => {
    expect(parseAmountInput('12.34')).toBe(12.34);
    expect(parseAmountInput('12,34')).toBe(12.34);
  });

  it('evaluates expressions that mix separators and operators', () => {
    expect(parseAmountInput('2.3 + 2,5 + 12,41')).toBe(17.21);
    expect(parseAmountInput('2x3 + 1')).toBe(7);
    expect(parseAmountInput('10 ÷ 4 + 0,5')).toBe(3);
  });

  it('honors operator precedence and parentheses', () => {
    expect(parseAmountInput('10 - 2 * 3')).toBe(4);
    expect(parseAmountInput('(10 - 2) * 3')).toBe(24);
  });

  it('rounds numeric inputs to two decimals', () => {
    expect(parseAmountInput(12.345)).toBe(12.35);
  });

  it('returns null for invalid or non-positive results', () => {
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput('2..3')).toBeNull();
    expect(parseAmountInput('1 - 1')).toBeNull();
    expect(parseAmountInput('1 / 0')).toBeNull();
  });
});
