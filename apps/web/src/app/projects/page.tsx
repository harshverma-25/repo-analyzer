'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  History,
  Trash2,
  ExternalLink,
  ArrowRight,
  GitBranch,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { getProjects, deleteProject } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import type { ProjectMetadata } from '@repo-analyzer/shared';

export default function ProjectsHistoryPage() {
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analyzed projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (projectId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" and all its historical scan artifacts?`)) {
      return;
    }

    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId && (p as any)._id !== projectId));
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-main flex items-center space-x-2.5">
            <History className="w-5 h-5 text-primary" />
            <span>Analyzed Repositories</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Persisted history of scanned repositories and their architectural artifacts.
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors"
        >
          <span>Scan New Repo</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-text-muted text-xs flex flex-col items-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
          <span>Loading project history...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{error}</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-surface border border-border text-text-muted space-y-3">
          <p className="text-sm">No repositories have been analyzed yet.</p>
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-primary font-semibold hover:underline"
          >
            <span>Analyze your first GitHub repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {projects.map((proj) => {
            const pId = (proj as any)._id || proj.id;
            return (
              <div
                key={pId}
                className="p-4 rounded-xl bg-surface border border-border hover:border-border/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-base font-bold text-text-main">
                      {proj.displayName || `${proj.owner}/${proj.repo}`}
                    </span>
                    <a
                      href={proj.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-text-subtle hover:text-primary transition-colors"
                      title="Open on GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-subtle font-mono">
                    <span className="flex items-center space-x-1">
                      <GitBranch className="w-3 h-3 text-text-subtle" />
                      <span>{proj.defaultBranch || 'main'}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-text-subtle" />
                      <span>First Scanned: {formatDate(proj.createdAt)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDelete(pId, proj.displayName)}
                    className="p-2 text-text-subtle hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                    title="Delete Project and Artifacts"
                  >
                    <Trash2 className="w-4 h-4" />
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
