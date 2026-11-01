'use client';

import React, { useState, useMemo } from 'react';
import { Layers, Search, CheckCircle2, HelpCircle, Package } from 'lucide-react';
import type { TechnologyFinding } from '@repo-analyzer/shared';

interface TechnologiesViewProps {
  technologies: TechnologyFinding[];
}

export function TechnologiesView({ technologies }: TechnologiesViewProps) {
  const [search, setSearch] = useState('');

  const filteredTech = useMemo(() => {
    return technologies.filter((t) => {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.evidence.toLowerCase().includes(q) ||
        (t.version && t.version.toLowerCase().includes(q))
      );
    });
  }, [technologies, search]);

  // Group by category
  const groupedCategories = useMemo(() => {
    const groups: Record<string, TechnologyFinding[]> = {};
    for (const tech of filteredTech) {
      const cat = tech.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tech);
    }
    return groups;
  }, [filteredTech]);

  const categoryLabels: Record<string, string> = {
    framework: 'Frameworks & Engines',
    runtime: 'Runtimes & Platforms',
    database: 'Databases & Storage',
    orm: 'Object-Relational Mappers (ORM / ODM)',
    build_tool: 'Build Tools & Bundlers',
    testing: 'Testing & QA',
    utility: 'Core Utilities & Libraries',
    styling: 'Styling & Design',
    other: 'Other Detected Packages',
  };

  return (
    <div className="space-y-6 text-left">
      {/* Search Header */}
      <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search technologies by name, manifest evidence, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary"
          />
        </div>
        <div className="text-xs text-text-subtle font-mono whitespace-nowrap">
          {filteredTech.length} of {technologies.length} Technologies
        </div>
      </div>

      {/* Grouped Category Sections */}
      {Object.keys(groupedCategories).length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-surface border border-border space-y-2">
          <Package className="w-8 h-8 text-text-subtle mx-auto" />
          <p className="font-semibold text-sm text-text-main">No technologies match your search.</p>
          <p className="text-xs text-text-subtle">Try clearing the search query.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedCategories).map(([catKey, items]) => (
            <div key={catKey} className="space-y-2.5">
              <div className="flex items-center space-x-2">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-text-subtle">
                  {categoryLabels[catKey] || catKey}
                </h4>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-text-subtle">
                  {items.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {items.map((tech, idx) => {
                  const isConfirmed = tech.confidence === 'confirmed';

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-surface border border-border shadow-subtle flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-text-main truncate">{tech.name}</span>
                          {tech.version && (
                            <span className="text-[10px] text-text-subtle">v{tech.version}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-subtle truncate mt-0.5" title={tech.evidence}>
                          {tech.evidence}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase shrink-0 border ${
                          isConfirmed
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {tech.confidence}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
