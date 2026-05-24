'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import {
  Download,
  FileSpreadsheet,
  ImageIcon,
  Trash2,
  PackageOpen,
} from 'lucide-react';
import { cn, formatRelative } from '@/lib/utils';
import {
  type DownloadItem,
  listDownloads,
  removeDownload,
  clearAll,
  getBlob,
} from '@/lib/downloads';

export default function DownloadsPage() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'image' | 'sheet'>('all');

  useEffect(() => {
    const refresh = () => setItems(listDownloads());
    refresh();
    window.addEventListener('downloads:changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('downloads:changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const filtered = items.filter((i) => filter === 'all' || i.kind === filter);
  const imageCount = items.filter((i) => i.kind === 'image').length;
  const sheetCount = items.filter((i) => i.kind === 'sheet').length;

  function downloadItem(item: DownloadItem) {
    const a = document.createElement('a');
    if (item.kind === 'image' && item.dataUrl) {
      a.href = item.dataUrl;
      a.download = `${item.title.replace(/\.[^.]+$/, '')}_${item.meta?.width}x${item.meta?.height}.jpg`;
      a.click();
    } else if (item.kind === 'sheet' && item.blobKey) {
      const blob = getBlob(item.blobKey);
      if (!blob) {
        alert('This file is no longer in memory. Re-run the enrichment to regenerate it.');
        return;
      }
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = item.meta?.filename ?? 'download.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8 max-w-[1300px] mx-auto">
        <PageHeader
          title="Download Center"
          subtitle="Every enhanced image and enriched master sheet from this session — in one place."
          actions={
            items.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all downloads? This only clears the list — your already-downloaded files are safe.')) {
                    clearAll();
                    setItems([]);
                  }
                }}
                className="btn-outline text-red-700 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            )
          }
        />

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-5">
          <FilterPill
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All"
            count={items.length}
          />
          <FilterPill
            active={filter === 'image'}
            onClick={() => setFilter('image')}
            label="Images"
            count={imageCount}
            icon={<ImageIcon className="w-3.5 h-3.5" />}
          />
          <FilterPill
            active={filter === 'sheet'}
            onClick={() => setFilter('sheet')}
            label="Master sheets"
            count={sheetCount}
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
          />
        </div>

        {filtered.length === 0 ? (
          <Card className="p-16 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 dark:bg-ink-800 text-ink-400 mb-4">
              <PackageOpen className="w-8 h-8" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ink-900 dark:text-white">
              Nothing here yet
            </h3>
            <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
              Use the <a href="/studio" className="text-royal-600 font-medium">AI Image Studio</a> to
              enhance product photos, or the{' '}
              <a href="/upload" className="text-royal-600 font-medium">Upload &amp; Enrich</a> page
              for catalogs. Outputs will appear here.
            </p>
            <div className="mt-6 flex gap-2 justify-center">
              <a href="/studio" className="btn-outline">
                <ImageIcon className="w-4 h-4" /> Open Image Studio
              </a>
              <a href="/upload" className="btn-primary">
                <FileSpreadsheet className="w-4 h-4" /> Upload Catalog
              </a>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <DownloadCard key={item.id} item={item} onDownload={downloadItem} onRemove={removeDownload} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-royal-600 text-white shadow-soft'
          : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200',
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          'ml-1 text-[10px] tabular-nums px-1.5 py-0.5 rounded-full',
          active ? 'bg-white/20' : 'bg-ink-200 dark:bg-ink-700',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function DownloadCard({
  item,
  onDownload,
  onRemove,
}: {
  item: DownloadItem;
  onDownload: (i: DownloadItem) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative">
        {item.kind === 'image' && item.dataUrl ? (
          <div className="aspect-[4/5] bg-ink-100 dark:bg-ink-900 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.dataUrl} alt={item.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[4/5] bg-gradient-to-br from-royal-50 via-royal-100 to-magenta-50 dark:from-royal-950/50 dark:via-royal-900/30 dark:to-magenta-950/40 flex items-center justify-center">
            <FileSpreadsheet className="w-16 h-16 text-royal-600/70" />
          </div>
        )}
        <span
          className={cn(
            'absolute top-3 left-3 pill text-[10px]',
            item.kind === 'image'
              ? 'bg-magenta-100 text-magenta-700'
              : 'bg-royal-100 text-royal-700',
          )}
        >
          {item.kind === 'image' ? 'Image' : 'Master Sheet'}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="font-medium text-ink-900 dark:text-white truncate" title={item.title}>
          {item.title}
        </div>
        <div className="text-xs text-ink-500 mt-0.5 truncate">{item.subtitle}</div>
        <div className="text-[11px] text-ink-400 mt-2">{formatRelative(item.createdAt)}</div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => onDownload(item)} className="btn-primary flex-1 !py-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="btn-outline !p-2"
            title="Remove from list"
          >
            <Trash2 className="w-3.5 h-3.5 text-ink-500" />
          </button>
        </div>
      </div>
    </Card>
  );
}
