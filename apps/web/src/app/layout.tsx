import type { Metadata } from 'next';
import Link from 'next/link';
import { Terminal, History, Github, ShieldAlert, Cpu } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Repo Analyzer — Static Code Understanding & Architecture Map',
  description: 'Evidence-based static analysis and grounded Gemini insights for public GitHub repositories.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-text-main">
        {/* Navigation Header */}
        <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary group-hover:border-primary transition-colors">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-wide text-text-main group-hover:text-primary transition-colors">
                    REPO ANALYZER
                  </span>
                  <span className="text-[10px] text-text-subtle tracking-wider uppercase font-mono">
                    Deterministic AST + Gemini
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  href="/projects"
                  className="px-3 py-1.5 rounded text-xs font-medium text-text-muted hover:text-text-main hover:bg-surfaceHover transition-colors flex items-center space-x-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Scan History</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-surfaceHover border border-border text-[11px] font-mono text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>API v1 Ready</span>
              </div>

              <a
                href="https://github.com/harshverma-25/repo-analyzer"
                target="_blank"
                rel="noreferrer"
                className="p-2 text-text-muted hover:text-text-main hover:bg-surfaceHover rounded transition-colors"
                title="View GitHub Repository"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="border-t border-border bg-surface/40 py-6 px-4 sm:px-6 lg:px-8 text-center text-xs text-text-subtle">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              Repo Analyzer &copy; 2026. Deterministic static code analysis establishes facts; Google Gemini explains them.
            </p>
            <div className="flex items-center space-x-4 text-text-muted">
              <span className="flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Static Observations Only</span>
              </span>
              <span className="flex items-center space-x-1">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                <span>Zero Untrusted Code Execution</span>
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
