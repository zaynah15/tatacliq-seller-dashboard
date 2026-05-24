'use client';

import { DashboardShell } from '@/components/layout/shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { mockValidationIssues } from '@/lib/mock-data';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const severityConfig = {
  error: { icon: AlertOctagon, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', badge: 'Error' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', badge: 'Warning' },
  info: { icon: Info, bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', badge: 'Info' },
};

export default function ValidationPage() {
  const errors = mockValidationIssues.filter(i => i.severity === 'error').length;
  const warnings = mockValidationIssues.filter(i => i.severity === 'warning').length;
  const infos = mockValidationIssues.filter(i => i.severity === 'info').length;

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <PageHeader
          title="Validation Center"
          subtitle="Every issue blocking master sheet generation, surfaced with AI-suggested fixes."
          actions={
            <>
              <button className="btn-outline"><CheckCircle2 className="w-4 h-4" /> Mark All Reviewed</button>
              <button className="btn-pink"><Sparkles className="w-4 h-4" /> Apply AI Suggestions</button>
            </>
          }
        />

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><AlertOctagon className="w-5 h-5 text-red-600" /></div>
              <div>
                <div className="text-[11px] text-ink-500 uppercase">Errors</div>
                <div className="font-display font-bold text-2xl text-ink-900 dark:text-white tabular-nums">{errors}</div>
              </div>
            </div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
              <div>
                <div className="text-[11px] text-ink-500 uppercase">Warnings</div>
                <div className="font-display font-bold text-2xl text-ink-900 dark:text-white tabular-nums">{warnings}</div>
              </div>
            </div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center"><Info className="w-5 h-5 text-sky-600" /></div>
              <div>
                <div className="text-[11px] text-ink-500 uppercase">Info</div>
                <div className="font-display font-bold text-2xl text-ink-900 dark:text-white tabular-nums">{infos}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Issues */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg text-ink-900 dark:text-white">All Issues</h3>
            <div className="flex items-center gap-2 text-xs">
              <select className="input-field !py-1.5 text-xs">
                <option>All severities</option>
                <option>Errors only</option>
                <option>Warnings only</option>
              </select>
              <select className="input-field !py-1.5 text-xs">
                <option>All types</option>
                <option>Missing field</option>
                <option>Duplicate SKU</option>
                <option>Invalid EAN/HSN</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {mockValidationIssues.map((issue) => {
              const cfg = severityConfig[issue.severity];
              const Icon = cfg.icon;
              return (
                <div key={issue.id} className="p-5 hover:bg-ink-50 dark:hover:bg-ink-800/40 transition group">
                  <div className="flex items-start gap-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                      <Icon className={cn('w-5 h-5', cfg.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-ink-900 dark:text-white">{issue.productTitle}</span>
                        <span className={cn('pill text-[10px] uppercase', cfg.bg, cfg.text)}>{cfg.badge}</span>
                        {issue.field && <span className="pill bg-ink-100 dark:bg-ink-800 text-ink-600 text-[10px]">Field: {issue.field}</span>}
                      </div>
                      <div className="text-sm text-ink-700 dark:text-ink-300 mt-1.5">{issue.message}</div>
                      {issue.suggestion && (
                        <div className="mt-3 inline-flex items-start gap-2 px-3 py-2 rounded-lg bg-royal-50 dark:bg-royal-900/20 border border-royal-100 dark:border-royal-900/40">
                          <Sparkles className="w-4 h-4 text-royal-600 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-royal-700 dark:text-royal-300 font-semibold">AI Suggestion</div>
                            <div className="text-sm text-ink-800 dark:text-ink-200">{issue.suggestion}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button className="btn-primary !py-1.5 !px-3 text-xs">Apply Fix</button>
                      <button className="btn-outline !py-1.5 !px-3 text-xs">Dismiss</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
