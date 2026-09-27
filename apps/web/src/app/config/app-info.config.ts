import { readEnv } from './read-env';

export const appInfoConfig = {
  buildCommit: readEnv(['NG_APP_BUILD_COMMIT']) ?? 'unknown',
};
