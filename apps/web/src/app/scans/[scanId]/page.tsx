'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { getScanStatus } from '../../../lib/api';
import type { ScanMetadata, ScanStage } from '@repo-analyzer/shared';

const STAGES: { stage: ScanStage; label: string; description: string }[] = [
  {
    stage: 'validating',
    label: 'Validating Repository',
    description: 'Enforcing GitHub hostname safety and verifying URL syntax.',
  },
  {
    stage: 'resolving_revision',
    label: 'Resolving Revision SHA',
    description: 'Fetching exact 40-character Git commit hash for deterministic auditability.',
  },
  {
    stage: 'fetching_tree',
    label: 'Retrieving Git Tree',
    description: 'Enumerating tree; filtering lockfiles, binaries, and vendor dependencies.',
  },
  {
    stage: 'analyzing_code',
    label: 'Executing AST Analysis',
    description: 'Resolving Express.js routes, Mongoose models, line metrics, and static security observations.',
  },
  {
    stage: 'generating_ai_insights',
    label: 'Synthesizing Gemini Insights',
    description: 'Synthesizing grounded architectural overview strictly from discovered static facts.',
  },
];

export default function ScanProgressPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params?.scanId as string;

  const [scan, setScan] = useState<ScanMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!scanId) return;

    let isMounted = true;
    let timer: NodeJS.Timeout;
    let consecutiveErrors = 0;

    const poll = async () => {
      try {
        const data = await getScanStatus(scanId);
        if (!isMounted) return;
        setScan(data);
        consecutiveErrors = 0;

        if (data.status === 'completed') {
          router.push(`/scans/${scanId}/report`);
          return;
        }

        if (data.status !== 'failed' && data.status !== 'cancelled') {
          timer = setTimeout(poll, 1500);
        }
      } catch (err: any) {
        if (!isMounted) return;
        consecutiveErrors++;
        if (consecutiveErrors <= 5) {
          timer = setTimeout(poll, 2500);
        } else {
          setError(err.message || 'Failed to poll scan status. Please check your connection.');
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [scanId, router]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(scanId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const currentStageIndex = STAGES.findIndex((s) => s.stage === scan?.stage);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 text-left">
      <div className="max-w-xl w-full bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-elevated space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-main flex items-center space-x-2">
              <span>Scan in Progress</span>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </h2>
            <div className="flex items-center space-x-1.5 mt-1 text-xs font-mono text-text-subtle">
              <span>ID: {scanId}</span>
              <button
                onClick={handleCopyId}
                className="hover:text-text-main transition-colors"
                title="Copy Scan ID"
              >
                {copiedId ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          <div className="text-right">
            <span className="text-3xl font-extrabold font-mono text-primary">
              {scan?.progressPercentage || 0}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border/70">
          <div
            className="bg-gradient-to-r from-primary to-accent h-2 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.max(5, scan?.progressPercentage || 5)}%` }}
          />
        </div>

        {/* Error Notice */}
        {scan?.status === 'failed' && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>Analysis Pipeline Failed</span>
            </div>
            <p className="font-mono text-[11px]">{scan.errorMessage || 'An error occurred during analysis.'}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Start New Scan</span>
            </button>
          </div>
        )}

        {/* Stages Checklist */}
        <div className="space-y-2.5">
          {STAGES.map((s, idx) => {
            const isCompleted = currentStageIndex > idx || scan?.status === 'completed';
            const isCurrent =
              currentStageIndex === idx && scan?.status !== 'completed' && scan?.status !== 'failed';

            return (
              <div
                key={s.stage}
                className={`flex items-start space-x-3.5 p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-primary/5 border-primary/40 text-text-main shadow-subtle'
                    : isCompleted
                    ? 'bg-surfaceHover/50 border-border text-text-muted'
                    : 'bg-transparent border-transparent text-text-subtle opacity-50'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 text-text-subtle" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">{s.label}</div>
                  <div className="text-[11px] text-text-subtle leading-normal mt-0.5">
                    {s.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed CTA */}
        {scan?.status === 'completed' && (
          <div className="pt-4 border-t border-border flex justify-end">
            <button
              onClick={() => router.push(`/scans/${scanId}/report`)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
            >
              <span>View Full Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
