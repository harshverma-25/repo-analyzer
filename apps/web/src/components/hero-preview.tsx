'use client';

import React, { useState } from 'react';
import {
  FileCode,
  Layers,
  Database,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  GitCommit,
  Sparkles,
  Cpu,
} from 'lucide-react';

export function HeroPreview() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'api' | 'models'>('architecture');

  return (
    <div className="w-full rounded-2xl bg-surface border border-border shadow-elevated overflow-hidden transition-all duration-200">
      {/* Window Titlebar */}
      <div className="px-4 py-2.5 bg-background/80 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-border" />
          </div>
          <div className="h-3 w-[1px] bg-border mx-1" />
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-text-muted">
            <span className="text-text-main font-semibold">expressjs/express</span>
            <span>&bull;</span>
            <span className="flex items-center space-x-1">
              <GitCommit className="w-3 h-3 text-text-subtle" />
              <span>main:4a8b1c</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Deterministic AST</span>
          </span>
        </div>
      </div>

      {/* Mini Segmented Navigation */}
      <div className="px-4 pt-3 pb-2 border-b border-border/60 bg-surface flex items-center justify-between text-xs">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-2.5 py-1 rounded text-xs font-medium font-mono transition-colors ${
              activeTab === 'architecture'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Architecture Flow
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-2.5 py-1 rounded text-xs font-medium font-mono transition-colors ${
              activeTab === 'api'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            API Routes
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-2.5 py-1 rounded text-xs font-medium font-mono transition-colors ${
              activeTab === 'models'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Data Models
          </button>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-text-subtle">
          <span>50 Files</span>
          <span>&bull;</span>
          <span>12.4k LOC</span>
        </div>
      </div>

      {/* Main Preview Canvas */}
      <div className="p-4 sm:p-5 bg-background/50 min-h-[290px] flex flex-col justify-between">
        {activeTab === 'architecture' && (
          <div className="space-y-3.5 my-auto">
            <div className="text-[11px] font-mono text-text-subtle uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Static Request &rarr; Model Resolution Pipeline</span>
              <span className="text-primary font-semibold">100% Grounded</span>
            </div>

            {/* Architecture Node Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {/* Node 1: Route */}
              <div className="p-3 rounded-lg bg-surface border border-border shadow-subtle flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                    POST
                  </span>
                  <span className="text-[9px] font-mono text-text-subtle">Route</span>
                </div>
                <div className="text-xs font-mono font-semibold text-text-main truncate" title="/api/v1/auth/login">
                  /api/v1/users
                </div>
                <div className="text-[10px] font-mono text-text-subtle mt-2 flex items-center space-x-1 truncate">
                  <FileCode className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">routes/users.ts</span>
                </div>
              </div>

              {/* Node 2: Middleware */}
              <div className="p-3 rounded-lg bg-surface border border-border shadow-subtle flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center space-x-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Guard</span>
                  </span>
                  <span className="text-[9px] font-mono text-text-subtle">Middleware</span>
                </div>
                <div className="text-xs font-mono font-semibold text-text-main truncate">
                  authGuard()
                </div>
                <div className="text-[10px] font-mono text-text-subtle mt-2 flex items-center space-x-1 truncate">
                  <FileCode className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">jwt.verify()</span>
                </div>
              </div>

              {/* Node 3: Controller */}
              <div className="p-3 rounded-lg bg-surface border border-border shadow-subtle flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                    Handler
                  </span>
                  <span className="text-[9px] font-mono text-text-subtle">Logic</span>
                </div>
                <div className="text-xs font-mono font-semibold text-text-main truncate">
                  create()
                </div>
                <div className="text-[10px] font-mono text-text-subtle mt-2 flex items-center space-x-1 truncate">
                  <FileCode className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">UserController.ts</span>
                </div>
              </div>

              {/* Node 4: Database Model */}
              <div className="p-3 rounded-lg bg-surface border border-border shadow-subtle flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center space-x-1">
                    <Database className="w-2.5 h-2.5" />
                    <span>Schema</span>
                  </span>
                  <span className="text-[9px] font-mono text-text-subtle">Mongoose</span>
                </div>
                <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                  User
                </div>
                <div className="text-[10px] font-mono text-text-subtle mt-2 flex items-center space-x-1 truncate">
                  <span>8 fields &bull; 2 refs</span>
                </div>
              </div>
            </div>

            {/* Inferred Status Code Pipeline */}
            <div className="p-2.5 rounded-lg bg-surface/70 border border-border flex items-center justify-between text-xs font-mono">
              <span className="text-text-subtle text-[11px]">Static Output Contracts:</span>
              <div className="flex items-center space-x-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  201 Created
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  401 Unauthorized
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  409 Conflict
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-2 my-auto font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  GET
                </span>
                <span className="text-text-main font-semibold">/api/v1/projects</span>
              </div>
              <span className="text-[10px] text-text-subtle">routes/project.ts:24</span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  POST
                </span>
                <span className="text-text-main font-semibold">/api/v1/scans</span>
              </div>
              <span className="text-[10px] text-text-subtle">routes/scan.ts:18</span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  DELETE
                </span>
                <span className="text-text-main font-semibold">/api/v1/projects/:id</span>
              </div>
              <span className="text-[10px] text-text-subtle">routes/project.ts:72</span>
            </div>
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-2 my-auto font-mono text-xs">
            <div className="p-3 rounded-lg bg-surface border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-text-main text-xs">Model: Scan</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">models/Scan.ts</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-text-muted">
                <div>&bull; projectId: <span className="text-primary">ObjectId (ref: Project)</span></div>
                <div>&bull; status: <span className="text-amber-500">enum[5]</span></div>
                <div>&bull; commitSha: <span className="text-text-subtle">String (len 40)</span></div>
                <div>&bull; progressPercentage: <span className="text-primary">Number</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Metrics Row */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-text-subtle">
          <div className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span>Single-pass TypeScript Compiler AST</span>
          </div>
          <div className="flex items-center space-x-1 text-primary">
            <Sparkles className="w-3 h-3" />
            <span>Grounded Gemini Model</span>
          </div>
        </div>
      </div>
    </div>
  );
}
