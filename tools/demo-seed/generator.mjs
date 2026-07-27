import { createHash } from 'node:crypto';
import { DATASET_VERSION, DATE_RANGE, FIXTURES } from './fixtures.mjs';

const INCOME_KEYS = new Set(['salary', 'bonus', 'freelance', 'refunds']);
const EXPENSE_KEYS = [
  'supermarket',
  'bakery',
  'home-supplies',
  'electricity',
  'internet',
  'mobile',
  'public-transit',
  'fuel',
  'car-service',
  'rides',
  'pharmacy',
  'healthcare',
  'fitness',
  'clothing',
  'personal-care',
  'dining',
  'entertainment',
  'subscriptions',
  'education',
  'travel',
  'gifts',
];
const AMOUNT_RANGES = {
  supermarket: [25, 145],
  bakery: [5, 28],
  'home-supplies': [15, 180],
  electricity: [55, 150],
  internet: [45, 85],
  mobile: [30, 75],
  'public-transit': [3, 45],
  fuel: [35, 95],
  'car-service': [80, 420],
  rides: [9, 45],
  pharmacy: [8, 75],
  healthcare: [35, 220],
  fitness: [18, 75],
  clothing: [25, 180],
  'personal-care': [15, 95],
  dining: [12, 85],
  entertainment: [10, 70],
  subscriptions: [8, 35],
  education: [12, 130],
  travel: [70, 480],
  gifts: [20, 160],
};

export function uuidFor(locale, type, key) {
  const hex = createHash('sha256')
    .update(`spendist:${DATASET_VERSION}:${locale}:${type}:${key}`)
    .digest('hex')
    .slice(0, 32)
    .split('');
  hex[12] = '4';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(
    12,
    16
  )}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function hashNumber(input) {
  return createHash('sha256').update(input).digest().readUInt32BE(0);
}

function rng(seed) {
  let state = hashNumber(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function dateAtNoon(date) {
  return `${date}T12:00:00.000Z`;
}

function addDays(date, days) {
  const result = new Date(`${date}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function daysBetween(start, end) {
  return Math.floor(
    (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) /
      86400000
  );
}

function recurringDefinitions(fixture) {
  const currency = fixture.defaultCurrency;
  const localized = fixture.locale === 'pl';
  return [
    ['salary', 'salary', 1, localized ? 8500 : 6200, 'income', 'fixed', false],
    ['rent', 'rent', 3, localized ? 2650 : 1850, 'expense', 'fixed', false],
    ['internet', 'internet', 8, localized ? 79 : 65, 'expense', 'fixed', false],
    [
      'streaming',
      'subscriptions',
      12,
      localized ? 49 : 19,
      'expense',
      'fixed',
      false,
    ],
    ['fitness', 'fitness', 15, localized ? 159 : 59, 'expense', 'fixed', true],
    [
      'electricity',
      'electricity',
      22,
      localized ? 128 : 104,
      'expense',
      'variable',
      false,
    ],
  ].map(([key, categoryKey, day, amount, direction, amountMode, isPaused]) => ({
    key,
    name: fixture.recurringNames[key],
    categoryKey,
    day,
    amount,
    direction,
    amountMode,
    isPaused,
    currency,
  }));
}

function transactionDescription(fixture, categoryKey, random) {
  const options =
    fixture.descriptions[categoryKey] ?? fixture.descriptions.default;
  return options[Math.floor(random() * options.length)];
}

function placeKeyForCategory(categoryKey) {
  if (['supermarket', 'home-supplies'].includes(categoryKey))
    return 'green-market';
  if (categoryKey === 'bakery') return 'bakery';
  if (categoryKey === 'dining') return 'coffee';
  if (['pharmacy', 'healthcare'].includes(categoryKey)) return 'pharmacy';
  if (['entertainment', 'subscriptions'].includes(categoryKey)) return 'cinema';
  if (['public-transit', 'rides'].includes(categoryKey)) return 'transit';
  if (categoryKey === 'fitness') return 'fitness';
  if (categoryKey === 'travel') return 'station';
  return null;
}

function tagsFor(categoryKey, index) {
  const result = [];
  if (index % 3 === 0) result.push('everyday');
  if (['healthcare', 'pharmacy', 'fitness'].includes(categoryKey))
    result.push('health');
  if (['education', 'freelance'].includes(categoryKey)) result.push('work');
  if (['travel'].includes(categoryKey)) result.push('vacation');
  if (['subscriptions', 'internet', 'mobile'].includes(categoryKey))
    result.push('online');
  if (index % 11 === 0) result.push('weekend');
  return [...new Set(result)].slice(0, 2);
}

export function generateDemoDataset(locale, ownerId) {
  const fixture = FIXTURES[locale];
  if (!fixture) throw new Error(`Unsupported demo locale: ${locale}`);
  if (!ownerId) throw new Error('ownerId is required');

  const generatedAt = `${DATE_RANGE.end}T12:00:00.000Z`;
  const groups = fixture.groups.map((group) => ({
    id: uuidFor(locale, 'group', group.key),
    owner_id: ownerId,
    name: group.name,
    color: group.color,
    icon: group.icon,
  }));
  const groupIds = Object.fromEntries(
    fixture.groups.map((item) => [item.key, uuidFor(locale, 'group', item.key)])
  );
  const categoryIds = Object.fromEntries(
    fixture.categories.map(([key]) => [key, uuidFor(locale, 'category', key)])
  );
  const categories = fixture.categories.map(
    ([key, name, groupKey, parentKey, icon]) => ({
      id: categoryIds[key],
      owner_id: ownerId,
      group_id: groupIds[groupKey],
      parent_id: parentKey ? categoryIds[parentKey] : null,
      name,
      color: fixture.groups.find((group) => group.key === groupKey).color,
      icon,
    })
  );
  const tagIds = Object.fromEntries(
    fixture.tags.map(([key]) => [key, uuidFor(locale, 'tag', key)])
  );
  const tags = fixture.tags.map(([key, name, color, icon]) => ({
    id: tagIds[key],
    owner_id: ownerId,
    name,
    color,
    icon,
  }));
  const placeIds = Object.fromEntries(
    fixture.places.map(([key]) => [key, uuidFor(locale, 'place', key)])
  );
  const places = fixture.places.map(([key, name, street, postalCode]) => ({
    id: placeIds[key],
    owner_id: ownerId,
    name,
    street,
    city: fixture.city,
    postal_code: postalCode,
    country: locale === 'pl' ? 'Polska' : 'United States',
    note:
      locale === 'pl'
        ? 'Fikcyjne miejsce demonstracyjne'
        : 'Fictional demo location',
  }));
  const walletIds = Object.fromEntries(
    fixture.wallets.map((wallet) => [
      wallet.key,
      uuidFor(locale, 'wallet', wallet.key),
    ])
  );
  const wallets = fixture.wallets.map((wallet) => ({
    id: walletIds[wallet.key],
    owner_id: ownerId,
    name: wallet.name,
    is_default: wallet.isDefault,
    currency_id: wallet.currencyId,
  }));

  const recurringDefs = recurringDefinitions(fixture);
  const recurringIds = Object.fromEntries(
    recurringDefs.map((item) => [
      item.key,
      uuidFor(locale, 'recurring', item.key),
    ])
  );
  const recurringTransactions = recurringDefs.map((item) => ({
    id: recurringIds[item.key],
    owner_id: ownerId,
    category_id: categoryIds[item.categoryKey],
    wallet_id: walletIds.main,
    name: item.name,
    start_date: '2026-01-01',
    end_date: null,
    schedule: `0 8 ${item.day} * *`,
    amount: item.amount,
    amount_mode: item.amountMode,
    currency: item.currency,
    exchange_rate: 1,
    direction: item.direction,
    is_paused: item.isPaused,
    paused_at: item.isPaused ? '2026-05-01T12:00:00.000Z' : null,
    last_run_at: item.isPaused
      ? '2026-04-15T08:00:00.000Z'
      : `2026-07-${String(item.day).padStart(2, '0')}T08:00:00.000Z`,
  }));

  const transactions = [];
  const transactionTags = [];
  const occurrences = [];
  let sequence = 0;
  const addTransaction = ({
    date,
    categoryKey,
    amount,
    direction = 'expense',
    walletKey = 'main',
    placeKey = null,
    recurringKey = null,
    automatic = false,
    description = null,
  }) => {
    const id = uuidFor(
      locale,
      'transaction',
      String(sequence).padStart(4, '0')
    );
    const occurredAt = dateAtNoon(date);
    const wallet = fixture.wallets.find((item) => item.key === walletKey);
    transactions.push({
      id,
      owner_id: ownerId,
      category_id: categoryIds[categoryKey],
      wallet_id: walletIds[walletKey],
      place_id: placeKey ? placeIds[placeKey] : null,
      occurred_at: occurredAt,
      description,
      amount: roundMoney(amount),
      amount_in_default: roundMoney(amount),
      currency: wallet.currency,
      exchange_rate: 1,
      is_automatic: automatic,
      direction,
      recurring_transaction_id: recurringKey
        ? recurringIds[recurringKey]
        : null,
      recurring_scheduled_for: recurringKey ? occurredAt : null,
      import_source: 'demo_seed',
      import_fingerprint: `${DATASET_VERSION}:${locale}:${sequence}`,
      import_metadata: {
        demo_seed_id: 'spendist-screenshots',
        demo_seed_version: DATASET_VERSION,
      },
      imported_at: generatedAt,
    });
    for (const tagKey of tagsFor(categoryKey, sequence)) {
      transactionTags.push({
        owner_id: ownerId,
        transaction_id: id,
        tag_id: tagIds[tagKey],
      });
    }
    sequence += 1;
    return { id, occurredAt };
  };

  for (let month = 1; month <= 7; month += 1) {
    for (const recurring of recurringDefs) {
      if (recurring.key === 'fitness' && month > 4) continue;
      if (recurring.key === 'electricity' && month === 7) continue;
      const date = `2026-${String(month).padStart(2, '0')}-${String(
        recurring.day
      ).padStart(2, '0')}`;
      if (date > DATE_RANGE.end) continue;
      const variableFactor =
        recurring.amountMode === 'variable' ? 0.82 + month * 0.035 : 1;
      const created = addTransaction({
        date,
        categoryKey: recurring.categoryKey,
        amount: recurring.amount * variableFactor,
        direction: recurring.direction,
        recurringKey: recurring.key,
        automatic: true,
        description: recurring.name,
      });
      if (recurring.amountMode === 'variable') {
        occurrences.push({
          id: uuidFor(locale, 'occurrence', `${recurring.key}:${month}`),
          owner_id: ownerId,
          recurring_transaction_id: recurringIds[recurring.key],
          scheduled_for: created.occurredAt,
          amount: roundMoney(recurring.amount * variableFactor),
          amount_in_default: roundMoney(recurring.amount * variableFactor),
          currency: recurring.currency,
          exchange_rate: 1,
          transaction_id: created.id,
        });
      }
    }
  }
  occurrences.push({
    id: uuidFor(locale, 'occurrence', 'electricity:7'),
    owner_id: ownerId,
    recurring_transaction_id: recurringIds.electricity,
    scheduled_for: '2026-07-29T12:00:00.000Z',
    amount: null,
    amount_in_default: null,
    currency: fixture.defaultCurrency,
    exchange_rate: 1,
    transaction_id: null,
  });

  const random = rng(`${DATASET_VERSION}:${locale}`);
  const totalDays = daysBetween(DATE_RANGE.start, DATE_RANGE.end);
  while (transactions.length < 300) {
    const index = transactions.length;
    const categoryKey =
      EXPENSE_KEYS[
        (index + Math.floor(random() * EXPENSE_KEYS.length)) %
          EXPENSE_KEYS.length
      ];
    const [min, max] = AMOUNT_RANGES[categoryKey];
    const date = addDays(
      DATE_RANGE.start,
      Math.floor(random() * (totalDays + 1))
    );
    const walletRoll = random();
    const walletKey =
      walletRoll < 0.04 ? 'travel' : walletRoll < 0.16 ? 'cash' : 'main';
    const placeKey = random() < 0.68 ? placeKeyForCategory(categoryKey) : null;
    addTransaction({
      date,
      categoryKey,
      amount: min + random() * (max - min),
      walletKey,
      placeKey,
      description: transactionDescription(fixture, categoryKey, random),
    });
  }

  const extraIncome = [
    ['2026-02-18', 'refunds', fixture.locale === 'pl' ? 189 : 95],
    ['2026-04-20', 'freelance', fixture.locale === 'pl' ? 1450 : 950],
    ['2026-06-15', 'bonus', fixture.locale === 'pl' ? 1200 : 800],
  ];
  for (let index = 0; index < extraIncome.length; index += 1) {
    const [date, categoryKey, amount] = extraIncome[index];
    const replacement = transactions.length - 1 - index;
    const oldId = transactions[replacement].id;
    transactions.splice(replacement, 1);
    for (
      let tagIndex = transactionTags.length - 1;
      tagIndex >= 0;
      tagIndex -= 1
    ) {
      if (transactionTags[tagIndex].transaction_id === oldId)
        transactionTags.splice(tagIndex, 1);
    }
    sequence = replacement;
    addTransaction({
      date,
      categoryKey,
      amount,
      direction: 'income',
      description: fixture.categories.find(([key]) => key === categoryKey)[1],
    });
  }
  transactions.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  const recurringTransactionTags = [
    ['salary', 'work'],
    ['rent', 'essential'],
    ['internet', 'online'],
    ['streaming', 'online'],
    ['fitness', 'health'],
    ['electricity', 'essential'],
  ].map(([recurringKey, tagKey]) => ({
    owner_id: ownerId,
    recurring_transaction_id: recurringIds[recurringKey],
    tag_id: tagIds[tagKey],
  }));
  const notifications = [
    ['salary', '2026-07-01T12:00:00.000Z', '2026-07-02T09:00:00.000Z'],
    ['rent', '2026-07-03T12:00:00.000Z', null],
    ['internet', '2026-07-08T12:00:00.000Z', '2026-07-09T09:00:00.000Z'],
    ['streaming', '2026-07-12T12:00:00.000Z', null],
  ].map(([recurringKey, createdAt, readAt], index) => ({
    id: uuidFor(locale, 'notification', String(index)),
    owner_id: ownerId,
    type: 'recurring_transaction_created',
    created_at: createdAt,
    read_at: readAt,
    payload: {
      recurring_transaction_id: recurringIds[recurringKey],
      description: fixture.recurringNames[recurringKey],
      amount: recurringDefs.find((item) => item.key === recurringKey).amount,
      currency: fixture.defaultCurrency,
      occurred_at: createdAt,
    },
  }));

  return {
    locale,
    profile: {
      id: ownerId,
      username: fixture.username,
      full_name: fixture.fullName,
      language: fixture.locale,
      timezone: fixture.timezone,
      is_admin: false,
      avatar_url: null,
    },
    wallets,
    groups,
    categories,
    tags,
    places,
    recurringTransactions,
    recurringTransactionTags,
    transactions,
    transactionTags,
    occurrences,
    notifications,
  };
}

export function summarizeDataset(dataset) {
  const incomes = dataset.transactions.filter(
    (item) => item.direction === 'income'
  );
  const expenses = dataset.transactions.filter(
    (item) => item.direction === 'expense'
  );
  const categoryCount = new Set(
    dataset.transactions.map((item) => item.category_id)
  ).size;
  const checksum = createHash('sha256')
    .update(JSON.stringify(dataset))
    .digest('hex')
    .slice(0, 16);
  return {
    locale: dataset.locale,
    transactions: dataset.transactions.length,
    incomeTransactions: incomes.length,
    expenseTransactions: expenses.length,
    categoriesUsed: categoryCount,
    wallets: dataset.wallets.length,
    categoryGroups: dataset.groups.length,
    categories: dataset.categories.length,
    tags: dataset.tags.length,
    places: dataset.places.length,
    recurringTransactions: dataset.recurringTransactions.length,
    recurringOccurrences: dataset.occurrences.length,
    notifications: dataset.notifications.length,
    firstTransaction: dataset.transactions.at(0)?.occurred_at.slice(0, 10),
    lastTransaction: dataset.transactions.at(-1)?.occurred_at.slice(0, 10),
    checksum,
  };
}

export function validateDataset(dataset) {
  const errors = [];
  if (dataset.transactions.length !== 300)
    errors.push('Expected exactly 300 transactions.');
  const ids = new Set(dataset.transactions.map((item) => item.id));
  if (ids.size !== dataset.transactions.length)
    errors.push('Transaction IDs must be unique.');
  if (dataset.transactions.some((item) => item.amount < 0))
    errors.push('Transaction amounts must be non-negative.');
  if (
    dataset.transactions.some((item) => {
      const date = item.occurred_at.slice(0, 10);
      return date < DATE_RANGE.start || date > DATE_RANGE.end;
    })
  )
    errors.push('Transactions must stay inside the configured date range.');
  const categoryIds = new Set(dataset.categories.map((item) => item.id));
  const walletIds = new Set(dataset.wallets.map((item) => item.id));
  const placeIds = new Set(dataset.places.map((item) => item.id));
  if (dataset.transactions.some((item) => !categoryIds.has(item.category_id)))
    errors.push('Unknown transaction category.');
  if (dataset.transactions.some((item) => !walletIds.has(item.wallet_id)))
    errors.push('Unknown transaction wallet.');
  if (
    dataset.transactions.some(
      (item) => item.place_id && !placeIds.has(item.place_id)
    )
  )
    errors.push('Unknown transaction place.');
  if (
    dataset.categories.some(
      (item) => item.parent_id && !categoryIds.has(item.parent_id)
    )
  )
    errors.push('Unknown parent category.');
  if (
    dataset.transactions.some(
      (item) => !['PLN', 'USD', 'EUR'].includes(item.currency)
    )
  )
    errors.push('Unsupported currency.');
  if (errors.length) throw new Error(errors.join(' '));
  return true;
}

export { DATE_RANGE, FIXTURES, INCOME_KEYS };
