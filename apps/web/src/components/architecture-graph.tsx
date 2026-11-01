'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
} from '@xyflow/react';
import {
  Cpu,
  Layers,
  Database,
  Lock,
  FileCode,
  Search,
  Filter,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Code2,
} from 'lucide-react';
import { useTheme } from './theme-provider';
import type {
  ArchitectureGraphArtifact,
  RouteFinding,
  DatabaseModelFinding,
} from '@repo-analyzer/shared';

// Custom Node Component for React Flow
function ArchitectureCustomNode({ data }: { data: any }) {
  const typeStyles: Record<string, { badge: string; color: string; icon: any }> = {
    route: { badge: 'Route', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: Code2 },
    router: { badge: 'Router', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', icon: Layers },
    middleware: { badge: 'Middleware', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: Lock },
    controller: { badge: 'Controller', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', icon: FileCode },
    service: { badge: 'Service', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', icon: Cpu },
    model: { badge: 'Model', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: Database },
    database: { badge: 'Database', color: 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20', icon: Database },
  };

  const style = typeStyles[data.nodeType] || {
    badge: data.nodeType || 'Node',
    color: 'text-text-muted bg-surfaceHover border-border',
    icon: Layers,
  };
  const Icon = style.icon;

  return (
    <div className="w-56 rounded-lg bg-surface border border-border hover:border-primary/50 transition-all p-3 shadow-subtle text-left select-none">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-primary border-none" />
      <div className="flex items-center justify-between mb-1.5">
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border ${style.color} flex items-center space-x-1`}>
          <Icon className="w-2.5 h-2.5" />
          <span>{style.badge}</span>
        </span>
        {data.method && (
          <span className="text-[9px] font-mono font-bold text-text-subtle">
            {data.method}
          </span>
        )}
      </div>

      <div className="text-xs font-mono font-semibold text-text-main truncate" title={data.label}>
        {data.label}
      </div>

      {data.filePath && (
        <div className="text-[10px] font-mono text-text-subtle truncate mt-1.5 flex items-center space-x-1">
          <FileCode className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{data.filePath}</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-primary border-none" />
    </div>
  );
}

const nodeTypes = {
  custom: ArchitectureCustomNode,
};

interface ArchitectureExplorerProps {
  graph?: ArchitectureGraphArtifact;
  endpoints: RouteFinding[];
  databaseModels: DatabaseModelFinding[];
}

export function ArchitectureExplorer({
  graph,
  endpoints,
  databaseModels,
}: ArchitectureExplorerProps) {
  const { resolvedTheme } = useTheme();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeView, setActiveView] = useState<'graph' | 'mermaid'>('graph');
  const [copiedMermaid, setCopiedMermaid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Compute layouted nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const rawNodes = graph?.nodes || [];
    const rawEdges = graph?.edges || [];

    // Fallback: If backend graph nodes are empty, synthesize from endpoints and models
    if (rawNodes.length === 0 && (endpoints.length > 0 || databaseModels.length > 0)) {
      const generatedNodes: Node[] = [];
      const generatedEdges: Edge[] = [];

      // Column 1: Routes
      endpoints.slice(0, 8).forEach((ep, i) => {
        generatedNodes.push({
          id: `ep-${ep.id}`,
          type: 'custom',
          position: { x: 50, y: i * 80 + 40 },
          data: {
            label: ep.resolvedPath,
            nodeType: 'route',
            method: ep.method,
            filePath: ep.filePath,
          },
        });

        // Middlewares
        if (ep.authRequired || ep.middlewareChain.length > 0) {
          const mwId = `mw-${ep.id}`;
          generatedNodes.push({
            id: mwId,
            type: 'custom',
            position: { x: 330, y: i * 80 + 40 },
            data: {
              label: ep.authRequired ? 'authGuard' : ep.middlewareChain[0] || 'middleware',
              nodeType: 'middleware',
              filePath: 'auth/middleware.ts',
            },
          });
          generatedEdges.push({
            id: `edge-${ep.id}-mw`,
            source: `ep-${ep.id}`,
            target: mwId,
            label: 'mounts',
            animated: true,
            style: { stroke: resolvedTheme === 'dark' ? '#4b5563' : '#94a3b8' },
          });

          // Controller
          if (ep.handlerName) {
            const ctrlId = `ctrl-${ep.id}`;
            generatedNodes.push({
              id: ctrlId,
              type: 'custom',
              position: { x: 610, y: i * 80 + 40 },
              data: {
                label: ep.handlerName,
                nodeType: 'controller',
                filePath: ep.filePath,
              },
            });
            generatedEdges.push({
              id: `edge-mw-${ctrlId}`,
              source: mwId,
              target: ctrlId,
              label: 'calls',
              style: { stroke: resolvedTheme === 'dark' ? '#4b5563' : '#94a3b8' },
            });
          }
        }
      });

      // Column 4: Models
      databaseModels.slice(0, 6).forEach((m, i) => {
        generatedNodes.push({
          id: `m-${m.id}`,
          type: 'custom',
          position: { x: 890, y: i * 90 + 40 },
          data: {
            label: m.modelName,
            nodeType: 'model',
            filePath: m.filePath,
          },
        });
      });

      return { initialNodes: generatedNodes, initialEdges: generatedEdges };
    }

    // Normal path: parse rawNodes and organize into layered columns
    // Columns: route (50px), middleware (330px), controller/router (610px), service (890px), model/db (1170px)
    const columnX: Record<string, number> = {
      route: 50,
      router: 50,
      middleware: 330,
      controller: 610,
      service: 890,
      model: 1170,
      database: 1170,
      external: 1170,
    };

    const rowCounts: Record<string, number> = {};

    const nodes: Node[] = rawNodes.map((n) => {
      const type = n.type || 'route';
      const col = columnX[type] ?? 330;
      const row = rowCounts[type] || 0;
      rowCounts[type] = row + 1;

      return {
        id: n.id,
        type: 'custom',
        position: { x: col, y: row * 85 + 40 },
        data: {
          label: n.label,
          nodeType: n.type,
          filePath: n.filePath,
          metadata: n.metadata,
        },
      };
    });

    const edges: Edge[] = rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || e.relationshipType || undefined,
      animated: e.relationshipType === 'calls' || e.relationshipType === 'queries',
      style: {
        stroke: resolvedTheme === 'dark' ? '#4b5563' : '#94a3b8',
        strokeWidth: 1.5,
      },
      labelStyle: {
        fontSize: 10,
        fill: resolvedTheme === 'dark' ? '#9ca3af' : '#64748b',
        fontFamily: 'monospace',
      },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [graph, endpoints, databaseModels, resolvedTheme]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Filter nodes according to search and type
  const displayedNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesType =
        filterType === 'ALL' || (n.data?.nodeType as string)?.toLowerCase() === filterType.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        (n.data?.label as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.data?.filePath as string)?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [nodes, filterType, searchTerm]);

  const handleCopyMermaid = () => {
    if (!graph?.mermaidDiagram) return;
    navigator.clipboard.writeText(graph.mermaidDiagram);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  return (
    <div
      className={`rounded-xl bg-surface border border-border shadow-md overflow-hidden flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'h-[620px]'
      }`}
    >
      {/* Top Controls Toolbar */}
      <div className="p-3 bg-surface border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg bg-background p-0.5 border border-border">
            <button
              onClick={() => setActiveView('graph')}
              className={`px-3 py-1 rounded-md text-xs font-medium font-mono transition-colors ${
                activeView === 'graph'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Interactive Graph
            </button>
            <button
              onClick={() => setActiveView('mermaid')}
              className={`px-3 py-1 rounded-md text-xs font-medium font-mono transition-colors ${
                activeView === 'mermaid'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Mermaid Diagram
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-1 text-text-subtle text-[11px] font-mono">
            <span>{displayedNodes.length} Nodes</span>
            <span>&bull;</span>
            <span>{edges.length} Edges</span>
          </div>
        </div>

        {activeView === 'graph' ? (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter graph nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background border border-border rounded-md pl-8 pr-2.5 py-1 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary w-40 sm:w-48"
              />
            </div>

            {/* Type selector */}
            <div className="flex items-center space-x-1">
              {['ALL', 'ROUTE', 'MIDDLEWARE', 'CONTROLLER', 'MODEL'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors ${
                    filterType === t
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-text-muted hover:text-text-main border border-transparent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded bg-background border border-border text-text-muted hover:text-text-main transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <button
            onClick={handleCopyMermaid}
            disabled={!graph?.mermaidDiagram}
            className="px-2.5 py-1 rounded bg-background border border-border text-text-muted hover:text-text-main flex items-center space-x-1.5 text-xs transition-colors font-mono"
          >
            {copiedMermaid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMermaid ? 'Copied' : 'Copy Mermaid Syntax'}</span>
          </button>
        )}
      </div>

      {/* Main View Area */}
      <div className="flex-1 w-full relative bg-background">
        {activeView === 'graph' ? (
          displayedNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-xs text-text-muted">
              <Cpu className="w-8 h-8 text-text-subtle mb-2" />
              <p className="font-semibold text-text-main">No architecture nodes match your filter.</p>
              <p className="text-text-subtle mt-1">Try resetting the node type filter or clearing the search text.</p>
            </div>
          ) : (
            <ReactFlow
              nodes={displayedNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              maxZoom={2}
            >
              <Background
                color={resolvedTheme === 'dark' ? '#374151' : '#cbd5e1'}
                gap={20}
                size={1}
              />
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap
                position="bottom-right"
                nodeStrokeColor={resolvedTheme === 'dark' ? '#4b5563' : '#94a3b8'}
                nodeColor={resolvedTheme === 'dark' ? '#1f2937' : '#f1f5f9'}
                maskColor={resolvedTheme === 'dark' ? 'rgba(11, 15, 23, 0.7)' : 'rgba(248, 250, 252, 0.7)'}
                className="!bg-surface !border !border-border !rounded-lg"
              />
            </ReactFlow>
          )
        ) : (
          <div className="p-6 h-full overflow-auto font-mono text-xs text-text-main">
            {graph?.mermaidDiagram ? (
              <pre className="p-4 rounded-xl bg-surface border border-border overflow-x-auto leading-relaxed text-text-muted">
                {graph.mermaidDiagram}
              </pre>
            ) : (
              <div className="text-center py-16 text-text-subtle">
                <p>No Mermaid diagram generated for this repository scan.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
