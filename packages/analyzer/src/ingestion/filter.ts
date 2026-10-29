import path from 'path';

export interface FileFilterResult {
  accepted: boolean;
  reason?: string;
}

const EXCLUDED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.github',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'target',
  'vendor',
  '.venv',
  'venv',
  '__pycache__',
  'coverage',
  '.nyc_output',
  '.cache',
  '.idea',
  '.vscode',
]);

const BINARY_AND_MEDIA_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.avif',
  '.mp4', '.webm', '.mov', '.mp3', '.wav',
  '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z',
  '.pdf', '.epub', '.doc', '.docx',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.lock', '.sqlite', '.db',
]);

const LOCKFILES_AND_LARGE_DATA = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'composer.lock',
  'cargo.lock',
  'gemfile.lock',
  'poetry.lock',
]);

export const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB limit for AST parsing
export const MAX_ANALYZE_FILES_COUNT = 2000;

export function filterRepoFile(filePath: string, sizeBytes?: number): FileFilterResult {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1];

  // Check excluded directory anywhere in path
  for (const part of parts.slice(0, -1)) {
    if (EXCLUDED_DIRECTORIES.has(part.toLowerCase())) {
      return { accepted: false, reason: `Excluded directory: ${part}` };
    }
  }

  // Check lockfiles
  if (LOCKFILES_AND_LARGE_DATA.has(fileName.toLowerCase())) {
    return { accepted: false, reason: 'Generated package lockfile' };
  }

  // Check binary / media extensions
  const ext = path.extname(fileName).toLowerCase();
  if (BINARY_AND_MEDIA_EXTENSIONS.has(ext)) {
    return { accepted: false, reason: `Binary or media format (${ext})` };
  }

  // Minified files
  if (fileName.endsWith('.min.js') || fileName.endsWith('.min.css')) {
    return { accepted: false, reason: 'Minified source bundle' };
  }

  // Check file size if provided
  if (sizeBytes !== undefined && sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { accepted: false, reason: `File size exceeds threshold (${Math.round(sizeBytes / 1024)} KB > 500 KB)` };
  }

  return { accepted: true };
}
