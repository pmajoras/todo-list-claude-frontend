import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();

function mockFetch(status: number, body?: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : `Error ${status}`,
    json: () => Promise.resolve(body ?? {}),
  }));
}

describe('api', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends Authorization: Bearer header when token exists', async () => {
    localStorageMock.setItem('session_token', 'my-jwt');
    mockFetch(200, []);

    await api.get('/api/todos');

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>)['Authorization']).toBe('Bearer my-jwt');
  });

  it('omits Authorization header when no token in localStorage', async () => {
    mockFetch(200, []);

    await api.get('/api/todos');

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('sets Content-Type: application/json on every request', async () => {
    mockFetch(200, {});

    await api.get('/api/todos');

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('throws an Error when the response is not ok', async () => {
    mockFetch(404);

    await expect(api.get('/api/todos/999')).rejects.toThrow('404');
  });

  it('returns undefined for 204 No Content responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    const result = await api.delete('/api/todos/1');

    expect(result).toBeUndefined();
  });

  it('POST sends the correct method and serialised body', async () => {
    mockFetch(201, { id: '1' });

    await api.post('/api/todos', { description: 'Test' });

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.method).toBe('POST');
    expect(opts?.body).toBe(JSON.stringify({ description: 'Test' }));
  });

  it('PUT sends the correct method and serialised body', async () => {
    mockFetch(200, { id: '1' });

    await api.put('/api/todos/1', { status: 'DONE' });

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.method).toBe('PUT');
    expect(opts?.body).toBe(JSON.stringify({ status: 'DONE' }));
  });

  it('PATCH sends the correct method and serialised body', async () => {
    mockFetch(200, { id: '1' });

    await api.patch('/api/todos/1', { status: 'DONE' });

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.method).toBe('PATCH');
    expect(opts?.body).toBe(JSON.stringify({ status: 'DONE' }));
  });

  it('DELETE sends the DELETE method', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    await api.delete('/api/todos/1');

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.method).toBe('DELETE');
  });
});
