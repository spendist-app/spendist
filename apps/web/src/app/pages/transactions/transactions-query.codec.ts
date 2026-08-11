import type {
  TransactionPresetId,
  TransactionSortId,
  TransactionsFilters,
} from './transactions.store';

export type TransactionSidebarPanel = 'categories' | 'tags';

export interface TransactionUrlState {
  readonly filters: TransactionsFilters;
  readonly panel: TransactionSidebarPanel;
  readonly hideEmpty: boolean;
  readonly advanced: boolean;
}

export const TRANSACTION_QUERY_KEYS = [
  'category',
  'tag',
  'place',
  'q',
  'min',
  'max',
  'from',
  'to',
  'period',
  'sort',
  'panel',
  'hideEmpty',
  'advanced',
] as const;

type QueryParams = Readonly<Record<string, unknown>>;

export function defaultTransactionUrlState(now = new Date()): TransactionUrlState {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    filters: {
      selectedCategoryIds: [],
      selectedTagIds: [],
      selectedPlaceId: null,
      minimumAmount: null,
      maximumAmount: null,
      searchTerm: '',
      from: new Date(Date.UTC(year, month, 1)),
      to: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
      preset: 'currentMonth',
      sort: 'dateDesc',
    },
    panel: 'categories',
    hideEmpty: false,
    advanced: false,
  };
}

export function parseTransactionQuery(
  params: QueryParams,
  now = new Date()
): TransactionUrlState {
  const defaults = defaultTransactionUrlState(now);
  const period = stringValue(params['period']);
  const parsedFrom = parseDate(stringValue(params['from']));
  const parsedTo = parseDate(stringValue(params['to']));
  let from = defaults.filters.from;
  let to = defaults.filters.to;
  let preset: TransactionPresetId = 'currentMonth';

  if (period === 'all') {
    from = null;
    to = null;
    preset = 'allTime';
  } else if (parsedFrom || parsedTo) {
    const candidateFrom = parsedFrom;
    const candidateTo = parsedTo ? endOfDay(parsedTo) : null;
    if (!candidateFrom || !candidateTo || candidateFrom <= candidateTo) {
      from = candidateFrom;
      to = candidateTo;
      preset = inferPreset(from, to, now);
    }
  }

  const minimumAmount = parseAmount(stringValue(params['min']));
  const maximumCandidate = parseAmount(stringValue(params['max']));
  const maximumAmount =
    minimumAmount !== null && maximumCandidate !== null && maximumCandidate < minimumAmount
      ? null
      : maximumCandidate;
  const sortCandidate = stringValue(params['sort']);
  const sort: TransactionSortId = SORTS.includes(sortCandidate as TransactionSortId)
    ? (sortCandidate as TransactionSortId)
    : 'dateDesc';

  return {
    filters: {
      selectedCategoryIds: parseList(params['category']),
      selectedTagIds: parseList(params['tag']),
      selectedPlaceId: cleanId(stringValue(params['place'])),
      minimumAmount,
      maximumAmount,
      searchTerm: stringValue(params['q']).trim(),
      from,
      to,
      preset,
      sort,
    },
    panel: stringValue(params['panel']) === 'tags' ? 'tags' : 'categories',
    hideEmpty: stringValue(params['hideEmpty']) === '1',
    advanced: stringValue(params['advanced']) === '1',
  };
}

export function serializeTransactionQuery(
  state: TransactionUrlState
): Record<string, string | readonly string[]> {
  const result: Record<string, string | readonly string[]> = {};
  if (state.filters.sort !== 'dateDesc') result['sort'] = state.filters.sort;
  if (state.panel !== 'categories') result['panel'] = state.panel;
  if (state.hideEmpty) result['hideEmpty'] = '1';
  if (state.advanced) result['advanced'] = '1';
  const categories = canonicalList(state.filters.selectedCategoryIds);
  const tags = canonicalList(state.filters.selectedTagIds);
  if (categories.length) result['category'] = categories;
  if (tags.length) result['tag'] = tags;
  add(result, 'place', state.filters.selectedPlaceId);
  add(result, 'q', state.filters.searchTerm.trim());
  add(result, 'min', formatAmount(state.filters.minimumAmount));
  add(result, 'max', formatAmount(state.filters.maximumAmount));
  if (state.filters.from) result['from'] = formatDate(state.filters.from);
  if (state.filters.to) result['to'] = formatDate(state.filters.to);
  if (!state.filters.from && !state.filters.to) {
    result['period'] = 'all';
  }
  return result;
}

const SORTS: readonly TransactionSortId[] = [
  'dateDesc', 'dateAsc', 'amountDesc', 'amountAsc', 'descriptionAsc', 'descriptionDesc',
];

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : Array.isArray(value) && typeof value[0] === 'string' ? value[0] : '';
}

function parseList(value: unknown): readonly string[] {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(new Set(values.flatMap((item) => stringValue(item).split(','))
    .map((item) => cleanId(item)).filter((item): item is string => !!item))).sort();
}

function cleanId(value: string): string | null {
  const token = value.trim();
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token)
    ? token
    : null;
}

function canonicalList(values: readonly string[]): readonly string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort();
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

function formatDate(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function parseAmount(value: string): number | null {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function formatAmount(value: number | null): string | null {
  return value === null || !Number.isFinite(value) || value < 0 ? null : String(value);
}

function sameDate(left: Date | null, right: Date | null): boolean {
  return left?.getTime() === right?.getTime();
}

function inferPreset(
  from: Date | null,
  to: Date | null,
  now: Date
): TransactionPresetId {
  if (!from || !to) return 'custom';
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const ranges: readonly [TransactionPresetId, Date, Date][] = [
    [
      'currentMonth',
      new Date(Date.UTC(year, month, 1)),
      new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
    ],
    [
      'previousMonth',
      new Date(Date.UTC(year, month - 1, 1)),
      new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    ],
    [
      'thisYear',
      new Date(Date.UTC(year, 0, 1)),
      new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
    ],
    [
      'lastYear',
      new Date(Date.UTC(year - 1, 0, 1)),
      new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999)),
    ],
  ];
  return ranges.find(([, start, end]) => sameDate(from, start) && sameDate(to, end))?.[0]
    ?? 'custom';
}

function endOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}

function add(target: Record<string, string | readonly string[]>, key: string, value: string | null): void {
  if (value) target[key] = value;
}
