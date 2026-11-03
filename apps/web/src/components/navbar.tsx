'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Code2,
  Github,
  Menu,
  X,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Analyze' },
    { href: '/projects', label: 'History' },
  ];

  return (
    <header className="border-b border-white/[0.07] bg-black/40 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          className="flex items-center space-x-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-blue-400 group-hover:border-blue-400/50 transition-colors">
            <Code2 className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white group-hover:text-blue-400 transition-colors">
            Repo Analyzer
          </span>
        </Link>

        {/* Center: Desktop Navigation Links (Centered in Header) */}
        <nav
          className="hidden md:flex items-center space-x-6 absolute left-1/2 -translate-x-1/2"
          aria-label="Main Navigation"
        >
          {navLinks.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname.startsWith('/scans')
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-1 text-sm font-medium transition-colors focus:outline-none ${
                  isActive
                    ? 'text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-blue-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: GitHub Icon & Mobile Menu Toggle */}
        <div className="flex items-center space-x-2">
          {/* GitHub Repository Link */}
          <a
            href="https://github.com/harshverma-25/repo-analyzer"
            target="_blank"
            rel="noreferrer"
            aria-label="View Source on GitHub"
            title="View Source on GitHub"
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Github className="w-4 h-4" />
          </a>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 text-white/60 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.07] bg-black/90 backdrop-blur-xl px-4 py-3 space-y-2">
          {navLinks.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname.startsWith('/scans')
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-400 bg-blue-500/10 font-semibold'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
