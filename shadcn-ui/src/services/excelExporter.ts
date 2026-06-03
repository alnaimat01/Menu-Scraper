import * as XLSX from 'xlsx';
import { ParsedMenuItem } from './sourceCodeParser';

export class ExcelExporter {
  exportToExcel(items: ParsedMenuItem[], restaurantName: string, restaurantId: string): void {
    console.log('📊 Generating Excel file...');
    console.log(`📝 Total items: ${items.length}`);
    console.log(`🏪 Restaurant: ${restaurantName}`);
    console.log(`🔢 Restaurant ID: ${restaurantId}`);

    // Create worksheet data
    const worksheetData = [
      // Header row
      ['Category', 'Item Name', 'Description', 'Price', 'Size', 'Choice Groups'],
      // Data rows
      ...items.map(item => [
        item.category,
        item.itemName,
        item.description,
        item.price,
        item.size,
        item.choiceGroups
      ])
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const modifiersData = [
  ['Group Name', 'Option Name', 'Option Price', 'Old Price', 'Min', 'Max']
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
      { wch: 50 },  // Description
      { wch: 12 },  // Price
      { wch: 15 },  // Size
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