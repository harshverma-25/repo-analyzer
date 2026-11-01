'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Terminal,
  History,
  Github,
  Sun,
  Moon,
  Menu,
  X,
  Code2,
  Sparkles,
} from 'lucide-react';
import { useTheme } from './theme-provider';

export function Navbar() {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Analyze', icon: Code2 },
    { href: '/projects', label: 'History', icon: History },
  ];

  return (
    <header className="border-b border-border bg-surface/85 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-8">
          <Link
            href="/"
            className="flex items-center space-x-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 -m-1"
          >
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:border-primary transition-colors">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-tight text-text-main group-hover:text-primary transition-colors">
                Repo Analyzer
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                v1.0
              </span>
            </div>
          </Link>

          {/* Desktop Center: Primary Navigation */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/' || pathname.startsWith('/scans')
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? 'text-text-main font-semibold bg-surfaceHover/80'
                      : 'text-text-muted hover:text-text-main hover:bg-surfaceHover/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-text-subtle'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions (GitHub repo, Theme toggle, Mobile Menu button) */}
        <div className="flex items-center space-x-2">
          {/* Status badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-surfaceHover border border-border text-[11px] font-mono text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>AST Engine Online</span>
          </div>

          {/* GitHub Repository Link */}
          <a
            href="https://github.com/harshverma-25/repo-analyzer"
            target="_blank"
            rel="noreferrer"
            aria-label="View Source on GitHub"
            title="View Source on GitHub"
            className="p-2 text-text-muted hover:text-text-main hover:bg-surfaceHover rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Github className="w-4 h-4" />
          </a>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 text-text-muted hover:text-text-main hover:bg-surfaceHover rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600" />
            )}
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 text-text-muted hover:text-text-main hover:bg-surfaceHover rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname.startsWith('/scans')
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full px-3 py-2 rounded-md text-xs font-medium flex items-center space-x-2 transition-colors ${
                  isActive
                    ? 'text-primary font-semibold bg-primary/10'
                    : 'text-text-muted hover:text-text-main hover:bg-surfaceHover'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
