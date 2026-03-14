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
  { id: '1', title: 'Todo item',        description: 'Todo description',        status: 'TODO',        order: 2, userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
  { id: '4', title: 'Low priority',     description: 'Low priority desc',       status: 'TODO',        order: 1, userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
  { id: '2', title: 'In progress item', description: 'In progress description', status: 'IN_PROGRESS', order: 5, userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
  { id: '3', title: 'Done item',        description: 'Done description',        status: 'DONE',        order: 3, userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
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

  it('displays description on cards when present', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Todo description')).toBeTruthy();
      expect(screen.getByText('In progress description')).toBeTruthy();
    });
  });

  it('does not render description when it is undefined', async () => {
    const todosNoDesc: Todo[] = [
      { id: '1', title: 'Title only', status: 'TODO', userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
    ];
    vi.mocked(todoService.list).mockResolvedValue(todosNoDesc);
    renderPage();

    await waitFor(() => expect(screen.getByText('Title only')).toBeTruthy());
    // The card should not have a description paragraph
    expect(screen.queryByText('undefined')).toBeNull();
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
    expect(screen.getByPlaceholderText('Description (optional)')).toBeTruthy();
  });

  it('hides the form when Cancel is clicked', async () => {
    vi.mocked(todoService.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => screen.getByText('+ New Todo'));
    act(() => { fireEvent.click(screen.getByText('+ New Todo')); });
    act(() => { fireEvent.click(screen.getByText('Cancel')); });

    expect(screen.queryByPlaceholderText('What needs to be done?')).toBeNull();
  });

  it('calls todoService.create with title and adds the card to the board', async () => {
    const newTodo: Todo = { id: '99', title: 'New task', status: 'TODO', userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE };
    vi.mocked(todoService.list).mockResolvedValue([]);
    vi.mocked(todoService.create).mockResolvedValue(newTodo);
    renderPage();

    await waitFor(() => screen.getByText('+ New Todo'));
    act(() => { fireEvent.click(screen.getByText('+ New Todo')); });

    const input = screen.getByPlaceholderText('What needs to be done?');
    fireEvent.change(input, { target: { value: 'New task' } });

    await act(async () => { fireEvent.click(screen.getByText('Add')); });

    expect(todoService.create).toHaveBeenCalledWith({ title: 'New task' });
    await waitFor(() => expect(screen.getByText('New task')).toBeTruthy());
  });

  it('calls todoService.create with title and description when both provided', async () => {
    const newTodo: Todo = { id: '99', title: 'New task', description: 'Some details', status: 'TODO', userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE };
    vi.mocked(todoService.list).mockResolvedValue([]);
    vi.mocked(todoService.create).mockResolvedValue(newTodo);
    renderPage();

    await waitFor(() => screen.getByText('+ New Todo'));
    act(() => { fireEvent.click(screen.getByText('+ New Todo')); });

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), { target: { value: 'New task' } });
    fireEvent.change(screen.getByPlaceholderText('Description (optional)'), { target: { value: 'Some details' } });

    await act(async () => { fireEvent.click(screen.getByText('Add')); });

    expect(todoService.create).toHaveBeenCalledWith({ title: 'New task', description: 'Some details' });
  });

  it('does not submit an empty title', async () => {
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
      { id: '1', title: 'High priority', status: 'TODO', order: 2,         userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
      { id: '5', title: 'Null order',    status: 'TODO', order: undefined,  userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE },
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

  // ── Inline edit ─────────────────────────────────────────────────────────────

  it('shows inputs with current title and description when the edit button is clicked', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit todo')[0]);

    expect(screen.getByDisplayValue('Todo item')).toBeTruthy();
    expect(screen.getByDisplayValue('Todo description')).toBeTruthy();
  });

  it('calls todoService.update with title and description on save', async () => {
    const updated = { ...mockTodos[0], title: 'Updated title', description: 'Updated desc' };
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockResolvedValue(updated);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit todo')[0]);

    const titleInput = screen.getByDisplayValue('Todo item');
    const descTextarea = screen.getByDisplayValue('Todo description');
    fireEvent.change(titleInput, { target: { value: 'Updated title' } });
    fireEvent.change(descTextarea, { target: { value: 'Updated desc' } });

    await act(async () => { fireEvent.submit(titleInput.closest('form')!); });

    expect(todoService.update).toHaveBeenCalledWith('1', { title: 'Updated title', description: 'Updated desc' });
    await waitFor(() => expect(screen.getByText('Updated title')).toBeTruthy());
  });

  it('closes the edit form on Cancel without calling update', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit todo')[0]);

    act(() => { fireEvent.click(screen.getByText('Cancel')); });

    expect(todoService.update).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Todo item')).toBeNull();
    expect(screen.getByText('Todo item')).toBeTruthy();
  });

  it('closes the edit form on Escape without calling update', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit todo')[0]);

    const titleInput = screen.getByDisplayValue('Todo item');
    fireEvent.keyDown(titleInput, { key: 'Escape' });

    expect(todoService.update).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Todo item')).toBeNull();
  });

  it('does not call update when saving an empty title', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit todo')[0]);

    const titleInput = screen.getByDisplayValue('Todo item');
    fireEvent.change(titleInput, { target: { value: '   ' } });

    await act(async () => { fireEvent.submit(titleInput.closest('form')!); });

    expect(todoService.update).not.toHaveBeenCalled();
  });

  it('shows an error and keeps form open when update fails', async () => {
    vi.mocked(todoService.list).mockResolvedValue(mockTodos);
    vi.mocked(todoService.update).mockRejectedValue(new Error('Server error'));
    renderPage();

    await waitFor(() => screen.getByText('Todo item'));
    fireEvent.click(screen.getAllByTitle('Edit todo')[0]);

    const titleInput = screen.getByDisplayValue('Todo item');
    fireEvent.change(titleInput, { target: { value: 'New title' } });

    await act(async () => { fireEvent.submit(titleInput.closest('form')!); });

    await waitFor(() => expect(screen.getByText('Failed to update todo.')).toBeTruthy());
    expect(screen.getByDisplayValue('New title')).toBeTruthy();
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
    const newTodo: Todo = { id: '99', title: 'New task', status: 'TODO', userId: 'u1', createdAt: BASE_DATE, updatedAt: BASE_DATE };
    vi.mocked(todoService.list).mockResolvedValue([]);
    vi.mocked(todoService.create).mockResolvedValue(newTodo);
    vi.mocked(projectService.getById).mockResolvedValue(mockProject);
    renderPage('/app/todos?projectId=p1');

    await waitFor(() => screen.getByText('+ New Todo'));
    act(() => { fireEvent.click(screen.getByText('+ New Todo')); });

    const input = screen.getByPlaceholderText('What needs to be done?');
    fireEvent.change(input, { target: { value: 'New task' } });

    await act(async () => { fireEvent.click(screen.getByText('Add')); });

    expect(todoService.create).toHaveBeenCalledWith({ title: 'New task', projectId: 'p1' });
  });
});
