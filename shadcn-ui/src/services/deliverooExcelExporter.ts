import * as XLSX from 'xlsx-js-style';
import { ParsedMenuItem } from './sourceCodeParser';

export class DeliverooExcelExporter {
  private isSizeGroup(group: any): boolean {
    
  const groupName = String(group.sectionName || group.name || group.title || '').toLowerCase();

  const groupNameLooksLikeSize =
    groupName.includes('size') ||
    groupName.includes('حجم') ||
    groupName.includes('الحجم');

  if (groupNameLooksLikeSize) return true;

  const options = group.choices || group.options || group.modifierOptions || group.modifiers || [];
  if (!options.length) return false;

  const clearSizeWords = [
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
      /^(\d+(\.\d+)?|\d+\/\d+)\s*(g|gm|gram|grams|kg|kilo|kilogram|kilograms|oz|ounce|ounces|l|liter|litre|liters|litres|gallon|gallons|galon)$/.test(cleanName) ||
      /^(half|quarter)\s*(kg|kilo|kilogram)$/.test(cleanName) ||
      /^(\d+)\s*(pc|pcs|piece|pieces)$/.test(cleanName) ||
      /^(نص|نصف|ربع)\s*(كيلو|كجم|kg)$/.test(cleanName) ||
      /^(\d+)\s*(قطعة|قطع)$/.test(cleanName)
    );
  };

  const sizeLikeOptionsCount = options.filter((option: any) => {
    const optionName = String(option.name || option.title || '').toLowerCase().trim();

    if (!optionName) return false;

  // Only treat Small / Medium / Large style options as sizes
  // when the option itself represents a size.
  // Prevents false size detection for options such as:
  // "Natural-Cut French Fries - Medium"
  // "Beef Burger - Large"
  // "Chicken Wrap - Small"
  // These are modifier options, not actual size options.

    const hasClearSizeWord = clearSizeWords.some(keyword => {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return (
    optionName === keyword ||
    new RegExp(`^${escapedKeyword}\\s*\\d*$`).test(optionName) ||
    new RegExp(`^\\d+\\s*${escapedKeyword}$`).test(optionName)
  );
});

    return hasClearSizeWord || isPureWeightOrPieces(optionName);
  }).length;

  return sizeLikeOptionsCount >= Math.ceil(options.length * 0.7);
}

private capitalizeText(value: any): string {
  if (value === undefined || value === null) return '';

  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

private calculateFinalSizePrice(itemPrice: any, sizePrice: any): string {
  const base = Number(itemPrice) || 0;
  const extra = Number(sizePrice) || 0;

  return String(Number((base + extra).toFixed(3)));
}

  exportToExcel(items: ParsedMenuItem[], restaurantName: string, restaurantId: string): void {
    console.log('📊 Generating Excel file...');
    console.log(`📝 Total items: ${items.length}`);
    console.log(`🏪 Restaurant: ${restaurantName}`);
    console.log(`🔢 Restaurant ID: ${restaurantId}`);

    // Create worksheet data
    const getGroupBaseName = (group: any) =>
  group.sectionName || group.name || group.title || '';

const normalizeText = (value: any) =>
  String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const normalizePrice = (value: any) => {
  if (value === undefined || value === null || value === '') return '';
  const num = Number(value);
  return isNaN(num) ? normalizeText(value) : String(num);
};

// Generate a unique signature for each modifier group.
// Prevents duplicate groups by comparing:
// - Group name
// - Min / Max selection
// - Option names
// - Option prices
// Ignores:
// - Extra spaces
// - Upper/lower case differences
// - Different option order



const getGroupSignature = (group: any) => {
  const groupName = normalizeText(getGroupBaseName(group));
  const options = group.choices || group.options || group.modifierOptions || group.modifiers || [];

  const optionsSignature = options
    .map((option: any) => [
      normalizeText(option.name || option.title || ''),
      normalizePrice(option.price),
      normalizePrice(option.oldPrice === -1 ? '' : option.oldPrice)
    ].join('|'))
    .sort()
    .join('||');

  return [
    groupName,
    normalizePrice(group.minQuantity ?? group.min ?? group.minSelection ?? ''),
    normalizePrice(group.maxQuantity ?? group.max ?? group.maxSelection ?? ''),
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
    categoryName.includes('اختيارات على ذوقك')
  );
});
    const worksheetData = [
      // Header row
      ['Category', 'Item Name', 'Size', 'Price', 'Description', 'Choice Groups'],
      // Data rows
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

  const sizeOptions =
  sizeGroup?.choices ||
  sizeGroup?.options ||
  sizeGroup?.modifierOptions ||
  [];

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

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    // Highlight items with price = 0
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
    const writtenModifierGroups = new Set<string>();

items.forEach(item => {
  if (!item.modifiers || item.modifiers.length === 0) return;

  item.modifiers
    .filter((group: any) => !this.isSizeGroup(group))
    .forEach((group: any) => {
      const options = group.choices || group.options || group.modifierOptions || group.modifiers || [];

      const groupSignature = getGroupSignature(group);

if (writtenModifierGroups.has(groupSignature)) {
  return;
}

writtenModifierGroups.add(groupSignature);

options.forEach((option: any) => {
  const row = [
    getUniqueGroupName(group),
    option.name || option.title || '',
    option.price ?? '',
    option.oldPrice === -1 ? '' : (option.oldPrice ?? ''),
    group.minQuantity ?? group.min ?? group.minSelection ?? '',
    group.maxQuantity ?? group.max ?? group.maxSelection ?? ''
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

modifiersWorksheet['!cols'] = [
  { wch: 30 },  // Group Name
  { wch: 30 },  // Option Name
  { wch: 15 },  // Option Price
  { wch: 15 },  // Old Price
  { wch: 10 },  // Min
  { wch: 10 }   // Max
];

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 },  // Category
      { wch: 30 },  // Item Name
      { wch: 15 },  // Size
      { wch: 12 },  // Price
      { wch: 50 },  // Description
      { wch: 40 }   // Choice Groups
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu');
    XLSX.utils.book_append_sheet(workbook, modifiersWorksheet, 'Modifiers');

    // Generate simple filename - only restaurant name
    const cleanName = restaurantName
      .trim()
      .replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, '') // Remove special chars but keep spaces and hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length
    const filename = `${cleanName}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, filename);

    console.log(`✅ Excel file created: ${filename}`);
  }
}