import * as XLSX from 'xlsx-js-style';
import { ParsedMenuItem } from './sourceCodeParser';

export class ExcelExporter {
  private isSizeGroup(group: any): boolean {
  const groupName = String(group.sectionName || group.name || group.title || '').toLowerCase();

  const groupNameLooksLikeSize =
    groupName.includes('size') ||
    groupName.includes('حجم') ||
    groupName.includes('الحجم');

  const options = group.choices || group.options || group.modifiers || [];

  const sizeKeywords = [
    'small',
    'medium',
    'large',
    'big',
    'regular',
    'family',
    'single',
    'double',
    'triple',

    'kilo',
    'kg',
    'gram',
    'gm',
    'half kilo',
    '1/2 kilo',
    '1 kilo',
    '250 gm',
    '500 gm',

    'piece',
    'pieces',
    'pcs',
    'pc',

    'صغير',
    'وسط',
    'كبير',
    'عائلي',
    'كيلو',
    'نص كيلو',
    'نصف كيلو',
    'غرام',
    'جرام',
    'غم',
    'قطعة',
    'قطع'
  ];

  const optionLooksLikeSize = options.some((option: any) => {
    const optionName = String(option.name || option.title || '').toLowerCase();

    return sizeKeywords.some(keyword => optionName.includes(keyword));
  });

  return groupNameLooksLikeSize || optionLooksLikeSize;
}
  exportToExcel(items: ParsedMenuItem[], restaurantName: string, restaurantId: string): void {
    console.log('📊 Generating Excel file...');
    console.log(`📝 Total items: ${items.length}`);
    console.log(`🏪 Restaurant: ${restaurantName}`);
    console.log(`🔢 Restaurant ID: ${restaurantId}`);

    // Create worksheet data
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
    categoryName.includes('offer') ||
    categoryName.includes('offers') ||
    categoryName.includes('اختيارات على ذوقك') ||
    categoryName.includes('عروض') ||
    categoryName.includes('العروض')
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

  const sizeOptions = sizeGroup?.choices || [];

  if (sizeOptions.length === 0) {
    return [[
  item.category,
  item.itemName,
  item.size,
  String(item.price),
  item.description,
  choiceGroupNames
]];
  }

 return sizeOptions.map((sizeOption: any) => [
    item.category,
    item.itemName,
    sizeOption.name || '',
    String(sizeOption.price ?? item.price),
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