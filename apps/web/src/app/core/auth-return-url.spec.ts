import { safeAuthReturnUrl } from './auth-return-url';

describe('safeAuthReturnUrl', () => {
  it('keeps local application paths including query parameters', () => {
    expect(safeAuthReturnUrl('/allowance/invite?token=test')).toBe(
      '/allowance/invite?token=test'
    );
  });

  it.each([
    null,
    undefined,
    '',
    'https://example.com',
    '//example.com',
    '/\\example.com',
  ])('falls back to the dashboard for %s', (value) => {
    expect(safeAuthReturnUrl(value)).toBe('/dashboard');
  });
});
