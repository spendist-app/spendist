import { FIXTURES } from './fixtures.mjs';

const VALID_LOCALES = new Set(['pl', 'en']);
const VALID_MODES = new Set(['sync', 'replace']);

export function parseArgs(argv) {
  const options = {
    apply: false,
    allowRemote: false,
    confirmProjectRef: null,
    confirmReplace: null,
    locale: 'all',
    mode: 'sync',
    help: false,
  };
  for (const argument of argv) {
    if (argument === '--apply') options.apply = true;
    else if (argument === '--allow-remote') options.allowRemote = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument.startsWith('--confirm-project-ref='))
      options.confirmProjectRef = argument.split('=', 2)[1];
    else if (argument.startsWith('--confirm-replace='))
      options.confirmReplace = argument.split('=', 2)[1];
    else if (argument.startsWith('--locale='))
      options.locale = argument.split('=', 2)[1];
    else if (argument.startsWith('--mode='))
      options.mode = argument.split('=', 2)[1];
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.locale !== 'all' && !VALID_LOCALES.has(options.locale)) {
    throw new Error(`Invalid locale "${options.locale}". Use pl, en, or all.`);
  }
  if (!VALID_MODES.has(options.mode)) {
    throw new Error(`Invalid mode "${options.mode}". Use sync or replace.`);
  }
  return options;
}

export function resolveTargetLocales(locale) {
  return locale === 'all' ? ['pl', 'en'] : [locale];
}

export function resolveProjectTarget(urlValue) {
  const url = new URL(urlValue);
  const localHosts = new Set(['127.0.0.1', 'localhost']);
  if (
    localHosts.has(url.hostname) &&
    url.protocol === 'http:' &&
    url.port === '55321' &&
    url.pathname === '/' &&
    !url.search &&
    !url.hash &&
    !url.username &&
    !url.password
  ) {
    return { isRemote: false, projectRef: 'local' };
  }
  const match = url.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  if (!match) {
    throw new Error(
      'Remote demo seed URL must be an exact https://<project-ref>.supabase.co URL.'
    );
  }
  if (url.protocol !== 'https:')
    throw new Error('Remote demo seed URL must use HTTPS.');
  if (
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error(
      'Remote demo seed URL must contain only the exact Supabase project origin.'
    );
  }
  return { isRemote: true, projectRef: match[1] };
}

export function assertExecutionAllowed(options, target, configuredProjectRef) {
  if (!options.apply) return;
  if (target.isRemote) {
    if (!options.allowRemote)
      throw new Error('Remote writes require --allow-remote.');
    if (!configuredProjectRef)
      throw new Error('Remote writes require DEMO_SEED_PROJECT_REF.');
    if (configuredProjectRef !== target.projectRef) {
      throw new Error('DEMO_SEED_PROJECT_REF does not match the Supabase URL.');
    }
    if (options.confirmProjectRef !== target.projectRef) {
      throw new Error(
        `Remote writes require --confirm-project-ref=${target.projectRef}.`
      );
    }
  }
  if (options.mode === 'replace') {
    const expected = resolveTargetLocales(options.locale)
      .map((locale) => FIXTURES[locale].email)
      .sort()
      .join(',');
    const actual = (options.confirmReplace ?? '')
      .split(',')
      .filter(Boolean)
      .sort()
      .join(',');
    if (actual !== expected) {
      throw new Error(`Replace requires --confirm-replace=${expected}.`);
    }
  }
}

export function isMarkedDemoUser(user, locale, seedId) {
  const fixture = FIXTURES[locale];
  return (
    user?.email?.toLowerCase() === fixture.email.toLowerCase() &&
    user?.app_metadata?.data_role === 'demo' &&
    user?.app_metadata?.demo_seed_id === seedId &&
    user?.app_metadata?.demo_seed_locale === locale
  );
}
