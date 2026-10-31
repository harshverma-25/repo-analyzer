'use client';

import { useEffect, useState, useMemo } from 'react';
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
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronRight,
  ChevronDown,
  FileCode,
  Folder,
  Send,
  Loader2,
  Copy,
  Info,
  ShieldAlert,
  Cpu,
} from 'lucide-react';
import { getScanReport, askAI } from '../../../../lib/api';
import { formatBytes, formatDate } from '../../../../lib/utils';
import type {
  FullScanReport,
  RouteFinding,
  HttpMethod,
  SecuritySeverity,
  FolderTreeNode,
} from '@repo-analyzer/shared';

type TabType = 'overview' | 'endpoints' | 'architecture' | 'models' | 'tree' | 'security' | 'ai';

export default function ScanReportPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params?.scanId as string;

  const [report, setReport] = useState<FullScanReport | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Endpoint filter state
  const [endpointSearch, setEndpointSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedEndpoint, setSelectedEndpoint] = useState<RouteFinding | null>(null);
  const [visibleEndpointsCount, setVisibleEndpointsCount] = useState(50);

  // Security filter state
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  // AI Q&A state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswers, setAiAnswers] = useState<{ question: string; answer: string; files: string[] }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!scanId) return;

    getScanReport(scanId)
      .then((data) => {
        setReport(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load scan report');
        setIsLoading(false);
      });
  }, [scanId]);

  // Filtered endpoints
  const filteredEndpoints = useMemo(() => {
    if (!report?.endpoints) return [];
    return report.endpoints.filter((ep) => {
      const matchesSearch =
        ep.resolvedPath.toLowerCase().includes(endpointSearch.toLowerCase()) ||
        (ep.handlerName && ep.handlerName.toLowerCase().includes(endpointSearch.toLowerCase())) ||
        ep.filePath.toLowerCase().includes(endpointSearch.toLowerCase());

      const matchesMethod = selectedMethod === 'ALL' || ep.method === selectedMethod;
      return matchesSearch && matchesMethod;
    });
  }, [report?.endpoints, endpointSearch, selectedMethod]);

  // Filtered security findings
  const filteredSecurity = useMemo(() => {
    if (!report?.securityFindings) return [];
    return report.securityFindings.filter((sec) => {
      if (selectedSeverity === 'ALL') return true;
      return sec.severity.toLowerCase() === selectedSeverity.toLowerCase();
    });
  }, [report?.securityFindings, selectedSeverity]);

  const handleAskAI = async (e?: React.FormEvent, customQ?: string) => {
    if (e) e.preventDefault();
    const query = customQ || aiQuestion;
    if (!query.trim() || isAiLoading) return;

    setIsAiLoading(true);
    try {
      const res = await askAI(scanId, query.trim());
      setAiAnswers((prev) => [
        ...prev,
        { question: query.trim(), answer: res.answer, files: res.referencedFiles || [] },
      ]);
      setAiQuestion('');
    } catch (err: any) {
      alert(`AI Query Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-mono text-text-muted">Loading repository analysis report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 max-w-md">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
          <h3 className="font-semibold text-sm mb-1">Report Unavailable</h3>
          <p className="text-xs mb-4">{error || 'Could not find report artifacts for this scan.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-xs transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const { project, scan, statistics, technologies, endpoints, databaseModels, securityFindings, aiSummary } = report;

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Info Banner */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-text-main font-mono">
                {project.displayName || `${project.owner}/${project.repo}`}
              </h1>
              <a
                href={project.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-text-subtle hover:text-primary transition-colors"
                title="View on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-text-muted font-mono">
              <span className="flex items-center space-x-1">
                <GitCommit className="w-3.5 h-3.5 text-text-subtle" />
                <span className="text-text-main font-semibold">
                  {scan.commitSha ? scan.commitSha.substring(0, 8) : 'HEAD'}
                </span>
              </span>
              <span>•</span>
              <span>Scanned: {formatDate(scan.completedAt || scan.createdAt)}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Deterministic Facts Verified</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('ai')}
              className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask Gemini</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-5 pt-4 border-t border-border/60">
          <div className="p-2.5 rounded-lg bg-background/60 border border-border/40">
            <div className="text-[10px] text-text-subtle uppercase font-mono">Code Lines</div>
            <div className="text-base font-bold font-mono text-text-main mt-0.5">
              {statistics.codeLines.toLocaleString()}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-background/60 border border-border/40">
            <div className="text-[10px] text-text-subtle uppercase font-mono">Total Files</div>
            <div className="text-base font-bold font-mono text-text-main mt-0.5">
              {statistics.totalFiles}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-background/60 border border-border/40">
            <div className="text-[10px] text-text-subtle uppercase font-mono">API Endpoints</div>
            <div className="text-base font-bold font-mono text-primary mt-0.5">
              {endpoints.length}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-background/60 border border-border/40">
            <div className="text-[10px] text-text-subtle uppercase font-mono">Data Models</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {databaseModels.length}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-background/60 border border-border/40">
            <div className="text-[10px] text-text-subtle uppercase font-mono">Technologies</div>
            <div className="text-base font-bold font-mono text-accent mt-0.5">
              {technologies.length}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-background/60 border border-border/40">
            <div className="text-[10px] text-text-subtle uppercase font-mono">Languages</div>
            <div className="text-base font-bold font-mono text-purple-400 mt-0.5">
              {statistics.languages.length}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-background/60 border border-border/40">
            <div className="text-[10px] text-text-subtle uppercase font-mono">Security Checks</div>
            <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
              {securityFindings.length}
            </div>
          </div>
        </div>
      </div>

      {/* Report Section Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview & Tech', icon: Layers },
          { id: 'endpoints', label: `API Explorer (${endpoints.length})`, icon: Code2 },
          { id: 'architecture', label: 'Architecture Graph', icon: Cpu },
          { id: 'models', label: `Database Models (${databaseModels.length})`, icon: Database },
          { id: 'tree', label: 'Folder Explorer', icon: FolderTree },
          { id: 'security', label: `Security (${securityFindings.length})`, icon: ShieldCheck },
          { id: 'ai', label: 'AI Explanations', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg flex items-center space-x-2 border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-primary text-primary bg-surface/50'
                  : 'border-transparent text-text-muted hover:text-text-main hover:bg-surface/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & TECH STACK */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Gemini Grounded Summary Card */}
          <div className="p-6 rounded-xl bg-surface border border-border shadow-md space-y-4">
            <div className="flex items-center space-x-2 text-primary font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Grounded Project Overview</span>
            </div>

            <p className="text-sm text-text-main leading-relaxed">
              {aiSummary.overview}
            </p>

            {aiSummary.keyFeatures && aiSummary.keyFeatures.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 font-mono">
                  Observed Capabilities:
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-main">
                  {aiSummary.keyFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start space-x-2 p-2 rounded bg-background/50 border border-border/40">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiSummary.suggestedExplorationPaths && aiSummary.suggestedExplorationPaths.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 font-mono">
                  Suggested Codebase Exploration:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aiSummary.suggestedExplorationPaths.map((path, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border/60">
                      <div className="font-semibold text-xs text-text-main">{path.title}</div>
                      <div className="text-[11px] text-text-muted mt-1 leading-normal">{path.description}</div>
                      <div className="mt-2 text-[10px] font-mono text-primary flex items-center space-x-1">
                        <FileCode className="w-3 h-3" />
                        <span>Entry: {path.entryFile}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Technology Detection Stack */}
          <div className="p-6 rounded-xl bg-surface border border-border shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-main flex items-center space-x-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Detected Technologies & Dependencies ({technologies.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-text-subtle">
                Evidence extracted from manifests & imports
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {technologies.map((tech, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-background border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-text-main">{tech.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                      tech.confidence === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}>
                      {tech.confidence}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-subtle font-mono truncate" title={tech.evidence}>
                    {tech.evidence}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Language Breakdown */}
          <div className="p-6 rounded-xl bg-surface border border-border shadow-md space-y-4">
            <h3 className="font-bold text-sm text-text-main flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              <span>Language Distribution (Language-Aware Line Counter)</span>
            </h3>

            {/* Visual language bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-background border border-border">
              {statistics.languages.map((lang, idx) => {
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500', 'bg-rose-500'];
                return (
                  <div
                    key={idx}
                    className={`${colors[idx % colors.length]} h-full transition-all`}
                    style={{ width: `${lang.percentage}%` }}
                    title={`${lang.language}: ${lang.percentage}% (${lang.codeLines} lines)`}
                  />
                );
              })}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border/60 text-text-subtle text-[11px]">
                    <th className="pb-2 font-medium">Language</th>
                    <th className="pb-2 font-medium">Files</th>
                    <th className="pb-2 font-medium">Code Lines</th>
                    <th className="pb-2 font-medium">Comments</th>
                    <th className="pb-2 font-medium">Blanks</th>
                    <th className="pb-2 font-medium">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {statistics.languages.map((lang, idx) => (
                    <tr key={idx} className="hover:bg-surfaceHover/30">
                      <td className="py-2 text-text-main font-semibold">{lang.language}</td>
                      <td className="py-2 text-text-muted">{lang.files}</td>
                      <td className="py-2 text-text-main">{lang.codeLines.toLocaleString()}</td>
                      <td className="py-2 text-text-subtle">{lang.commentLines.toLocaleString()}</td>
                      <td className="py-2 text-text-subtle">{lang.blankLines.toLocaleString()}</td>
                      <td className="py-2 text-primary font-bold">{lang.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analysis Coverage & Diagnostics */}
          <div className="p-6 rounded-xl bg-surface border border-border shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-main flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Analysis Coverage & Static Scope</span>
              </h3>
              <span className="text-[11px] font-mono text-text-subtle">
                Bounded ingestion (max 150 candidate source files)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-background border border-border/60">
                <div className="text-[10px] uppercase font-mono text-text-subtle mb-1">Total Files In Tree</div>
                <div className="text-base font-bold font-mono text-text-main">{statistics.totalFiles}</div>
              </div>
              <div className="p-3 rounded-lg bg-background border border-border/60">
                <div className="text-[10px] uppercase font-mono text-text-subtle mb-1">AST Analyzed</div>
                <div className="text-base font-bold font-mono text-emerald-400">{statistics.analyzedFiles}</div>
              </div>
              <div className="p-3 rounded-lg bg-background border border-border/60">
                <div className="text-[10px] uppercase font-mono text-text-subtle mb-1">Excluded / Skipped</div>
                <div className="text-base font-bold font-mono text-amber-400">{statistics.skippedFiles}</div>
              </div>
              <div className="p-3 rounded-lg bg-background border border-border/60">
                <div className="text-[10px] uppercase font-mono text-text-subtle mb-1">Code Density</div>
                <div className="text-base font-bold font-mono text-primary">
                  {statistics.totalLines > 0 ? Math.round((statistics.codeLines / statistics.totalLines) * 100) : 0}%
                </div>
              </div>
            </div>

            {statistics.skippedReasons && Object.keys(statistics.skippedReasons).length > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-2">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">
                  Skipped File Categories:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {Object.entries(statistics.skippedReasons).map(([reason, count], idx) => (
                    <div key={idx} className="p-2 rounded bg-background/60 border border-border/40 flex items-center justify-between">
                      <span className="text-text-muted truncate pr-2">{reason}</span>
                      <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-main font-semibold">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: API EXPLORER */}
      {/* ========================================================================= */}
      {activeTab === 'endpoints' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="p-4 rounded-xl bg-surface border border-border flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search endpoints by path, controller, or source file..."
                value={endpointSearch}
                onChange={(e) => setEndpointSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary"
              />
            </div>

            {/* Method filter buttons */}
            <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMethod(m)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-mono font-semibold transition-colors ${
                    selectedMethod === m
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-background border border-border text-text-muted hover:text-text-main'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint List */}
          {filteredEndpoints.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-surface border border-border text-xs space-y-2">
              {endpoints.length === 0 ? (
                <>
                  <p className="font-semibold text-text-main">No Express.js REST endpoints detected in analyzed files.</p>
                  <p className="text-text-subtle max-w-lg mx-auto">
                    This repository may be a middleware library, utility package, CLI tool, or use an alternative backend
                    framework (such as Fastify, NestJS, or Koa) or dynamic route registration not matching static Express AST patterns.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-text-main">No endpoints match your active filter.</p>
                  <p className="text-text-subtle">
                    Try adjusting the search query or switching the HTTP method filter to ALL.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEndpoints.slice(0, visibleEndpointsCount).map((ep) => {
                const methodColors: Record<string, string> = {
                  GET: 'text-blue-400 bg-blue-950/70 border-blue-800',
                  POST: 'text-emerald-400 bg-emerald-950/70 border-emerald-800',
                  PUT: 'text-amber-400 bg-amber-950/70 border-amber-800',
                  DELETE: 'text-red-400 bg-red-950/70 border-red-800',
                  PATCH: 'text-purple-400 bg-purple-950/70 border-purple-800',
                };
                const color = methodColors[ep.method] || 'text-text-main bg-background border-border';

                return (
                  <div
                    key={ep.id}
                    onClick={() => setSelectedEndpoint(ep)}
                    className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border ${color}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm font-semibold text-text-main">
                        {ep.resolvedPath}
                      </span>
                      {ep.authRequired && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px] flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Protected</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-xs font-mono text-text-subtle">
                      {ep.handlerName && (
                        <span className="text-text-muted">
                          handler: <span className="text-text-main">{ep.handlerName}</span>
                        </span>
                      )}
                      <span>
                        {ep.filePath}:{ep.lineNumber}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase bg-background border border-border text-text-subtle">
                        {ep.confidence}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredEndpoints.length > visibleEndpointsCount && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setVisibleEndpointsCount((prev) => prev + 50)}
                    className="px-4 py-2 bg-surface hover:bg-surfaceHover border border-border rounded-lg text-xs font-mono text-primary font-semibold transition-colors"
                  >
                    Show more endpoints ({filteredEndpoints.length - visibleEndpointsCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Endpoint Detail Drawer Modal */}
          {selectedEndpoint && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-primary text-white">
                      {selectedEndpoint.method}
                    </span>
                    <span className="font-mono text-base font-bold text-text-main">
                      {selectedEndpoint.resolvedPath}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedEndpoint(null)}
                    className="p-1 text-text-subtle hover:text-text-main rounded"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-text-subtle uppercase font-mono text-[10px] block">Source Location</span>
                    <span className="font-mono text-text-main">{selectedEndpoint.filePath}:{selectedEndpoint.lineNumber}</span>
                  </div>

                  {selectedEndpoint.routerPrefix && (
                    <div>
                      <span className="text-text-subtle uppercase font-mono text-[10px] block">Resolved Mount Prefix</span>
                      <span className="font-mono text-primary">{selectedEndpoint.routerPrefix}</span>
                    </div>
                  )}

                  {selectedEndpoint.middlewareChain && selectedEndpoint.middlewareChain.length > 0 && (
                    <div>
                      <span className="text-text-subtle uppercase font-mono text-[10px] block mb-1">Middleware Chain</span>
                      <div className="flex flex-wrap gap-1.5 font-mono">
                        {selectedEndpoint.middlewareChain.map((mw, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-background border border-border text-text-muted">
                            {mw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                    <div>
                      <span className="text-text-subtle uppercase font-mono text-[10px] block mb-1">Route Parameters</span>
                      <div className="space-y-1">
                        {selectedEndpoint.parameters.map((p, idx) => (
                          <div key={idx} className="p-2 rounded bg-background border border-border/60 flex items-center justify-between">
                            <span className="font-mono text-text-main font-semibold">:{p.name}</span>
                            <span className="text-[10px] font-mono text-text-subtle uppercase">in: {p.in}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-text-subtle uppercase font-mono text-[10px] block mb-1">Inferred Status Codes</span>
                    <div className="flex gap-2 font-mono">
                      {selectedEndpoint.inferredStatusCodes.map((sc, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {sc} OK
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedEndpoint.diagnostics && (
                    <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300">
                      <span className="font-semibold block mb-0.5">AST Analysis Diagnostic:</span>
                      {selectedEndpoint.diagnostics.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ARCHITECTURE GRAPH */}
      {/* ========================================================================= */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-surface border border-border shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-main flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span>Architecture & Dependency Map</span>
                </h3>
                <p className="text-xs text-text-subtle mt-0.5">
                  Static directed graph tracing Endpoints &rarr; Middlewares &rarr; Controllers &rarr; Database Models
                </p>
              </div>
            </div>

            {/* Architecture Node Visualizer */}
            <div className="p-5 rounded-xl bg-background border border-border/70 min-h-[300px] flex flex-col justify-center items-center text-center space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                {/* Layer 1: Client Routes */}
                <div className="p-4 rounded-xl bg-surface border border-border/60">
                  <h4 className="text-[11px] uppercase font-mono font-bold text-blue-400 mb-3">API Routing Layer</h4>
                  <div className="space-y-2">
                    {endpoints.slice(0, 5).map((e, idx) => (
                      <div key={idx} className="p-2 rounded bg-background border border-border text-[11px] font-mono text-left truncate">
                        <span className="font-bold text-primary mr-1">[{e.method}]</span>
                        <span>{e.resolvedPath}</span>
                      </div>
                    ))}
                    {endpoints.length > 5 && (
                      <div className="text-[10px] text-text-subtle text-center">
                        + {endpoints.length - 5} more routes
                      </div>
                    )}
                  </div>
                </div>

                {/* Layer 2: Middleware & Auth */}
                <div className="p-4 rounded-xl bg-surface border border-border/60">
                  <h4 className="text-[11px] uppercase font-mono font-bold text-amber-400 mb-3">Middleware & Auth</h4>
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-background border border-border text-[11px] font-mono text-left">
                      express.json()
                    </div>
                    {endpoints.some((e) => e.authRequired) && (
                      <div className="p-2 rounded bg-amber-950/40 border border-amber-800 text-[11px] font-mono text-amber-300 text-left flex items-center space-x-1.5">
                        <Lock className="w-3 h-3" />
                        <span>Auth Guards</span>
                      </div>
                    )}
                    <div className="p-2 rounded bg-background border border-border text-[11px] font-mono text-left">
                      CORS & Error Handlers
                    </div>
                  </div>
                </div>

                {/* Layer 3: Controllers & Services */}
                <div className="p-4 rounded-xl bg-surface border border-border/60">
                  <h4 className="text-[11px] uppercase font-mono font-bold text-purple-400 mb-3">Handlers & Logic</h4>
                  <div className="space-y-2">
                    {endpoints.filter((e) => e.handlerName).slice(0, 5).map((e, idx) => (
                      <div key={idx} className="p-2 rounded bg-background border border-border text-[11px] font-mono text-left truncate">
                        {e.handlerName}()
                      </div>
                    ))}
                    {endpoints.filter((e) => e.handlerName).length === 0 && (
                      <div className="text-xs text-text-subtle p-2">Anonymous route handlers</div>
                    )}
                  </div>
                </div>

                {/* Layer 4: Models & Database */}
                <div className="p-4 rounded-xl bg-surface border border-border/60">
                  <h4 className="text-[11px] uppercase font-mono font-bold text-emerald-400 mb-3">Database Layer</h4>
                  <div className="space-y-2">
                    {databaseModels.map((m, idx) => (
                      <div key={idx} className="p-2 rounded bg-background border border-border text-[11px] font-mono text-left flex items-center justify-between">
                        <span className="font-semibold text-emerald-400">{m.modelName}</span>
                        <span className="text-[10px] text-text-subtle">{m.fields.length} fields</span>
                      </div>
                    ))}
                    <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800 text-[11px] font-mono text-emerald-300 text-left flex items-center space-x-1.5">
                      <Database className="w-3 h-3" />
                      <span>MongoDB Engine</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mermaid Representation */}
            {report.architectureGraph?.mermaidDiagram && (
              <div className="p-4 rounded-xl bg-background border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-text-muted">Mermaid Flowchart Syntax:</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(report.architectureGraph.mermaidDiagram || '')}
                    className="p-1 text-text-subtle hover:text-text-main rounded flex items-center space-x-1 text-xs"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3 bg-surface rounded-lg text-xs font-mono text-text-muted overflow-x-auto">
                  {report.architectureGraph.mermaidDiagram}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DATABASE MODELS */}
      {/* ========================================================================= */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          {databaseModels.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-surface border border-border text-xs space-y-2">
              <p className="font-semibold text-text-main">No Mongoose schema models statically detected in analyzed files.</p>
              <p className="text-text-subtle max-w-lg mx-auto">
                This project may use an alternative ORM or database layer (such as Prisma, TypeORM, Drizzle, Sequelize, or raw SQL queries),
                or connect to external database services not modeled through Mongoose schemas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {databaseModels.map((m) => (
                <div key={m.id} className="p-5 rounded-xl bg-surface border border-border shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-bold text-sm text-text-main font-mono">{m.modelName}</h4>
                    </div>
                    <span className="text-[11px] font-mono text-text-subtle">
                      {m.filePath}:{m.lineNumber}
                    </span>
                  </div>

                  {/* Fields list */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-text-subtle border-b border-border/40 text-[10px]">
                          <th className="pb-1.5">Field</th>
                          <th className="pb-1.5">Type</th>
                          <th className="pb-1.5">Constraints</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {m.fields.map((f, fIdx) => (
                          <tr key={fIdx} className="hover:bg-surfaceHover/30">
                            <td className="py-1.5 text-text-main font-semibold">{f.name}</td>
                            <td className="py-1.5 text-primary">{f.type}</td>
                            <td className="py-1.5 flex flex-wrap gap-1">
                              {f.options.required && (
                                <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 text-[10px]">
                                  required
                                </span>
                              )}
                              {f.options.unique && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px]">
                                  unique
                                </span>
                              )}
                              {f.refTarget && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                                  ref: {f.refTarget}
                                </span>
                              )}
                              {f.options.default !== undefined && (
                                <span className="text-text-subtle text-[10px]">
                                  default: {String(f.options.default)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FOLDER TREE */}
      {/* ========================================================================= */}
      {activeTab === 'tree' && (
        <div className="p-6 rounded-xl bg-surface border border-border shadow-md space-y-4">
          <h3 className="font-bold text-sm text-text-main flex items-center space-x-2">
            <FolderTree className="w-4 h-4 text-primary" />
            <span>Repository Directory Hierarchy</span>
          </h3>

          <div className="p-4 rounded-lg bg-background border border-border font-mono text-xs max-h-[600px] overflow-y-auto">
            {report.folderTree ? (
              <TreeNodeItem node={report.folderTree} />
            ) : (
              <span className="text-text-subtle">No directory tree available.</span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: STATIC SECURITY REVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* Disclaimer Banner */}
          <div className="p-4 rounded-xl bg-surface border border-amber-800/40 text-amber-200 text-xs flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Static Analysis Security Disclaimer:</span>
              <span>
                These observations reflect heuristic AST pattern matches and static text signatures. They do not constitute
                proof of exploitability. Secrets and sensitive keys are automatically masked and redacted.
              </span>
            </div>
          </div>

          {/* Severity filter buttons */}
          <div className="flex items-center space-x-1.5">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                  selectedSeverity === sev
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-text-muted hover:text-text-main'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {filteredSecurity.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-surface border border-border text-xs space-y-2">
              {securityFindings.length === 0 ? (
                <>
                  <p className="font-semibold text-text-main">No static security observations flagged in analyzed files.</p>
                  <p className="text-text-subtle max-w-lg mx-auto">
                    All scanned source files passed deterministic static checks without triggering heuristics for hardcoded credentials,
                    arbitrary code/shell execution (eval, child_process.exec), or mutating endpoints lacking authentication guards.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-text-main">No security observations match the active severity filter ({selectedSeverity}).</p>
                  <p className="text-text-subtle">
                    Switch the filter to ALL to view findings of other severities.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSecurity.map((sec) => {
                const severityColors: Record<string, string> = {
                  critical: 'bg-red-950 text-red-400 border-red-800',
                  high: 'bg-rose-950 text-rose-400 border-rose-800',
                  medium: 'bg-amber-950 text-amber-400 border-amber-800',
                  low: 'bg-blue-950 text-blue-400 border-blue-800',
                };
                const badgeColor = severityColors[sec.severity.toLowerCase()] || 'bg-surface border-border text-text-muted';

                return (
                  <div key={sec.id} className="p-4 rounded-xl bg-surface border border-border space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badgeColor}`}>
                          {sec.severity}
                        </span>
                        <h4 className="font-semibold text-xs text-text-main">{sec.title}</h4>
                      </div>
                      <span className="text-[11px] font-mono text-text-subtle">
                        {sec.filePath}:{sec.lineNumber}
                      </span>
                    </div>

                    <p className="text-xs text-text-muted leading-relaxed">{sec.explanation}</p>

                    <div className="p-2.5 rounded bg-background border border-border/60 text-[11px] font-mono text-text-main truncate">
                      <code>{sec.evidenceSnippet}</code>
                    </div>

                    <div className="text-[11px] text-primary pt-1">
                      <span className="font-semibold">Recommendation: </span>
                      <span>{sec.recommendation}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: AI ASSISTANT / EXPLORATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-surface border border-border shadow-md space-y-4">
            <div className="flex items-center space-x-2 text-primary font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Grounded Google Gemini Repository Assistant</span>
            </div>
            <p className="text-xs text-text-muted">
              Ask specific technical questions about this repository. Responses are strictly grounded in verified
              static AST findings, routes, and data models.
            </p>

            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                'How does the routing architecture map incoming HTTP requests?',
                'Which database models and relations are defined?',
                'What security hygiene patterns were observed?',
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskAI(undefined, q)}
                  className="px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary text-text-muted hover:text-text-main transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* AI Q&A Feed */}
            <div className="space-y-4 pt-4 border-t border-border/60">
              {aiAnswers.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-background border border-border/80 space-y-2">
                  <div className="font-semibold text-xs text-primary flex items-center space-x-2">
                    <span>Q:</span>
                    <span>{item.question}</span>
                  </div>
                  <div className="text-xs text-text-main whitespace-pre-line leading-relaxed">
                    {item.answer}
                  </div>
                  {item.files && item.files.length > 0 && (
                    <div className="pt-2 border-t border-border/40 text-[10px] font-mono text-text-subtle flex flex-wrap gap-2">
                      <span>Referenced Sources:</span>
                      {item.files.map((f, fIdx) => (
                        <span key={fIdx} className="text-text-muted underline">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Question Input Form */}
            <form onSubmit={handleAskAI} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Ask Gemini about this codebase (e.g. How does error handling work?)..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                disabled={isAiLoading}
                className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={isAiLoading || !aiQuestion.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Expandable Folder Tree component
function TreeNodeItem({ node }: { node: FolderTreeNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const isDirectory = node.type === 'directory';

  if (!node.children || node.children.length === 0) {
    if (isDirectory) return null;
    return (
      <div className="py-1 flex items-center space-x-2 text-text-muted hover:text-text-main">
        <FileCode className="w-3.5 h-3.5 text-text-subtle shrink-0" />
        <span className="truncate">{node.name}</span>
        {node.lineCount && (
          <span className="text-[10px] text-text-subtle">({node.lineCount} lines)</span>
        )}
      </div>
    );
  }

  return (
    <div className="py-0.5">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 py-1 text-text-main font-semibold cursor-pointer hover:text-primary transition-colors select-none"
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-text-subtle" /> : <ChevronRight className="w-3.5 h-3.5 text-text-subtle" />}
        <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>{node.name || 'root'}</span>
      </div>

      {isOpen && (
        <div className="pl-4 border-l border-border/40 ml-2 space-y-0.5">
          {node.children.map((child, idx) => (
            <TreeNodeItem key={idx} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
