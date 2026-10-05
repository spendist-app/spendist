export function validateSupabaseFunctionsUrl(functionsBaseUrl, supabaseUrl) {
  const functionsHost = new URL(functionsBaseUrl).hostname;
  const projectHost = new URL(supabaseUrl).hostname;

  if (
    functionsHost.endsWith('.supabase.co') &&
    projectHost.endsWith('.supabase.co') &&
    functionsHost !== projectHost
  ) {
    throw new Error(
      'Supabase Functions URL points to a different project than SUPABASE_URL'
    );
  }
}
