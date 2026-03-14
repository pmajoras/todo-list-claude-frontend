import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProjectSidebar } from './ProjectSidebar';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/project';

// ── Service mock ─────────────────────────────────────────────────────────────
vi.mock('@/services/projectService', () => ({
  projectService: {
    list:    vi.fn(),
    getById: vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
    delete:  vi.fn(),
  },
}));

// ── Router mock ───────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────
const BASE_DATE = '2024-01-01T00:00:00Z';

const mockProjects: Project[] = [
  { id: 'p1', name: 'Project Alpha', ownerUserId: 'u1', status: 'ACTIVE', createdAt: BASE_DATE, updatedAt: BASE_DATE },
  { id: 'p2', name: 'Project Beta',  ownerUserId: 'u1', status: 'ACTIVE', createdAt: BASE_DATE, updatedAt: BASE_DATE },
];

function renderSidebar(url = '/app/todos') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ProjectSidebar />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('ProjectSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "All todos" and the project list', async () => {
    vi.mocked(projectService.list).mockResolvedValue(mockProjects);
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('All todos')).toBeTruthy();
      expect(screen.getByText('Project Alpha')).toBeTruthy();
      expect(screen.getByText('Project Beta')).toBeTruthy();
    });
  });

  it('clicking "All todos" navigates to /app/todos', async () => {
    vi.mocked(projectService.list).mockResolvedValue(mockProjects);
    renderSidebar('/app/todos?projectId=p1');

    await waitFor(() => screen.getByText('All todos'));
    fireEvent.click(screen.getByText('All todos'));

    expect(mockNavigate).toHaveBeenCalledWith('/app/todos');
  });

  it('clicking a project navigates to /app/todos?projectId=xxx', async () => {
    vi.mocked(projectService.list).mockResolvedValue(mockProjects);
    renderSidebar();

    await waitFor(() => screen.getByText('Project Alpha'));
    fireEvent.click(screen.getByText('Project Alpha'));

    expect(mockNavigate).toHaveBeenCalledWith('/app/todos?projectId=p1');
  });

  it('highlights the selected project from the URL param', async () => {
    vi.mocked(projectService.list).mockResolvedValue(mockProjects);
    const { container } = renderSidebar('/app/todos?projectId=p1');

    await waitFor(() => screen.getByText('Project Alpha'));

    const active = container.querySelectorAll('[class*="itemActive"]');
    expect(active.length).toBe(1);
    expect(active[0].textContent).toContain('Project Alpha');
  });

  it('highlights "All todos" when no projectId in URL', async () => {
    vi.mocked(projectService.list).mockResolvedValue(mockProjects);
    const { container } = renderSidebar('/app/todos');

    await waitFor(() => screen.getByText('Project Alpha'));

    const active = container.querySelectorAll('[class*="itemActive"]');
    expect(active.length).toBe(1);
    expect(active[0].textContent).toContain('All todos');
  });

  it('create form calls projectService.create with name and description', async () => {
    const newProject: Project = { id: 'p3', name: 'New Project', description: 'A description', ownerUserId: 'u1', status: 'ACTIVE', createdAt: BASE_DATE, updatedAt: BASE_DATE };
    vi.mocked(projectService.list).mockResolvedValue([]);
    vi.mocked(projectService.create).mockResolvedValue(newProject);
    renderSidebar();

    await waitFor(() => screen.getByText('All todos'));

    act(() => { fireEvent.click(screen.getByTitle('New project')); });

    fireEvent.change(screen.getByPlaceholderText('Name'),        { target: { value: 'New Project' } });
    fireEvent.change(screen.getByPlaceholderText('Description'), { target: { value: 'A description' } });

    await act(async () => { fireEvent.click(screen.getByText('Add')); });

    expect(projectService.create).toHaveBeenCalledWith({ name: 'New Project', description: 'A description' });
    await waitFor(() => expect(screen.getByText('New Project')).toBeTruthy());
  });

  it('does not submit the create form when name is empty', async () => {
    vi.mocked(projectService.list).mockResolvedValue([]);
    renderSidebar();

    await waitFor(() => screen.getByText('All todos'));
    act(() => { fireEvent.click(screen.getByTitle('New project')); });

    fireEvent.change(screen.getByPlaceholderText('Description'), { target: { value: 'A description' } });

    await act(async () => { fireEvent.click(screen.getByText('Add')); });

    expect(projectService.create).not.toHaveBeenCalled();
  });

  it('does not submit the create form when description is empty', async () => {
    vi.mocked(projectService.list).mockResolvedValue([]);
    renderSidebar();

    await waitFor(() => screen.getByText('All todos'));
    act(() => { fireEvent.click(screen.getByTitle('New project')); });

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'New Project' } });

    await act(async () => { fireEvent.click(screen.getByText('Add')); });

    expect(projectService.create).not.toHaveBeenCalled();
  });

  it('edit form calls projectService.update and updates the list', async () => {
    const updated: Project = { ...mockProjects[0], name: 'Renamed Alpha' };
    vi.mocked(projectService.list).mockResolvedValue(mockProjects);
    vi.mocked(projectService.update).mockResolvedValue(updated);
    renderSidebar();

    await waitFor(() => screen.getByText('Project Alpha'));

    act(() => { fireEvent.click(screen.getAllByTitle('Edit project')[0]); });

    const input = screen.getByDisplayValue('Project Alpha');
    fireEvent.change(input, { target: { value: 'Renamed Alpha' } });

    await act(async () => { fireEvent.click(screen.getByText('Save')); });

    expect(projectService.update).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Renamed Alpha' }));
    await waitFor(() => expect(screen.getByText('Renamed Alpha')).toBeTruthy());
  });

  it('cancel edit restores the project name without calling update', async () => {
    vi.mocked(projectService.list).mockResolvedValue(mockProjects);
    renderSidebar();

    await waitFor(() => screen.getByText('Project Alpha'));

    act(() => { fireEvent.click(screen.getAllByTitle('Edit project')[0]); });
    act(() => { fireEvent.click(screen.getByText('Cancel')); });

    expect(projectService.update).not.toHaveBeenCalled();
    expect(screen.getByText('Project Alpha')).toBeTruthy();
  });

  it('delete button calls projectService.delete and removes the project from the list', async () => {
    vi.mocked(projectService.list).mockResolvedValue(mockProjects);
    vi.mocked(projectService.delete).mockResolvedValue(undefined);
    renderSidebar();

    await waitFor(() => screen.getByText('Project Alpha'));

    await act(async () => { fireEvent.click(screen.getAllByTitle('Delete project')[0]); });

    expect(projectService.delete).toHaveBeenCalledWith('p1');
    await waitFor(() => expect(screen.queryByText('Project Alpha')).toBeNull());
  });

  it('deleting the currently selected project navigates to /app/todos', async () => {
    vi.mocked(projectService.list).mockResolvedValue([mockProjects[0]]);
    vi.mocked(projectService.delete).mockResolvedValue(undefined);
    renderSidebar('/app/todos?projectId=p1');

    await waitFor(() => screen.getByText('Project Alpha'));

    await act(async () => { fireEvent.click(screen.getByTitle('Delete project')); });

    expect(mockNavigate).toHaveBeenCalledWith('/app/todos');
  });

  it('deleting a non-selected project does not navigate', async () => {
    vi.mocked(projectService.list).mockResolvedValue(mockProjects);
    vi.mocked(projectService.delete).mockResolvedValue(undefined);
    renderSidebar('/app/todos?projectId=p1');

    await waitFor(() => screen.getByText('Project Beta'));

    await act(async () => { fireEvent.click(screen.getAllByTitle('Delete project')[1]); });

    expect(projectService.delete).toHaveBeenCalledWith('p2');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
