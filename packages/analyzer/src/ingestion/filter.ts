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

const SENSITIVE_SECRET_FILENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  'id_rsa',
  'id_ed25519',
  'credentials.json',
  'service-account.json',
  'secrets.json',
  'token.json',
]);

const SENSITIVE_SECRET_EXTENSIONS = new Set([
  '.pem',
  '.key',
  '.p12',
  '.pfx',
  '.crt',
  '.cer',
]);

export const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB limit for AST parsing
export const MAX_ANALYZE_FILES_COUNT = 2000;

export function filterRepoFile(filePath: string, sizeBytes?: number): FileFilterResult {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1].toLowerCase();

  // 1. Exclude secret-bearing files from analysis to prevent leakage into prompts or memory
  if (SENSITIVE_SECRET_FILENAMES.has(fileName) || fileName.startsWith('.env.')) {
    return { accepted: false, reason: `Excluded sensitive secret or environment file (${fileName})` };
  }

  const ext = path.extname(fileName).toLowerCase();
  if (SENSITIVE_SECRET_EXTENSIONS.has(ext)) {
    return { accepted: false, reason: `Excluded cryptographic certificate or key file (${ext})` };
  }

  // 2. Check excluded directory anywhere in path
  for (const part of parts.slice(0, -1)) {
    if (EXCLUDED_DIRECTORIES.has(part.toLowerCase())) {
      return { accepted: false, reason: `Excluded directory: ${part}` };
    }
  }

  // 3. Check lockfiles
  if (LOCKFILES_AND_LARGE_DATA.has(fileName)) {
    return { accepted: false, reason: 'Generated package lockfile' };
  }

  // 4. Check binary / media extensions
  if (BINARY_AND_MEDIA_EXTENSIONS.has(ext)) {
    return { accepted: false, reason: `Binary or media format (${ext})` };
  }

  // 5. Minified files
  if (fileName.endsWith('.min.js') || fileName.endsWith('.min.css')) {
    return { accepted: false, reason: 'Minified source bundle' };
  }

  // 6. Check file size if provided
  if (sizeBytes !== undefined && sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { accepted: false, reason: `File size exceeds threshold (${Math.round(sizeBytes / 1024)} KB > 500 KB)` };
  }

  return { accepted: true };
}
