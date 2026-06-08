import type { ParsedMenuItem } from './sourceCodeParser';

export class DeliverooParser {
  parseSourceCode(html: string): ParsedMenuItem[] {
    const nextData = this.extractNextData(html);

    const root =
      nextData?.props?.initialState?.menuPage?.menu?.metas?.root;

    if (!root) {
      throw new Error('Deliveroo menu root not found');
    }

    const allItems = Array.isArray(root.items) ? root.items : [];

const items = allItems.filter((item: any) => {
  return (
    item.categoryId ||
    item.category_id ||
    item.menuCategoryId
  );
});
    const categories = Array.isArray(root.categories) ? root.categories : [];
    const modifierGroups = Array.isArray(root.modifierGroups) ? root.modifierGroups : [];
    

    const categoryMap = new Map<string, string>();

    for (const category of categories) {
      const id = String(category.id || category.uuid || '');
      const name = String(category.name || category.title || 'Uncategorized');

      if (id) {
        categoryMap.set(id, name);
      }
    }

    const modifierGroupMap = new Map<string, any>();

for (const group of modifierGroups) {
  const id = String(group.id || group.uuid || group.drnId || '');

  if (id) {
    modifierGroupMap.set(id, group);
  }
}

    return items.map((item: any) => {
      const categoryId = String(
        item.categoryId ||
        item.category_id ||
        item.menuCategoryId ||
        ''
      );

      return {
        category: categoryMap.get(categoryId) || 'Uncategorized',
        itemName: item.name || item.title || 'Unknown Item',
        description: item.description || '',
        price: this.formatPrice(
          item.price ||
          item.basePrice ||
          item.priceFormatted ||
          item.displayPrice
        ),
        size: '',
        choiceGroups: this.getChoiceGroupNames(item, modifierGroupMap),
modifiers: this.getModifiers(item, modifierGroupMap)
      };
    });
  }

  private extractNextData(html: string): any {
    const match = html.match(
      /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
    );

    if (!match?.[1]) {
      throw new Error('__NEXT_DATA__ not found');
    }

    return JSON.parse(match[1]);
  }

  private formatPrice(price: any): string {
  if (price === undefined || price === null || price === '') {
    return '';
  }

  let value: any = price;

  if (typeof value === 'object') {
    value =
      value.formatted ||
      value.value ||
      value.amount ||
      value.fractional ||
      '';
  }

  const cleaned = String(value)
    .replace(/KD/gi, '')
    .replace(/KWD/gi, '')
    .trim();

  const num = parseFloat(cleaned);

  if (Number.isNaN(num)) {
    return cleaned;
  }

  return String(num);
}

private getChoiceGroupNames(item: any, modifierGroupMap: Map<string, any>): string {
  const groupIds = this.getModifierGroupIds(item);

  return groupIds
    .map((id) => {
      const group = modifierGroupMap.get(id);
      return group?.name || group?.title || '';
    })
    .filter(Boolean)
    .join(' | ');
}

private getModifiers(item: any, modifierGroupMap: Map<string, any>): any[] {
  const groupIds = this.getModifierGroupIds(item);

  return groupIds
  .map((id) => modifierGroupMap.get(id))
  .filter(Boolean)
  .map((group) => ({
    name: group.name || group.title || '',
    min: group.minSelection ?? group.min ?? group.minimumSelection ?? '',
    max: group.maxSelection ?? group.max ?? group.maximumSelection ?? '',
    options: (group.modifierOptions || group.options || group.items || []).map((option: any) => ({
      name: option.name || option.title || '',
      price: this.formatPrice(
        option.price ||
        option.basePrice ||
        option.priceFormatted ||
        option.displayPrice
      )
    }))
  }));
}

private getModifierGroupIds(item: any): string[] {
  const ids =
    item.modifierGroupIds ||
    item.modifier_group_ids ||
    item.modifierGroups ||
    [];

  if (!Array.isArray(ids)) {
    return [];
  }

  return ids.map((id) => String(id));
}
}