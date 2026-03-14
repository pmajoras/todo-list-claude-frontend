import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TodoDetailPage } from './TodoDetailPage';
import { todoService } from '@/services/todoService';
import type { Todo } from '@/types/todo';

// ── Service mock ─────────────────────────────────────────────────────────────
vi.mock('@/services/todoService', () => ({
  todoService: {
    list:    vi.fn(),
    getById: vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
  },
}));

// ── Router mock ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams:    () => ({ id: 'todo-1' }),
    useNavigate:  () => mockNavigate,
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────
const mockTodo: Todo = {
  id:          'todo-1',
  title:       'Buy groceries',
  description: 'Milk, eggs, bread',
  status:      'TODO',
  userId:      'u1',
  createdAt:   '2024-01-15T10:00:00Z',
  updatedAt:   '2024-01-16T12:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <TodoDetailPage />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('TodoDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while the todo is being fetched', () => {
    vi.mocked(todoService.getById).mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();

    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('displays the todo title and description after loading', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Buy groceries')).toBeTruthy();
      expect(screen.getByDisplayValue('Milk, eggs, bread')).toBeTruthy();
    });
  });

  it('displays created and updated timestamps', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Created:/)).toBeTruthy();
      expect(screen.getByText(/Updated:/)).toBeTruthy();
    });
  });

  it('shows a load error when getById() rejects', async () => {
    vi.mocked(todoService.getById).mockRejectedValue(new Error('Not found'));
    renderPage();

    await waitFor(() => expect(screen.getByText('Failed to load todo.')).toBeTruthy());
  });

  it('Save Changes button is disabled when nothing has changed', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));

    expect(screen.getByText('Save Changes')).toBeDisabled();
  });

  it('Save Changes button is disabled when title is cleared', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));
    fireEvent.change(screen.getByDisplayValue('Buy groceries'), {
      target: { value: '' },
    });

    expect(screen.getByText('Save Changes')).toBeDisabled();
  });

  it('handles todo with no description gracefully', async () => {
    const todoNoDesc: Todo = { ...mockTodo, description: undefined };
    vi.mocked(todoService.getById).mockResolvedValue(todoNoDesc);
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));
    // Description textarea should be empty
    const descTextarea = screen.getByPlaceholderText('Add a description (optional)…');
    expect((descTextarea as HTMLTextAreaElement).value).toBe('');
  });

  it('Save Changes button is enabled after editing the title', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));
    fireEvent.change(screen.getByDisplayValue('Buy groceries'), {
      target: { value: 'Buy organic groceries' },
    });

    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('Save Changes button is enabled after editing the description', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Milk, eggs, bread'));
    fireEvent.change(screen.getByDisplayValue('Milk, eggs, bread'), {
      target: { value: 'Organic milk, free-range eggs' },
    });

    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('Save Changes button is enabled after changing the status', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));
    act(() => { fireEvent.click(screen.getByText('In Progress')); });

    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('calls todoService.update with title, description, and status', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    vi.mocked(todoService.update).mockResolvedValue({ ...mockTodo, title: 'Buy organic groceries' });
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));
    fireEvent.change(screen.getByDisplayValue('Buy groceries'), {
      target: { value: 'Buy organic groceries' },
    });

    await act(async () => { fireEvent.click(screen.getByText('Save Changes')); });

    expect(todoService.update).toHaveBeenCalledWith('todo-1', {
      title: 'Buy organic groceries',
      description: 'Milk, eggs, bread',
      status: 'TODO',
    });
  });

  it('sends undefined description when description is cleared', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    vi.mocked(todoService.update).mockResolvedValue({ ...mockTodo, description: undefined });
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Milk, eggs, bread'));
    fireEvent.change(screen.getByDisplayValue('Milk, eggs, bread'), {
      target: { value: '' },
    });

    await act(async () => { fireEvent.click(screen.getByText('Save Changes')); });

    expect(todoService.update).toHaveBeenCalledWith('todo-1', {
      title: 'Buy groceries',
      description: undefined,
      status: 'TODO',
    });
  });

  it('shows "Saved!" after a successful save', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    vi.mocked(todoService.update).mockResolvedValue({ ...mockTodo, title: 'Updated' });
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));
    fireEvent.change(screen.getByDisplayValue('Buy groceries'), { target: { value: 'Updated' } });

    await act(async () => { fireEvent.click(screen.getByText('Save Changes')); });

    await waitFor(() => expect(screen.getByText('Saved!')).toBeTruthy());
  });

  it('shows an error message when save fails', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    vi.mocked(todoService.update).mockRejectedValue(new Error('Server error'));
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));
    fireEvent.change(screen.getByDisplayValue('Buy groceries'), { target: { value: 'Updated' } });

    await act(async () => { fireEvent.click(screen.getByText('Save Changes')); });

    await waitFor(() => expect(screen.getByText('Failed to save changes.')).toBeTruthy());
  });

  it('re-enables Save Changes after a failed save', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    vi.mocked(todoService.update).mockRejectedValue(new Error('Server error'));
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));
    fireEvent.change(screen.getByDisplayValue('Buy groceries'), { target: { value: 'Updated' } });

    await act(async () => { fireEvent.click(screen.getByText('Save Changes')); });

    await waitFor(() => expect(screen.getByText('Save Changes')).not.toBeDisabled());
  });

  it('navigates to /app/todos when Back button is clicked', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    renderPage();

    await waitFor(() => screen.getByText('← Back to todos'));
    fireEvent.click(screen.getByText('← Back to todos'));

    expect(mockNavigate).toHaveBeenCalledWith('/app/todos');
  });

  it('navigates to /app/todos when Cancel is clicked', async () => {
    vi.mocked(todoService.getById).mockResolvedValue(mockTodo);
    renderPage();

    await waitFor(() => screen.getByDisplayValue('Buy groceries'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(mockNavigate).toHaveBeenCalledWith('/app/todos');
  });
});
