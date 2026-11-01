'use client';

import React from 'react';
import {
  Code2,
  FileText,
  Layers,
  PieChart,
  ShieldCheck,
  FileCode,
  Percent,
} from 'lucide-react';
import { formatBytes } from '../lib/utils';
import type { StatisticsArtifact } from '@repo-analyzer/shared';

interface StatisticsViewProps {
  statistics: StatisticsArtifact;
}

const LANGUAGE_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export function StatisticsView({ statistics }: StatisticsViewProps) {
  const codeDensity =
    statistics.totalLines > 0
      ? Math.round((statistics.codeLines / statistics.totalLines) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-left">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle">
          <span className="text-[10px] font-mono uppercase text-text-subtle block">Source Lines</span>
          <span className="text-xl font-bold font-mono text-text-main mt-1 block">
            {statistics.codeLines.toLocaleString()}
          </span>
          <span className="text-[11px] text-text-subtle mt-0.5 block">Excludes comments/blanks</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle">
          <span className="text-[10px] font-mono uppercase text-text-subtle block">Comment Lines</span>
          <span className="text-xl font-bold font-mono text-text-muted mt-1 block">
            {statistics.commentLines.toLocaleString()}
          </span>
          <span className="text-[11px] text-text-subtle mt-0.5 block">
            {statistics.totalLines > 0
              ? `${Math.round((statistics.commentLines / statistics.totalLines) * 100)}% of total`
              : '0%'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle">
          <span className="text-[10px] font-mono uppercase text-text-subtle block">Blank Lines</span>
          <span className="text-xl font-bold font-mono text-text-subtle mt-1 block">
            {statistics.blankLines.toLocaleString()}
          </span>
          <span className="text-[11px] text-text-subtle mt-0.5 block">Spacing & formatting</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle">
          <span className="text-[10px] font-mono uppercase text-text-subtle block">Total Lines</span>
          <span className="text-xl font-bold font-mono text-primary mt-1 block">
            {statistics.totalLines.toLocaleString()}
          </span>
          <span className="text-[11px] text-text-subtle mt-0.5 block">Aggregated file sum</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono uppercase text-text-subtle block">Code Density</span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            {codeDensity}%
          </span>
          <span className="text-[11px] text-text-subtle mt-0.5 block">Executable lines / total</span>
        </div>
      </div>

      {/* Language Distribution Breakdown */}
      <div className="p-6 rounded-xl bg-surface border border-border shadow-subtle space-y-4 text-left">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-text-main flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-primary" />
            <span>Language Distribution</span>
          </h3>
          <span className="text-xs font-mono text-text-subtle">
            {statistics.languages.length} {statistics.languages.length === 1 ? 'Language' : 'Languages'}
          </span>
        </div>

        {/* Proportional Language Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-background border border-border">
          {statistics.languages.map((lang, idx) => (
            <div
              key={idx}
              style={{
                width: `${lang.percentage}%`,
                backgroundColor: LANGUAGE_PALETTE[idx % LANGUAGE_PALETTE.length],
              }}
              title={`${lang.language}: ${lang.percentage}% (${lang.codeLines.toLocaleString()} code lines)`}
              className="h-full transition-all"
            />
          ))}
        </div>

        {/* Language Data Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-background text-text-subtle text-[10px] border-b border-border">
              <tr>
                <th className="p-2.5 font-medium">Language</th>
                <th className="p-2.5 font-medium">Files</th>
                <th className="p-2.5 font-medium">Code Lines</th>
                <th className="p-2.5 font-medium">Comments</th>
                <th className="p-2.5 font-medium">Blanks</th>
                <th className="p-2.5 font-medium">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {statistics.languages.map((lang, idx) => (
                <tr key={idx} className="hover:bg-surfaceHover/40 transition-colors">
                  <td className="p-2.5 flex items-center space-x-2 font-semibold text-text-main">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: LANGUAGE_PALETTE[idx % LANGUAGE_PALETTE.length] }}
                    />
                    <span>{lang.language}</span>
                  </td>
                  <td className="p-2.5 text-text-muted">{lang.files}</td>
                  <td className="p-2.5 text-text-main font-semibold">
                    {lang.codeLines.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-text-subtle">{lang.commentLines.toLocaleString()}</td>
                  <td className="p-2.5 text-text-subtle">{lang.blankLines.toLocaleString()}</td>
                  <td className="p-2.5 text-primary font-bold">{lang.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis Scope & Skipped Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div className="p-5 rounded-xl bg-surface border border-border shadow-subtle space-y-3">
          <h4 className="font-bold text-xs text-text-main flex items-center space-x-2 uppercase font-mono tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Ingestion & Tree Metrics</span>
          </h4>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between">
              <span className="text-text-muted">Total Files in Repository Tree</span>
              <span className="font-bold text-text-main">{statistics.totalFiles}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between">
              <span className="text-text-muted">AST Parsed Source Files</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {statistics.analyzedFiles}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between">
              <span className="text-text-muted">Skipped Files (Binaries, Lockfiles, Vendor)</span>
              <span className="font-bold text-amber-500">{statistics.skippedFiles}</span>
            </div>
          </div>
        </div>

        {statistics.skippedReasons && Object.keys(statistics.skippedReasons).length > 0 && (
          <div className="p-5 rounded-xl bg-surface border border-border shadow-subtle space-y-3">
            <h4 className="font-bold text-xs text-text-main uppercase font-mono tracking-wider">
              Skipped Categories Breakdown
            </h4>
            <div className="space-y-1.5 text-xs font-mono max-h-48 overflow-y-auto">
              {Object.entries(statistics.skippedReasons).map(([reason, count], idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-background border border-border flex items-center justify-between"
                >
                  <span className="text-text-muted truncate pr-2">{reason}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface border border-border text-text-main">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Largest Files Table (if available) */}
      {statistics.largestFiles && statistics.largestFiles.length > 0 && (
        <div className="p-6 rounded-xl bg-surface border border-border shadow-subtle space-y-4 text-left">
          <h3 className="font-bold text-sm text-text-main flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-text-subtle" />
            <span>Largest Files in Codebase</span>
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-background text-text-subtle text-[10px] border-b border-border">
                <tr>
                  <th className="p-2.5 font-medium">File Path</th>
                  <th className="p-2.5 font-medium">Language</th>
                  <th className="p-2.5 font-medium">Size</th>
                  <th className="p-2.5 font-medium">Code Lines</th>
                  <th className="p-2.5 font-medium">Total Lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {statistics.largestFiles.slice(0, 10).map((file, idx) => (
                  <tr key={idx} className="hover:bg-surfaceHover/40 transition-colors">
                    <td className="p-2.5 text-text-main font-semibold truncate max-w-xs" title={file.path}>
                      {file.path}
                    </td>
                    <td className="p-2.5 text-text-muted">{file.language}</td>
                    <td className="p-2.5 text-text-subtle">{formatBytes(file.sizeBytes)}</td>
                    <td className="p-2.5 text-primary font-semibold">{file.codeLines.toLocaleString()}</td>
                    <td className="p-2.5 text-text-main">{file.totalLines.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
