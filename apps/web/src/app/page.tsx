'use client';

import React, { useState } from 'react';
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
  Github,
  Loader2,
} from 'lucide-react';
import { createScan } from '../lib/api';
import { HeroPreview } from '../components/hero-preview';

export default function LandingPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subtle live validation
  const isValidGitHubUrl = (url: string) => {
    if (!url.trim()) return null;
    try {
      const parsed = new URL(url.trim());
      return (
        parsed.hostname.toLowerCase() === 'github.com' &&
        /^\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/)?$/.test(parsed.pathname)
      );
    } catch {
      return false;
    }
  };

  const validationState = isValidGitHubUrl(repoUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || isLoading) return;

    if (validationState === false) {
      setErrorMessage('Please enter a valid GitHub repository URL (e.g. https://github.com/expressjs/express)');
      return;
    }

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

  const featureItems = [
    {
      id: 'apis',
      title: 'APIs',
      description: 'Resolved routes, parameters & status codes',
      icon: Code2,
      badge: 'AST Discovery',
    },
    {
      id: 'models',
      title: 'Models',
      description: 'Mongoose schemas, types & references',
      icon: Database,
      badge: 'Schema Mapping',
    },
    {
      id: 'architecture',
      title: 'Architecture',
      description: 'Route &rarr; Controller &rarr; Model graphs',
      icon: Layers,
      badge: 'Interactive Flow',
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Token redaction, eval & auth checks',
      icon: ShieldCheck,
      badge: 'Static Audit',
    },
    {
      id: 'ai',
      title: 'AI Insights',
      description: 'Gemini synthesis with zero hallucination',
      icon: Sparkles,
      badge: 'Grounded QA',
    },
  ];

  return (
    <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="max-w-7xl w-full mx-auto space-y-16">
        {/* ========================================================================= */}
        {/* HERO SECTION: 2-COLUMN COMPOSITION */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline, Description & Repository Input */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Trust Pill */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-mono text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Evidence-based static code understanding</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-text-main leading-[1.15]">
              Understand any{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-accent">
                GitHub repository
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-xl">
              Code insights, architecture, APIs, models and security — in seconds.
            </p>

            {/* Repository Input Component */}
            <div className="pt-2 max-w-xl space-y-3">
              <form
                onSubmit={handleSubmit}
                className="p-2 rounded-xl bg-surface border border-border shadow-elevated flex flex-col sm:flex-row gap-2 transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20"
              >
                {/* Repository URL Input */}
                <div className="relative flex-1">
                  <Github className="w-4 h-4 text-text-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/expressjs/express"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full bg-background border border-border/70 rounded-lg pl-10 pr-8 py-2.5 text-xs sm:text-sm text-text-main placeholder-text-subtle focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                  {validationState === true && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Optional Branch Input */}
                <div className="relative sm:w-32">
                  <GitBranch className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-background border border-border/70 rounded-lg pl-9 pr-3 py-2.5 text-xs sm:text-sm text-text-main placeholder-text-subtle focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>

                {/* Submit Analyze Button */}
                <button
                  type="submit"
                  disabled={isLoading || !repoUrl.trim()}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all disabled:opacity-40 shadow-sm whitespace-nowrap cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Validation Warning Feedback */}
              {validationState === false && repoUrl.length > 5 && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono flex items-center space-x-1 px-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Format: https://github.com/owner/repository</span>
                </div>
              )}

              {/* Server Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Sample Repository Shortcuts */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-subtle pt-1 font-mono">
                <span>Try sample:</span>
                <button
                  type="button"
                  onClick={() => setSampleRepo('https://github.com/expressjs/express')}
                  className="px-2.5 py-1 rounded-md bg-surface border border-border hover:border-primary text-text-muted hover:text-text-main transition-colors text-xs"
                >
                  expressjs/express
                </button>
                <button
                  type="button"
                  onClick={() => setSampleRepo('https://github.com/harshverma-25/repo-analyzer')}
                  className="px-2.5 py-1 rounded-md bg-surface border border-border hover:border-primary text-text-muted hover:text-text-main transition-colors text-xs"
                >
                  harshverma-25/repo-analyzer
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Sophisticated Product Preview */}
          <div className="lg:col-span-6 w-full">
            <HeroPreview />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FEATURE NAVIGATION (5 COMPACT FEATURE SHORTCUTS) */}
        {/* ========================================================================= */}
        <div className="pt-8 border-t border-border">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {featureItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all text-left shadow-subtle group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-mono font-medium text-text-subtle bg-background px-1.5 py-0.5 rounded border border-border">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-xs text-text-main group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p
                      className="text-[11px] text-text-muted leading-snug line-clamp-2 mt-0.5"
                      dangerouslySetInnerHTML={{ __html: item.description }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
