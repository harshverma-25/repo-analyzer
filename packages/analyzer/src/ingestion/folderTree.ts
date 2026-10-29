import type { FolderTreeNode } from '@repo-analyzer/shared';

export function buildFolderTree(
  fileItems: { path: string; sizeBytes?: number; language?: string; lineCount?: number }[]
): FolderTreeNode {
  const root: FolderTreeNode = {
    name: 'root',
    path: '',
    type: 'directory',
    children: [],
  };

  for (const item of fileItems) {
    const segments = item.path.split('/');
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isFile = i === segments.length - 1;
      const currentPath = segments.slice(0, i + 1).join('/');

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find((c) => c.name === segment);

      if (!child) {
        child = {
          name: segment,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          sizeBytes: isFile ? item.sizeBytes : undefined,
          language: isFile ? item.language : undefined,
          lineCount: isFile ? item.lineCount : undefined,
          children: isFile ? undefined : [],
        };
        current.children.push(child);
      }

      if (!isFile) {
        current = child;
      }
    }
  }

  // Sort directories first, then files alphabetically
  function sortNode(node: FolderTreeNode) {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      for (const child of node.children) {
        sortNode(child);
      }
    }
  }

  sortNode(root);
  return root;
}
