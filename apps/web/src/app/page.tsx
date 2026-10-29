'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowRight,
  GitBranch,
  Layers,
  Database,
  ShieldCheck,
  Code2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { createScan } from '../lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await createScan(repoUrl.trim(), branch.trim() || undefined);
      router.push(`/scans/${result.scanId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize repository scan');
      setIsLoading(false);
    }
  };

  const setSampleRepo = (url: string) => {
    setRepoUrl(url);
    setErrorMessage(null);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-mono text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AST Code Analysis + Google Gemini Synthesis</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-main">
          Evidence-Based <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-accent">
            GitHub Repository Understanding
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-text-muted leading-relaxed">
          Submit any public GitHub repository. Our static analysis engine maps routes,
          unveils database models, inspects dependencies, and computes language statistics—synthesized
          by Google Gemini with zero hallucination.
        </p>

        {/* Scan Submission Form */}
        <div className="max-w-2xl mx-auto mt-6">
          <form
            onSubmit={handleSubmit}
            className="p-2 sm:p-2.5 rounded-xl bg-surface border border-border shadow-2xl flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                required
                placeholder="https://github.com/expressjs/express"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-main placeholder-text-subtle focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="relative sm:w-36">
              <GitBranch className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Branch (opt)"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-main placeholder-text-subtle focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !repoUrl.trim()}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {isLoading ? (
                <span>Analyzing...</span>
              ) : (
                <>
                  <span>Analyze</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {errorMessage && (
            <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center space-x-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Example Repositories */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-text-subtle">
            <span>Try sample repos:</span>
            <button
              type="button"
              onClick={() => setSampleRepo('https://github.com/expressjs/express')}
              className="px-2.5 py-1 rounded-md bg-surface border border-border hover:border-primary text-text-muted hover:text-text-main transition-colors font-mono"
            >
              expressjs/express
            </button>
            <button
              type="button"
              onClick={() => setSampleRepo('https://github.com/harshverma-25/repo-analyzer')}
              className="px-2.5 py-1 rounded-md bg-surface border border-border hover:border-primary text-text-muted hover:text-text-main transition-colors font-mono"
            >
              harshverma-25/repo-analyzer
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-12 text-left">
          <div className="p-5 rounded-xl bg-surface border border-border/70 hover:border-border transition-colors">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-primary flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-text-main mb-1">AST Express.js Route Extraction</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Traces TypeScript ASTs to resolve nested <code>app.use()</code> mount prefixes, handlers,
              middleware chains, and status codes.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border/70 hover:border-border transition-colors">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-text-main mb-1">Mongoose Model Discovery</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Discovers schemas, field definitions, required & unique options, subdocuments, and relational references.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border/70 hover:border-border transition-colors">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-text-main mb-1">Static Security Audit</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Detects hardcoded credentials with automated token redaction, dynamic <code>eval()</code>,
              and unauthenticated mutations.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border/70 hover:border-border transition-colors">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-text-main mb-1">Language-Aware Line Metrics</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Measures true source code, blank, and comment lines across 30+ languages rather than byte approximations.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border/70 hover:border-border transition-colors">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
              <GitBranch className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-text-main mb-1">Interactive Architecture Graphs</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Visualizes Route &rarr; Middleware &rarr; Controller &rarr; Model relationships using React Flow and Mermaid.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border/70 hover:border-border transition-colors">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-accent flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-text-main mb-1">Grounded Gemini Synthesis</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Synthesizes high-level architecture narratives and answers questions strictly bounded by discovered code facts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
