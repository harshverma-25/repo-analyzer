import type {
  ApiResponse,
  FullScanReport,
  ScanMetadata,
  ProjectMetadata,
} from '@repo-analyzer/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const payload: ApiResponse<T> = await res.json();

  if (!res.ok || !payload.success) {
    const errorMsg = payload.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }

  return payload.data as T;
}

export async function createScan(repoUrl: string, branch?: string): Promise<{ scanId: string; status: string; stage: string }> {
  return fetchJson('/api/v1/scans', {
    method: 'POST',
    body: JSON.stringify({ repoUrl, branch }),
  });
}

export async function getScanStatus(scanId: string): Promise<ScanMetadata> {
  return fetchJson(`/api/v1/scans/${scanId}`);
}

export async function getScanReport(scanId: string): Promise<FullScanReport> {
  return fetchJson(`/api/v1/scans/${scanId}/report`);
}

export async function askAI(scanId: string, question: string): Promise<{ answer: string; referencedFiles: string[] }> {
  return fetchJson(`/api/v1/scans/${scanId}/ai/explain`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

export async function getProjects(): Promise<ProjectMetadata[]> {
  return fetchJson('/api/v1/projects');
}

export async function deleteProject(projectId: string): Promise<{ message: string }> {
  return fetchJson(`/api/v1/projects/${projectId}`, {
    method: 'DELETE',
  });
}

export async function checkHealth(): Promise<{ status: string; geminiConfigured: boolean; database: string }> {
  return fetchJson('/api/v1/health');
}
