import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { TranslocoPipe } from '@ngneat/transloco';
import { EMPTY, from, fromEvent, merge, timer } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

@Component({
  selector: 'app-app-update-notification',
  imports: [TranslocoPipe],
  templateUrl: './app-update-notification.html',
  styleUrl: './app-update-notification.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppUpdateNotification {
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly updateAvailable = signal(false);
  protected readonly refreshing = signal(false);

  constructor() {
    const swUpdate = this.swUpdate;
    if (!swUpdate?.isEnabled) {
      return;
    }

    swUpdate.versionUpdates
      .pipe(
        filter(
          (event): event is VersionReadyEvent => event.type === 'VERSION_READY'
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.updateAvailable.set(true));

    const window = this.document.defaultView;
    const visibilityChecks = window
      ? fromEvent(this.document, 'visibilitychange').pipe(
          filter(() => this.document.visibilityState === 'visible')
        )
      : EMPTY;

    merge(timer(0, UPDATE_CHECK_INTERVAL_MS), visibilityChecks)
      .pipe(
        switchMap(() =>
          from(swUpdate.checkForUpdate()).pipe(catchError(() => EMPTY))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  protected dismiss(): void {
    this.updateAvailable.set(false);
  }

  protected async refresh(): Promise<void> {
    if (!this.swUpdate || this.refreshing()) {
      return;
    }

    this.refreshing.set(true);
    try {
      await this.swUpdate.activateUpdate();
      this.document.defaultView?.location.reload();
    } catch {
      this.refreshing.set(false);
    }
  }
}
