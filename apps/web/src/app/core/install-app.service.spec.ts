import { TestBed } from '@angular/core/testing';
import { InstallAppService } from './install-app.service';

function installPrompt(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn(() => Promise.resolve());

  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome }),
  });

  return { event, prompt };
}

describe('InstallAppService', () => {
  it('offers installation only after the browser allows a prompt', () => {
    const service = TestBed.inject(InstallAppService);

    expect(service.canInstall()).toBe(false);

    const { event } = installPrompt('accepted');

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(service.canInstall()).toBe(true);
  });

  it('shows the captured prompt once and reports the choice', async () => {
    const service = TestBed.inject(InstallAppService);
    const accepted = installPrompt('accepted');

    window.dispatchEvent(accepted.event);

    await expect(service.install()).resolves.toBe('installed');
    expect(accepted.prompt).toHaveBeenCalledTimes(1);
    expect(service.canInstall()).toBe(false);

    const dismissed = installPrompt('dismissed');

    window.dispatchEvent(dismissed.event);

    await expect(service.install()).resolves.toBe('canceled');
  });

  it('hides the option once the app is installed', () => {
    const service = TestBed.inject(InstallAppService);

    window.dispatchEvent(installPrompt('accepted').event);
    window.dispatchEvent(new Event('appinstalled'));

    expect(service.canInstall()).toBe(false);
  });
});
