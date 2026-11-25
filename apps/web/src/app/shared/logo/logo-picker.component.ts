import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { isImeComposing } from '../keyboard-events';
import { LogoComponent } from './logo.component';
import {
  type DashboardIconCandidate,
  LogoCatalogService,
  type SimpleIconCandidate,
} from './logo-catalog.service';
import { LogoService } from './logo.service';
import { type LogoDraft, LOGO_SOURCE_TYPES, searchCatalog } from './logo';

const SIMPLE_ICON_RESULTS = 24;

const DASHBOARD_ICON_RESULTS = 12;

type CatalogState = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Modal for choosing a logo: bundled Simple Icons, Dashboard Icons fetched
 * from jsDelivr only after the user asks for them, or an uploaded image.
 *
 * It is rendered inside other forms, so it contains no form of its own and
 * every button is a plain button.
 */
@Component({
  standalone: true,
  selector: 'app-logo-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, LogoComponent],
  templateUrl: './logo-picker.component.html',
})
export class LogoPickerComponent {
  /** Text the search starts with, usually the record's name. */
  readonly initialQuery = input('');
  readonly picked = output<LogoDraft>();
  readonly closed = output<void>();

  private readonly catalog = inject(LogoCatalogService);
  private readonly logos = inject(LogoService);
  private readonly transloco = inject(TranslocoService);
  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly acceptedTypes = LOGO_SOURCE_TYPES.join(',');
  protected readonly query = signal('');
  protected readonly simpleIcons = signal<readonly SimpleIconCandidate[]>([]);
  protected readonly simpleIconsState = signal<CatalogState>('idle');
  protected readonly dashboardIcons = signal<readonly DashboardIconCandidate[]>(
    []
  );
  protected readonly dashboardIconsState = signal<CatalogState>('idle');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly simpleIconResults = computed(() =>
    searchCatalog(this.simpleIcons(), this.query(), SIMPLE_ICON_RESULTS)
  );

  protected readonly dashboardIconResults = computed(() =>
    searchCatalog(this.dashboardIcons(), this.query(), DASHBOARD_ICON_RESULTS)
  );

  protected readonly hasQuery = computed(() => this.query().trim() !== '');

  constructor() {
    afterNextRender(() => {
      this.query.set(this.initialQuery());
      const dialog = this.dialog().nativeElement;

      // The native modal makes the page inert, contains focus, handles Esc
      // and the back gesture, and returns focus to the invoker on close.
      if ('showModal' in HTMLDialogElement.prototype && !dialog.open) {
        dialog.showModal();
      }

      void this.loadSimpleIcons();
    });
  }

  protected onQueryInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.query.set(event.target.value);
    }
  }

  /** Enter must not submit the form this dialog is rendered in. */
  protected onQueryKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !isImeComposing(event)) {
      event.preventDefault();
    }
  }

  protected async loadDashboardIcons(): Promise<void> {
    this.dashboardIconsState.set('loading');

    try {
      this.dashboardIcons.set(await this.catalog.loadDashboardIcons());
      this.dashboardIconsState.set('ready');
    } catch {
      this.dashboardIconsState.set('failed');
    }
  }

  protected pickSimpleIcon(candidate: SimpleIconCandidate): void {
    this.finish({ value: candidate.value, pending: null });
  }

  protected async pickDashboardIcon(
    candidate: DashboardIconCandidate
  ): Promise<void> {
    await this.prepare(() => this.catalog.downloadDashboardIcon(candidate));
  }

  protected async onFileSelected(event: Event): Promise<void> {
    if (!(event.target instanceof HTMLInputElement)) return;

    const file = event.target.files?.item(0) ?? null;
    event.target.value = '';

    if (file) {
      await this.prepare(async () => file);
    }
  }

  protected cancel(): void {
    this.dialog().nativeElement.close();
  }

  protected onDialogClosed(): void {
    this.closed.emit();
  }

  private async loadSimpleIcons(): Promise<void> {
    this.simpleIconsState.set('loading');

    try {
      this.simpleIcons.set(await this.catalog.loadSimpleIcons());
      this.simpleIconsState.set('ready');
    } catch {
      this.simpleIconsState.set('failed');
    }
  }

  private async prepare(source: () => Promise<Blob>): Promise<void> {
    if (this.busy()) return;

    this.busy.set(true);
    this.error.set(null);

    try {
      const pending = await this.logos.prepareFile(await source());
      this.finish({ value: null, pending });
    } catch (error) {
      const key =
        error instanceof Error && error.message.startsWith('logos.')
          ? error.message
          : 'logos.errors.decode';

      this.error.set(this.transloco.translate(key));
    } finally {
      this.busy.set(false);
    }
  }

  private finish(draft: LogoDraft): void {
    this.picked.emit(draft);
    this.dialog().nativeElement.close();
  }
}
