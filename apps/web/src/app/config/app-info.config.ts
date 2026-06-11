const readEnv = (key: string): string | undefined => {
  if (typeof globalThis !== 'undefined') {
    const globalRecord = globalThis as unknown as Record<string, unknown>;
    const globalValue = globalRecord[key];
    if (typeof globalValue === 'string' && globalValue.length) {
      return globalValue;
    }

    for (const sourceName of ['env', '__env']) {
      const source = globalRecord[sourceName] as
        | Record<string, string | undefined>
        | undefined;
      const nested = source?.[key];
      if (typeof nested === 'string' && nested.length) {
        return nested;
      }
    }
  }

  try {
    const importMetaEnv =
      (import.meta as { env?: Record<string, string | undefined> }).env ??
      undefined;
    const metaValue = importMetaEnv?.[key];
    if (typeof metaValue === 'string' && metaValue.length) {
      return metaValue;
    }
  } catch {
    // ignore environments where import.meta is unsupported
  }

  if (typeof process !== 'undefined') {
    const processEnv =
      (process as unknown as { env?: Record<string, string | undefined> })[
        'env'
      ] ?? undefined;
    const fromProcess = processEnv?.[key];
    if (typeof fromProcess === 'string' && fromProcess.length) {
      return fromProcess;
    }
  }

  return undefined;
};

export const appInfoConfig = {
  buildCommit: readEnv('NG_APP_BUILD_COMMIT') ?? 'unknown',
};
