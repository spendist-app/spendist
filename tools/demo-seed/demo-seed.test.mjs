import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_SEED_ID, FIXTURES } from './fixtures.mjs';
import {
  generateDemoDataset,
  summarizeDataset,
  validateDataset,
} from './generator.mjs';
import {
  assertExecutionAllowed,
  isMarkedDemoUser,
  parseArgs,
  resolveProjectTarget,
} from './safety.mjs';

const OWNER = '10000000-0000-4000-8000-000000000001';

for (const locale of ['pl', 'en']) {
  test(`${locale} dataset is deterministic and complete`, () => {
    const first = generateDemoDataset(locale, OWNER);
    const second = generateDemoDataset(locale, OWNER);
    assert.deepEqual(first, second);
    assert.equal(validateDataset(first), true);
    const summary = summarizeDataset(first);
    assert.equal(summary.transactions, 300);
    assert.equal(summary.wallets, 3);
    assert.equal(summary.categoryGroups, 5);
    assert.equal(summary.categories, 29);
    assert.equal(summary.tags, 8);
    assert.equal(summary.places, 8);
    assert.equal(summary.recurringTransactions, 6);
    assert.equal(summary.recurringOccurrences, 7);
    assert.equal(summary.notifications, 4);
    assert.equal(summary.firstTransaction, '2026-01-01');
    assert.ok(summary.lastTransaction <= '2026-07-28');
    assert.ok(summary.categoriesUsed >= 25);
  });
}

test('CLI defaults to a no-write dry run', () => {
  const options = parseArgs([]);
  assert.equal(options.apply, false);
  assert.equal(options.mode, 'sync');
  assert.equal(options.locale, 'all');
});

test('remote writes require all project confirmations', () => {
  const target = resolveProjectTarget('https://abc123.supabase.co');
  assert.throws(
    () => assertExecutionAllowed(parseArgs(['--apply']), target, 'abc123'),
    /--allow-remote/
  );
  assert.throws(
    () =>
      assertExecutionAllowed(
        parseArgs(['--apply', '--allow-remote']),
        target,
        'abc123'
      ),
    /--confirm-project-ref/
  );
  assert.doesNotThrow(() =>
    assertExecutionAllowed(
      parseArgs(['--apply', '--allow-remote', '--confirm-project-ref=abc123']),
      target,
      'abc123'
    )
  );
});

test('replace requires exact selected demo emails', () => {
  const target = resolveProjectTarget('http://127.0.0.1:55321');
  const incomplete = parseArgs([
    '--apply',
    '--mode=replace',
    '--locale=all',
    `--confirm-replace=${FIXTURES.pl.email}`,
  ]);
  assert.throws(
    () => assertExecutionAllowed(incomplete, target),
    /confirm-replace/
  );
  const complete = parseArgs([
    '--apply',
    '--mode=replace',
    '--locale=all',
    `--confirm-replace=${FIXTURES.pl.email},${FIXTURES.en.email}`,
  ]);
  assert.doesNotThrow(() => assertExecutionAllowed(complete, target));
});

test('user marker requires both exact email and exact metadata', () => {
  const user = {
    email: FIXTURES.pl.email,
    app_metadata: {
      data_role: 'demo',
      demo_seed_id: DEMO_SEED_ID,
      demo_seed_locale: 'pl',
    },
  };
  assert.equal(isMarkedDemoUser(user, 'pl', DEMO_SEED_ID), true);
  assert.equal(
    isMarkedDemoUser(
      { ...user, email: 'someone@example.com' },
      'pl',
      DEMO_SEED_ID
    ),
    false
  );
  assert.equal(
    isMarkedDemoUser({ ...user, app_metadata: {} }, 'pl', DEMO_SEED_ID),
    false
  );
});

test('only the fixed local origin bypasses remote confirmations', () => {
  assert.deepEqual(resolveProjectTarget('http://127.0.0.1:55321'), {
    isRemote: false,
    projectRef: 'local',
  });
  assert.throws(
    () => resolveProjectTarget('http://127.0.0.1:9999'),
    /exact https/
  );
  assert.throws(
    () => resolveProjectTarget('https://abc123.supabase.co/unexpected'),
    /exact Supabase project origin/
  );
});
