const LOCAL_DEVELOPMENT_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
];

function allowedOrigins(): string[] {
  const appUrl = (Deno.env.get('APP_URL') ?? 'https://spendist.app').replace(
    /\/$/,
    ''
  );

  return [appUrl, 'https://spendist.app', ...LOCAL_DEVELOPMENT_ORIGINS];
}

// Browser-called functions answer CORS only for the Spendist web origins.
export function withAllowedOrigin(
  request: Request,
  response: Response
): Response {
  const origin = request.headers.get('Origin');
  const headers = new Headers(response.headers);

  headers.append('Vary', 'Origin');

  if (origin && allowedOrigins().includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
