import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectService } from './projectService';
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

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list() calls GET /api/projects', () => {
    vi.mocked(api.get).mockResolvedValue([]);

    projectService.list();

    expect(api.get).toHaveBeenCalledWith('/api/projects');
  });

  it('getById() calls GET /api/projects/:id', () => {
    vi.mocked(api.get).mockResolvedValue({});

    projectService.getById('p1');

    expect(api.get).toHaveBeenCalledWith('/api/projects/p1');
  });

  it('create() calls POST /api/projects with the request body', () => {
    vi.mocked(api.post).mockResolvedValue({});
    const data = { name: 'My Project', description: 'A description' };

    projectService.create(data);

    expect(api.post).toHaveBeenCalledWith('/api/projects', data);
  });

  it('update() calls PUT /api/projects/:id with the request body', () => {
    vi.mocked(api.put).mockResolvedValue({});
    const data = { name: 'Updated', description: 'New desc', status: 'INACTIVE' as const };

    projectService.update('p1', data);

    expect(api.put).toHaveBeenCalledWith('/api/projects/p1', data);
  });

  it('delete() calls DELETE /api/projects/:id', () => {
    vi.mocked(api.delete).mockResolvedValue(undefined);

    projectService.delete('p1');

    expect(api.delete).toHaveBeenCalledWith('/api/projects/p1');
  });

  it('list() returns the value resolved by api.get', async () => {
    const projects = [{ id: 'p1', name: 'Test' }];
    vi.mocked(api.get).mockResolvedValue(projects);

    const result = await projectService.list();

    expect(result).toBe(projects);
  });

  it('create() returns the value resolved by api.post', async () => {
    const project = { id: 'p1', name: 'My Project', description: 'A description' };
    vi.mocked(api.post).mockResolvedValue(project);

    const result = await projectService.create({ name: 'My Project', description: 'A description' });

    expect(result).toBe(project);
  });

  it('update() returns the value resolved by api.put', async () => {
    const updated = { id: 'p1', name: 'Updated' };
    vi.mocked(api.put).mockResolvedValue(updated);

    const result = await projectService.update('p1', { name: 'Updated', description: 'desc' });

    expect(result).toBe(updated);
  });
});
