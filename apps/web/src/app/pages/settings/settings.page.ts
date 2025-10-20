import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import { SettingsStore, CategoryEntity, CategoryGroupEntity } from './settings.store';
import {
  canonicalHeroIconName,
  formatHeroIconLabel as formatHeroIconLabelFn,
  heroIconSvg as heroIconSvgFn,
  isHeroIconName as isHeroIconNameFn,
} from '../../shared/icons/heroicons';
import { HeroIconPickerComponent } from '../../shared/icons/hero-icon-picker.component';

type SettingsPanelId = 'profile' | 'categories';
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
}

interface CategoryGroupWithCount extends CategoryGroupEntity {
  readonly categoriesTotal: number;
}

@Component({
  standalone: true,
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, HeroIconPickerComponent, TranslocoPipe],
  providers: [SettingsStore],
  template: `
    <section class="mx-auto w-full max-w-6xl px-4 py-10 sm:py-12 lg:py-16">
      <header class="mb-8 space-y-2">
        <p class="text-sm font-semibold uppercase tracking-wide text-primary">
          {{ 'settings.hero.badge' | transloco }}
        </p>
        <h1 class="text-3xl font-semibold sm:text-4xl">
          {{ 'settings.hero.title' | transloco }}
        </h1>
        <p class="max-w-2xl text-base-content/70">
          {{ 'settings.hero.description' | transloco }}
        </p>
      </header>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <aside class="rounded-2xl border border-base-300 bg-base-100/80 shadow-sm backdrop-blur-sm">
          <div class="flex flex-col gap-4 p-4 sm:p-6">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">
              {{ 'settings.workspace.label' | transloco }}
            </h2>
            <nav class="flex flex-col gap-2" aria-label="Settings sections">
              @for (panel of panels; track panel.id) {
                <button
                  type="button"
                  class="btn btn-ghost justify-start gap-3 px-4 py-3 text-left transition"
                  [class.btn-active]="panel.id === activePanel()"
                  [class.bg-base-200]="panel.id === activePanel()"
                  [class.shadow-sm]="panel.id === activePanel()"
                  [attr.aria-current]="panel.id === activePanel() ? 'page' : null"
                  (click)="selectPanel(panel.id)"
                >
                  <span class="text-left">
                    <span class="block text-sm font-semibold">
                      {{ panel.labelKey | transloco }}
                    </span>
                    <span class="block text-xs text-base-content/60">
                      {{ panel.descriptionKey | transloco }}
                    </span>
                  </span>
                </button>
              }
            </nav>
          </div>
        </aside>

        <div class="flex flex-col gap-6">
          @if (activePanel() === 'profile') {
            <section class="space-y-6">
              <header class="space-y-2">
                <h2 class="text-2xl font-semibold">
                  {{ 'settings.panels.profile.header' | transloco }}
                </h2>
                <p class="text-base-content/70">
                  {{ 'settings.panels.profile.text' | transloco }}
                </p>
              </header>

              <div class="grid gap-4 rounded-2xl border border-base-300 bg-base-100/80 p-6 shadow-sm sm:grid-cols-2">
                <article class="flex items-start gap-4">
                  <div class="avatar placeholder">
                    <div class="bg-primary/20 text-primary size-14 rounded-full">
                      <span class="font-semibold">JD</span>
                    </div>
                  </div>
                  <div class="flex-1 space-y-2">
                    <h3 class="text-lg font-semibold">
                      {{ 'settings.panels.profile.name' | transloco }}
                    </h3>
                    <p class="text-sm text-base-content/70">
                      {{ 'settings.panels.profile.currency' | transloco }}:
                      <span class="font-medium text-base-content">PLN</span>
                    </p>
                    <p class="text-sm text-base-content/70">
                      {{ 'settings.panels.profile.language' | transloco }}:
                      {{ 'common.language.english' | transloco }} ·
                      {{ 'settings.panels.profile.timezone' | transloco }}: Europe/Warsaw
                    </p>
                  </div>
                </article>

                <div class="flex flex-col justify-between gap-4">
                  <p class="text-sm text-base-content/70">
                    {{ 'settings.panels.profile.blurb' | transloco }}
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="btn btn-primary btn-sm" (click)="openProfileEditor()">
                      {{ 'common.actions.openProfileEditor' | transloco }}
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" (click)="manageSecurity()">
                      {{ 'common.actions.manageSecurity' | transloco }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="rounded-2xl border border-dashed border-base-300 bg-base-100/50 p-6 text-sm text-base-content/70">
                {{ 'settings.panels.profile.note' | transloco }}
              </div>
            </section>
          } @else {
            <section class="space-y-6">
              <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 class="text-2xl font-semibold">
                    {{ 'settings.panels.categories.header' | transloco }}
                  </h2>
                  <p class="max-w-2xl text-base-content/70">
                    {{ 'settings.panels.categories.text' | transloco }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    [disabled]="!hasGroups() || store.loading() || store.categoryMutationPending()"
                    (click)="openCategoryCreator()"
                  >
                    {{ 'settings.panels.categories.addCategory' | transloco }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    [disabled]="store.loading() || store.groupMutationPending()"
                    (click)="openGroupCreator()"
                  >
                    {{ 'settings.panels.categories.addGroup' | transloco }}
                  </button>
                </div>
              </header>

              @if (store.error(); as error) {
                <div class="alert alert-error flex-col items-start gap-2 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
                  <div class="font-semibold">
                    {{ 'settings.panels.categories.status.errorTitle' | transloco }}
                  </div>
                  <div>{{ error }}</div>
                  <button type="button" class="btn btn-sm btn-ghost text-error" (click)="dismissError()">
                    {{ 'common.actions.dismiss' | transloco }}
                  </button>
                </div>
              }

              <div class="tabs tabs-boxed bg-base-200/60 p-1" role="tablist" aria-label="Category workspace">
                <button
                  id="settings-categories-tab-list"
                  type="button"
                  role="tab"
                  class="tab flex-1 text-sm font-semibold"
                  [class.tab-active]="activeCategoriesTab() === 'list'"
                  [attr.aria-selected]="activeCategoriesTab() === 'list'"
                  [attr.aria-controls]="'settings-categories-panel-list'"
                  [attr.tabindex]="activeCategoriesTab() === 'list' ? 0 : -1"
                  (click)="selectCategoriesTab('list')"
                >
                  {{ 'settings.panels.categories.tabs.manage' | transloco }}
                </button>
                <button
                  id="settings-categories-tab-groups"
                  type="button"
                  role="tab"
                  class="tab flex-1 text-sm font-semibold"
                  [class.tab-active]="activeCategoriesTab() === 'groups'"
                  [attr.aria-selected]="activeCategoriesTab() === 'groups'"
                  [attr.aria-controls]="'settings-categories-panel-groups'"
                  [attr.tabindex]="activeCategoriesTab() === 'groups' ? 0 : -1"
                  (click)="selectCategoriesTab('groups')"
                >
                  {{ 'settings.panels.categories.tabs.groups' | transloco }}
                </button>
              </div>

              @if (store.loading()) {
                <div class="flex justify-center py-16">
                  <span
                    class="loading loading-lg text-primary"
                    [attr.aria-label]="'settings.panels.categories.status.loading' | transloco"
                  ></span>
                </div>
              } @else {
                @if (activeCategoriesTab() === 'list') {
                  <div
                    id="settings-categories-panel-list"
                    role="tabpanel"
                    aria-labelledby="settings-categories-tab-list"
                    class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
                  >
                    <div class="rounded-2xl border border-base-300 bg-base-100/80 p-4 shadow-sm sm:p-6">
                      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <label class="flex w-full flex-col gap-1 text-xs font-medium text-base-content/70 sm:max-w-xs">
                          <span>{{ 'settings.panels.categories.searchLabel' | transloco }}</span>
                          <input
                            id="settings-category-search"
                            type="search"
                            class="input input-bordered w-full"
                            [attr.placeholder]="'settings.panels.categories.searchPlaceholder' | transloco"
                            [value]="categoryQuery()"
                            (input)="onCategoryQueryChange($event)"
                          />
                        </label>

                        <div class="flex flex-wrap gap-2">
                          <button
                            type="button"
                            class="badge badge-outline"
                            [class.badge-neutral]="selectedGroupFilter() === null"
                            (click)="selectGroupFilter(null)"
                          >
                            {{ 'settings.panels.categories.filters.all' | transloco }}
                          </button>
                          @for (group of categoryGroupsWithStats(); track group.id) {
                            <button
                              type="button"
                              class="badge badge-outline"
                              [class.badge-neutral]="selectedGroupFilter() === group.id"
                              (click)="selectGroupFilter(group.id)"
                            >
                              {{ group.name }}
                              <span class="ml-1 text-xs text-base-content/70">
                                {{ 'settings.panels.categories.filters.count' | transloco: { total: group.categoriesTotal } }}
                              </span>
                            </button>
                          }
                        </div>
                      </div>

                      @if (!hasGroups()) {
                        <div class="mt-6 rounded-xl border border-dashed border-base-300 p-6 text-sm text-base-content/70">
                          {{ 'settings.panels.categories.emptyGroups' | transloco }}
                        </div>
                      }

                      <div class="mt-4 space-y-2">
                        @for (category of filteredCategories(); track category.id) {
                          <button
                            type="button"
                            class="w-full rounded-xl border border-transparent px-4 py-3 text-left transition hover:border-primary/30 hover:bg-base-200/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            [class.bg-base-200]="category.id === selectedCategoryId()"
                            [class.border-primary]="category.id === selectedCategoryId()"
                            (click)="selectCategory(category.id)"
                          >
                            <div class="flex items-start justify-between gap-4">
                              <div class="flex items-start gap-3">
                                <span
                                  class="mt-1 size-3 rounded-full"
                                  [style.backgroundColor]="category.color ?? '#CBD5F5'"
                                  aria-hidden="true"
                                ></span>
                                <div>
                                  <p class="text-sm font-semibold text-base-content">
                                    {{ category.name }}
                                    @if (category.icon; as iconKeyword) {
                                      @if (heroIconSvg(iconKeyword); as iconSvg) {
                                        <span class="badge badge-ghost badge-sm ml-2 p-0.5">
                                          <ng-icon [svg]="iconSvg" size="16" aria-hidden="true"></ng-icon>
                                          <span class="sr-only">
                                            {{ 'settings.panels.categories.list.iconSrLabel' | transloco: { label: isHeroIconName(iconKeyword) ? formatHeroIconLabel(iconKeyword) : iconKeyword } }}
                                          </span>
                                        </span>
                                      } @else {
                                        <span class="badge badge-ghost badge-sm ml-2">{{ iconKeyword }}</span>
                                      }
                                    }
                                  </p>
                                  <p class="text-xs text-base-content/60">
                                    {{ category.groupName }}
                                  </p>
                                </div>
                              </div>
                              <span class="text-lg font-semibold text-base-content/50" aria-hidden="true">></span>
                            </div>
                          </button>
                        }

                        @if (filteredCategories().length === 0 && hasGroups()) {
                          <div class="rounded-xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/70">
                            {{ 'settings.panels.categories.noMatches' | transloco }}
                          </div>
                        }
                      </div>
                    </div>

                    <aside class="rounded-2xl border border-base-300 bg-base-100/80 p-4 shadow-sm sm:p-6 lg:sticky lg:top-24 lg:self-start">
                      @if (categoryEditorMode(); as mode) {
                        <form class="space-y-4" [formGroup]="categoryForm" (ngSubmit)="submitCategoryForm(mode)">
                          <div>
                            <h3 class="text-xl font-semibold text-base-content">
                              {{ (mode === 'edit' ? 'settings.panels.categories.editor.editTitle' : 'settings.panels.categories.editor.createTitle') | transloco }}
                            </h3>
                            <p class="text-sm text-base-content/70">
                              {{ 'settings.panels.categories.editor.description' | transloco }}
                            </p>
                          </div>

                          <label class="form-control w-full">
                            <span class="label-text text-sm font-semibold text-base-content">
                              {{ 'settings.panels.categories.editor.nameLabel' | transloco }}
                            </span>
                            <input
                              type="text"
                              formControlName="name"
                              class="input input-bordered w-full"
                              maxlength="60"
                              [attr.placeholder]="'settings.panels.categories.editor.namePlaceholder' | transloco"
                            />
                            @if (categoryFormControls.name.touched && categoryFormControls.name.hasError('required')) {
                              <span class="mt-1 text-xs text-error">
                                {{ 'settings.panels.categories.editor.nameRequired' | transloco }}
                              </span>
                            }
                          </label>

                          <label class="form-control w-full">
                            <span class="label-text text-sm font-semibold text-base-content">
                              {{ 'settings.panels.categories.editor.groupLabel' | transloco }}
                            </span>
                            <select formControlName="groupId" class="select select-bordered w-full">
                              <option value="" disabled>
                                {{ 'settings.panels.categories.editor.groupPlaceholder' | transloco }}
                              </option>
                              @for (group of store.groups(); track group.id) {
                                <option [value]="group.id">{{ group.name }}</option>
                              }
                            </select>
                            @if (categoryFormControls.groupId.touched && categoryFormControls.groupId.hasError('required')) {
                              <span class="mt-1 text-xs text-error">
                                {{ 'settings.panels.categories.editor.groupRequired' | transloco }}
                              </span>
                            }
                          </label>

                          <div class="form-control w-full">
                            <span class="label-text text-sm font-semibold text-base-content">
                              {{ 'settings.panels.categories.editor.colorLabel' | transloco }}
                            </span>
                            <div class="flex items-center gap-3">
                              <input type="color" formControlName="color" class="h-10 w-16 rounded-lg border border-base-300 bg-base-200" />
                              <input
                                type="text"
                                formControlName="color"
                                class="input input-bordered w-full"
                                [attr.placeholder]="'settings.panels.categories.editor.colorPlaceholder' | transloco"
                                maxlength="7"
                              />
                            </div>
                          </div>

                          <app-hero-icon-picker
                            formControlName="icon"
                            [label]="'settings.panels.categories.editor.iconLabel' | transloco"
                            [allowNone]="true"
                            [searchPlaceholder]="'settings.panels.categories.searchPlaceholder' | transloco"
                          ></app-hero-icon-picker>

                          <div class="flex flex-wrap gap-2">
                            <button type="submit" class="btn btn-primary btn-sm" [disabled]="store.categoryMutationPending()">
                              {{ (mode === 'edit' ? 'common.actions.saveChanges' : 'common.actions.createCategory') | transloco }}
                            </button>
                            <button type="button" class="btn btn-ghost btn-sm" (click)="cancelCategoryEdit()" [disabled]="store.categoryMutationPending()">
                              {{ 'common.actions.cancel' | transloco }}
                            </button>
                          </div>
                        </form>
                      } @else if (selectedCategory(); as category) {
                        <div class="space-y-4">
                          <header>
                            <p class="text-xs uppercase tracking-wide text-base-content/60">
                              {{ 'settings.panels.categories.details.selectedHeading' | transloco }}
                            </p>
                            <h3 class="text-xl font-semibold text-base-content">{{ category.name }}</h3>
                            <p class="text-sm text-base-content/70">
                              {{ 'settings.panels.categories.details.groupedUnder' | transloco: { group: category.groupName } }}
                            </p>
                          </header>

                          <dl class="grid gap-3 text-sm">
                            <div class="grid gap-1">
                              <dt class="text-xs uppercase tracking-wide text-base-content/50">
                                {{ 'settings.panels.categories.details.group' | transloco }}
                              </dt>
                              <dd>{{ category.groupName }}</dd>
                            </div>
                            <div class="grid gap-1">
                              <dt class="text-xs uppercase tracking-wide text-base-content/50">
                                {{ 'settings.panels.categories.details.icon' | transloco }}
                              </dt>
                              <dd>
                                @if (category.icon; as iconKeyword) {
                                  @if (heroIconSvg(iconKeyword); as iconSvg) {
                                    <span class="inline-flex items-center gap-2">
                                      <ng-icon [svg]="iconSvg" size="20" aria-hidden="true"></ng-icon>
                                      <span class="text-xs text-base-content/60">
                                        {{ isHeroIconName(iconKeyword) ? formatHeroIconLabel(iconKeyword) : iconKeyword }}
                                      </span>
                                    </span>
                                  } @else {
                                    {{ iconKeyword }}
                                  }
                                } @else {
                                  <span class="text-base-content/60">
                                    {{ 'settings.panels.categories.list.notSet' | transloco }}
                                  </span>
                                }
                              </dd>
                            </div>
                            <div class="grid gap-1">
                              <dt class="text-xs uppercase tracking-wide text-base-content/50">
                                {{ 'settings.panels.categories.details.accent' | transloco }}
                              </dt>
                              <dd>
                                @if (category.color) {
                                  <span class="inline-flex items-center gap-2">
                                    <span class="size-3 rounded-full" [style.backgroundColor]="category.color" aria-hidden="true"></span>
                                    {{ category.color }}
                                  </span>
                                } @else {
                                  <span class="text-base-content/60">
                                    {{ 'settings.panels.categories.details.defaultColor' | transloco }}
                                  </span>
                                }
                              </dd>
                            </div>
                          </dl>

                          <div class="flex flex-wrap gap-2">
                            <button type="button" class="btn btn-primary btn-sm" (click)="openCategoryEditor(category.id)" [disabled]="store.categoryMutationPending()">
                              {{ 'settings.panels.categories.details.edit' | transloco }}
                            </button>
                            <button type="button" class="btn btn-ghost btn-sm text-error" (click)="deleteCategory(category.id)" [disabled]="store.categoryMutationPending()">
                              {{ 'common.actions.delete' | transloco }}
                            </button>
                          </div>
                        </div>
                      } @else {
                        <div class="flex flex-col items-start gap-3 text-sm">
                          <h3 class="text-base font-semibold">
                            {{ 'settings.panels.categories.details.promptTitle' | transloco }}
                          </h3>
                          <p class="text-base-content/70">
                            {{ 'settings.panels.categories.details.promptDescription' | transloco }}
                          </p>
                          <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            [disabled]="!hasGroups() || store.categoryMutationPending()"
                            (click)="openCategoryCreator()"
                          >
                            {{ 'common.actions.addFirstCategory' | transloco }}
                          </button>
                        </div>
                      }
                    </aside>
                  </div>
                } @else {
                  <div
                    id="settings-categories-panel-groups"
                    role="tabpanel"
                    aria-labelledby="settings-categories-tab-groups"
                    class="space-y-4"
                  >
                    @if (groupEditorMode(); as mode) {
                      <form
                        class="rounded-2xl border border-base-300 bg-base-100/80 p-5 shadow-sm sm:p-6"
                        [formGroup]="categoryGroupForm"
                        (ngSubmit)="submitGroupForm(mode)"
                      >
                        <div class="mb-4">
                          <h3 class="text-xl font-semibold text-base-content">
                            {{ (mode === 'edit' ? 'settings.panels.categories.groups.formTitleEdit' : 'settings.panels.categories.groups.formTitleCreate') | transloco }}
                          </h3>
                          <p class="text-sm text-base-content/70">
                            {{ 'settings.panels.categories.groups.description' | transloco }}
                          </p>
                        </div>

                        <div class="grid gap-4 sm:grid-cols-2">
                          <label class="form-control w-full">
                            <span class="label-text text-sm font-semibold text-base-content">
                              {{ 'settings.panels.categories.groups.nameLabel' | transloco }}
                            </span>
                            <input
                              type="text"
                              formControlName="name"
                              class="input input-bordered w-full"
                              maxlength="60"
                              [attr.placeholder]="'settings.panels.categories.groups.namePlaceholder' | transloco"
                            />
                            @if (categoryGroupFormControls.name.touched && categoryGroupFormControls.name.hasError('required')) {
                              <span class="mt-1 text-xs text-error">
                                {{ 'settings.panels.categories.groups.nameError' | transloco }}
                              </span>
                            }
                          </label>

                          <div class="form-control w-full">
                            <span class="label-text text-sm font-semibold text-base-content">
                              {{ 'settings.panels.categories.groups.colorLabel' | transloco }}
                            </span>
                            <div class="flex items-center gap-3">
                              <input type="color" formControlName="color" class="h-10 w-16 rounded-lg border border-base-300 bg-base-200" />
                              <input
                                type="text"
                                formControlName="color"
                                class="input input-bordered w-full"
                                placeholder="#0EA5A5"
                                maxlength="7"
                              />
                            </div>
                          </div>
                        </div>

                        <app-hero-icon-picker
                          class="sm:w-1/2"
                          formControlName="icon"
                          [label]="'settings.panels.categories.editor.iconLabel' | transloco"
                          [allowNone]="true"
                          [searchPlaceholder]="'settings.panels.categories.searchPlaceholder' | transloco"
                        ></app-hero-icon-picker>

                        <div class="mt-4 flex flex-wrap gap-2">
                          <button type="submit" class="btn btn-primary btn-sm" [disabled]="store.groupMutationPending()">
                            {{ (mode === 'edit' ? 'common.actions.saveChanges' : 'common.actions.createGroup') | transloco }}
                          </button>
                          <button type="button" class="btn btn-ghost btn-sm" (click)="cancelGroupEdit()" [disabled]="store.groupMutationPending()">
                            {{ 'common.actions.cancel' | transloco }}
                          </button>
                        </div>
                      </form>
                    }

                    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      @for (group of categoryGroupsWithStats(); track group.id) {
                        <article class="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-100/80 p-5 shadow-sm">
                          <header class="flex items-start justify-between gap-4">
                            <div class="flex items-start gap-3">
                              <span
                                class="flex size-10 items-center justify-center rounded-full text-base font-semibold text-base-100"
                                [style.backgroundColor]="group.color ?? '#CBD5F5'"
                                aria-hidden="true"
                              >
                                @if (heroIconSvg(group.icon); as iconSvg) {
                                  <ng-icon [svg]="iconSvg" size="24px" aria-hidden="true"></ng-icon>
                                } @else {
                                  {{ group.icon ?? group.name.slice(0, 2).toUpperCase() }}
                                }
                              </span>
                              <div>
                                <h3 class="text-lg font-semibold text-base-content">{{ group.name }}</h3>
                                <p class="text-xs text-base-content/60">
                                  {{ 'settings.panels.categories.list.groupLabel' | transloco: { total: group.categoriesTotal } }}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              class="btn btn-ghost btn-circle btn-sm"
                              [attr.aria-label]="('settings.panels.categories.groups.formTitleEdit' | transloco) + ' ' + group.name"
                              (click)="openGroupEditor(group.id)"
                              [disabled]="store.groupMutationPending()"
                            >
                              <span aria-hidden="true" class="text-lg font-semibold text-base-content/70">...</span>
                            </button>
                          </header>

                          <div class="flex flex-wrap gap-1.5 text-xs text-base-content/70">
                            {{ 'settings.panels.categories.groups.pill.description' | transloco }}
                          </div>

                          <div class="mt-auto flex flex-wrap gap-2">
                            <button
                              type="button"
                              class="btn btn-outline btn-xs"
                              (click)="openGroupCategories(group.id)"
                              [disabled]="store.groupMutationPending()"
                            >
                              {{ 'common.actions.viewCategories' | transloco }}
                            </button>
                            <button
                              type="button"
                              class="btn btn-ghost btn-xs text-error"
                              (click)="deleteCategoryGroup(group.id)"
                              [disabled]="store.groupMutationPending()"
                            >
                              {{ 'common.actions.deleteGroup' | transloco }}
                            </button>
                          </div>
                        </article>
                      }

                      <article
                        class="flex min-h-[220px] flex-col items-start justify-center gap-4 rounded-2xl border border-dashed border-base-300 bg-base-100/50 p-5 text-base-content/70"
                      >
                        <h3 class="text-lg font-semibold text-base-content">
                          {{ 'settings.panels.categories.groups.emptyCtaTitle' | transloco }}
                        </h3>
                        <p class="text-sm">
                          {{ 'settings.panels.categories.groups.emptyCtaBody' | transloco }}
                        </p>
                        <button type="button" class="btn btn-primary btn-sm" (click)="openGroupCreator()" [disabled]="store.groupMutationPending()">
                          {{ 'common.actions.addGroup' | transloco }}
                        </button>
                      </article>
                    </div>
                  </div>
                }
              }
            </section>
          }
        </div>
      </div>
    </section>
  `,
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
      id: 'categories',
      labelKey: 'settings.panels.categories.label',
      descriptionKey: 'settings.panels.categories.description',
    },
  ];

  protected readonly activePanel = signal<SettingsPanelId>('profile');
  protected readonly activeCategoriesTab = signal<CategoriesTabId>('list');
  protected readonly categoryEditorMode = signal<CategoryEditorMode | null>(null);
  protected readonly groupEditorMode = signal<GroupEditorMode | null>(null);
  protected readonly editingGroupId = signal<string | null>(null);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly selectedGroupFilter = signal<string | null>(null);
  protected readonly categoryQuery = signal('');

  protected readonly hasGroups = computed(() => this.store.groups().length > 0);

  protected readonly categoryGroupsWithStats = computed<CategoryGroupWithCount[]>(() => {
    const groups = this.store.groups();
    const categories = this.store.categories();
    return groups.map((group) => ({
      ...group,
      categoriesTotal: categories.filter((category) => category.groupId === group.id).length,
    }));
  });

  protected readonly categoriesView = computed<CategoryViewModel[]>(() => {
    const groups = new Map(this.store.groups().map((group) => [group.id, group.name]));
    return this.store.categories().map((category) => ({
      ...category,
      groupName: groups.get(category.groupId) ?? 'Unassigned',
    }));
  });

  protected readonly filteredCategories = computed<CategoryViewModel[]>(() => {
    const query = this.categoryQuery().trim().toLowerCase();
    const groupFilter = this.selectedGroupFilter();

    return this.categoriesView()
      .filter((category) => {
        const matchesGroup = groupFilter === null || category.groupId === groupFilter;
        const matchesQuery = query.length === 0 || category.name.toLowerCase().includes(query);
        return matchesGroup && matchesQuery;
      });
  });

  protected readonly selectedCategory = computed<CategoryViewModel | null>(() => {
    const id = this.selectedCategoryId();
    if (!id) {
      return null;
    }
    return this.categoriesView().find((category) => category.id === id) ?? null;
  });

  protected readonly categoryForm = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required, Validators.maxLength(60)] }),
    groupId: this.fb.control('', { validators: [Validators.required] }),
    color: this.fb.control('', { validators: [Validators.maxLength(7)] }),
    icon: this.fb.control('', { validators: [Validators.maxLength(32)] }),
  });

  protected readonly categoryGroupForm = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required, Validators.maxLength(60)] }),
    color: this.fb.control('#0EA5A5', { validators: [Validators.maxLength(7)] }),
    icon: this.fb.control(canonicalHeroIconName('folder'), { validators: [Validators.maxLength(32)] }),
  });

  protected readonly categoryFormControls = this.categoryForm.controls;
  protected readonly categoryGroupFormControls = this.categoryGroupForm.controls;

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

      if (!currentId || !categories.some((category) => category.id === currentId)) {
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
    if (panel === 'categories' && this.store.groups().length > 0 && !this.selectedCategoryId()) {
      const first = this.categoriesView()[0]?.id ?? null;
      this.selectedCategoryId.set(first);
    }
    if (panel === 'profile') {
      this.categoryEditorMode.set(null);
      this.groupEditorMode.set(null);
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
    if (!categories.some((category) => category.id === this.selectedCategoryId())) {
      const first = categories[0]?.id ?? null;
      this.selectedCategoryId.set(first);
    }
  }

  protected selectGroupFilter(groupId: string | null): void {
    this.selectedGroupFilter.set(groupId);
    const categories = this.filteredCategories();
    if (!categories.some((category) => category.id === this.selectedCategoryId())) {
      const first = categories[0]?.id ?? null;
      this.selectedCategoryId.set(first);
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
      this.selectedGroupFilter() ??
      this.store.groups()[0]?.id ??
      '';

    this.categoryForm.setValue({
      name: '',
      groupId: defaultGroup,
      color: this.resolveGroupColor(defaultGroup) ?? '#0EA5A5',
      icon: '',
    });
    this.categoryForm.markAsPristine();
    this.categoryForm.markAsUntouched();
    this.selectedCategoryId.set(null);
  }

  protected openCategoryEditor(categoryId: string): void {
    const category = this.store.categories().find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    this.store.clearError();
    this.categoryEditorMode.set('edit');
    this.selectedCategoryId.set(categoryId);
    this.categoryForm.setValue({
      name: category.name,
      groupId: category.groupId,
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
    const message = this.transloco.translate('settings.panels.categories.modals.confirmCategoryDelete');
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
    const message = this.transloco.translate('settings.panels.categories.modals.confirmGroupDelete');
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

  protected dismissError(): void {
    this.store.clearError();
  }

  protected openProfileEditor(): void {}

  protected manageSecurity(): void {}

  private resolveGroupColor(groupId: string): string | null {
    const group = this.store.groups().find((item) => item.id === groupId);
    return group?.color ?? null;
  }
}
