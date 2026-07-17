import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { provideAppTransloco } from '../i18n/transloco.providers';
import { AppUpdateNotification } from './app-update-notification';

describe('AppUpdateNotification', () => {
  let component: AppUpdateNotification;
  let fixture: ComponentFixture<AppUpdateNotification>;
  const versionUpdates = new Subject<VersionEvent>();
  const swUpdateStub = {
    isEnabled: true,
    versionUpdates,
    checkForUpdate: vi.fn().mockResolvedValue(false),
    activateUpdate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AppUpdateNotification],
      providers: [
        { provide: SwUpdate, useValue: swUpdateStub },
        ...provideAppTransloco(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppUpdateNotification);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a refresh notification when a new version is ready', async () => {
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'current' },
      latestVersion: { hash: 'latest' },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('aside')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('button.btn-primary')
    ).not.toBeNull();
  });

  it('can dismiss the notification', async () => {
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'current' },
      latestVersion: { hash: 'latest' },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const dismissButton = fixture.nativeElement.querySelector(
      'button.btn-circle'
    ) as HTMLButtonElement;
    dismissButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
  });
});
