import { describe, it, expect, vi, beforeEach } from 'vitest';
import { todoService } from './todoService';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    put:    vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

describe('todoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list() calls GET /api/todos', () => {
    vi.mocked(api.get).mockResolvedValue([]);

    todoService.list();

    expect(api.get).toHaveBeenCalledWith('/api/todos');
  });

  it('getById() calls GET /api/todos/:id', () => {
    vi.mocked(api.get).mockResolvedValue({});

    todoService.getById('abc-123');

    expect(api.get).toHaveBeenCalledWith('/api/todos/abc-123');
  });

  it('create() calls POST /api/todos with the request body', () => {
    vi.mocked(api.post).mockResolvedValue({});
    const data = { description: 'New todo' };

    todoService.create(data);

    expect(api.post).toHaveBeenCalledWith('/api/todos', data);
  });

  it('update() calls PATCH /api/todos/:id with the request body', () => {
    vi.mocked(api.patch).mockResolvedValue({});
    const data = { status: 'DONE' as const };

    todoService.update('abc-123', data);

    expect(api.patch).toHaveBeenCalledWith('/api/todos/abc-123', data);
  });

  it('list() returns the value resolved by api.get', async () => {
    const todos = [{ id: '1', description: 'Test' }];
    vi.mocked(api.get).mockResolvedValue(todos);

    const result = await todoService.list();

    expect(result).toBe(todos);
  });

  it('update() returns the value resolved by api.patch', async () => {
    const updated = { id: '1', status: 'DONE' };
    vi.mocked(api.patch).mockResolvedValue(updated);

    const result = await todoService.update('1', { status: 'DONE' });

    expect(result).toBe(updated);
  });
});
