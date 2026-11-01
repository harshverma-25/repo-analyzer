'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  FileCode,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import type { SecurityFinding, SecuritySeverity } from '@repo-analyzer/shared';

interface SecurityAuditProps {
  findings: SecurityFinding[];
}

export function SecurityAudit({ findings }: SecurityAuditProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25';
      case 'high':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25';
      case 'medium':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
      case 'low':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25';
      default:
        return 'bg-surfaceHover text-text-muted border-border';
    }
  };

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const q = search.toLowerCase();
      const matchesSearch =
        f.title.toLowerCase().includes(q) ||
        f.explanation.toLowerCase().includes(q) ||
        f.filePath.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q);

      const matchesSeverity =
        selectedSeverity === 'ALL' || f.severity.toLowerCase() === selectedSeverity.toLowerCase();

      return matchesSearch && matchesSeverity;
    });
  }, [findings, search, selectedSeverity]);

  return (
    <div className="space-y-4">
      {/* Disclaimer Audit Notice */}
      <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle flex items-start space-x-3.5 text-xs text-text-muted leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-text-main block">
            Static Security Observations Disclaimer
          </span>
          <p>
            Observations reflect static AST heuristic patterns and token signatures in source files.
            They are intended for engineering hygiene audits and do not prove runtime exploitability.
            Raw credentials and tokens are automatically masked before presentation.
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search findings by title, category, or file..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary"
          />
        </div>

        {/* Severity Selector */}
        <div className="flex rounded-lg bg-background p-0.5 border border-border">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSeverity(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors ${
                selectedSeverity === s
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List or Clean State */}
      {filteredFindings.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-surface border border-border space-y-3">
          {findings.length === 0 ? (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm text-text-main">
                No static security observations flagged in analyzed files.
              </h4>
              <p className="text-xs text-text-subtle max-w-md mx-auto leading-relaxed">
                All scanned source files passed static checks without triggering heuristics for hardcoded
                secrets, arbitrary code execution (eval, child_process), or unauthenticated mutations.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm text-text-main">
                No observations match severity filter ({selectedSeverity}).
              </p>
              <p className="text-xs text-text-subtle">
                Switch the filter to ALL to view findings across all severity tiers.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding) => {
            const badgeClass = getSeverityBadgeClass(finding.severity);

            return (
              <div
                key={finding.id}
                className="p-4 rounded-xl bg-surface border border-border shadow-subtle space-y-3 text-xs text-left"
              >
                {/* Header: Severity + Title + File */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badgeClass}`}
                    >
                      {finding.severity}
                    </span>
                    <h4 className="font-semibold text-sm text-text-main">{finding.title}</h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-text-subtle bg-background border border-border">
                      {finding.category.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono text-text-subtle">
                    <FileCode className="w-3 h-3" />
                    <span>
                      {finding.filePath}:{finding.lineNumber}
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-text-muted leading-relaxed">{finding.explanation}</p>

                {/* Evidence Snippet */}
                {finding.evidenceSnippet && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-text-subtle uppercase block">
                      Code Evidence (Token Redacted):
                    </span>
                    <pre className="p-2.5 rounded-lg bg-background border border-border font-mono text-[11px] text-text-main overflow-x-auto">
                      <code>{finding.evidenceSnippet}</code>
                    </pre>
                  </div>
                )}

                {/* Recommended Remediation */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-[11px] text-text-muted space-y-0.5">
                  <span className="font-semibold text-primary font-mono block text-xs">
                    Recommended Remediation:
                  </span>
                  <p>{finding.recommendation}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
