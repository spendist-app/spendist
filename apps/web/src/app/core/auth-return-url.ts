export const DEFAULT_AUTH_RETURN_URL = '/dashboard';

export function safeAuthReturnUrl(value: string | null | undefined): string {
  return value?.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\')
    ? value
    : DEFAULT_AUTH_RETURN_URL;
}
