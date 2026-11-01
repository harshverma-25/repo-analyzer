'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History,
  Trash2,
  ExternalLink,
  ArrowRight,
  GitBranch,
  Calendar,
  AlertCircle,
  Loader2,
  Search,
  Code2,
  FolderGit2,
} from 'lucide-react';
import { getProjects, deleteProject } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import type { ProjectMetadata } from '@repo-analyzer/shared';

export default function ProjectsHistoryPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analyzed projects history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (projectId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" and all associated analysis artifacts?`)) {
      return;
    }

    setDeletingId(projectId);
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId && (p as any)._id !== projectId));
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase();
      const name = p.displayName || `${p.owner}/${p.repo}`;
      return name.toLowerCase().includes(q) || p.canonicalUrl.toLowerCase().includes(q);
    });
  }, [projects, search]);

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-text-main flex items-center space-x-2.5">
            <History className="w-5 h-5 text-primary" />
            <span>Scan History</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Persisted inventory of analyzed GitHub repositories and their architectural artifacts.
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors self-start sm:self-auto shadow-sm"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Analyze New Repo</span>
        </Link>
      </div>

      {/* Search Toolbar */}
      {projects.length > 0 && (
        <div className="p-3.5 rounded-xl bg-surface border border-border shadow-subtle flex items-center justify-between gap-3 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search history by repository name or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary"
            />
          </div>
          <span className="text-xs font-mono text-text-subtle whitespace-nowrap">
            {filteredProjects.length} of {projects.length} Saved
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center text-text-muted text-xs flex flex-col items-center">
          <Loader2 className="w-7 h-7 animate-spin text-primary mb-3" />
          <span className="font-semibold text-text-main">Loading scan history...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-surface border border-border text-text-muted space-y-4 shadow-subtle">
          <FolderGit2 className="w-10 h-10 text-text-subtle mx-auto" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-text-main">No repositories have been analyzed yet</h4>
            <p className="text-xs text-text-subtle max-w-sm mx-auto">
              Submit a public GitHub repository on the homepage to generate deterministic route graphs, schemas, and Gemini insights.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <span>Analyze your first GitHub repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-12 text-center rounded-xl bg-surface border border-border text-xs text-text-subtle">
          No repositories match your search query "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredProjects.map((proj) => {
            const pId = (proj as any)._id || proj.id;
            const displayName = proj.displayName || `${proj.owner}/${proj.repo}`;

            return (
              <div
                key={pId}
                className="p-4 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-subtle"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-sm font-bold text-text-main truncate">
                      {displayName}
                    </span>
                    <a
                      href={proj.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-text-subtle hover:text-primary transition-colors p-0.5"
                      title="Open repository on GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-subtle font-mono">
                    <span className="flex items-center space-x-1 text-text-muted">
                      <GitBranch className="w-3 h-3" />
                      <span>{proj.defaultBranch || 'main'}</span>
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Scanned: {formatDate(proj.createdAt)}</span>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => router.push(`/?repo=${encodeURIComponent(proj.canonicalUrl)}`)}
                    className="px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary/50 text-text-main text-xs font-mono font-medium transition-colors"
                  >
                    Analyze Again
                  </button>

                  <button
                    onClick={() => handleDelete(pId, displayName)}
                    disabled={deletingId === pId}
                    className="p-2 text-text-subtle hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete project artifacts"
                  >
                    {deletingId === pId ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
