export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  canonicalUrl: string;
  displayName: string;
}

export function parseAndValidateGitHubUrl(rawUrl: string): ParsedGitHubUrl {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('A repository URL is required');
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Reject anything other than https / http
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP/HTTPS URLs are supported');
  }

  // Enforce github.com domain
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'github.com' && hostname !== 'www.github.com') {
    throw new Error('Only public repositories on github.com are currently supported');
  }

  // Extract /:owner/:repo
  const segments = parsed.pathname
    .split('/')
    .filter((s) => s.length > 0);

  if (segments.length < 2) {
    throw new Error('URL must include both owner and repository name (e.g. https://github.com/owner/repo)');
  }

  const owner = segments[0];
  let repo = segments[1];

  // Strip .git suffix if present
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  // Validate owner and repo names against GitHub's naming rules
  const validNameRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!validNameRegex.test(owner) || !validNameRegex.test(repo)) {
    throw new Error('Repository owner or name contains invalid characters');
  }

  // Reject traversal or suspicious tokens
  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') {
    throw new Error('Malformed repository path');
  }

  const canonicalUrl = `https://github.com/${owner}/${repo}`;
  const displayName = `${owner}/${repo}`;

  return {
    owner,
    repo,
    canonicalUrl,
    displayName,
  };
}
