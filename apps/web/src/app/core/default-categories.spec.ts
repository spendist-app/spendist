import { heroIconSvg } from '../shared/icons/heroicons';
import { CATEGORY_TEMPLATES } from './default-categories';

describe('default category templates', () => {
  it('use icon names that exist in heroicons', () => {
    const icons = CATEGORY_TEMPLATES.flatMap((group) => [
      group.icon,
      ...group.categories.flatMap((category) => [
        category.icon,
        ...(category.children ?? []).map((child) => child.icon),
      ]),
    ]);

    expect(icons.length).toBeGreaterThan(0);
    expect(icons.filter((icon) => heroIconSvg(icon) === null)).toEqual([]);
  });
});
