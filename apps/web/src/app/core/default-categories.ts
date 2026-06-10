import { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_LANGUAGE, LanguageCode } from '../i18n/languages';
import { canonicalHeroIconName } from '../shared/icons/heroicons';
import { logError } from './logger';

interface CategoryTemplate {
  readonly key: string;
  readonly icon: string;
  readonly color?: string | null;
  readonly name: Record<LanguageCode, string>;
  readonly children?: readonly CategoryTemplate[];
}

interface CategoryGroupTemplate {
  readonly key: string;
  readonly icon: string;
  readonly color: string | null;
  readonly name: Record<LanguageCode, string>;
  readonly categories: readonly CategoryTemplate[];
}

const CATEGORY_TEMPLATES: readonly CategoryGroupTemplate[] = [
  {
    key: 'essentials',
    icon: canonicalHeroIconName('heroHome') ?? 'heroHome',
    color: '#0EA5A5',
    name: {
      en: 'Essentials',
      pl: 'Podstawowe',
    },
    categories: [
      {
        key: 'food',
        icon: canonicalHeroIconName('heroCake') ?? 'heroCake',
        color: '#0EA5A5',
        name: {
          en: 'Food',
          pl: 'Jedzenie',
        },
        children: [
          {
            key: 'groceries',
            icon: canonicalHeroIconName('heroShoppingCart') ?? 'heroShoppingCart',
            color: '#0EA5A5',
            name: {
              en: 'Groceries',
              pl: 'Spożywcze',
            },
            children: [
              {
                key: 'biedronka',
                icon: canonicalHeroIconName('heroBuildingStorefront') ?? 'heroBuildingStorefront',
                color: '#0EA5A5',
                name: {
                  en: 'Biedronka',
                  pl: 'Biedronka',
                },
              },
            ],
          },
        ],
      },
      {
        key: 'shopping',
        icon: canonicalHeroIconName('heroShoppingCart') ?? 'heroShoppingCart',
        color: '#0EA5A5',
        name: {
          en: 'Shopping',
          pl: 'Zakupy',
        },
      },
      {
        key: 'transport',
        icon: canonicalHeroIconName('heroTruck') ?? 'heroTruck',
        color: '#0EA5A5',
        name: {
          en: 'Transport',
          pl: 'Transport',
        },
      },
      {
        key: 'utilities',
        icon: canonicalHeroIconName('heroBolt') ?? 'heroBolt',
        color: '#0EA5A5',
        name: {
          en: 'Utilities',
          pl: 'Opłaty stałe',
        },
      },
    ],
  },
  {
    key: 'lifestyle',
    icon: canonicalHeroIconName('heroSparkles') ?? 'heroSparkles',
    color: '#F59E0B',
    name: {
      en: 'Lifestyle',
      pl: 'Styl życia',
    },
    categories: [
      {
        key: 'diningOut',
        icon: canonicalHeroIconName('heroCake') ?? 'heroCake',
        color: '#F59E0B',
        name: {
          en: 'Dining Out',
          pl: 'Jedzenie na mieście',
        },
      },
      {
        key: 'entertainment',
        icon: canonicalHeroIconName('heroFilm') ?? 'heroFilm',
        color: '#F59E0B',
        name: {
          en: 'Entertainment',
          pl: 'Rozrywka',
        },
      },
    ],
  },
  {
    key: 'income',
    icon: canonicalHeroIconName('heroBanknotes') ?? 'heroBanknotes',
    color: '#2DD4BF',
    name: {
      en: 'Income',
      pl: 'Dochody',
    },
    categories: [
      {
        key: 'salary',
        icon: canonicalHeroIconName('heroBriefcase') ?? 'heroBriefcase',
        color: '#2DD4BF',
        name: {
          en: 'Salary',
          pl: 'Pensja',
        },
      },
      {
        key: 'sideHustle',
        icon: canonicalHeroIconName('heroRocketLaunch') ?? 'heroRocketLaunch',
        color: '#2DD4BF',
        name: {
          en: 'Side Hustle',
          pl: 'Dodatkowe źródło',
        },
      },
    ],
  },
] as const;

export async function ensureDefaultCategoriesForUser(
  client: SupabaseClient,
  ownerId: string,
  language: LanguageCode,
): Promise<void> {
  const effectiveLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;

  const { error: countError, count } = await client
    .from('categories')
    .select('id', { head: true, count: 'exact' })
    .eq('owner_id', ownerId);

  if (countError) {
    logError('DefaultCategories', 'Failed to count existing categories', countError);
    return;
  }

  if ((count ?? 0) > 0) {
    return;
  }

  for (const groupTemplate of CATEGORY_TEMPLATES) {
    const groupName = resolveTranslation(groupTemplate.name, effectiveLanguage);

    let groupId: string | null = null;

    const { data: existingGroups, error: groupLookupError } = await client
      .from('categories_group')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('name', groupName)
      .limit(1);

    if (!groupLookupError && existingGroups && existingGroups.length > 0) {
      groupId = existingGroups[0].id;
    }

    if (!groupId) {
      const { data: insertedGroup, error: groupInsertError } = await client
        .from('categories_group')
        .insert({
          owner_id: ownerId,
          name: groupName,
          color: groupTemplate.color,
          icon: groupTemplate.icon,
        })
        .select('id')
        .single();

      if (groupInsertError) {
        logError('DefaultCategories', 'Failed to insert group', groupName, groupInsertError);
        continue;
      }

      groupId = insertedGroup.id;
    }

    if (!groupId) {
      continue;
    }

    for (const categoryTemplate of groupTemplate.categories) {
      await ensureDefaultCategory(
        client,
        ownerId,
        groupId,
        groupTemplate.color,
        categoryTemplate,
        effectiveLanguage,
        null,
      );
    }
  }
}

async function ensureDefaultCategory(
  client: SupabaseClient,
  ownerId: string,
  groupId: string,
  groupColor: string | null,
  categoryTemplate: CategoryTemplate,
  language: LanguageCode,
  parentId: string | null,
): Promise<string | null> {
  const categoryName = resolveTranslation(categoryTemplate.name, language);

  const { data: existingCategory, error: categoryLookupError } = await client
    .from('categories')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('name', categoryName)
    .limit(1);

  let categoryId = !categoryLookupError && existingCategory && existingCategory.length > 0
    ? existingCategory[0].id
    : null;

  if (!categoryId) {
    const { data: insertedCategory, error: categoryInsertError } = await client
      .from('categories')
      .insert({
        owner_id: ownerId,
        name: categoryName,
        color: categoryTemplate.color ?? groupColor,
        icon: categoryTemplate.icon,
        group_id: groupId,
        parent_id: parentId,
      })
      .select('id')
      .single();

    if (categoryInsertError) {
      logError('DefaultCategories', 'Failed to insert category', categoryName, categoryInsertError);
      return null;
    }

    categoryId = insertedCategory.id;
  }

  for (const childTemplate of categoryTemplate.children ?? []) {
    await ensureDefaultCategory(
      client,
      ownerId,
      groupId,
      categoryTemplate.color ?? groupColor,
      childTemplate,
      language,
      categoryId,
    );
  }

  return categoryId;
}

function resolveTranslation(dictionary: Record<LanguageCode, string>, language: LanguageCode): string {
  return dictionary[language] ?? dictionary[DEFAULT_LANGUAGE];
}

function isSupportedLanguage(language: string): language is LanguageCode {
  return (['en', 'pl'] as const).includes(language as LanguageCode);
}
