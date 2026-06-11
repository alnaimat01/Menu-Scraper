import * as XLSX from 'xlsx-js-style';
import { NoonFoodParsedItem } from './NoonFoodParser';

export class NoonFoodExcelExporter {
  private capitalizeText(value: any): string {
    if (value === undefined || value === null) return '';

    return String(value)
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private isSizeGroup(group: any): boolean {
  const options = group.choices || group.options || group.modifiers || [];
  if (!options.length) return false;

  const sizeWords = [
    'small',
    'medium',
    'large',
    'regular',
    'family',
    'single',
    'double',
    'triple',
    'half',
    'quarter',
    'full',
    'xs',
    's',
    'm',
    'l',
    'xl',
    'xxl',
    'xxxl',
    'صغير',
    'وسط',
    'كبير',
    'عائلي',
    'نصف',
    'نص',
    'ربع',
    'كامل'
  ];

  const isPureWeightOrPieces = (name: string) => {
    const cleanName = name.trim().toLowerCase();

    return (
      /^(\d+(\.\d+)?|\d+\/\d+)\s*(g|gm|gram|grams|kg|kilo|kilogram|kilograms|oz|ounce|ounces|l|liter|litre|liters|litres|ml|gallon|gallons|galon)$/.test(cleanName) ||
      /^(half|quarter)\s*(kg|kilo|kilogram)$/.test(cleanName) ||
      /^(\d+)\s*(pc|pcs|piece|pieces)$/.test(cleanName) ||
      /^(نص|نصف|ربع)\s*(كيلو|كجم|kg)$/.test(cleanName) ||
      /^(\d+)\s*(قطعة|قطع)$/.test(cleanName)
    );
  };

  const isPureSizeName = (name: string) => {
    const cleanName = name.trim().toLowerCase();

    if (!cleanName) return false;

    if (sizeWords.includes(cleanName)) return true;

    const sizeWithMeasureRegex =
      /^(small|medium|large|regular|family|single|double|triple|half|quarter|full|xs|s|m|l|xl|xxl|xxxl)\s*(\(?\d+(\.\d+)?\s*(ml|l|liter|litre|oz|g|gm|gram|kg|piece|pieces|pc|pcs)\)?)$/;

    if (sizeWithMeasureRegex.test(cleanName)) return true;

    return isPureWeightOrPieces(cleanName);
  };

  const optionNames = options
    .map((option: any) => String(option.name || option.title || '').trim())
    .filter(Boolean);

  if (optionNames.length === 0) return false;

  const sizeCount = optionNames.filter((name: string) =>
    isPureSizeName(name)
  ).length;

  return sizeCount >= Math.ceil(optionNames.length * 0.7);
}
  private calculateFinalSizePrice(itemPrice: any, sizePrice: any): string {
    const base = Number(itemPrice) || 0;
    const extra = Number(sizePrice) || 0;

    return String(Number((base + extra).toFixed(3)));
  }

  exportToExcel(items: NoonFoodParsedItem[], restaurantName: string, restaurantId: string): void {
    console.log('📊 Generating Noon Food Excel file...');
    console.log(`📝 Total items: ${items.length}`);
    console.log(`🏪 Restaurant: ${restaurantName}`);
    console.log(`🔢 Restaurant ID: ${restaurantId}`);

    const getGroupBaseName = (group: any) =>
      group.sectionName || group.name || group.title || '';

    const getGroupSignature = (group: any) => {
      const groupName = getGroupBaseName(group);
      const options = group.choices || group.options || group.modifiers || [];

      const optionsSignature = options
        .map((option: any) => [
          option.name || option.title || '',
          option.price ?? '',
          option.oldPrice === -1 ? '' : (option.oldPrice ?? '')
        ].join('|'))
        .join('||');

      return [
        groupName,
        group.minQuantity ?? group.min ?? '',
        group.maxQuantity ?? group.max ?? '',
        optionsSignature
      ].join('###');
    };

    const groupNameCounters = new Map<string, number>();
    const groupSignatureToUniqueName = new Map<string, string>();

    items.forEach(item => {
      if (!item.modifiers || item.modifiers.length === 0) return;

      item.modifiers
        .filter((group: any) => !this.isSizeGroup(group))
        .forEach((group: any) => {
          const baseName = getGroupBaseName(group);
          const signature = getGroupSignature(group);

          if (groupSignatureToUniqueName.has(signature)) return;

          const currentCount = groupNameCounters.get(baseName) || 0;
          const uniqueName = currentCount === 0
            ? baseName
            : `${baseName} (${currentCount + 1})`;

          groupNameCounters.set(baseName, currentCount + 1);
          groupSignatureToUniqueName.set(signature, uniqueName);
        });
    });

    const getUniqueGroupName = (group: any) => {
      const signature = getGroupSignature(group);
      return groupSignatureToUniqueName.get(signature) || getGroupBaseName(group);
    };

    const exportItems = items.filter(item => {
      const categoryName = String(item.category || '').trim().toLowerCase();

      return !(
        categoryName.includes('picks for you') ||
        categoryName.includes('اختيارات على ذوقك') ||
        categoryName.includes('bestselling')
      );
    });

    const worksheetData = [
      ['Category', 'Item Name', 'Size', 'Price', 'Description', 'Choice Groups'],
      ...exportItems.flatMap(item => {
        const choiceGroupNames = item.modifiers && item.modifiers.length > 0
          ? item.modifiers
              .filter((group: any) => !this.isSizeGroup(group))
              .map((group: any) => getUniqueGroupName(group))
              .filter(Boolean)
              .join(' #')
          : item.choiceGroups;

        const sizeGroup = item.modifiers?.find((group: any) =>
          this.isSizeGroup(group)
        );

        const sizeOptions = sizeGroup?.choices || [];

        if (sizeOptions.length === 0) {
          return [[
            this.capitalizeText(item.category),
            this.capitalizeText(item.itemName),
            this.capitalizeText(item.size),
            String(item.price),
            item.description,
            choiceGroupNames
          ]];
        }

        return sizeOptions.map((sizeOption: any) => [
          this.capitalizeText(item.category),
          this.capitalizeText(item.itemName),
          this.capitalizeText(sizeOption.name || ''),
          String(this.calculateFinalSizePrice(item.price, sizeOption.price)),
          item.description,
          choiceGroupNames
        ]);
      })
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    for (let row = 2; row <= worksheetData.length; row++) {
      const priceCell = worksheet[`D${row}`];

      if (!priceCell) continue;

      if (Number(priceCell.v) === 0) {
        priceCell.s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: 'FF0000' }
          }
        };
      }
    }

    const modifiersMap = new Map<string, any[]>();

    items.forEach(item => {
      if (!item.modifiers || item.modifiers.length === 0) return;

      item.modifiers
        .filter((group: any) => !this.isSizeGroup(group))
        .forEach((group: any) => {
          const options = group.choices || group.options || group.modifiers || [];

          options.forEach((option: any) => {
            const row = [
              getUniqueGroupName(group),
              option.name || option.title || '',
              option.price ?? '',
              option.oldPrice === -1 ? '' : (option.oldPrice ?? ''),
              group.minQuantity ?? group.min ?? '',
              group.maxQuantity ?? group.max ?? ''
            ];

            const key = row.join('||');
            modifiersMap.set(key, row);
          });
        });
    });

    const modifiersRows = Array.from(modifiersMap.values());

    const modifiersData = [
      ['Group Name', 'Option Name', 'Option Price', 'Old Price', 'Min', 'Max'],
      ...modifiersRows
    ];

    const modifiersWorksheet = XLSX.utils.aoa_to_sheet(modifiersData);

    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 50 },
      { wch: 40 }
    ];

    modifiersWorksheet['!cols'] = [
      { wch: 30 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu');
    XLSX.utils.book_append_sheet(workbook, modifiersWorksheet, 'Modifiers');

    const cleanName = restaurantName
      .trim()
      .replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const filename = `${cleanName}.xlsx`;

    XLSX.writeFile(workbook, filename);

    console.log(`✅ Noon Food Excel file created: ${filename}`);
  }
}