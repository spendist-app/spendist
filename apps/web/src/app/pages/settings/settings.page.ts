import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import {
  SettingsStore,
  CategoryEntity,
  CategoryGroupEntity,
  ProfileEntity,
  WalletEntity,
} from './settings.store';
import {
  canonicalHeroIconName,
  formatHeroIconLabel as formatHeroIconLabelFn,
  heroIconSvg as heroIconSvgFn,
  isHeroIconName as isHeroIconNameFn,
} from '../../shared/icons/heroicons';
import { HeroIconPickerComponent } from '../../shared/icons/hero-icon-picker.component';

type SettingsPanelId = 'profile' | 'wallets' | 'categories';
type CategoriesTabId = 'list' | 'groups';
type CategoryEditorMode = 'create' | 'edit';
type GroupEditorMode = 'create' | 'edit';

interface SettingsPanel {
  readonly id: SettingsPanelId;
  readonly labelKey: string;
  readonly descriptionKey: string;
}

interface CategoryViewModel extends CategoryEntity {
  readonly groupName: string;
  readonly path: string;
  readonly depth: number;
  readonly parentName: string | null;
}

interface CategoryGroupWithCount extends CategoryGroupEntity {
  readonly categoriesTotal: number;
}

interface ParentCategoryOption {
  readonly id: string;
  readonly label: string;
  readonly depth: number;
}

@Component({
  standalone: true,
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HeroIconPickerComponent,
    TranslocoPipe,
  ],
  providers: [SettingsStore],
  templateUrl: './settings.page.html',
})
export class SettingsPageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly store = inject(SettingsStore);
  private readonly transloco = inject(TranslocoService);

  protected readonly heroIconSvg = heroIconSvgFn;
  protected readonly formatHeroIconLabel = formatHeroIconLabelFn;
  protected readonly isHeroIconName = isHeroIconNameFn;

  protected readonly panels: readonly SettingsPanel[] = [
    {
      id: 'profile',
      labelKey: 'settings.panels.profile.label',
      descriptionKey: 'settings.panels.profile.description',
    },
    {
      id: 'wallets',
      labelKey: 'settings.panels.wallets.label',
      descriptionKey: 'settings.panels.wallets.description',
    },
    {
      id: 'categories',
      labelKey: 'settings.panels.categories.label',
      descriptionKey: 'settings.panels.categories.description',
    },
  ];

  protected readonly activePanel = signal<SettingsPanelId>('profile');
  protected readonly activeCategoriesTab = signal<CategoriesTabId>('list');
  protected readonly categoryEditorMode = signal<CategoryEditorMode | null>(
    null
  );
  protected readonly groupEditorMode = signal<GroupEditorMode | null>(null);
  protected readonly editingGroupId = signal<string | null>(null);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly selectedGroupFilter = signal<string | null>(null);
  protected readonly categoryQuery = signal('');

  protected readonly hasGroups = computed(() => this.store.groups().length > 0);

  protected readonly categoryGroupsWithStats = computed<
    CategoryGroupWithCount[]
  >(() => {
    const groups = this.store.groups();
    const categories = this.store.categories();
    return groups.map((group) => ({
      ...group,
      categoriesTotal: categories.filter(
        (category) => category.groupId === group.id
      ).length,
    }));
  });

  protected readonly categoriesView = computed<CategoryViewModel[]>(() => {
    const groups = new Map(
      this.store.groups().map((group) => [group.id, group.name])
    );
    const categories = this.store.categories();
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    return categories
      .map((category) => ({
        ...category,
        groupName: groups.get(category.groupId) ?? 'Unassigned',
        path: this.buildCategoryPath(category, categoryMap),
        depth: this.resolveCategoryDepth(category, categoryMap),
        parentName: category.parentId ? categoryMap.get(category.parentId)?.name ?? null : null,
      }))
      .sort((a, b) => {
        if (a.groupName !== b.groupName) {
          return a.groupName.localeCompare(b.groupName);
        }
        return a.path.localeCompare(b.path);
      });
  });

  protected readonly filteredCategories = computed<CategoryViewModel[]>(() => {
    const query = this.categoryQuery().trim().toLowerCase();
    const groupFilter = this.selectedGroupFilter();

    return this.categoriesView().filter((category) => {
      const matchesGroup =
        groupFilter === null || category.groupId === groupFilter;
      const matchesQuery =
        query.length === 0 || category.path.toLowerCase().includes(query);
      return matchesGroup && matchesQuery;
    });
  });

  protected parentCategoryOptions(): ParentCategoryOption[] {
    const groupId = this.categoryFormControls.groupId.value;
    if (!groupId) {
      return [];
    }

    const editingId = this.categoryEditorMode() === 'edit' ? this.selectedCategoryId() : null;
    const descendants = editingId ? this.collectDescendantIds(editingId) : new Set<string>();

    return this.categoriesView()
      .filter(
        (category) =>
          category.groupId === groupId &&
          category.id !== editingId &&
          !descendants.has(category.id) &&
          category.depth < 3
      )
      .map((category) => ({
        id: category.id,
        label: category.path,
        depth: category.depth,
      }));
  }

  protected readonly selectedCategory = computed<CategoryViewModel | null>(
    () => {
      const id = this.selectedCategoryId();
      if (!id) {
        return null;
      }
      return (
        this.categoriesView().find((category) => category.id === id) ?? null
      );
    }
  );

  protected readonly categoryForm = this.fb.group({
    name: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    groupId: this.fb.control('', { validators: [Validators.required] }),
    parentId: this.fb.control<string | null>(null),
    color: this.fb.control('', { validators: [Validators.maxLength(7)] }),
    icon: this.fb.control('', { validators: [Validators.maxLength(32)] }),
  });

  protected readonly categoryGroupForm = this.fb.group({
    name: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    color: this.fb.control('#0EA5A5', {
      validators: [Validators.maxLength(7)],
    }),
    icon: this.fb.control(canonicalHeroIconName('folder'), {
      validators: [Validators.maxLength(32)],
    }),
  });

  protected readonly categoryFormControls = this.categoryForm.controls;
  protected readonly categoryGroupFormControls =
    this.categoryGroupForm.controls;
  protected readonly walletForm = this.fb.group({
    name: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    currencyId: this.fb.control<number | null>(null, {
      validators: [Validators.required],
    }),
    isDefault: this.fb.control(false),
  });
  protected readonly walletFormControls = this.walletForm.controls;
  protected readonly walletEditorMode = signal<'create' | 'edit'>('create');
  protected readonly editingWalletId = signal<string | null>(null);
  protected readonly walletMutationPending = computed(() =>
    this.store.walletMutationPending()
  );
  protected readonly walletError = computed(() => this.store.walletError());
  protected readonly walletCurrencies = computed(() => this.store.currencies());
  protected readonly profile = computed(() => this.store.profile());
  protected readonly avatarUploadPending = computed(() =>
    this.store.profileMutationPending()
  );
  protected readonly avatarUploadError = computed(() =>
    this.store.profileError()
  );
  protected readonly avatarInitials = computed(() =>
    this.resolveProfileInitials(this.profile())
  );

  constructor() {
    effect(() => {
      const categories = this.categoriesView();
      const currentId = this.selectedCategoryId();

      if (categories.length === 0) {
        if (this.selectedCategoryId() !== null) {
          this.selectedCategoryId.set(null);
        }
        if (this.categoryEditorMode() === 'edit') {
          this.categoryEditorMode.set(null);
        }
        return;
      }

      if (
        !currentId ||
        !categories.some((category) => category.id === currentId)
      ) {
        this.selectedCategoryId.set(categories[0].id);
      }
    });

    effect(() => {
      const groups = this.store.groups();
      const filter = this.selectedGroupFilter();

      if (filter && !groups.some((group) => group.id === filter)) {
        this.selectedGroupFilter.set(null);
      }

      if (!groups.length && this.categoryEditorMode()) {
        this.categoryEditorMode.set(null);
      }

      if (!groups.length && !this.groupEditorMode()) {
        this.openGroupCreator();
      }
    });

    effect(() => {
      const wallets = this.store.wallets();
      const mode = this.walletEditorMode();
      const editingId = this.editingWalletId();

      if (mode === 'edit') {
        if (!editingId) {
          return;
        }

        if (!wallets.some((wallet) => wallet.id === editingId)) {
          if (wallets.length > 0) {
            this.openWalletEditor(wallets[0].id);
          } else {
            this.openWalletCreator();
          }
        }
        return;
      }

      if (mode === 'create' && !this.walletForm.dirty) {
        this.resetWalletForm();
      }

      if (wallets.length === 0 && this.activePanel() === 'wallets') {
        this.store.clearWalletError();
      }
    });

    effect(() => {
      const currencies = this.walletCurrencies();
      if (currencies.length === 0) {
        return;
      }

      const control = this.walletFormControls.currencyId;
      const currentValue = control.value;
      const hasMatch = currencies.some(
        (currency) => currency.id === currentValue
      );
      if (hasMatch && currentValue !== null) {
        return;
      }

      const fallback = this.resolveDefaultCurrencyId();
      const wasDirty = control.dirty;
      const wasTouched = control.touched;
      control.setValue(fallback, { emitEvent: false });
      if (!wasDirty) {
        control.markAsPristine();
      }
      if (!wasTouched) {
        control.markAsUntouched();
      }
    });
  }

  protected coerceIconValue(icon: string | null): string {
    const canonical = canonicalHeroIconName(icon);
    if (canonical) {
      return canonical;
    }

    const trimmed = icon?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : '';
  }

  protected selectPanel(panel: SettingsPanelId): void {
    this.activePanel.set(panel);
    if (
      panel === 'categories' &&
      this.store.groups().length > 0 &&
      !this.selectedCategoryId()
    ) {
      const first = this.categoriesView()[0]?.id ?? null;
      this.selectedCategoryId.set(first);
    }
    if (panel === 'profile') {
      this.categoryEditorMode.set(null);
      this.groupEditorMode.set(null);
      this.walletEditorMode.set('create');
      this.editingWalletId.set(null);
      return;
    }
    if (panel === 'wallets') {
      const wallets = this.store.wallets();
      if (wallets.length > 0) {
        const currentId = this.editingWalletId();
        const targetId =
          currentId && wallets.some((wallet) => wallet.id === currentId)
            ? currentId
            : wallets[0].id;
        this.openWalletEditor(targetId);
      } else {
        this.openWalletCreator();
      }
    }
  }

  protected selectCategoriesTab(tab: CategoriesTabId): void {
    this.activeCategoriesTab.set(tab);
    if (tab === 'groups') {
      this.categoryEditorMode.set(null);
    }
  }

  protected selectCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
    this.categoryEditorMode.set(null);
    this.store.clearError();
  }

  protected onCategoryQueryChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.categoryQuery.set(target?.value ?? '');

    const categories = this.filteredCategories();
    if (
      !categories.some((category) => category.id === this.selectedCategoryId())
    ) {
      const first = categories[0]?.id ?? null;
      this.selectedCategoryId.set(first);
    }
  }

  protected selectGroupFilter(groupId: string | null): void {
    this.selectedGroupFilter.set(groupId);
    const categories = this.filteredCategories();
    if (
      !categories.some((category) => category.id === this.selectedCategoryId())
    ) {
      const first = categories[0]?.id ?? null;
      this.selectedCategoryId.set(first);
    }
  }

  protected onCategoryGroupChange(): void {
    const parentId = this.categoryFormControls.parentId.value;
    if (!parentId) {
      return;
    }

    const parentStillAvailable = this.parentCategoryOptions().some(
      (option) => option.id === parentId
    );
    if (!parentStillAvailable) {
      this.categoryFormControls.parentId.setValue(null);
    }
  }

  protected openCategoryCreator(): void {
    if (!this.hasGroups()) {
      this.selectCategoriesTab('groups');
      this.openGroupCreator();
      return;
    }

    this.store.clearError();
    this.categoryEditorMode.set('create');

    const defaultGroup =
      this.selectedGroupFilter() ?? this.store.groups()[0]?.id ?? '';

    this.categoryForm.setValue({
      name: '',
      groupId: defaultGroup,
      parentId: null,
      color: this.resolveGroupColor(defaultGroup) ?? '#0EA5A5',
      icon: '',
    });
    this.categoryForm.markAsPristine();
    this.categoryForm.markAsUntouched();
    this.selectedCategoryId.set(null);
  }

  protected openCategoryEditor(categoryId: string): void {
    const category = this.store
      .categories()
      .find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    this.store.clearError();
    this.categoryEditorMode.set('edit');
    this.selectedCategoryId.set(categoryId);
    this.categoryForm.setValue({
      name: category.name,
      groupId: category.groupId,
      parentId: category.parentId,
      color: category.color ?? '',
      icon: this.coerceIconValue(category.icon),
    });
    this.categoryForm.markAsPristine();
    this.categoryForm.markAsUntouched();
  }

  protected cancelCategoryEdit(): void {
    this.categoryEditorMode.set(null);
    this.categoryForm.reset({
      name: '',
      groupId: '',
      parentId: null,
      color: '',
      icon: '',
    });
    if (!this.selectedCategoryId() && this.categoriesView().length > 0) {
      this.selectedCategoryId.set(this.categoriesView()[0].id);
    }
    this.store.clearError();
  }

  protected async submitCategoryForm(mode: CategoryEditorMode): Promise<void> {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const formValue = this.categoryForm.getRawValue();
    const payload = {
      name: formValue.name,
      groupId: formValue.groupId,
      parentId: formValue.parentId || null,
      color: formValue.color,
      icon: formValue.icon,
    };

    try {
      if (mode === 'create') {
        const category = await this.store.createCategory(payload);
        this.selectedCategoryId.set(category.id);
      } else {
        const categoryId = this.selectedCategoryId();
        if (!categoryId) {
          return;
        }
        await this.store.updateCategory(categoryId, payload);
      }
      this.cancelCategoryEdit();
    } catch {
      // Errors are surfaced via store.error signal.
    }
  }

  protected async deleteCategory(categoryId: string): Promise<void> {
    const message = this.transloco.translate(
      'settings.panels.categories.modals.confirmCategoryDelete'
    );
    if (!window.confirm(message)) {
      return;
    }
    try {
      await this.store.deleteCategory(categoryId);
    } catch {
      // Error already surfaced via store.error.
    }
  }

  protected openGroupCreator(): void {
    this.store.clearError();
    this.groupEditorMode.set('create');
    this.editingGroupId.set(null);
    this.categoryGroupForm.setValue({
      name: '',
      color: '#0EA5A5',
      icon: canonicalHeroIconName('folder'),
    });
    this.categoryGroupForm.markAsPristine();
    this.categoryGroupForm.markAsUntouched();
  }

  protected openGroupEditor(groupId: string): void {
    const group = this.store.groups().find((item) => item.id === groupId);
    if (!group) {
      return;
    }

    this.store.clearError();
    this.groupEditorMode.set('edit');
    this.editingGroupId.set(groupId);
    this.categoryGroupForm.setValue({
      name: group.name,
      color: group.color ?? '',
      icon: this.coerceIconValue(group.icon),
    });
    this.categoryGroupForm.markAsPristine();
    this.categoryGroupForm.markAsUntouched();
  }

  protected cancelGroupEdit(): void {
    this.groupEditorMode.set(null);
    this.editingGroupId.set(null);
    this.store.clearError();
  }

  protected async submitGroupForm(mode: GroupEditorMode): Promise<void> {
    if (this.categoryGroupForm.invalid) {
      this.categoryGroupForm.markAllAsTouched();
      return;
    }

    const formValue = this.categoryGroupForm.getRawValue();
    const payload = {
      name: formValue.name,
      color: formValue.color,
      icon: formValue.icon,
    };

    try {
      if (mode === 'create') {
        const group = await this.store.createGroup(payload);
        this.selectedGroupFilter.set(group.id);
      } else {
        const groupId = this.editingGroupId();
        if (!groupId) {
          return;
        }
        await this.store.updateGroup(groupId, payload);
      }
      this.cancelGroupEdit();
    } catch {
      // Error already surfaced via store.error.
    }
  }

  protected async deleteCategoryGroup(groupId: string): Promise<void> {
    const message = this.transloco.translate(
      'settings.panels.categories.modals.confirmGroupDelete'
    );
    if (!window.confirm(message)) {
      return;
    }

    try {
      await this.store.deleteGroup(groupId);
      if (this.selectedGroupFilter() === groupId) {
        this.selectedGroupFilter.set(null);
      }
    } catch {
      // Error already surfaced via store.error.
    }
  }

  protected openGroupCategories(groupId: string): void {
    this.selectCategoriesTab('list');
    this.selectGroupFilter(groupId);
  }

  protected openWalletCreator(): void {
    this.walletEditorMode.set('create');
    this.editingWalletId.set(null);
    this.store.clearWalletError();
    this.resetWalletForm();
  }

  protected openWalletEditor(walletId: string): void {
    const wallet = this.store.wallets().find((item) => item.id === walletId);
    if (!wallet) {
      return;
    }

    this.walletEditorMode.set('edit');
    this.editingWalletId.set(walletId);
    this.store.clearWalletError();
    this.resetWalletForm({
      name: wallet.name,
      currencyId: wallet.currencyId,
      isDefault: wallet.isDefault,
    });
  }

  protected cancelWalletEdit(): void {
    this.openWalletCreator();
  }

  protected async submitWalletForm(): Promise<void> {
    if (this.walletMutationPending()) {
      return;
    }

    if (this.walletForm.invalid) {
      this.walletForm.markAllAsTouched();
      return;
    }

    const { name, currencyId, isDefault } = this.walletForm.getRawValue();
    const numericCurrencyId =
      typeof currencyId === 'number' ? currencyId : Number(currencyId ?? NaN);

    if (!Number.isFinite(numericCurrencyId)) {
      const fallback = this.resolveDefaultCurrencyId();
      this.walletFormControls.currencyId.setValue(fallback, {
        emitEvent: false,
      });
      return;
    }

    const payload = {
      name: name ?? '',
      currencyId: numericCurrencyId,
      isDefault: !!isDefault,
    };

    try {
      if (this.walletEditorMode() === 'create') {
        await this.store.createWallet(payload);
        this.openWalletCreator();
      } else {
        const walletId = this.editingWalletId();
        if (!walletId) {
          return;
        }
        await this.store.updateWallet(walletId, payload);
        this.openWalletEditor(walletId);
      }
      this.walletForm.markAsPristine();
      this.walletForm.markAsUntouched();
    } catch {
      // Errors surfaced by the store.
    }
  }

  protected async makeWalletDefault(wallet: WalletEntity): Promise<void> {
    if (this.walletMutationPending() || wallet.isDefault) {
      return;
    }

    try {
      await this.store.updateWallet(wallet.id, {
        name: wallet.name,
        currencyId: wallet.currencyId,
        isDefault: true,
      });
      this.openWalletEditor(wallet.id);
    } catch {
      // Errors surfaced by the store.
    }
  }

  protected dismissError(): void {
    this.store.clearError();
  }

  protected async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);

    if (!file || this.avatarUploadPending()) {
      return;
    }

    try {
      await this.store.uploadAvatar(file);
    } catch {
      // Error is surfaced via avatarUploadError.
    } finally {
      if (input) {
        input.value = '';
      }
    }
  }

  protected openProfileEditor(): void {
    return;
  }

  protected manageSecurity(): void {
    return;
  }

  protected clearProfileError(): void {
    this.store.clearProfileError();
  }

  private resolveGroupColor(groupId: string): string | null {
    const group = this.store.groups().find((item) => item.id === groupId);
    return group?.color ?? null;
  }

  private buildCategoryPath(
    category: CategoryEntity,
    categoryMap: ReadonlyMap<string, CategoryEntity>,
  ): string {
    const names: string[] = [];
    let current: CategoryEntity | undefined = category;
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      names.unshift(current.name);
      current = current.parentId ? categoryMap.get(current.parentId) : undefined;
    }

    return names.join(' / ');
  }

  private resolveCategoryDepth(
    category: CategoryEntity,
    categoryMap: ReadonlyMap<string, CategoryEntity>,
  ): number {
    let depth = 1;
    let current = category.parentId ? categoryMap.get(category.parentId) : undefined;
    const visited = new Set<string>([category.id]);

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      depth += 1;
      current = current.parentId ? categoryMap.get(current.parentId) : undefined;
    }

    return depth;
  }

  private collectDescendantIds(categoryId: string): Set<string> {
    const descendants = new Set<string>();
    const pending = [categoryId];
    const categories = this.store.categories();

    while (pending.length > 0) {
      const currentId = pending.pop();
      for (const category of categories) {
        if (category.parentId === currentId && !descendants.has(category.id)) {
          descendants.add(category.id);
          pending.push(category.id);
        }
      }
    }

    return descendants;
  }

  private resetWalletForm(overrides?: {
    name?: string;
    currencyId?: number;
    isDefault?: boolean;
  }): void {
    const fallbackCurrencyId =
      overrides?.currencyId ?? this.resolveDefaultCurrencyId();
    const shouldBeDefault =
      overrides?.isDefault ?? this.store.wallets().length === 0;

    this.walletForm.reset(
      {
        name: overrides?.name ?? '',
        currencyId: fallbackCurrencyId,
        isDefault: shouldBeDefault,
      },
      { emitEvent: false }
    );
    this.walletForm.markAsPristine();
    this.walletForm.markAsUntouched();
  }

  private resolveDefaultCurrencyId(): number {
    const wallets = this.store.wallets();
    const defaultWallet =
      wallets.find((wallet) => wallet.isDefault) ?? wallets[0];
    if (defaultWallet) {
      return defaultWallet.currencyId;
    }

    const currencies = this.store.currencies();
    return currencies[0]?.id ?? 1;
  }

  private resolveProfileInitials(profile: ProfileEntity | null): string {
    const source = profile?.fullName || profile?.username || 'Spendist';
    const parts = source
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0);

    if (parts.length === 0) {
      return 'SP';
    }

    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? parts[1]?.[0] ?? '' : parts[0]?.[1] ?? '';
    return `${first}${second}`.toUpperCase();
  }
}
