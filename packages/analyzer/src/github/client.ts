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
    const url = `${this.baseUrl}/repos/${owner}/${repo}`;
    const res = await fetch(url, { headers: this.getHeaders() });

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
    const ref = revision && revision.trim().length > 0 ? revision.trim() : 'HEAD';
    const url = `${this.baseUrl}/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`;
    const res = await fetch(url, { headers: this.getHeaders() });

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
    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`;
    const res = await fetch(url, { headers: this.getHeaders() });

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
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${filePath}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch file content for "${filePath}": ${res.statusText}`);
    }

    return await res.text();
  }
}
