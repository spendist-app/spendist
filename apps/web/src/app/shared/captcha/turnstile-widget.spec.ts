import { CaptchaState, turnstileSiteKey } from './turnstile-widget';

describe('CaptchaState', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lets forms submit when no site key is configured', () => {
    vi.stubGlobal('__env', {});

    const captcha = new CaptchaState();

    expect(turnstileSiteKey()).toBeNull();
    expect(captcha.required).toBe(false);
    expect(captcha.ready()).toBe(true);
  });

  it('waits for a token when a site key is configured', () => {
    vi.stubGlobal('__env', {
      NG_APP_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
    });

    const captcha = new CaptchaState();

    expect(captcha.required).toBe(true);
    expect(captcha.ready()).toBe(false);

    captcha.token.set('token');
    expect(captcha.ready()).toBe(true);

    captcha.token.set(null);
    expect(captcha.ready()).toBe(false);
  });
});
