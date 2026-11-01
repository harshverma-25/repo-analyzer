'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Lock,
  FileCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Copy,
  Check,
  X,
  Code2,
  ExternalLink,
} from 'lucide-react';
import type { RouteFinding, HttpMethod } from '@repo-analyzer/shared';

interface ApiExplorerProps {
  endpoints: RouteFinding[];
}

export function ApiExplorer({ endpoints }: ApiExplorerProps) {
  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [authFilter, setAuthFilter] = useState<'ALL' | 'AUTH_ONLY'>('ALL');
  const [selectedEndpoint, setSelectedEndpoint] = useState<RouteFinding | null>(null);
  const [page, setPage] = useState(1);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const pageSize = 25;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Method Badge color mapper matching instructions
  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800';
      case 'POST':
        return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800';
      case 'PUT':
        return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800';
      case 'PATCH':
        return 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/70 border-purple-200 dark:border-purple-800';
      case 'DELETE':
        return 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800';
      default:
        return 'text-text-muted bg-surfaceHover border-border';
    }
  };

  // Filtering
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      const query = search.toLowerCase();
      const matchesSearch =
        ep.resolvedPath.toLowerCase().includes(query) ||
        (ep.handlerName && ep.handlerName.toLowerCase().includes(query)) ||
        ep.filePath.toLowerCase().includes(query) ||
        (ep.routerPrefix && ep.routerPrefix.toLowerCase().includes(query));

      const matchesMethod = selectedMethod === 'ALL' || ep.method === selectedMethod;
      const matchesAuth = authFilter === 'ALL' || ep.authRequired;

      return matchesSearch && matchesMethod && matchesAuth;
    });
  }, [endpoints, search, selectedMethod, authFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEndpoints.length / pageSize) || 1;
  const paginatedEndpoints = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEndpoints.slice(start, start + pageSize);
  }, [filteredEndpoints, page, pageSize]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search endpoints by path, controller, or source file..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Method Filter Buttons */}
          <div className="flex rounded-lg bg-background p-0.5 border border-border">
            {['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setSelectedMethod(m);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors ${
                  selectedMethod === m
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Auth Filter Toggle */}
          <button
            onClick={() => {
              setAuthFilter(authFilter === 'ALL' ? 'AUTH_ONLY' : 'ALL');
              setPage(1);
            }}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center space-x-1.5 transition-colors ${
              authFilter === 'AUTH_ONLY'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-background border-border text-text-muted hover:text-text-main'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>Auth Protected</span>
          </button>
        </div>
      </div>

      {/* Results Count & Active Filter Indicator */}
      <div className="flex items-center justify-between px-1 text-xs text-text-subtle font-mono">
        <span>
          Showing {filteredEndpoints.length} of {endpoints.length} endpoints
        </span>
        {totalPages > 1 && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Endpoint List */}
      {filteredEndpoints.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-surface border border-border space-y-3">
          <Code2 className="w-8 h-8 text-text-subtle mx-auto" />
          <p className="font-semibold text-sm text-text-main">
            {endpoints.length === 0
              ? 'No Express.js endpoints detected in analyzed files.'
              : 'No endpoints match your active filter.'}
          </p>
          <p className="text-xs text-text-subtle max-w-md mx-auto">
            {endpoints.length === 0
              ? 'This repository may be a CLI tool, utility library, or use an alternative framework.'
              : 'Try clearing the search query or resetting the HTTP method and authentication filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedEndpoints.map((ep) => {
            const badgeClass = getMethodBadgeClass(ep.method);
            const isConfirmed = ep.confidence === 'confirmed';

            return (
              <div
                key={ep.id}
                onClick={() => setSelectedEndpoint(ep)}
                className="group p-3.5 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-subtle hover:shadow-md"
              >
                {/* Left Side: Method badge + Path */}
                <div className="flex items-center space-x-3 min-w-0">
                  <span
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase border shrink-0 ${badgeClass}`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-sm font-semibold text-text-main truncate group-hover:text-primary transition-colors">
                    {ep.resolvedPath}
                  </span>
                  {ep.authRequired && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center space-x-1 shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Protected</span>
                    </span>
                  )}
                </div>

                {/* Right Side: Handler, File info, Confidence */}
                <div className="flex items-center space-x-4 text-xs font-mono text-text-subtle shrink-0">
                  {ep.handlerName && (
                    <span className="text-text-muted truncate max-w-[140px]" title={ep.handlerName}>
                      {ep.handlerName}()
                    </span>
                  )}
                  <span className="truncate max-w-[180px]" title={`${ep.filePath}:${ep.lineNumber}`}>
                    {ep.filePath.split('/').pop()}:{ep.lineNumber}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono border ${
                      isConfirmed
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {ep.confidence}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-subtle group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-2 flex items-center justify-between text-xs font-mono">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-md bg-surface border border-border text-text-muted hover:text-text-main disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-text-subtle">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-md bg-surface border border-border text-text-muted hover:text-text-main disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Endpoint Detail Modal Drawer */}
      {selectedEndpoint && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedEndpoint(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${getMethodBadgeClass(
                      selectedEndpoint.method
                    )}`}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <h3 className="font-mono text-base font-bold text-text-main">
                    {selectedEndpoint.resolvedPath}
                  </h3>
                  <button
                    onClick={() => handleCopy(selectedEndpoint.resolvedPath, 'path')}
                    title="Copy path"
                    className="p-1 text-text-subtle hover:text-text-main rounded transition-colors"
                  >
                    {copiedText === 'path' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {selectedEndpoint.routerPrefix && (
                  <p className="text-[11px] font-mono text-text-subtle">
                    Router Mount Prefix: <span className="text-primary">{selectedEndpoint.routerPrefix}</span>
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelectedEndpoint(null)}
                className="p-1.5 rounded-lg text-text-subtle hover:text-text-main hover:bg-surfaceHover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Extraction Confidence Alert */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 ${
                selectedEndpoint.confidence === 'confirmed'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block uppercase text-[10px] tracking-wider font-mono">
                  Extraction Confidence: {selectedEndpoint.confidence}
                </span>
                <span className="text-[11px] leading-relaxed">
                  {selectedEndpoint.confidence === 'confirmed'
                    ? 'This route was deterministically verified by resolving TypeScript AST call expressions and router mounts.'
                    : 'This route was inferred from controller naming patterns or dynamic variable mounts.'}
                </span>
              </div>
            </div>

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                <span className="text-[10px] text-text-subtle uppercase block">Handler / Controller</span>
                <span className="text-text-main font-semibold">
                  {selectedEndpoint.handlerName ? `${selectedEndpoint.handlerName}()` : 'Anonymous Handler'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                <span className="text-[10px] text-text-subtle uppercase block">Authentication Guard</span>
                <span className="flex items-center space-x-1.5">
                  {selectedEndpoint.authRequired ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {selectedEndpoint.authMiddlewareDetected || 'Guard Detected'}
                      </span>
                    </>
                  ) : (
                    <span className="text-text-muted">Public / Unprotected</span>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-background border border-border space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-subtle uppercase">Source File Location</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `${selectedEndpoint.filePath}:${selectedEndpoint.lineNumber}`,
                        'file'
                      )
                    }
                    className="text-[10px] text-primary flex items-center space-x-1 hover:underline"
                  >
                    {copiedText === 'file' ? <span>Copied</span> : <span>Copy Location</span>}
                  </button>
                </div>
                <div className="text-text-main flex items-center space-x-2">
                  <FileCode className="w-3.5 h-3.5 text-text-subtle" />
                  <span>
                    {selectedEndpoint.filePath}:{selectedEndpoint.lineNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Middleware Chain */}
            {selectedEndpoint.middlewareChain && selectedEndpoint.middlewareChain.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-text-subtle uppercase tracking-wider block">
                  Middleware Chain ({selectedEndpoint.middlewareChain.length})
                </span>
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {selectedEndpoint.middlewareChain.map((mw, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-background border border-border text-text-main"
                    >
                      {idx + 1}. {mw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Route Parameters */}
            {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-text-subtle uppercase tracking-wider block">
                  Route Parameters ({selectedEndpoint.parameters.length})
                </span>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-background text-text-subtle text-[10px]">
                      <tr>
                        <th className="p-2 font-medium">Name</th>
                        <th className="p-2 font-medium">In</th>
                        <th className="p-2 font-medium">Type</th>
                        <th className="p-2 font-medium">Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {selectedEndpoint.parameters.map((p, pIdx) => (
                        <tr key={pIdx}>
                          <td className="p-2 text-text-main font-semibold">{p.name}</td>
                          <td className="p-2 text-text-muted">{p.in}</td>
                          <td className="p-2 text-primary">{p.type || 'string'}</td>
                          <td className="p-2">
                            {p.required ? (
                              <span className="text-emerald-500 font-semibold">Yes</span>
                            ) : (
                              <span className="text-text-subtle">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Inferred Status Codes */}
            {selectedEndpoint.inferredStatusCodes && selectedEndpoint.inferredStatusCodes.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-text-subtle uppercase tracking-wider block">
                  Inferred Response Status Codes
                </span>
                <div className="flex flex-wrap gap-2 font-mono text-xs">
                  {selectedEndpoint.inferredStatusCodes.map((sc, scIdx) => (
                    <span
                      key={scIdx}
                      className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold"
                    >
                      {sc} OK
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnostics */}
            {selectedEndpoint.diagnostics && selectedEndpoint.diagnostics.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-mono space-y-1">
                <span className="font-semibold block">AST Diagnostic Notes:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {selectedEndpoint.diagnostics.map((d, dIdx) => (
                    <li key={dIdx}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
