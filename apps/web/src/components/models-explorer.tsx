'use client';

import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  FileCode,
  Link2,
  Key,
  Layers,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import type { DatabaseModelFinding } from '@repo-analyzer/shared';

interface ModelsExplorerProps {
  models: DatabaseModelFinding[];
}

export function ModelsExplorer({ models }: ModelsExplorerProps) {
  const [search, setSearch] = useState('');
  const [expandedModelId, setExpandedModelId] = useState<string | null>(
    models.length > 0 ? models[0].id : null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const q = search.toLowerCase();
      return (
        m.modelName.toLowerCase().includes(q) ||
        (m.collectionName && m.collectionName.toLowerCase().includes(q)) ||
        m.filePath.toLowerCase().includes(q) ||
        m.fields.some((f) => f.name.toLowerCase().includes(q))
      );
    });
  }, [models, search]);

  if (models.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl bg-surface border border-border space-y-3">
        <Database className="w-8 h-8 text-text-subtle mx-auto" />
        <h4 className="font-semibold text-sm text-text-main">
          No Mongoose schema models statically detected in analyzed files.
        </h4>
        <p className="text-xs text-text-subtle max-w-lg mx-auto leading-relaxed">
          This project may use an alternative ORM or database layer (such as Prisma, TypeORM, Drizzle,
          Sequelize, or raw SQL queries), or connect to external microservices not modeled through Mongoose schemas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search models by name, field, or schema file..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary"
          />
        </div>
        <div className="text-xs text-text-subtle font-mono whitespace-nowrap">
          {filteredModels.length} of {models.length} Models
        </div>
      </div>

      {/* Models Grid/List */}
      <div className="space-y-4">
        {filteredModels.map((m) => {
          const isExpanded = expandedModelId === m.id;

          return (
            <div
              key={m.id}
              className="rounded-xl bg-surface border border-border overflow-hidden shadow-subtle transition-all"
            >
              {/* Card Header Bar */}
              <div
                onClick={() => setExpandedModelId(isExpanded ? null : m.id)}
                className="p-4 cursor-pointer hover:bg-surfaceHover/50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-bold text-text-main">
                        {m.modelName}
                      </span>
                      {m.collectionName && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-text-subtle bg-background border border-border">
                          coll: {m.collectionName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-text-subtle mt-0.5 truncate">
                      {m.filePath}:{m.lineNumber}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0 text-xs font-mono">
                  <span className="text-text-muted">
                    {m.fields.length} {m.fields.length === 1 ? 'field' : 'fields'}
                  </span>
                  {m.relationships.length > 0 && (
                    <span className="text-primary hidden sm:inline">
                      {m.relationships.length} {m.relationships.length === 1 ? 'rel' : 'rels'}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-text-subtle" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-subtle" />
                  )}
                </div>
              </div>

              {/* Expanded Schema Table and Details */}
              {isExpanded && (
                <div className="p-4 border-t border-border bg-background/50 space-y-4 animate-in fade-in duration-150">
                  {/* Schema Fields Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-text-subtle uppercase tracking-wider">
                        Field Definitions ({m.fields.length})
                      </span>
                      <button
                        onClick={() => handleCopy(m.filePath, `path-${m.id}`)}
                        className="text-[10px] font-mono text-primary hover:underline flex items-center space-x-1"
                      >
                        {copiedId === `path-${m.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Location Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Schema Path</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-background text-text-subtle text-[10px] border-b border-border">
                          <tr>
                            <th className="p-2.5 font-medium">Field</th>
                            <th className="p-2.5 font-medium">Type</th>
                            <th className="p-2.5 font-medium">Required</th>
                            <th className="p-2.5 font-medium">Unique</th>
                            <th className="p-2.5 font-medium">Default</th>
                            <th className="p-2.5 font-medium">Reference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {m.fields.map((f, fIdx) => (
                            <tr key={fIdx} className="hover:bg-surfaceHover/40 transition-colors">
                              <td className="p-2.5 text-text-main font-semibold">{f.name}</td>
                              <td className="p-2.5 text-primary">{f.type}</td>
                              <td className="p-2.5">
                                {f.options.required ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    Required
                                  </span>
                                ) : (
                                  <span className="text-text-subtle text-[11px]">—</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                {f.options.unique ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                    Unique
                                  </span>
                                ) : (
                                  <span className="text-text-subtle text-[11px]">—</span>
                                )}
                              </td>
                              <td className="p-2.5 text-text-muted">
                                {f.options.default !== undefined ? (
                                  <span>{String(f.options.default)}</span>
                                ) : (
                                  <span className="text-text-subtle">—</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                {f.refTarget ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 w-fit">
                                    <Link2 className="w-2.5 h-2.5" />
                                    <span>{f.refTarget}</span>
                                  </span>
                                ) : (
                                  <span className="text-text-subtle">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Model Relationships */}
                  {m.relationships.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-mono text-text-subtle uppercase tracking-wider block">
                        Model Relationships ({m.relationships.length})
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs font-mono">
                        {m.relationships.map((rel, rIdx) => (
                          <div
                            key={rIdx}
                            className="p-2 rounded-lg bg-surface border border-border flex items-center space-x-2"
                          >
                            <span className="text-text-main font-semibold">{m.modelName}</span>
                            <span className="text-text-subtle">&rarr;</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
                              {rel.type} ({rel.foreignField})
                            </span>
                            <span className="text-text-subtle">&rarr;</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {rel.targetModel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schema Indexes */}
                  {m.indexes && m.indexes.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-mono text-text-subtle uppercase tracking-wider block">
                        Schema Indexes ({m.indexes.length})
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs font-mono">
                        {m.indexes.map((idx, iIdx) => (
                          <div
                            key={iIdx}
                            className="px-2.5 py-1 rounded bg-surface border border-border flex items-center space-x-1.5 text-text-muted"
                          >
                            <Key className="w-3 h-3 text-amber-500" />
                            <span>{JSON.stringify(idx.fields)}</span>
                            {idx.unique && (
                              <span className="text-purple-500 text-[10px] font-semibold">(Unique)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
