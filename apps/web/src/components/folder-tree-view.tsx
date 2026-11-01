'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react';
import type { FolderTreeNode } from '@repo-analyzer/shared';
import { formatBytes } from '../lib/utils';

function getFileIcon(name: string) {
  if (name.endsWith('.json')) return FileJson;
  if (name.endsWith('.md') || name.endsWith('.txt')) return FileText;
  return FileCode;
}

function TreeNode({
  node,
  search,
  defaultExpanded,
}: {
  node: FolderTreeNode;
  search: string;
  defaultExpanded: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const isDir = node.type === 'directory';
  const Icon = isDir ? (isOpen ? FolderOpen : Folder) : getFileIcon(node.name);

  // If search is active, check if node or any children match
  const matchesSearch =
    search === '' ||
    node.name.toLowerCase().includes(search.toLowerCase()) ||
    node.path.toLowerCase().includes(search.toLowerCase());

  if (!matchesSearch && (!node.children || node.children.length === 0)) {
    return null;
  }

  if (!isDir) {
    return (
      <div className="py-1 px-2 rounded hover:bg-surfaceHover/50 flex items-center justify-between text-xs font-mono text-text-muted hover:text-text-main transition-colors">
        <div className="flex items-center space-x-2 truncate">
          <Icon className="w-3.5 h-3.5 text-text-subtle shrink-0" />
          <span className="truncate">{node.name}</span>
        </div>
        <div className="flex items-center space-x-3 text-[10px] text-text-subtle shrink-0 font-mono">
          {node.lineCount !== undefined && <span>{node.lineCount} lines</span>}
          {node.sizeBytes !== undefined && <span>{formatBytes(node.sizeBytes)}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="py-0.5">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="py-1 px-2 rounded hover:bg-surfaceHover/50 flex items-center justify-between text-xs font-mono cursor-pointer select-none text-text-main font-semibold transition-colors"
      >
        <div className="flex items-center space-x-1.5 truncate">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-subtle shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-subtle shrink-0" />
          )}
          <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{node.name || 'root'}</span>
        </div>
        {node.children && (
          <span className="text-[10px] text-text-subtle font-mono">
            {node.children.length} {node.children.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {isOpen && node.children && node.children.length > 0 && (
        <div className="pl-4 ml-2 border-l border-border/60 space-y-0.5">
          {node.children.map((child, idx) => (
            <TreeNode
              key={idx}
              node={child}
              search={search}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTreeView({ folderTree }: { folderTree: FolderTreeNode }) {
  const [search, setSearch] = useState('');
  const [expandAll, setExpandAll] = useState(true);

  return (
    <div className="p-6 rounded-xl bg-surface border border-border shadow-subtle space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search files and directories in repository..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={() => setExpandAll(!expandAll)}
          className="px-3 py-1.5 rounded-lg bg-background border border-border text-text-muted hover:text-text-main text-xs font-mono transition-colors whitespace-nowrap"
        >
          {expandAll ? 'Collapse Subtrees' : 'Expand Subtrees'}
        </button>
      </div>

      <div className="p-3 rounded-lg bg-background border border-border max-h-[580px] overflow-y-auto">
        {folderTree ? (
          <TreeNode node={folderTree} search={search} defaultExpanded={expandAll} />
        ) : (
          <div className="text-center py-8 text-xs text-text-subtle font-mono">
            No folder tree data available.
          </div>
        )}
      </div>
    </div>
  );
}
