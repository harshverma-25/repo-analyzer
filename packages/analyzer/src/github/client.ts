export interface GitHubRepoDetails {
  owner: string;
  repo: string;
  defaultBranch: string;
  description?: string;
  starsCount?: number;
  forksCount?: number;
}

export interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url?: string;
}

export interface GitHubTreeResult {
  sha: string;
  truncated: boolean;
  items: GitTreeItem[];
}

const ALLOWED_REDIRECT_HOSTS = new Set([
  'api.github.com',
  'raw.githubusercontent.com',
  'github.com',
  'codeload.github.com',
]);

const REQUEST_TIMEOUT_MS = 10000; // 10s strict timeout

/**
 * SSRF-Safe Fetch: Enforces HTTPS, approved destination domains, and manual redirect inspection.
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
  redirectCount = 0
): Promise<Response> {
  if (redirectCount > 3) {
    throw new Error('Too many HTTP redirects encountered.');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Enforce HTTPS
  if (parsed.protocol !== 'https:') {
    throw new Error(`Insecure protocol "${parsed.protocol}" is rejected.`);
  }

  // Validate Hostname against allowed GitHub domains
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_REDIRECT_HOSTS.has(host)) {
    throw new Error(`Access to unapproved host "${host}" is blocked for SSRF prevention.`);
  }

  // Reject non-standard ports (enforce default HTTPS port 443 only)
  if (parsed.port && parsed.port !== '443') {
    throw new Error(`Non-standard port "${parsed.port}" is blocked for SSRF prevention.`);
  }

  // Reject embedded credentials in URL
  if (parsed.username || parsed.password) {
    throw new Error('Embedded credentials in URLs are blocked for security.');
  }

  // Enforce request timeout
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  const res = await fetch(url, {
    ...options,
    redirect: 'manual', // Do not automatically follow redirects to untrusted destinations
    signal,
  });

  // Handle redirects safely
  if ([301, 302, 307, 308].includes(res.status)) {
    const location = res.headers.get('location');
    if (!location) {
      throw new Error(`Received HTTP ${res.status} redirect without a location header.`);
    }

    const nextUrl = new URL(location, url);
    const nextOptions: RequestInit = { ...options };

    // Strip authorization header if redirected across domains to prevent token leakage
    if (nextUrl.hostname.toLowerCase() !== host && nextOptions.headers) {
      const headers = new Headers(nextOptions.headers as HeadersInit);
      headers.delete('authorization');
      nextOptions.headers = headers;
    }

    return safeFetch(nextUrl.toString(), nextOptions, redirectCount + 1);
  }

  return res;
}

export class GitHubClient {
  private token?: string;
  private baseUrl = 'https://api.github.com';

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Repo-Analyzer/1.0',
    };
    if (this.token && this.token.trim().length > 0) {
      headers['Authorization'] = `token ${this.token.trim()}`;
    }
    return headers;
  }

  async getRepoDetails(owner: string, repo: string): Promise<GitHubRepoDetails> {
    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const url = `${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}`;
    const res = await safeFetch(url, { headers: this.getHeaders() });

    if (res.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
    }
    if (res.status === 403 || res.status === 429) {
      const resetHeader = res.headers.get('x-ratelimit-reset');
      const resetTime = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000).toLocaleTimeString() : 'shortly';
      throw new Error(`GitHub API rate limit exceeded. Please configure GITHUB_TOKEN or wait until ${resetTime}.`);
    }
    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}: ${res.statusText}`);
    }

    const data: any = await res.json();
    return {
      owner: data.owner?.login || owner,
      repo: data.name || repo,
      defaultBranch: data.default_branch || 'main',
      description: data.description || '',
      starsCount: data.stargazers_count,
      forksCount: data.forks_count,
    };
  }

  async resolveCommitSha(owner: string, repo: string, revision?: string): Promise<string> {
    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const ref = revision && revision.trim().length > 0 ? revision.trim() : 'HEAD';
    const url = `${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/commits/${encodeURIComponent(ref)}`;
    const res = await safeFetch(url, { headers: this.getHeaders() });

    if (!res.ok) {
      throw new Error(`Failed to resolve commit for revision "${ref}": ${res.statusText}`);
    }

    const data: any = await res.json();
    if (!data.sha || typeof data.sha !== 'string') {
      throw new Error(`Invalid commit SHA received for revision "${ref}"`);
    }

    return data.sha;
  }

  async getGitTree(owner: string, repo: string, commitSha: string): Promise<GitHubTreeResult> {
    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const cleanSha = encodeURIComponent(commitSha.trim());
    const url = `${this.baseUrl}/repos/${cleanOwner}/${cleanRepo}/git/trees/${cleanSha}?recursive=1`;
    const res = await safeFetch(url, { headers: this.getHeaders() });

    if (!res.ok) {
      throw new Error(`Failed to fetch Git tree for commit ${commitSha}: ${res.statusText}`);
    }

    const data: any = await res.json();
    const items: GitTreeItem[] = Array.isArray(data.tree) ? data.tree : [];

    return {
      sha: data.sha || commitSha,
      truncated: Boolean(data.truncated),
      items,
    };
  }

  async fetchRawFile(owner: string, repo: string, commitSha: string, filePath: string): Promise<string> {
    const cleanOwner = encodeURIComponent(owner.trim());
    const cleanRepo = encodeURIComponent(repo.trim());
    const cleanSha = encodeURIComponent(commitSha.trim());

    // Sanitize path against directory traversal and null-byte injection
    if (filePath.includes('\0')) {
      throw new Error('Null byte detected in file path');
    }

    const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized.includes('..')) {
      throw new Error('Path traversal sequence detected in file path');
    }

    let decoded = filePath;
    try {
      decoded = decodeURIComponent(filePath);
    } catch {
      // If decode fails, proceed with validated normalized string
    }

    if (decoded.includes('..')) {
      throw new Error('Path traversal sequence detected in file path');
    }

    const encodedPath = normalized
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    const url = `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/${cleanSha}/${encodedPath}`;
    const res = await safeFetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch file content for "${filePath}": ${res.statusText}`);
    }

    return await res.text();
  }
}
