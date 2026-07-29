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
  NG_APP_BUILD_COMMIT?: string;
  CF_PAGES_COMMIT_SHA?: string;
  GITHUB_SHA?: string;
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

const LLM_ASSET_ALIASES = new Map([
  ['/llms.txt', '/llm.txt'],
  ['/llms-full.txt', '/llm-full.txt'],
]);

const buildEnvPayload = (env: Env): Record<string, string> => {
  const supabaseUrl = env.SUPABASE_URL ?? env.NG_APP_SUPABASE_URL ?? '';
  const publishableKey =
    env.SUPABASE_PUBLISHABLE_KEY ??
    env.SUPABASE_ANON_KEY ??
    env.NG_APP_SUPABASE_PUBLISHABLE_KEY ??
    env.NG_APP_SUPABASE_ANON_KEY ??
    '';
  const buildCommit =
    env.NG_APP_BUILD_COMMIT ?? env.CF_PAGES_COMMIT_SHA ?? env.GITHUB_SHA ?? '';

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
    NG_APP_BUILD_COMMIT: buildCommit,
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
    const url = new URL(request.url);
    const { pathname } = url;
    if (SERVICE_WORKER_ASSET_PATHS.has(pathname)) {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    if (/^\/llms?(?:-full)?\.txt$/.test(pathname)) {
      headers.set('Content-Type', 'text/plain; charset=utf-8');
    }
    if (
      /^\/(pl|en)\/blog(?:\/|$)/.test(pathname) &&
      url.searchParams.has('tag')
    ) {
      headers.set('X-Robots-Tag', 'noindex, follow');
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

const blogNotFoundResponse = async (
  request: Request,
  env: Env
): Promise<Response> => {
  const { pathname } = new URL(request.url);
  const locale = pathname.startsWith('/pl/blog') ? 'pl' : 'en';
  const url = new URL(request.url);
  url.pathname = `/${locale}/blog-not-found/index.html`;
  const response = await env.ASSETS.fetch(
    new Request(url.toString(), { headers: request.headers })
  );
  return new Response(response.body, {
    status: 404,
    statusText: 'Not Found',
    headers: response.headers,
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/env.js') {
      return envResponse(env);
    }

    const llmAssetPath = LLM_ASSET_ALIASES.get(url.pathname);
    const assetRequest = llmAssetPath
      ? new Request(
          new URL(llmAssetPath + url.search, request.url).toString(),
          request
        )
      : request;
    const assetResponse = await env.ASSETS.fetch(assetRequest);
    if (assetResponse.status === 404 && shouldServeHtmlFallback(request)) {
      if (/^\/(pl|en)\/blog(?:\/|$)/.test(url.pathname)) {
        return withSecurityHeaders(
          await blogNotFoundResponse(request, env),
          request
        );
      }
      const fallbackResponse = await fallbackToIndex(request, env);
      return withSecurityHeaders(fallbackResponse, request);
    }

    return withSecurityHeaders(assetResponse, request);
  },
};
