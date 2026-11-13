import { Injectable, signal } from '@angular/core';

export interface GlobalNoticeMessage {
  kind: 'success' | 'info';
  messageKey: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalNoticeService {
  readonly notice = signal<GlobalNoticeMessage | null>(null);

  showSuccess(messageKey: string): void {
    this.notice.set({ kind: 'success', messageKey });
  }

  showInfo(messageKey: string): void {
    this.notice.set({ kind: 'info', messageKey });
  }

  dismiss(): void {
    this.notice.set(null);
  }
}
