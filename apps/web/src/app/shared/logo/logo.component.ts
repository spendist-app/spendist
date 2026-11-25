import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { LogoService } from './logo.service';
import { logoGlyphTone, parseLogo, simpleIconPath } from './logo';

const SIZE_CLASSES = {
  xs: 'size-5 rounded-md',
  sm: 'size-6 rounded-md',
  md: 'size-10 rounded-xl',
  lg: 'size-12 rounded-2xl',
} as const;

/**
 * A logo tile. Decorative: the brand name is always shown next to it. Renders
 * nothing for an empty or invalid value, or when the image fails to load.
 */
@Component({
  standalone: true,
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  styles: `
    .logo-glyph {
      background-color: currentColor;
      mask-position: center;
      mask-repeat: no-repeat;
      mask-size: 62%;
      forced-color-adjust: none;
    }
  `,
  template: `
    @if (previewUrl(); as url) {
    <span
      aria-hidden="true"
      class="inline-flex shrink-0 overflow-hidden bg-white ring-1 ring-base-300"
      [class]="sizeClass()"
      data-testid="logo"
    >
      <img [src]="url" alt="" class="size-full object-contain p-0.5" />
    </span>
    } @else if (parsed(); as logo) { @if (logo.kind === 'simple-icons') {
    <span
      aria-hidden="true"
      class="inline-flex shrink-0"
      [class]="sizeClass()"
      [class.text-white]="tone() === 'light'"
      [class.text-black]="tone() === 'dark'"
      [style.background-color]="'#' + logo.hex"
      data-testid="logo"
      [attr.data-logo]="logo.slug"
    >
      <span
        class="logo-glyph size-full"
        [style.mask-image]="'url(' + glyphPath() + ')'"
      ></span>
    </span>
    } @else if (fileUrl() && !failed()) {
    <span
      aria-hidden="true"
      class="inline-flex shrink-0 overflow-hidden bg-white ring-1 ring-base-300"
      [class]="sizeClass()"
      data-testid="logo"
    >
      <img
        [src]="fileUrl()"
        alt=""
        loading="lazy"
        decoding="async"
        class="size-full object-contain p-0.5"
        (error)="failed.set(true)"
      />
    </span>
    } }
  `,
})
export class LogoComponent {
  private readonly logos = inject(LogoService);

  /** Stored logo value. */
  readonly logo = input<string | null>(null);
  /** A picked image that is not saved yet; shown instead of `logo`. */
  readonly previewUrl = input<string | null>(null);
  /** Owner of the record, for file logos of records shared by another account. */
  readonly ownerId = input<string | null>(null);
  readonly size = input<keyof typeof SIZE_CLASSES>('md');

  protected readonly parsed = computed(() => parseLogo(this.logo()));
  protected readonly sizeClass = computed(() => SIZE_CLASSES[this.size()]);
  protected readonly failed = linkedSignal({
    source: () => this.logo(),
    computation: () => false,
  });

  protected readonly tone = computed(() => {
    const logo = this.parsed();

    return logo?.kind === 'simple-icons' ? logoGlyphTone(logo.hex) : null;
  });

  protected readonly glyphPath = computed(() => {
    const logo = this.parsed();

    return logo?.kind === 'simple-icons' ? simpleIconPath(logo.slug) : '';
  });

  protected readonly fileUrl = computed(() =>
    this.parsed()?.kind === 'file'
      ? this.logos.imageUrl(this.logo(), this.ownerId())
      : null
  );
}
