#!/usr/bin/env node

const { spawnSync } = await import('node:child_process');
const fs = await import('node:fs/promises');
const net = await import('node:net');
const path = await import('node:path');
const process = await import('node:process');

const rootDir = process.cwd();
const configPath = path.join(rootDir, 'supabase', 'config.toml');

const sectionPortKeys = new Map([
  ['api', [{ key: 'port', label: 'Supabase API' }]],
  [
    'db',
    [
      { key: 'port', label: 'Supabase database' },
      { key: 'shadow_port', label: 'Supabase shadow database' },
    ],
  ],
  ['studio', [{ key: 'port', label: 'Supabase Studio' }]],
  ['inbucket', [{ key: 'port', label: 'Supabase Inbucket' }]],
  ['analytics', [{ key: 'port', label: 'Supabase analytics' }]],
  [
    'edge_runtime',
    [{ key: 'inspector_port', label: 'Supabase Edge Runtime inspector' }],
  ],
]);

const optionalEnabledSections = new Set([
  'db.pooler',
  'analytics',
  'edge_runtime',
  'inbucket',
  'studio',
]);

function parseLocalSupabaseConfig(toml) {
  const result = {
    projectId: undefined,
    sections: new Map(),
  };

  let currentSection = '';

  for (const rawLine of toml.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) {
      continue;
    }

    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!result.sections.has(currentSection)) {
        result.sections.set(currentSection, {});
      }
      continue;
    }

    const keyValueMatch = /^([A-Za-z0-9_]+)\s*=\s*(.+)$/.exec(line);
    if (!keyValueMatch) {
      continue;
    }

    const [, key, rawValue] = keyValueMatch;
    const value = rawValue.trim().replace(/^"|"$/g, '');

    if (!currentSection && key === 'project_id') {
      result.projectId = value;
      continue;
    }

    if (!result.sections.has(currentSection)) {
      result.sections.set(currentSection, {});
    }

    const section = result.sections.get(currentSection);
    if (/^\d+$/.test(value)) {
      section[key] = Number(value);
    } else if (value === 'true' || value === 'false') {
      section[key] = value === 'true';
    } else {
      section[key] = value;
    }
  }

  return result;
}

function configuredPorts(config) {
  const ports = [];

  for (const [sectionName, keys] of sectionPortKeys) {
    const section = config.sections.get(sectionName);
    if (!section) {
      continue;
    }

    if (optionalEnabledSections.has(sectionName) && section.enabled === false) {
      continue;
    }

    for (const { key, label } of keys) {
      if (Number.isInteger(section[key])) {
        ports.push({ label, port: section[key] });
      }
    }
  }

  const pooler = config.sections.get('db.pooler');
  if (pooler?.enabled === true && Number.isInteger(pooler.port)) {
    ports.push({ label: 'Supabase database pooler', port: pooler.port });
  }

  return ports;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      resolve(error.code !== 'EADDRINUSE');
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen({ host: '127.0.0.1', port });
  });
}

function supabaseStatus() {
  return spawnSync('npx', ['supabase', 'status'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const toml = await fs.readFile(configPath, 'utf8');
const config = parseLocalSupabaseConfig(toml);
const ports = configuredPorts(config);

const status = supabaseStatus();
if (status.status === 0) {
  const project = config.projectId ? ` "${config.projectId}"` : '';
  console.log(`[supabase] Local project${project} is already running.`);
  process.exit(0);
}

const unavailablePorts = [];
for (const { label, port } of ports) {
  if (!(await isPortAvailable(port))) {
    unavailablePorts.push({ label, port });
  }
}

if (unavailablePorts.length > 0) {
  console.error(
    '[supabase] Cannot start the local Supabase stack because required ports are busy:'
  );
  for (const { label, port } of unavailablePorts) {
    console.error(`  - ${label}: ${port}`);
  }
  console.error('');
  console.error(
    '[supabase] Stop the conflicting service manually or change supabase/config.toml.'
  );
  console.error(
    '[supabase] This script never runs `supabase stop --all` automatically.'
  );
  process.exit(1);
}

console.log('[supabase] Local Supabase is not running. Starting it now...');
const start = spawnSync('npx', ['supabase', 'start'], {
  cwd: rootDir,
  stdio: 'inherit',
});

process.exit(start.status ?? 1);
