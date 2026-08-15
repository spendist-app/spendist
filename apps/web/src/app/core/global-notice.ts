import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';
import { GlobalNoticeService } from './global-notice.service';

@Component({
  selector: 'app-global-notice',
  imports: [TranslocoPipe],
  templateUrl: './global-notice.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalNotice {
  protected readonly notices = inject(GlobalNoticeService);
}
