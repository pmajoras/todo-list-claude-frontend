import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TodoListPage } from './TodoListPage';
import { todoService } from '@/services/todoService';
import { projectService } from '@/services/projectService';
import type { Todo } from '@/types/todo';
import type { Project } from '@/types/project';

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

// ── Service mocks ─────────────────────────────────────────────────────────────
vi.mock('@/services/todoService', () => ({
  todoService: {
    list:    vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('@/services/projectService', () => ({
  projectService: {
    list:    vi.fn(),
    getById: vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
    delete:  vi.fn(),
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
  { id: '1', description: 'Todo item',        status: 'TODO',        order: 2, userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
  { id: '4', description: 'Low priority',     status: 'TODO',        order: 1, userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
  { id: '2', description: 'In progress item', status: 'IN_PROGRESS', order: 5, userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
  { id: '3', description: 'Done item',        status: 'DONE',        order: 3, userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
];

const mockProject: Project = {
  id: 'p1', name: 'My Project', ownerUserId: 'u1', status: 'ACTIVE',
  createdAt: BASE_DATE, updatedAt: BASE_DATE,
};

function renderPage(url = '/app/todos') {
  return render(
    <MemoryRouter initialEntries={[url]}>
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

  it('renders higher-order todos before lower-order ones in the same column', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    const cards = screen.getAllByText(/Todo item|Low priority/);
    expect(cards[0].textContent).toBe('Todo item');   // order 2 comes first
    expect(cards[1].textContent).toBe('Low priority'); // order 1 comes second
  });

  it('treats null order as 1 when sorting', async () => {
    const todosWithNull: Todo[] = [
      { id: '1', description: 'High priority', status: 'TODO', order: 2,         userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
      { id: '5', description: 'Null order',    status: 'TODO', order: undefined,  userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
    ];
    vi.mocked(todoService.list).mockResolvedValue(todosWithNull);
    renderPage();

    await waitFor(() => screen.getByText('High priority'));

    const cards = screen.getAllByText(/High priority|Null order/);
    expect(cards[0].textContent).toBe('High priority');
    expect(cards[1].textContent).toBe('Null order');
  });

  it('dragging UP: places card above target with overOrder + 1', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockResolvedValue({ ...mockTodos[1], order: 3 });
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    // 'Low priority' (id '4', order 1) dragged UP onto 'Todo item' (id '1', order 2)
    // activeOrder (1) < overOrder (2) → dragging up → newOrder = 2 + 1 = 3
    await act(async () => {
      capturedOnDragEnd!({ active: { id: '4' }, over: { id: '1' } });
    });

    expect(todoService.update).toHaveBeenCalledWith('4', { order: 3 });
  });

  it('dragging DOWN: places card below target with overOrder - 1', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockResolvedValue({ ...mockTodos[0], order: 0 });
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    // 'Todo item' (id '1', order 2) dragged DOWN onto 'Low priority' (id '4', order 1)
    // activeOrder (2) > overOrder (1) → dragging down → newOrder = 1 - 1 = 0
    await act(async () => {
      capturedOnDragEnd!({ active: { id: '1' }, over: { id: '4' } });
    });

    expect(todoService.update).toHaveBeenCalledWith('1', { order: 0 });
  });

  it('calls update with status and order when card is dropped onto a card in a different column', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockResolvedValue({ ...mockTodos[0], status: 'IN_PROGRESS', order: 6 });
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    // Drop 'Todo item' (id '1', status TODO) onto 'In progress item' (id '2', status IN_PROGRESS, order 5)
    // Expected: patch = { status: 'IN_PROGRESS', order: 6 }
    await act(async () => {
      capturedOnDragEnd!({ active: { id: '1' }, over: { id: '2' } });
    });

    expect(todoService.update).toHaveBeenCalledWith('1', { status: 'IN_PROGRESS', order: 6 });
  });

  it('does not call update when a card is dropped onto itself', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    await act(async () => {
      capturedOnDragEnd!({ active: { id: '1' }, over: { id: '1' } });
    });

    expect(todoService.update).not.toHaveBeenCalled();
  });

  it('reverts and shows error when card-drop reorder API call fails', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockRejectedValue(new Error('Server error'));
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));

    await act(async () => {
      capturedOnDragEnd!({ active: { id: '4' }, over: { id: '1' } });
    });

    await waitFor(() => expect(screen.getByText('Failed to reorder todo.')).toBeTruthy());
  });

  // ── Inline description edit ───────────────────────────────────────────────

  it('shows a textarea with current description when the edit button is clicked', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit description')[0]);

    expect(screen.getByDisplayValue('Todo item')).toBeTruthy();
  });

  it('calls todoService.update with the new description on save', async () => {
    const updated = { ...mockTodos[0], description: 'Updated description' };
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockResolvedValue(updated);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit description')[0]);

    const textarea = screen.getByDisplayValue('Todo item');
    fireEvent.change(textarea, { target: { value: 'Updated description' } });

    await act(async () => { fireEvent.submit(textarea.closest('form')!); });

    expect(todoService.update).toHaveBeenCalledWith('1', { description: 'Updated description' });
    await waitFor(() => expect(screen.getByText('Updated description')).toBeTruthy());
  });

  it('closes the edit form on Cancel without calling update', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit description')[0]);

    act(() => { fireEvent.click(screen.getByText('Cancel')); });

    expect(todoService.update).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Todo item')).toBeNull();
    expect(screen.getByText('Todo item')).toBeTruthy();
  });

  it('closes the edit form on Escape without calling update', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit description')[0]);

    const textarea = screen.getByDisplayValue('Todo item');
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(todoService.update).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Todo item')).toBeNull();
  });

  it('does not call update when saving an empty description', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit description')[0]);

    const textarea = screen.getByDisplayValue('Todo item');
    fireEvent.change(textarea, { target: { value: '   ' } });

    await act(async () => { fireEvent.submit(textarea.closest('form')!); });

    expect(todoService.update).not.toHaveBeenCalled();
  });

  it('shows an error and keeps form open when update fails', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockRejectedValue(new Error('Server error'));
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit description')[0]);

    const textarea = screen.getByDisplayValue('Todo item');
    fireEvent.change(textarea, { target: { value: 'New text' } });

    await act(async () => { fireEvent.submit(textarea.closest('form')!); });

    await waitFor(() => expect(screen.getByText('Failed to update todo.')).toBeTruthy());
    expect(screen.getByDisplayValue('New text')).toBeTruthy();
  });

  // ── Project filter ────────────────────────────────────────────────────────

  it('calls todoService.list with projectId when ?projectId is in the URL', async () => {
    vi.mocked(todoService.list).mockResolvedValue([]);
    vi.mocked(projectService.getById).mockResolvedValue(mockProject);
    renderPage('/app/todos?projectId=p1');

    await waitFor(() => expect(todoService.list).toHaveBeenCalledWith({ projectId: 'p1' }));
  });

  it('shows the project name as the page title when a project is selected', async () => {
    vi.mocked(todoService.list).mockResolvedValue([]);
    vi.mocked(projectService.getById).mockResolvedValue(mockProject);
    renderPage('/app/todos?projectId=p1');

    await waitFor(() => expect(screen.getByText('My Project')).toBeTruthy());
  });

  it('shows "My Todos" when no project is selected', async () => {
    vi.mocked(todoService.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByText('My Todos')).toBeTruthy());
  });

  it('passes projectId to todoService.create when a project is selected', async () => {
    const newTodo: Todo = { id: '99', description: 'New task', status: 'TODO', userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE };
    vi.mocked(todoService.list).mockResolvedValue([]);
    vi.mocked(todoService.create).mockResolvedValue(newTodo);
    vi.mocked(projectService.getById).mockResolvedValue(mockProject);
    renderPage('/app/todos?projectId=p1');

    await waitFor(() => screen.getByText('+ New Todo'));
    act(() => { fireEvent.click(screen.getByText('+ New Todo')); });

    const input = screen.getByPlaceholderText('What needs to be done?');
    fireEvent.change(input, { target: { value: 'New task' } });

    await act(async () => { fireEvent.click(screen.getByText('Add')); });

    expect(todoService.create).toHaveBeenCalledWith({ description: 'New task', projectId: 'p1' });
  });
});
