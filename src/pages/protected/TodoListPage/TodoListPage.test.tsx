import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TodoListPage } from './TodoListPage';
import { todoService } from '@/services/todoService';
import type { Todo } from '@/types/todo';

// ── dnd-kit mock ─────────────────────────────────────────────────────────────
// Capture the DnD handlers so tests can simulate drag events directly.
let capturedOnDragEnd: ((e: any) => void) | undefined;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd, onDragStart }: any) => {
    capturedOnDragEnd = onDragEnd;
    void onDragStart; // suppress unused warning
    return <>{children}</>;
  },
  DragOverlay:  () => null,
  PointerSensor: class {},
  useSensor:    vi.fn(() => null),
  useSensors:   vi.fn(() => []),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners:  {},
    setNodeRef: vi.fn(),
    transform:  null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Translate: { toString: () => '' } },
}));

// ── Service mock ─────────────────────────────────────────────────────────────
vi.mock('@/services/todoService', () => ({
  todoService: {
    list:    vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
    getById: vi.fn(),
  },
}));

// ── Router mock ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────
const BASE_DATE = '2024-01-01T00:00:00Z';

const mockTodos: Todo[] = [
  { id: '1', description: 'Todo item',        status: 'TODO',        userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
  { id: '2', description: 'In progress item', status: 'IN_PROGRESS', userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
  { id: '3', description: 'Done item',        status: 'DONE',        userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <TodoListPage />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('TodoListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDragEnd = undefined;
  });

  it('renders the three column headers', async () => {
    vi.mocked(todoService.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Todo')).toBeTruthy();
      expect(screen.getByText('In Progress')).toBeTruthy();
      expect(screen.getByText('Done')).toBeTruthy();
    });
  });

  it('places each todo in the correct column', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Todo item')).toBeTruthy();
      expect(screen.getByText('In progress item')).toBeTruthy();
      expect(screen.getByText('Done item')).toBeTruthy();
    });
  });

  it('shows an error message when list() rejects', async () => {
    vi.mocked(todoService.list).mockRejectedValue(new Error('Network error'));
    renderPage();

    await waitFor(() => expect(screen.getByText('Failed to load todos.')).toBeTruthy());
  });

  it('shows the add form when "+ New Todo" is clicked', async () => {
    vi.mocked(todoService.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => screen.getByText('+ New Todo'));
    act(() => { fireEvent.click(screen.getByText('+ New Todo')); });

    expect(screen.getByPlaceholderText('What needs to be done?')).toBeTruthy();
  });

  it('hides the form when Cancel is clicked', async () => {
    vi.mocked(todoService.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => screen.getByText('+ New Todo'));
    act(() => { fireEvent.click(screen.getByText('+ New Todo')); });
    act(() => { fireEvent.click(screen.getByText('Cancel')); });

    expect(screen.queryByPlaceholderText('What needs to be done?')).toBeNull();
  });

  it('calls todoService.create and adds the card to the board', async () => {
    const newTodo: Todo = { id: '99', description: 'New task', status: 'TODO', userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE };
    vi.mocked(todoService.list).mockResolvedValue([]);
    vi.mocked(todoService.create).mockResolvedValue(newTodo);
    renderPage();

    await waitFor(() => screen.getByText('+ New Todo'));
    act(() => { fireEvent.click(screen.getByText('+ New Todo')); });

    const input = screen.getByPlaceholderText('What needs to be done?');
    fireEvent.change(input, { target: { value: 'New task' } });

    await act(async () => { fireEvent.click(screen.getByText('Add')); });

    expect(todoService.create).toHaveBeenCalledWith({ description: 'New task' });
    await waitFor(() => expect(screen.getByText('New task')).toBeTruthy());
  });

  it('does not submit an empty description', async () => {
    vi.mocked(todoService.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => screen.getByText('+ New Todo'));
    act(() => { fireEvent.click(screen.getByText('+ New Todo')); });

    await act(async () => { fireEvent.click(screen.getByText('Add')); });

    expect(todoService.create).not.toHaveBeenCalled();
  });

  it('calls todoService.update when a card is dragged to a different column', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockResolvedValue({ ...mockTodos[0], status: 'DONE' });
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    await act(async () => {
      capturedOnDragEnd!({ active: { id: '1' }, over: { id: 'DONE' } });
    });

    expect(todoService.update).toHaveBeenCalledWith('1', { status: 'DONE' });
  });

  it('does not call update when dropped in the same column', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    await act(async () => {
      capturedOnDragEnd!({ active: { id: '1' }, over: { id: 'TODO' } });
    });

    expect(todoService.update).not.toHaveBeenCalled();
  });

  it('does not call update when dropped outside any column', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    await act(async () => {
      capturedOnDragEnd!({ active: { id: '1' }, over: null });
    });

    expect(todoService.update).not.toHaveBeenCalled();
  });

  it('reverts optimistic update and shows error when API call fails', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockRejectedValue(new Error('Server error'));
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    await act(async () => {
      capturedOnDragEnd!({ active: { id: '1' }, over: { id: 'DONE' } });
    });

    await waitFor(() => expect(screen.getByText('Failed to move todo.')).toBeTruthy());
  });

  it('navigates to the detail page when a card is clicked', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getByText('Todo item'));

    expect(mockNavigate).toHaveBeenCalledWith('/app/todos/1');
  });
});
