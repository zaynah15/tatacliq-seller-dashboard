'use client';

import { useState, useRef } from 'react';
import { DashboardShell } from '@/components/layout/shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import {
  Upload,
  FileSpreadsheet,
  ImageIcon,
  X,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Archive,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerSheet } from '@/lib/downloads';

interface EnrichedPreview {
  rowIndex: number;
  sku?: string;
  title?: string;
  brand?: string;
  mrp?: number;
  confidence: number;
  enriched: Record<string, string>;
  matchedImages: string[];
}

interface PreviewResponse {
  totalProducts: number;
  processed: number;
  truncated: boolean;
  averageConfidence: number;
  usedGemini: boolean;
  imagesFound: number;
  products: EnrichedPreview[];
}

export default function UploadPage() {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);

  const [phase, setPhase] = useState<'idle' | 'enriching' | 'ready' | 'error'>('idle');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('enriched.xlsx');
  const [expanded, setExpanded] = useState<number | null>(null);

  const hasInput = excelFile || zipFile;

  async function runEnrichment() {
    if (!hasInput) return;
    setPhase('enriching');
    setError(null);
    setPreview(null);
    setDownloadBlob(null);

    const form = new FormData();
    if (zipFile) {
      form.append('zip', zipFile);
    } else if (excelFile) {
      form.append('excel', excelFile);
      for (const img of imageFiles) form.append('images', img);
    }

    try {
      // Step 1: get JSON preview
      const previewRes = await fetch('/api/enrich-preview', { method: 'POST', body: form });
      if (!previewRes.ok) {
        const j = await previewRes.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${previewRes.status}`);
      }
      const previewData: PreviewResponse = await previewRes.json();
      setPreview(previewData);

      // Step 2: get downloadable file (re-runs, but lets user download exact same data)
      const form2 = new FormData();
      if (zipFile) form2.append('zip', zipFile);
      else if (excelFile) {
        form2.append('excel', excelFile);
        for (const img of imageFiles) form2.append('images', img);
      }
      const fileRes = await fetch('/api/enrich-batch', { method: 'POST', body: form2 });
      if (!fileRes.ok) throw new Error('Failed to build downloadable file');
      const blob = await fileRes.blob();
      setDownloadBlob(blob);
      const cd = fileRes.headers.get('Content-Disposition') ?? '';
      const m = cd.match(/filename="(.+?)"/);
      const filename = m?.[1] ?? 'enriched.xlsx';
      setDownloadFilename(filename);

      registerSheet({
        title: filename,
        subtitle: `${previewData.processed} products • avg ${previewData.averageConfidence}% confidence`,
        blob,
        filename,
        productCount: previewData.processed,
        averageConfidence: previewData.averageConfidence,
      });

      setPhase('ready');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      setPhase('error');
    }
  }

  function downloadFile() {
    if (!downloadBlob) return;
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setExcelFile(null);
    setImageFiles([]);
    setZipFile(null);
    setPreview(null);
    setDownloadBlob(null);
    setError(null);
    setPhase('idle');
    setExpanded(null);
  }

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <PageHeader
          title="Upload & Enrich"
          subtitle="Drop a seller's Excel catalog (with optional images), and download the enriched, portal-ready version."
        />

        {phase === 'idle' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Option A: ZIP */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="pill bg-magenta-100 text-magenta-700 text-[10px]">Recommended</div>
                  <h3 className="font-semibold text-ink-900 dark:text-white">Upload a ZIP</h3>
                </div>
                <p className="text-sm text-ink-500 mb-4">
                  Single ZIP containing the Excel catalog + product images (named by SKU).
                </p>
                <DropZone
                  onFiles={(files) => setZipFile(files[0])}
                  accept=".zip"
                  icon={<Archive className="w-7 h-7" />}
                  label="Drop a .zip here"
                  hint="Excel + images bundled together"
                  inputRef={zipInputRef}
                />
                {zipFile && (
                  <FileChip
                    icon={<Archive className="w-4 h-4 text-magenta-600" />}
                    name={zipFile.name}
                    size={zipFile.size}
                    onRemove={() => setZipFile(null)}
                  />
                )}
              </Card>

              <div className="text-center text-xs uppercase tracking-wide text-ink-400 font-medium">
                — or upload separately —
              </div>

              {/* Option B: separate excel + images */}
              <Card className="p-6">
                <h3 className="font-semibold text-ink-900 dark:text-white mb-1">Excel catalog</h3>
                <p className="text-sm text-ink-500 mb-3">.xlsx, .xls, or .csv from the seller</p>
                <DropZone
                  onFiles={(files) => setExcelFile(files[0])}
                  accept=".xlsx,.xls,.csv"
                  icon={<FileSpreadsheet className="w-7 h-7" />}
                  label="Drop your Excel here"
                  hint="One file"
                  inputRef={excelInputRef}
                  disabled={!!zipFile}
                />
                {excelFile && (
                  <FileChip
                    icon={<FileSpreadsheet className="w-4 h-4 text-royal-600" />}
                    name={excelFile.name}
                    size={excelFile.size}
                    onRemove={() => setExcelFile(null)}
                  />
                )}
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-ink-900 dark:text-white mb-1">
                  Product images <span className="text-ink-400 font-normal">(optional)</span>
                </h3>
                <p className="text-sm text-ink-500 mb-3">
                  Name files by SKU (e.g. <code className="text-xs bg-ink-100 dark:bg-ink-800 px-1 rounded">LFH-KRT-001.jpg</code>) for auto-matching.
                </p>
                <DropZone
                  onFiles={(files) => setImageFiles((prev) => [...prev, ...files])}
                  accept="image/*"
                  multiple
                  icon={<ImageIcon className="w-7 h-7" />}
                  label="Drop images here"
                  hint="JPG, PNG, WebP — multiple OK"
                  inputRef={imagesInputRef}
                  disabled={!!zipFile}
                />
                {imageFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {imageFiles.map((f, i) => (
                      <FileChip
                        key={i}
                        icon={<ImageIcon className="w-4 h-4 text-magenta-600" />}
                        name={f.name}
                        size={f.size}
                        onRemove={() => setImageFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        compact
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-5 sticky top-6">
                <h3 className="font-semibold text-ink-900 dark:text-white mb-3">Ready to enrich?</h3>
                <div className="space-y-2 text-sm mb-4">
                  <StatusRow label="Excel" done={!!(excelFile || zipFile)} />
                  <StatusRow label="Images" done={imageFiles.length > 0 || !!zipFile} optional />
                </div>
                <button
                  onClick={runEnrichment}
                  disabled={!hasInput}
                  className="w-full btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  Run AI Enrichment
                </button>
                <p className="text-[11px] text-ink-500 mt-3 leading-relaxed">
                  Up to 20 products per upload. Uses Gemini if <code className="bg-ink-100 dark:bg-ink-800 px-1 rounded">GEMINI_API_KEY</code> is set, otherwise a deterministic fallback. Either way, you get a downloadable enriched .xlsx.
                </p>
              </Card>

              <Card className="p-5">
                <h4 className="text-sm font-semibold text-ink-900 dark:text-white mb-2">
                  How matching works
                </h4>
                <ul className="text-xs text-ink-600 dark:text-ink-400 space-y-1.5 leading-relaxed">
                  <li>• Excel rows → products (one row = one product)</li>
                  <li>• Images matched by filename containing the SKU</li>
                  <li>• AI fills 30+ portal fields (HSN, fabric, sleeve, etc.)</li>
                  <li>• Never cross-references Tata CLiQ</li>
                </ul>
              </Card>
            </div>
          </div>
        )}

        {phase === 'enriching' && (
          <Card className="p-12 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-royal-500 to-magenta-500 text-white mb-4">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-xl font-display font-semibold text-ink-900 dark:text-white">
              Enriching your catalog...
            </h3>
            <p className="text-sm text-ink-500 mt-2">
              Parsing rows, matching images, calling Gemini, building master sheet. Usually 10-30s.
            </p>
            <div className="mt-6 flex justify-center gap-2 text-xs text-ink-500">
              <Step label="Parse" active />
              <Step label="Match images" active />
              <Step label="Enrich" active />
              <Step label="Generate" />
            </div>
          </Card>
        )}

        {phase === 'error' && (
          <Card className="p-8 max-w-2xl mx-auto border-red-200 bg-red-50/40 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-ink-900 dark:text-white">Enrichment failed</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                <button onClick={reset} className="btn-outline mt-4">
                  Try again
                </button>
              </div>
            </div>
          </Card>
        )}

        {phase === 'ready' && preview && (
          <div className="space-y-5">
            {/* Success banner */}
            <Card className="p-5 border-green-200 bg-gradient-to-r from-green-50/60 to-royal-50/60 dark:from-green-950/20 dark:to-royal-950/20">
              <div className="flex items-center gap-4">
                <div className="flex w-11 h-11 items-center justify-center rounded-xl bg-green-600 text-white shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-ink-900 dark:text-white">
                    Enriched {preview.processed} of {preview.totalProducts} products
                    {preview.truncated && (
                      <span className="ml-2 text-xs text-amber-600">
                        (capped at 20 — re-upload for the rest)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-ink-600 dark:text-ink-300 mt-0.5 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Avg confidence: <b className="text-green-700">{preview.averageConfidence}%</b></span>
                    <span>Images matched: <b>{preview.imagesFound}</b></span>
                    <span>
                      Engine:{' '}
                      <b className={preview.usedGemini ? 'text-royal-700' : 'text-ink-700'}>
                        {preview.usedGemini ? 'Gemini Pro' : 'Mock (no API key)'}
                      </b>
                    </span>
                  </div>
                </div>
                <button onClick={downloadFile} className="btn-primary !px-5 shrink-0">
                  <Download className="w-4 h-4" />
                  Download .xlsx
                </button>
                <button onClick={reset} className="btn-outline shrink-0">
                  New batch
                </button>
              </div>
            </Card>

            {/* Product preview */}
            <Card>
              <div className="px-5 pt-5 pb-3 border-b border-ink-100 dark:border-ink-800">
                <h3 className="font-semibold text-ink-900 dark:text-white">Enriched products preview</h3>
                <p className="text-sm text-ink-500 mt-0.5">Click a row to see all enriched fields.</p>
              </div>
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {preview.products.map((p, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-ink-50 dark:hover:bg-ink-900/50 text-left transition"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-royal-100 to-magenta-100 dark:from-royal-950/50 dark:to-magenta-950/50 flex items-center justify-center text-xs font-mono font-semibold text-royal-700">
                        #{p.rowIndex}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ink-900 dark:text-white truncate">
                          {p.enriched.enhanced_title || p.title || '(no title)'}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-500">
                          {p.sku && <span className="font-mono">{p.sku}</span>}
                          {p.brand && <><span>·</span><span>{p.brand}</span></>}
                          {p.mrp && <><span>·</span><span>₹{p.mrp}</span></>}
                          {p.matchedImages.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-magenta-600 flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                {p.matchedImages.length} image{p.matchedImages.length > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ConfidenceBadge value={p.confidence} />
                      <Eye className={cn('w-4 h-4 text-ink-400 transition', expanded === i && 'rotate-90')} />
                    </button>
                    {expanded === i && (
                      <div className="px-5 pb-5 bg-ink-50/50 dark:bg-ink-900/30">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 pt-3">
                          {Object.entries(p.enriched).map(([k, v]) => (
                            <FieldRow key={k} label={k} value={v} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

// ===== Helper components =====

function DropZone({
  onFiles,
  accept,
  multiple,
  icon,
  label,
  hint,
  inputRef,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  inputRef: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
}) {
  const [active, setActive] = useState(false);
  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        if (disabled) return;
        if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        'relative rounded-xl border-2 border-dashed p-8 text-center transition',
        disabled
          ? 'opacity-40 cursor-not-allowed border-ink-200 dark:border-ink-800'
          : 'cursor-pointer hover:border-royal-400 hover:bg-royal-50/40 dark:hover:bg-royal-950/20',
        active && !disabled
          ? 'border-royal-500 bg-royal-50 dark:bg-royal-950/30'
          : 'border-ink-200 dark:border-ink-700',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
      />
      <div className="flex flex-col items-center gap-2 text-ink-600 dark:text-ink-300">
        <div className="text-royal-600">{icon}</div>
        <div className="font-medium text-ink-900 dark:text-white">{label}</div>
        <div className="text-xs text-ink-500">{hint}</div>
      </div>
    </div>
  );
}

function FileChip({
  icon,
  name,
  size,
  onRemove,
  compact,
}: {
  icon: React.ReactNode;
  name: string;
  size: number;
  onRemove: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'mt-3 flex items-center gap-2 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900',
        compact ? 'p-2 mt-0' : 'p-3',
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-ink-900 dark:text-white truncate">{name}</div>
        <div className="text-[10px] text-ink-500">{(size / 1024).toFixed(0)} KB</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-ink-400 hover:text-red-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function StatusRow({ label, done, optional }: { label: string; done: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-700 dark:text-ink-200">
        {label} {optional && <span className="text-ink-400 text-xs">(optional)</span>}
      </span>
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-ink-300 dark:border-ink-600" />
      )}
    </div>
  );
}

function Step({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium',
        active ? 'bg-royal-100 text-royal-700 dark:bg-royal-900/40 dark:text-royal-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800',
      )}
    >
      {label}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 90 ? 'bg-green-100 text-green-700' : value >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={cn('pill text-[10px] font-mono', color)}>{value}%</span>;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">
        {label.replace(/_/g, ' ')}
      </div>
      <div className="text-sm text-ink-900 dark:text-ink-100 mt-0.5">{value}</div>
    </div>
  );
}
