import { Injectable, signal } from '@angular/core';

export interface GlobalNoticeMessage {
  kind: 'success';
  messageKey: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalNoticeService {
  readonly notice = signal<GlobalNoticeMessage | null>(null);

  showSuccess(messageKey: string): void {
    this.notice.set({ kind: 'success', messageKey });
  }

  dismiss(): void {
    this.notice.set(null);
  }
}
