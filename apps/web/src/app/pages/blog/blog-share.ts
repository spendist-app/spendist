import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import { heroLink, heroShare } from '@ng-icons/heroicons/outline';
import {
  bootstrapFacebook,
  bootstrapLinkedin,
  bootstrapTwitterX,
} from '@ng-icons/bootstrap-icons';

@Component({
  selector: 'app-blog-share',
  imports: [TranslocoPipe, NgIcon],
  templateUrl: './blog-share.html',
  styleUrl: './blog-share.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogShare {
  readonly title = input.required<string>();
  readonly url = input.required<string>();
  readonly locale = input.required<'pl' | 'en'>();
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly copyStatus = signal<'idle' | 'copied' | 'failed'>('idle');
  protected readonly copyLabelKey = computed(() => {
    const status = this.copyStatus();

    if (status === 'copied') return 'blog.share.copied';

    if (status === 'failed') return 'blog.share.copyFailed';

    return 'blog.share.copy';
  });
  private copyStatusTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly nativeShareAvailable =
    isPlatformBrowser(this.platformId) && navigator.share;
  protected readonly encodedUrl = computed(() =>
    encodeURIComponent(this.url())
  );
  protected readonly encodedTitle = computed(() =>
    encodeURIComponent(this.title())
  );
  protected readonly shareIcon = heroShare;
  protected readonly linkIcon = heroLink;
  protected readonly facebookIcon = bootstrapFacebook;
  protected readonly linkedinIcon = bootstrapLinkedin;
  protected readonly xIcon = bootstrapTwitterX;

  protected async share(): Promise<void> {
    if (!this.nativeShareAvailable) return;

    try {
      await navigator.share({ title: this.title(), url: this.url() });
    } catch {
      // A cancelled native share is not an application error.
    }
  }

  protected async copy(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.copyStatusTimer !== null) clearTimeout(this.copyStatusTimer);

    this.copyStatus.set('idle');

    try {
      await navigator.clipboard.writeText(this.url());
      this.copyStatus.set('copied');
    } catch {
      // Clipboard access can be denied; report it instead of a false success.
      this.copyStatus.set('failed');
    }

    this.copyStatusTimer = setTimeout(() => {
      this.copyStatus.set('idle');
      this.copyStatusTimer = null;
    }, 2000);
  }
}
