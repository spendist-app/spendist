import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { DATASET_VERSION, DEMO_SEED_ID, FIXTURES } from './fixtures.mjs';
import {
  generateDemoDataset,
  summarizeDataset,
  validateDataset,
} from './generator.mjs';
import { isMarkedDemoUser } from './safety.mjs';

const DELETE_ORDER = [
  'recurring_transaction_occurrences',
  'transaction_tags',
  'transactions',
  'recurring_transaction_tags',
  'notifications',
  'recurring_transactions',
  'places',
  'tags',
  'categories',
  'categories_group',
  'wallets',
];
const AVATAR_BUCKET = 'avatars';

function marker(locale) {
  return {
    data_role: 'demo',
    demo_seed_id: DEMO_SEED_ID,
    demo_seed_locale: locale,
    demo_seed_version: DATASET_VERSION,
  };
}

function userMetadata(fixture, avatarUrl = null) {
  return {
    username: fixture.username,
    full_name: fixture.fullName,
    language: fixture.locale,
    timezone: fixture.timezone,
    wallet_currency_id: fixture.defaultCurrencyId,
    avatar_url: avatarUrl,
  };
}

function failOnError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function listAllUsers(client) {
  const result = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    failOnError(error, 'Could not list Auth users');
    result.push(...data.users);
    if (data.users.length < 1000) return result;
  }
  throw new Error('Auth user scan exceeded the safety pagination limit.');
}

async function findUser(client, email) {
  const users = await listAllUsers(client);
  return (
    users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ??
    null
  );
}

async function waitForProfile(client, userId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    failOnError(error, 'Could not check the generated profile');
    if (data?.id) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(
    'Auth user was created, but its profile trigger did not finish.'
  );
}

async function createDemoUser(client, locale, password) {
  if (!password)
    throw new Error(
      'DEMO_SEED_INITIAL_PASSWORD is required when creating a demo account.'
    );
  const fixture = FIXTURES[locale];
  const { data, error } = await client.auth.admin.createUser({
    email: fixture.email,
    password,
    email_confirm: true,
    user_metadata: userMetadata(fixture),
    app_metadata: marker(locale),
  });
  failOnError(error, `Could not create ${fixture.email}`);
  if (!data.user?.id)
    throw new Error(`Auth did not return an ID for ${fixture.email}.`);
  await waitForProfile(client, data.user.id);
  return data.user;
}

export function avatarObjectPath(userId) {
  return `${userId}/avatar.png`;
}

async function removeDemoAvatar(client, userId) {
  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .remove([avatarObjectPath(userId)]);
  failOnError(error, 'Could not remove the replaced demo avatar');
}

async function resolveDemoUser(client, locale, mode, password) {
  const fixture = FIXTURES[locale];
  const existing = await findUser(client, fixture.email);
  if (existing && !isMarkedDemoUser(existing, locale, DEMO_SEED_ID)) {
    throw new Error(
      `Safety stop: ${fixture.email} exists without the expected demo marker.`
    );
  }
  if (mode === 'replace' && existing) {
    await removeDemoAvatar(client, existing.id);
    const { error } = await client.auth.admin.deleteUser(existing.id, false);
    failOnError(error, `Could not replace ${fixture.email}`);
    return createDemoUser(client, locale, password);
  }
  if (!existing) return createDemoUser(client, locale, password);
  return existing;
}

async function seedDemoAvatar(client, fixture, userId) {
  const avatar = await readFile(
    new URL(`./assets/${fixture.avatarFile}`, import.meta.url)
  );
  const objectPath = avatarObjectPath(userId);
  const { error: uploadError } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, avatar, {
      cacheControl: '3600',
      contentType: 'image/png',
      upsert: true,
    });
  failOnError(uploadError, `Could not upload avatar for ${fixture.email}`);
  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
  const avatarUrl = `${data.publicUrl}?v=${DATASET_VERSION}`;
  const { error: profileError } = await client
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);
  failOnError(profileError, `Could not set avatar for ${fixture.email}`);
  return avatarUrl;
}

async function insertRows(client, table, rows) {
  for (let index = 0; index < rows.length; index += 400) {
    const { error } = await client
      .from(table)
      .insert(rows.slice(index, index + 400));
    failOnError(error, `Could not insert ${table}`);
  }
}

async function clearDomainData(client, ownerId) {
  for (const table of DELETE_ORDER) {
    const { error } = await client.from(table).delete().eq('owner_id', ownerId);
    failOnError(error, `Could not clear ${table}`);
  }
}

async function writeDataset(client, dataset) {
  await clearDomainData(client, dataset.profile.id);
  const { error: profileError } = await client
    .from('profiles')
    .update(dataset.profile)
    .eq('id', dataset.profile.id);
  failOnError(profileError, 'Could not update the demo profile');

  await insertRows(client, 'wallets', dataset.wallets);
  await insertRows(client, 'categories_group', dataset.groups);
  await insertRows(client, 'categories', dataset.categories);
  await insertRows(client, 'tags', dataset.tags);
  await insertRows(client, 'places', dataset.places);
  await insertRows(
    client,
    'recurring_transactions',
    dataset.recurringTransactions
  );
  await insertRows(
    client,
    'recurring_transaction_tags',
    dataset.recurringTransactionTags
  );
  await insertRows(client, 'transactions', dataset.transactions);
  await insertRows(client, 'transaction_tags', dataset.transactionTags);
  await insertRows(
    client,
    'recurring_transaction_occurrences',
    dataset.occurrences
  );
  await insertRows(client, 'notifications', dataset.notifications);
}

async function verifyCount(client, table, ownerId, expected) {
  const { count, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId);
  failOnError(error, `Could not verify ${table}`);
  if (count !== expected)
    throw new Error(
      `Verification failed for ${table}: expected ${expected}, got ${count}.`
    );
}

async function verifyDataset(client, dataset, avatarUrl) {
  await verifyCount(
    client,
    'wallets',
    dataset.profile.id,
    dataset.wallets.length
  );
  await verifyCount(
    client,
    'categories_group',
    dataset.profile.id,
    dataset.groups.length
  );
  await verifyCount(
    client,
    'categories',
    dataset.profile.id,
    dataset.categories.length
  );
  await verifyCount(client, 'tags', dataset.profile.id, dataset.tags.length);
  await verifyCount(
    client,
    'places',
    dataset.profile.id,
    dataset.places.length
  );
  await verifyCount(
    client,
    'recurring_transactions',
    dataset.profile.id,
    dataset.recurringTransactions.length
  );
  await verifyCount(client, 'transactions', dataset.profile.id, 300);
  await verifyCount(
    client,
    'notifications',
    dataset.profile.id,
    dataset.notifications.length
  );
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('avatar_url')
    .eq('id', dataset.profile.id)
    .single();
  failOnError(profileError, 'Could not verify the demo avatar');
  if (profile.avatar_url !== avatarUrl) {
    throw new Error('Verification failed for the demo avatar URL.');
  }
}

export function createAdminClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function applyDemoSeed({
  url,
  serviceRoleKey,
  password,
  locales,
  mode,
  log = console.log,
}) {
  const client = createAdminClient(url, serviceRoleKey);
  const summaries = [];
  for (const locale of locales) {
    const user = await resolveDemoUser(client, locale, mode, password);
    const dataset = generateDemoDataset(locale, user.id);
    validateDataset(dataset);
    await writeDataset(client, dataset);
    const avatarUrl = await seedDemoAvatar(client, FIXTURES[locale], user.id);
    const { error: metadataError } = await client.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: userMetadata(FIXTURES[locale], avatarUrl),
        app_metadata: marker(locale),
      }
    );
    failOnError(
      metadataError,
      `Could not update markers for ${FIXTURES[locale].email}`
    );
    await verifyDataset(client, dataset, avatarUrl);
    const summary = summarizeDataset(dataset);
    summaries.push(summary);
    log(
      `Seeded ${FIXTURES[locale].email}: ${summary.transactions} transactions, checksum ${summary.checksum}.`
    );
  }
  return summaries;
}
