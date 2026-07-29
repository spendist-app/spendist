import { DOCUMENT, isPlatformBrowser } from '@angular/common';
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
  private readonly document = inject(DOCUMENT);
  protected readonly copied = signal(false);
  protected readonly nativeShareAvailable =
    isPlatformBrowser(this.platformId) && typeof navigator.share === 'function';
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
    try {
      await navigator.clipboard.writeText(this.url());
    } catch {
      const input = this.document.createElement('textarea');
      input.value = this.url();
      this.document.body.appendChild(input);
      input.select();
      this.document.execCommand('copy');
      input.remove();
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
