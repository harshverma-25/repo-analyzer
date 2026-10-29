'use client';

import { useEffect, useState } from 'react';
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
    description: 'Recursively enumerating tree; filtering lockfiles, binaries, and vendor dependencies.',
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

  useEffect(() => {
    if (!scanId) return;

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const poll = async () => {
      try {
        const data = await getScanStatus(scanId);
        if (!isMounted) return;
        setScan(data);

        if (data.status === 'completed') {
          // Redirect to full report dashboard
          router.push(`/scans/${scanId}/report`);
          return;
        }

        if (data.status !== 'failed' && data.status !== 'cancelled') {
          timer = setTimeout(poll, 1500);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to poll scan status');
      }
    };

    poll();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [scanId, router]);

  const currentStageIndex = STAGES.findIndex((s) => s.stage === scan?.stage);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-main flex items-center space-x-2">
              <span>Scan in Progress</span>
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
            </h2>
            <p className="text-xs font-mono text-text-subtle mt-0.5">
              ID: {scanId}
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-primary">
              {scan?.progressPercentage || 0}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-background rounded-full h-2 my-6 overflow-hidden border border-border/60">
          <div
            className="bg-gradient-to-r from-primary to-accent h-2 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.max(5, scan?.progressPercentage || 5)}%` }}
          ></div>
        </div>

        {/* Status Error Display */}
        {scan?.status === 'failed' && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>Analysis Pipeline Failed</span>
            </div>
            <p className="font-mono">{scan.errorMessage || 'Unknown error occurred.'}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-2 px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-xs transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Start New Scan</span>
            </button>
          </div>
        )}

        {/* Stages Checklist */}
        <div className="space-y-4">
          {STAGES.map((s, idx) => {
            const isCompleted = currentStageIndex > idx || scan?.status === 'completed';
            const isCurrent = currentStageIndex === idx && scan?.status !== 'completed' && scan?.status !== 'failed';

            return (
              <div
                key={s.stage}
                className={`flex items-start space-x-3.5 p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? 'bg-primary/10 border-primary/40 text-text-main'
                    : isCompleted
                    ? 'bg-surfaceHover/50 border-border/40 text-text-muted'
                    : 'bg-transparent border-transparent text-text-subtle opacity-60'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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

        {scan?.status === 'completed' && (
          <div className="mt-6 pt-4 border-t border-border flex justify-end">
            <button
              onClick={() => router.push(`/scans/${scanId}/report`)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-lg flex items-center space-x-2 transition-colors"
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
