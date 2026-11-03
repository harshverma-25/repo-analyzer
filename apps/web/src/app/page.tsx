'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Code2,
  Database,
  Network,
  Shield,
  Sparkles,
  Github,
  GitBranch,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { createScan } from '../lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || isLoading) return;

    if (isValidGitHubUrl(repoUrl) === false) {
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

  const featureItems = [
    { title: 'APIs', icon: Code2 },
    { title: 'Models', icon: Database },
    { title: 'Architecture', icon: Network },
    { title: 'Security', icon: Shield },
    { title: 'AI Insights', icon: Sparkles },
  ];

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Main Centered Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-6xl lg:text-[4rem] font-extrabold tracking-tight text-white leading-[1.12]">
          Understand any
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-[#bca6ff]">
            GitHub repository
          </span>
        </h1>

        {/* Centered Subtitle */}
        <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
          Code insights, architecture, APIs, models, and security — in seconds.
        </p>

        {/* Wide Centered Search / Input Box with Glassmorphism */}
        <div className="w-full max-w-3xl mx-auto mt-9 sm:mt-11">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center rounded-full bg-white/[0.03] border border-white/[0.1] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] backdrop-blur-2xl p-1.5 focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
          >
            {/* GitHub Octocat Icon */}
            <Github className="w-5 h-5 text-white/50 ml-4 shrink-0" />

            {/* URL Input */}
            <input
              id="repo-url-input"
              name="repoUrl"
              aria-label="Repository URL"
              type="url"
              required
              placeholder="Paste a public GitHub repository URL"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="flex-1 bg-transparent px-4 py-2.5 text-sm sm:text-base text-white placeholder:text-white/35 focus:outline-none font-sans"
            />

            {/* Branch Selector Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 font-mono border-l border-white/[0.08] mr-1">
              <GitBranch className="w-3.5 h-3.5 text-white/50" />
              <input
                id="repo-branch-input"
                name="branch"
                aria-label="Branch (optional)"
                type="text"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-12 bg-transparent text-xs text-white/90 placeholder:text-white/40 focus:outline-none font-mono"
              />
              <ChevronDown className="w-3 h-3 text-white/50 pointer-events-none" />
            </div>

            {/* Submit Analyze Button */}
            <button
              id="analyze-submit-button"
              aria-label="Analyze repository"
              type="submit"
              disabled={isLoading || !repoUrl.trim()}
              className="px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-medium rounded-full flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <span>Analyze &rarr;</span>
              )}
            </button>
          </form>

          {/* Validation / Server Error Message */}
          {errorMessage && (
            <div className="mt-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 backdrop-blur-md text-rose-300 text-xs flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sample Repository Shortcuts */}
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/40 font-mono">
            <span>Try sample:</span>
            <button
              type="button"
              onClick={() => {
                setRepoUrl('https://github.com/expressjs/express');
                setErrorMessage(null);
              }}
              className="hover:text-blue-400 underline underline-offset-2 transition-colors cursor-pointer"
            >
              expressjs/express
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => {
                setRepoUrl('https://github.com/harshverma-25/repo-analyzer');
                setErrorMessage(null);
              }}
              className="hover:text-blue-400 underline underline-offset-2 transition-colors cursor-pointer"
            >
              repo-analyzer
            </button>
          </div>
        </div>

        {/* 5 Feature Icons Row: Glassmorphism Cards */}
        <div className="w-full max-w-3xl mx-auto mt-14 sm:mt-18 flex items-center justify-between px-3 sm:px-6">
          {featureItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex flex-col items-center space-y-2.5 group cursor-default">
                <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl flex items-center justify-center text-blue-400 group-hover:bg-white/[0.07] group-hover:border-blue-400/40 group-hover:text-blue-300 group-hover:scale-105 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.75]" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  {item.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
