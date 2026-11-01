import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Terminal, ShieldCheck, Cpu } from 'lucide-react';
import { ThemeProvider } from '../components/theme-provider';
import { Navbar } from '../components/navbar';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Repo Analyzer — Code Insights, Architecture & Security',
  description:
    'Evidence-based static code understanding, architecture mapping, and grounded Gemini insights for public GitHub repositories.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Anti-flash theme script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('repo-analyzer-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen flex flex-col bg-background text-text-main font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-150`}
      >
        <ThemeProvider>
          {/* Navigation Header */}
          <Navbar />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col">{children}</main>

          {/* Minimalist Developer Footer */}
          <footer className="border-t border-border bg-surface/50 py-5 px-4 sm:px-6 lg:px-8 text-xs text-text-subtle transition-colors">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-text-muted">Repo Analyzer</span>
                <span>&copy; {new Date().getFullYear()}</span>
                <span>— Deterministic AST facts & Google Gemini explanations</span>
              </div>
              <div className="flex items-center space-x-4 text-[11px] font-mono text-text-muted">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Static Observations</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  <span>Zero Code Execution</span>
                </span>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
