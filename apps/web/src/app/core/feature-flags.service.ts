import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminAccessService } from './admin-access.service';

const STORAGE_KEY = 'spendist.hidePreviewFeatures';

// Preview modules (Allowance, Mortgages) are visible only to administrators, who can hide them to see the regular app.
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly adminAccess = inject(AdminAccessService);
  readonly previewHidden = signal(readPreviewHidden());
  readonly previewVisible = computed(
    () => this.adminAccess.allowed() && !this.previewHidden()
  );

  setPreviewHidden(hidden: boolean): void {
    this.previewHidden.set(hidden);

    try {
      if (hidden) window.localStorage.setItem(STORAGE_KEY, 'true');
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable; the choice then lasts for this session only.
    }
  }
}

function readPreviewHidden(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.localStorage.getItem(STORAGE_KEY) === 'true'
    );
  } catch {
    return false;
  }
}
