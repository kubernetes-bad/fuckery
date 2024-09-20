const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030/api';

export type Sample = { [key: string]: string | number | null };

export enum Grade {
  BAD = 'bad',
  GOOD = 'good',
  DONE = 'done',
  REJECT = 'rejected',
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(new URL(url, API_URL), {
    ...options,
    credentials: 'include',
    redirect: 'manual',
  });
  if (response.type === 'opaqueredirect' || response.status === 401) {
    window.location.href = `${API_URL}/auth/login`;
    throw new Error('Unauthorized');
  }
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response;
}

export const fetchNextSample = async () => {
  const response = await fetchWithAuth('/next');
  if (!response.ok) {
    console.error(response);
    throw new Error('Failed to fetch next record');
  }
  return response.json();
};

export const getStats = async () => {
  const response = await fetchWithAuth('/info');
  return response.json();
};

export const getHighlights = async (text: string, signal?: AbortSignal) => {
  const response = await fetchWithAuth('/highlights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!response.ok) {
    console.error(response)
    throw new Error('Failed to fetch highlights');
  }

  return response.json();
};

export const complete = async (sample: Sample) => {
  const response = await fetchWithAuth('/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sample),
  });

  if (!response.ok) throw new Error('Failed to submit edits');
};

export const grade = async (sample: Sample, grade: Grade) => {
  const response = await fetchWithAuth('/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...sample, grade: grade }),
  })
  if (!response.ok) throw new Error('Failed to mark as bad');
};

export const fetchEdit = async () => {
  const response = await fetchWithAuth('/edit', {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Failed to mark as bad');

  if (!response.ok) {
    console.error(response)
    throw new Error('Failed to fetch highlights');
  }

  const [original, edit] = await response.json();
  return [original, edit];
};
