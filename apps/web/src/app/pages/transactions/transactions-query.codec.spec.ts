import { describe, expect, it } from 'vitest';
import {
  defaultTransactionUrlState,
  parseTransactionQuery,
  serializeTransactionQuery,
} from './transactions-query.codec';

const now = new Date('2026-08-11T12:00:00Z');
const categoryId = '11111111-1111-4111-8111-111111111111';
const parentCategoryId = '22222222-2222-4222-8222-222222222222';
const tagId = '33333333-3333-4333-8333-333333333333';
const secondTagId = '44444444-4444-4444-8444-444444444444';
const placeId = '55555555-5555-4555-8555-555555555555';

describe('transaction query codec', () => {
  it('canonicalizes a bare query to the exact current month', () => {
    const parsed = parseTransactionQuery({}, now);
    expect(parsed.filters.to?.toISOString()).toBe('2026-08-31T23:59:59.999Z');
    expect(serializeTransactionQuery(parsed)).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });

  it('round-trips data and panel state', () => {
    const parsed = parseTransactionQuery({
      category: `${parentCategoryId},${categoryId},${parentCategoryId}`,
      tag: [`${secondTagId},${tagId}`], place: placeId, q: ' milk ',
      min: '10.5', max: '50', from: '2026-07-01', to: '2026-07-31',
      sort: 'amountDesc', panel: 'tags', hideEmpty: '1', advanced: '1',
    }, now);
    expect(serializeTransactionQuery(parsed)).toEqual({
      category: [categoryId, parentCategoryId], tag: [tagId, secondTagId], place: placeId, q: 'milk', min: '10.5', max: '50',
      from: '2026-07-01', to: '2026-07-31', sort: 'amountDesc', panel: 'tags', hideEmpty: '1', advanced: '1',
    });
  });

  it('canonicalizes invalid owned parameters and supports all time', () => {
    const invalid = parseTransactionQuery({ category: 'not-a-uuid', tag: 'also-invalid', place: 'shop', from: '2026-02-30', to: 'wrong', min: '-1', max: 'NaN', sort: 'random', panel: 'x', hideEmpty: 'yes' }, now);
    expect(serializeTransactionQuery(invalid)).toEqual(serializeTransactionQuery(defaultTransactionUrlState(now)));
    expect(serializeTransactionQuery(parseTransactionQuery({ period: 'all' }, now))).toMatchObject({ period: 'all' });
  });

  it('preserves one-sided ranges and restores named exact presets', () => {
    expect(serializeTransactionQuery(parseTransactionQuery({ from: '2026-07-01' }, now))).toMatchObject({
      from: '2026-07-01',
    });
    expect(serializeTransactionQuery(parseTransactionQuery({ to: '2026-07-31' }, now))).toMatchObject({
      to: '2026-07-31',
    });
    expect(parseTransactionQuery({ from: '2026-07-01', to: '2026-07-31' }, now).filters.preset).toBe('previousMonth');
    expect(parseTransactionQuery({ from: '2026-01-01', to: '2026-12-31' }, now).filters.preset).toBe('thisYear');
  });
});
