type AssetFetcher = {
  fetch: (request: Request) => Promise<Response>;
};

interface Env {
  ASSETS: AssetFetcher;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  NG_APP_SUPABASE_URL?: string;
  NG_APP_SUPABASE_PUBLISHABLE_KEY?: string;
  NG_APP_SUPABASE_ANON_KEY?: string;
  NG_APP_SUPABASE_FUNCTIONS_URL?: string;
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "script-src-attr 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: http://127.0.0.1:55321 http://localhost:55321 ws://127.0.0.1:55321 ws://localhost:55321",
  "frame-src 'none'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

const SERVICE_WORKER_ASSET_PATHS = new Set([
  '/ngsw.json',
  '/ngsw-worker.js',
  '/safety-worker.js',
  '/worker-basic.min.js',
]);

const buildEnvPayload = (env: Env): Record<string, string> => {
  const supabaseUrl = env.SUPABASE_URL ?? env.NG_APP_SUPABASE_URL ?? '';
  const publishableKey =
    env.SUPABASE_PUBLISHABLE_KEY ??
    env.SUPABASE_ANON_KEY ??
    env.NG_APP_SUPABASE_PUBLISHABLE_KEY ??
    env.NG_APP_SUPABASE_ANON_KEY ??
    '';

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: publishableKey,
    SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NG_APP_SUPABASE_URL: supabaseUrl,
    NG_APP_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NG_APP_SUPABASE_ANON_KEY: publishableKey,
    NG_APP_SUPABASE_FUNCTIONS_URL:
      env.NG_APP_SUPABASE_FUNCTIONS_URL ??
      (supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : ''),
  };
};

const withSecurityHeaders = (
  response: Response,
  request?: Request
): Response => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  if (request) {
    const { pathname } = new URL(request.url);
    if (SERVICE_WORKER_ASSET_PATHS.has(pathname)) {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const envResponse = (env: Env): Response => {
  const payload = JSON.stringify(buildEnvPayload(env));
  const body = `globalThis.__env = ${payload};\nglobalThis.env = globalThis.__env;\n`;
  const response = new Response(body, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
    },
  });
  return withSecurityHeaders(response);
};

const shouldServeHtmlFallback = (request: Request): boolean => {
  if (request.method !== 'GET') {
    return false;
  }
  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html');
};

const fallbackToIndex = async (
  request: Request,
  env: Env
): Promise<Response> => {
  const url = new URL(request.url);
  url.pathname = '/index.html';
  const fallbackRequest = new Request(url.toString(), {
    method: 'GET',
    headers: request.headers,
  });
  return env.ASSETS.fetch(fallbackRequest);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/env.js') {
      return envResponse(env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404 && shouldServeHtmlFallback(request)) {
      const fallbackResponse = await fallbackToIndex(request, env);
      return withSecurityHeaders(fallbackResponse, request);
    }

    return withSecurityHeaders(assetResponse, request);
  },
};
