export interface NoonFoodParsedItem {
  category: string;
  itemName: string;
  description: string;
  price: string;
  size: string;
  choiceGroups: string;
  itemId?: string | number;
  modifiers?: NoonFoodModifierGroup[];
}

export interface NoonFoodModifierGroup {
  name: string;
  title: string;
  sectionName: string;
  min: number;
  max: number;
  minQuantity: number;
  maxQuantity: number;
  choices: NoonFoodModifierOption[];
  options: NoonFoodModifierOption[];
}

export interface NoonFoodModifierOption {
  name: string;
  title: string;
  price: string;
  oldPrice: string;
  itemCode?: string;
}

export class NoonFoodParser {
  parse(noonData: any): NoonFoodParsedItem[] {
    if (!noonData?.menu) {
      throw new Error('Invalid Noon Food data: menu is missing');
    }

    const menu = noonData.menu;

    if (!Array.isArray(menu.items)) {
      throw new Error('Invalid Noon Food data: menu.items is missing');
    }

    const allItems = menu.items || [];
    const categories = Array.isArray(menu.categories) ? menu.categories : [];
    const modifierGroups = Array.isArray(menu.modifiers) ? menu.modifiers : [];

    const itemByCode = new Map<string, any>();
    allItems.forEach((item: any) => {
      if (item?.itemCode) {
        itemByCode.set(String(item.itemCode), item);
      }
    });

    const modifierGroupByCode = new Map<string, any>();
    modifierGroups.forEach((group: any) => {
      if (group?.modifierCode) {
        modifierGroupByCode.set(String(group.modifierCode), group);
      }
    });

    const categoryByItemCode = this.buildCategoryByItemCode(categories);

    const mainItems = allItems
      .filter((item: any) => item?.itemType === 'main')
      .sort((a: any, b: any) => {
        const aPosition = Number(a.position ?? 0);
        const bPosition = Number(b.position ?? 0);
        return aPosition - bPosition;
      });

    return mainItems.map((item: any): NoonFoodParsedItem => {
      const modifiers = this.extractModifiers(
        item,
        modifierGroupByCode,
        itemByCode
      );

      return {
        category: categoryByItemCode.get(String(item.itemCode)) || '',
        itemName: item.name || '',
        description: item.itemDesc || '',
        price: this.formatPrice(item.price),
        size: '',
        choiceGroups: modifiers
          .map(group => group.name)
          .filter(Boolean)
          .join(' #'),
        itemId: item.itemCode,
        modifiers
      };
    });
  }

  private buildCategoryByItemCode(categories: any[]): Map<string, string> {
    const categoryByItemCode = new Map<string, string>();

    categories
      .filter((category: any) => category?.categoryType !== 'trending')
      .sort((a: any, b: any) => {
        const aPosition = Number(a.position ?? 0);
        const bPosition = Number(b.position ?? 0);
        return aPosition - bPosition;
      })
      .forEach((category: any) => {
        const categoryName = category?.name || '';

        (category?.items || []).forEach((itemCode: string) => {
          const code = String(itemCode);

          if (!categoryByItemCode.has(code)) {
            categoryByItemCode.set(code, categoryName);
          }
        });
      });

    return categoryByItemCode;
  }

  private extractModifiers(
    item: any,
    modifierGroupByCode: Map<string, any>,
    itemByCode: Map<string, any>
  ): NoonFoodModifierGroup[] {
    const modifierCodes = Array.isArray(item?.modifiers) ? item.modifiers : [];

    return modifierCodes
      .map((modifierCode: string) => {
        const group = modifierGroupByCode.get(String(modifierCode));
        if (!group) return null;

        const groupName = group.name || '';
        const min = Number(group.minTotalOptions ?? 0);
        const max = Number(group.maxTotalOptions ?? 0);

        const options = (Array.isArray(group.options) ? group.options : [])
          .map((option: any) => {
            const optionItem = itemByCode.get(String(option.itemCode));
            const optionName = optionItem?.name || option.itemCode || '';

            return {
              name: optionName,
              title: optionName,
              price: this.formatPrice(option.price ?? optionItem?.price),
              oldPrice: '',
              itemCode: option.itemCode
            };
          })
          .filter((option: NoonFoodModifierOption) => option.name);

        return {
          name: groupName,
          title: groupName,
          sectionName: groupName,
          min,
          max,
          minQuantity: min,
          maxQuantity: max,
          choices: options,
          options
        };
      })
      .filter(Boolean) as NoonFoodModifierGroup[];
  }

  private formatPrice(price: any): string {
    const value =
      typeof price === 'number'
        ? price
        : typeof price === 'string'
          ? parseFloat(price)
          : NaN;

    if (Number.isNaN(value)) return '';

    return String(value);
  }
}