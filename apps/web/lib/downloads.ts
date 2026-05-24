/**
 * Download Center store.
 *
 * The Image Studio and Upload pages register their outputs here so the
 * Download Center can show them in one place. Uses sessionStorage for
 * persistence across navigations within the same tab/session.
 *
 * NOTE: data URLs are kept in-memory only when small; for the .xlsx output
 * we store the Blob in a global cache because sessionStorage has a 5MB cap.
 */

export type DownloadKind = 'image' | 'sheet';

export interface DownloadItem {
  id: string;
  kind: DownloadKind;
  title: string;
  subtitle: string;
  createdAt: string;
  size?: number;
  // For images we store the data URL (small). For sheets we store a key
  // into the in-memory blob cache.
  dataUrl?: string;
  blobKey?: string;
  meta?: Record<string, any>;
}

const STORAGE_KEY = 'tatacliq-downloads-v1';

// In-memory blob cache for large outputs (master sheets). Lost on refresh,
// which is fine — the user can re-run enrichment to get a new one.
const blobCache = new Map<string, Blob>();

export function listDownloads(): DownloadItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DownloadItem[];
  } catch {
    return [];
  }
}

function persist(items: DownloadItem[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('downloads:changed'));
  } catch (err) {
    console.warn('downloads persist failed', err);
  }
}

export function registerImage(args: {
  title: string;
  subtitle: string;
  dataUrl: string;
  width: number;
  height: number;
  engine: string;
}): DownloadItem {
  const item: DownloadItem = {
    id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind: 'image',
    title: args.title,
    subtitle: args.subtitle,
    createdAt: new Date().toISOString(),
    dataUrl: args.dataUrl,
    meta: { width: args.width, height: args.height, engine: args.engine },
  };
  const items = [item, ...listDownloads()];
  persist(items);
  return item;
}

export function registerSheet(args: {
  title: string;
  subtitle: string;
  blob: Blob;
  filename: string;
  productCount: number;
  averageConfidence: number;
}): DownloadItem {
  const blobKey = `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  blobCache.set(blobKey, args.blob);
  const item: DownloadItem = {
    id: blobKey,
    kind: 'sheet',
    title: args.title,
    subtitle: args.subtitle,
    createdAt: new Date().toISOString(),
    size: args.blob.size,
    blobKey,
    meta: {
      filename: args.filename,
      productCount: args.productCount,
      averageConfidence: args.averageConfidence,
    },
  };
  const items = [item, ...listDownloads()];
  persist(items);
  return item;
}

export function getBlob(blobKey: string): Blob | undefined {
  return blobCache.get(blobKey);
}

export function removeDownload(id: string) {
  const items = listDownloads().filter((d) => d.id !== id);
  blobCache.delete(id);
  persist(items);
}

export function clearAll() {
  blobCache.clear();
  persist([]);
}
