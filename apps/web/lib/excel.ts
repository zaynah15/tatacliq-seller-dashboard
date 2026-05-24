/**
 * Excel parsing + enriched Excel generation.
 * Runs in Next.js API routes (Node runtime).
 */
import * as XLSX from 'xlsx';

export interface ParsedProduct {
  rowIndex: number;
  sku?: string;
  title?: string;
  brand?: string;
  category?: string;
  mrp?: number;
  description?: string;
  color?: string;
  // Raw row data so we keep anything else the seller sent
  raw: Record<string, any>;
}

// Map common column name variations to canonical fields
const COLUMN_ALIASES: Record<string, keyof ParsedProduct> = {
  'product name': 'title',
  'product title': 'title',
  'item title': 'title',
  'title': 'title',
  'name': 'title',

  'sku': 'sku',
  'sku code': 'sku',
  'seller sku': 'sku',
  'article id': 'sku',
  'item code': 'sku',

  'brand': 'brand',
  'brand name': 'brand',

  'category': 'category',
  'product type': 'category',
  'item category': 'category',

  'mrp': 'mrp',
  'mrp (inr)': 'mrp',
  'price': 'mrp',
  'selling price': 'mrp',

  'description': 'description',
  'product description': 'description',
  'desc': 'description',

  'color': 'color',
  'colour': 'color',
  'color family': 'color',
};

export function parseExcelBuffer(buffer: ArrayBuffer): ParsedProduct[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = wb.Sheets[firstSheetName];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows.map((row, idx) => {
    const normalized: ParsedProduct = { rowIndex: idx + 2, raw: row };
    for (const [key, val] of Object.entries(row)) {
      const aliasKey = key.toLowerCase().trim();
      const canonical = COLUMN_ALIASES[aliasKey];
      if (canonical) {
        if (canonical === 'mrp') {
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.]/g, ''));
          if (!isNaN(num)) (normalized as any)[canonical] = num;
        } else {
          (normalized as any)[canonical] = String(val).trim() || undefined;
        }
      }
    }
    return normalized;
  });
}

export interface EnrichedProduct extends ParsedProduct {
  enriched: {
    product_type?: string;
    hsn_code?: string;
    fabric_family?: string;
    fabric_composition?: string;
    sleeve_type?: string;
    neck_collar?: string;
    neckline?: string;
    fit_type?: string;
    pattern?: string;
    occasion?: string;
    age_band?: string;
    wash_care?: string;
    country_of_origin?: string;
    manufacturer?: string;
    color_family?: string;
    seo_keywords?: string;
    enhanced_description?: string;
    enhanced_title?: string;
    features?: string;
    transparency?: string;
    pocket_type?: string;
    hemline?: string;
    cuff_style?: string;
    stitching?: string;
    branding_logo?: string;
    size_chart?: string;
    ean?: string;
  };
  confidence: number; // 0..100
  matchedImages: string[]; // filenames that matched this SKU
}

const MASTER_COLUMNS = [
  'sku',
  'ean',
  'title',
  'enhanced_title',
  'brand',
  'category',
  'product_type',
  'hsn_code',
  'mrp',
  'color_family',
  'fabric_family',
  'fabric_composition',
  'sleeve_type',
  'fit_type',
  'neck_collar',
  'neckline',
  'pattern',
  'occasion',
  'age_band',
  'wash_care',
  'country_of_origin',
  'manufacturer',
  'pocket_type',
  'hemline',
  'cuff_style',
  'transparency',
  'branding_logo',
  'stitching',
  'features',
  'size_chart',
  'seo_keywords',
  'enhanced_description',
  'image_1',
  'image_2',
  'image_3',
  'image_4',
  '_ai_confidence',
];

export function buildEnrichedExcel(products: EnrichedProduct[]): ArrayBuffer {
  const rows = products.map((p) => {
    const row: Record<string, any> = {};
    row.sku = p.sku ?? '';
    row.ean = p.enriched.ean ?? '';
    row.title = p.title ?? '';
    row.enhanced_title = p.enriched.enhanced_title ?? p.title ?? '';
    row.brand = p.brand ?? '';
    row.category = p.category ?? p.enriched.product_type ?? '';
    row.product_type = p.enriched.product_type ?? '';
    row.hsn_code = p.enriched.hsn_code ?? '';
    row.mrp = p.mrp ?? '';
    row.color_family = p.enriched.color_family ?? p.color ?? '';
    row.fabric_family = p.enriched.fabric_family ?? '';
    row.fabric_composition = p.enriched.fabric_composition ?? '';
    row.sleeve_type = p.enriched.sleeve_type ?? '';
    row.fit_type = p.enriched.fit_type ?? '';
    row.neck_collar = p.enriched.neck_collar ?? '';
    row.neckline = p.enriched.neckline ?? '';
    row.pattern = p.enriched.pattern ?? '';
    row.occasion = p.enriched.occasion ?? '';
    row.age_band = p.enriched.age_band ?? '';
    row.wash_care = p.enriched.wash_care ?? '';
    row.country_of_origin = p.enriched.country_of_origin ?? 'India';
    row.manufacturer = p.enriched.manufacturer ?? '';
    row.pocket_type = p.enriched.pocket_type ?? '';
    row.hemline = p.enriched.hemline ?? '';
    row.cuff_style = p.enriched.cuff_style ?? '';
    row.transparency = p.enriched.transparency ?? '';
    row.branding_logo = p.enriched.branding_logo ?? '';
    row.stitching = p.enriched.stitching ?? '';
    row.features = p.enriched.features ?? '';
    row.size_chart = p.enriched.size_chart ?? '';
    row.seo_keywords = p.enriched.seo_keywords ?? '';
    row.enhanced_description = p.enriched.enhanced_description ?? p.description ?? '';
    row.image_1 = p.matchedImages[0] ?? '';
    row.image_2 = p.matchedImages[1] ?? '';
    row.image_3 = p.matchedImages[2] ?? '';
    row.image_4 = p.matchedImages[3] ?? '';
    row._ai_confidence = `${p.confidence}%`;
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: MASTER_COLUMNS });

  // Auto-width columns based on header length
  ws['!cols'] = MASTER_COLUMNS.map((col) => ({ wch: Math.max(col.length + 2, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Enriched Catalog');

  // Add a metadata sheet
  const metaWs = XLSX.utils.json_to_sheet([
    { key: 'Generated', value: new Date().toISOString() },
    { key: 'Total Products', value: products.length },
    { key: 'Source', value: 'TataCLiQ Seller Dashboard — AI Enrichment' },
    { key: 'Note', value: 'Cross-references: Myntra, Ajio, Amazon Fashion only. Never Tata CLiQ.' },
  ]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

/**
 * Match image filenames to products by SKU.
 * Convention: "SKU.jpg", "SKU_1.jpg", "SKU-front.png" etc.
 */
export function matchImagesToProduct(sku: string | undefined, allImages: string[]): string[] {
  if (!sku) return [];
  const skuLower = sku.toLowerCase();
  return allImages
    .filter((name) => name.toLowerCase().includes(skuLower))
    .sort();
}
