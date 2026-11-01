'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
  Code2,
  Database,
  ShieldCheck,
  FolderTree,
  Sparkles,
  GitCommit,
  GitBranch,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Cpu,
  BarChart2,
  FileCode,
  Calendar,
  Share2,
  Copy,
  Check,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import { getScanReport } from '../../../../lib/api';
import { formatDate } from '../../../../lib/utils';
import { ApiExplorer } from '../../../../components/api-explorer';
import { ModelsExplorer } from '../../../../components/models-explorer';
import { ArchitectureExplorer } from '../../../../components/architecture-graph';
import { SecurityAudit } from '../../../../components/security-audit';
import { StatisticsView } from '../../../../components/statistics-view';
import { TechnologiesView } from '../../../../components/technologies-view';
import { FolderTreeView } from '../../../../components/folder-tree-view';
import { AiInsightsView } from '../../../../components/ai-insights-view';
import type { FullScanReport } from '@repo-analyzer/shared';

type ReportSection =
  | 'overview'
  | 'statistics'
  | 'technologies'
  | 'apis'
  | 'models'
  | 'architecture'
  | 'tree'
  | 'security'
  | 'ai';

export default function ScanReportPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params?.scanId as string;

  const [report, setReport] = useState<FullScanReport | null>(null);
  const [activeSection, setActiveSection] = useState<ReportSection>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!scanId) return;

    getScanReport(scanId)
      .then((data) => {
        setReport(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load scan report artifacts');
        setIsLoading(false);
      });
  }, [scanId]);

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <Loader2 className="w-7 h-7 text-primary animate-spin mb-3" />
        <h3 className="text-sm font-semibold text-text-main">Loading repository report...</h3>
        <p className="text-xs font-mono text-text-subtle mt-1">
          Assembling verified AST routes, data models & Gemini explanations
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="p-6 rounded-2xl bg-surface border border-rose-500/30 max-w-md shadow-elevated space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="font-bold text-sm text-text-main">Report Artifacts Unavailable</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            {error || 'Could not find or parse the requested scan artifacts.'}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors shadow-sm"
            >
              Analyze Another Repo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const {
    project,
    scan,
    statistics,
    technologies,
    endpoints,
    databaseModels,
    securityFindings,
    folderTree,
    aiSummary,
  } = report;

  const primaryLanguage =
    statistics.languages && statistics.languages.length > 0
      ? statistics.languages[0].language
      : 'Unknown';

  const navItems: {
    id: ReportSection;
    label: string;
    icon: any;
    count?: number;
  }[] = [
    { id: 'overview', label: '1. Overview', icon: Layers },
    { id: 'statistics', label: '2. Statistics', icon: BarChart2 },
    { id: 'technologies', label: '3. Technologies', icon: Cpu, count: technologies.length },
    { id: 'apis', label: '4. APIs', icon: Code2, count: endpoints.length },
    { id: 'models', label: '5. Models', icon: Database, count: databaseModels.length },
    { id: 'architecture', label: '6. Architecture', icon: Layers },
    { id: 'tree', label: '7. Folder Structure', icon: FolderTree },
    { id: 'security', label: '8. Security', icon: ShieldCheck, count: securityFindings.length },
    { id: 'ai', label: '9. AI Insights', icon: Sparkles },
  ];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ========================================================================= */}
      {/* REPORT HEADER */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-subtle space-y-5 text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-text-main">
                {project.displayName || `${project.owner}/${project.repo}`}
              </h1>
              <a
                href={project.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-text-subtle hover:text-primary transition-colors p-1"
                title="Open repository on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Deterministic Facts Verified</span>
              </span>
            </div>

            {/* Commit & Branch Details */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-subtle font-mono">
              <span className="flex items-center space-x-1 text-text-muted">
                <GitBranch className="w-3.5 h-3.5" />
                <span>{project.defaultBranch || scan.requestedRevision || 'main'}</span>
              </span>
              <span>&bull;</span>
              <button
                onClick={() => handleCopySha(scan.commitSha || '')}
                className="flex items-center space-x-1 text-text-muted hover:text-text-main transition-colors"
                title="Click to copy commit SHA"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>{scan.commitSha ? scan.commitSha.substring(0, 8) : 'HEAD'}</span>
                {copiedSha ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-text-subtle" />
                )}
              </button>
              <span>&bull;</span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(scan.completedAt || scan.createdAt)}</span>
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveSection('ai')}
              className="px-3.5 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask Gemini</span>
            </button>
          </div>
        </div>

        {/* Compact Statistic Components */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-4 border-t border-border">
          <div className="p-3 rounded-lg bg-background border border-border">
            <span className="text-[10px] font-mono uppercase text-text-subtle block">Total Files</span>
            <span className="text-base font-bold font-mono text-text-main mt-0.5 block">
              {statistics.totalFiles}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-background border border-border">
            <span className="text-[10px] font-mono uppercase text-text-subtle block">Source Lines</span>
            <span className="text-base font-bold font-mono text-text-main mt-0.5 block">
              {statistics.codeLines.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-background border border-border">
            <span className="text-[10px] font-mono uppercase text-text-subtle block">API Endpoints</span>
            <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5 block">
              {endpoints.length}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-background border border-border">
            <span className="text-[10px] font-mono uppercase text-text-subtle block">Database Models</span>
            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {databaseModels.length}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-background border border-border">
            <span className="text-[10px] font-mono uppercase text-text-subtle block">Technologies</span>
            <span className="text-base font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5 block">
              {technologies.length}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-background border border-border">
            <span className="text-[10px] font-mono uppercase text-text-subtle block">Security Checks</span>
            <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
              {securityFindings.length}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DASHBOARD NAVIGATION & MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Desktop Sidebar Navigation (4 cols) */}
        <aside className="hidden lg:block lg:col-span-3 rounded-2xl bg-surface border border-border p-2 space-y-1 sticky top-20 shadow-subtle text-left">
          <div className="px-3 py-2 text-[10px] font-mono uppercase text-text-subtle font-semibold tracking-wider">
            Report Sections
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-mono font-medium flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'text-text-muted hover:text-text-main hover:bg-surfaceHover'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-text-subtle'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-background border border-border text-text-subtle'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Mobile / Tablet Horizontal Navigation Menu */}
        <div className="lg:hidden col-span-1 rounded-xl bg-surface border border-border p-1.5 overflow-x-auto flex space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`px-3 py-2 rounded-lg text-xs font-mono whitespace-nowrap flex items-center space-x-1.5 transition-all ${
                  isActive
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'text-text-muted hover:text-text-main hover:bg-surfaceHover'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="text-[10px] opacity-75">({item.count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area (9 cols) */}
        <main className="lg:col-span-9 space-y-6">
          {/* ========================================================================= */}
          {/* SECTION 1: OVERVIEW */}
          {/* ========================================================================= */}
          {activeSection === 'overview' && (
            <div className="space-y-6 text-left">
              {/* Grounded Executive Overview */}
              <div className="p-6 rounded-2xl bg-surface border border-border shadow-subtle space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-text-main font-semibold text-sm">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Grounded Project Overview</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Language: {primaryLanguage}
                  </span>
                </div>

                <p className="text-sm text-text-muted leading-relaxed">
                  {aiSummary.overview || 'Overview narrative generated from discovered code structure.'}
                </p>

                {/* Key Capabilities */}
                {aiSummary.keyFeatures && aiSummary.keyFeatures.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <h4 className="text-xs font-semibold text-text-subtle uppercase font-mono tracking-wider mb-2.5">
                      Verified Capabilities Checklist:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {aiSummary.keyFeatures.map((feat, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-background border border-border flex items-start space-x-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="text-text-main leading-normal">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Navigation Jump Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setActiveSection('apis')}
                  className="p-4 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all cursor-pointer space-y-2 shadow-subtle group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-main flex items-center space-x-1.5 font-mono">
                      <Code2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>API Explorer</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-text-subtle group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-[11px] text-text-subtle">
                    Explore {endpoints.length} verified Express.js endpoints with parameters and auth guards.
                  </p>
                </div>

                <div
                  onClick={() => setActiveSection('models')}
                  className="p-4 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all cursor-pointer space-y-2 shadow-subtle group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-main flex items-center space-x-1.5 font-mono">
                      <Database className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Data Models</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-text-subtle group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-[11px] text-text-subtle">
                    Inspect {databaseModels.length} Mongoose schemas with field constraints and model relationships.
                  </p>
                </div>

                <div
                  onClick={() => setActiveSection('architecture')}
                  className="p-4 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all cursor-pointer space-y-2 shadow-subtle group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-main flex items-center space-x-1.5 font-mono">
                      <Layers className="w-3.5 h-3.5 text-purple-500" />
                      <span>Architecture Graph</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-text-subtle group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-[11px] text-text-subtle">
                    Interactive React Flow graph linking Routes &rarr; Middlewares &rarr; Handlers &rarr; Models.
                  </p>
                </div>
              </div>

              {/* Exploration Paths Preview */}
              {aiSummary.suggestedExplorationPaths && aiSummary.suggestedExplorationPaths.length > 0 && (
                <div className="p-6 rounded-2xl bg-surface border border-border shadow-subtle space-y-4">
                  <h4 className="font-semibold text-xs text-text-main uppercase font-mono tracking-wider">
                    Recommended Codebase Entry Points
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    {aiSummary.suggestedExplorationPaths.map((path, idx) => (
                      <div key={idx} className="p-3.5 rounded-lg bg-background border border-border space-y-1">
                        <div className="font-bold text-text-main font-sans">{path.title}</div>
                        <div className="text-[11px] text-text-muted font-sans leading-relaxed">
                          {path.description}
                        </div>
                        <div className="text-[10px] text-primary flex items-center space-x-1 pt-1 truncate">
                          <FileCode className="w-3 h-3 shrink-0" />
                          <span className="truncate">{path.entryFile}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: STATISTICS */}
          {/* ========================================================================= */}
          {activeSection === 'statistics' && (
            <StatisticsView statistics={statistics} />
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: TECHNOLOGIES */}
          {/* ========================================================================= */}
          {activeSection === 'technologies' && (
            <TechnologiesView technologies={technologies} />
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: APIS */}
          {/* ========================================================================= */}
          {activeSection === 'apis' && (
            <ApiExplorer endpoints={endpoints} />
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: MODELS */}
          {/* ========================================================================= */}
          {activeSection === 'models' && (
            <ModelsExplorer models={databaseModels} />
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: ARCHITECTURE */}
          {/* ========================================================================= */}
          {activeSection === 'architecture' && (
            <ArchitectureExplorer
              graph={report.architectureGraph}
              endpoints={endpoints}
              databaseModels={databaseModels}
            />
          )}

          {/* ========================================================================= */}
          {/* SECTION 7: FOLDER STRUCTURE */}
          {/* ========================================================================= */}
          {activeSection === 'tree' && (
            <FolderTreeView folderTree={folderTree} />
          )}

          {/* ========================================================================= */}
          {/* SECTION 8: SECURITY */}
          {/* ========================================================================= */}
          {activeSection === 'security' && (
            <SecurityAudit findings={securityFindings} />
          )}

          {/* ========================================================================= */}
          {/* SECTION 9: AI INSIGHTS */}
          {/* ========================================================================= */}
          {activeSection === 'ai' && (
            <AiInsightsView scanId={scanId} aiSummary={aiSummary} />
          )}
        </main>
      </div>
    </div>
  );
}
