import type {
  ArchitectureGraphArtifact,
  ArchitectureNode,
  ArchitectureEdge,
  RouteFinding,
  DatabaseModelFinding,
} from '@repo-analyzer/shared';

export function buildArchitectureGraph(
  routes: RouteFinding[],
  models: DatabaseModelFinding[]
): ArchitectureGraphArtifact {
  const nodes: ArchitectureNode[] = [];
  const edges: ArchitectureEdge[] = [];
  const nodeIds = new Set<string>();

  function addNode(node: ArchitectureNode) {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  }

  // Add Database node if models exist
  if (models.length > 0) {
    addNode({
      id: 'db-mongo',
      label: 'MongoDB Database',
      type: 'database',
      metadata: { engine: 'MongoDB' },
    });
  }

  // Add Model nodes and edges to DB
  for (const model of models) {
    const modelNodeId = `model-${model.modelName}`;
    addNode({
      id: modelNodeId,
      label: `${model.modelName} (Model)`,
      type: 'model',
      filePath: model.filePath,
      metadata: { fieldsCount: model.fields.length },
    });

    edges.push({
      id: `edge-${modelNodeId}-db`,
      source: modelNodeId,
      target: 'db-mongo',
      label: 'persists in',
      relationshipType: 'queries',
    });

    // Model relationships
    for (const rel of model.relationships) {
      const targetModelId = `model-${rel.targetModel}`;
      edges.push({
        id: `edge-${modelNodeId}-${targetModelId}`,
        source: modelNodeId,
        target: targetModelId,
        label: `ref (${rel.foreignField})`,
        relationshipType: 'references',
      });
    }
  }

  // Add Route & Controller nodes and edges
  for (const route of routes) {
    const routeNodeId = `route-${route.method}-${route.resolvedPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
    addNode({
      id: routeNodeId,
      label: `${route.method} ${route.resolvedPath}`,
      type: 'route',
      filePath: route.filePath,
      metadata: { method: route.method, auth: route.authRequired },
    });

    // If there is an auth middleware, add edge
    if (route.authMiddlewareDetected) {
      const authNodeId = `mw-${route.authMiddlewareDetected.replace(/[^a-zA-Z0-9]/g, '_')}`;
      addNode({
        id: authNodeId,
        label: `${route.authMiddlewareDetected} (Auth)`,
        type: 'middleware',
      });

      edges.push({
        id: `edge-${routeNodeId}-${authNodeId}`,
        source: routeNodeId,
        target: authNodeId,
        label: 'protects',
        relationshipType: 'uses',
      });
    }

    // If there is a handler/controller
    if (route.handlerName) {
      const handlerNodeId = `handler-${route.handlerName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      addNode({
        id: handlerNodeId,
        label: `${route.handlerName}()`,
        type: 'controller',
        filePath: route.filePath,
      });

      edges.push({
        id: `edge-${routeNodeId}-${handlerNodeId}`,
        source: routeNodeId,
        target: handlerNodeId,
        label: 'routes to',
        relationshipType: 'calls',
      });

      // Connect handler to models if name matches (e.g. getUser -> User model)
      for (const model of models) {
        if (
          route.handlerName.toLowerCase().includes(model.modelName.toLowerCase()) ||
          route.resolvedPath.toLowerCase().includes(model.modelName.toLowerCase())
        ) {
          const modelNodeId = `model-${model.modelName}`;
          edges.push({
            id: `edge-${handlerNodeId}-${modelNodeId}`,
            source: handlerNodeId,
            target: modelNodeId,
            label: 'uses model',
            relationshipType: 'queries',
          });
          break;
        }
      }
    }
  }

  // Build Mermaid diagram text
  let mermaidText = 'flowchart TD\n';
  mermaidText += '  subgraph API_Endpoints ["API Endpoints"]\n';
  const topRoutes = routes.slice(0, 10);
  for (const r of topRoutes) {
    const safeId = `R_${r.method}_${r.resolvedPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
    mermaidText += `    ${safeId}["[${r.method}] ${r.resolvedPath}"]\n`;
  }
  mermaidText += '  end\n';

  if (models.length > 0) {
    mermaidText += '  subgraph Database_Layer ["Database Models"]\n';
    for (const m of models) {
      mermaidText += `    M_${m.modelName}["${m.modelName} Schema"]\n`;
    }
    mermaidText += '    DB[(MongoDB)]\n';
    for (const m of models) {
      mermaidText += `    M_${m.modelName} --> DB\n`;
    }
    mermaidText += '  end\n';
  }

  return {
    nodes,
    edges,
    mermaidDiagram: mermaidText,
  };
}
