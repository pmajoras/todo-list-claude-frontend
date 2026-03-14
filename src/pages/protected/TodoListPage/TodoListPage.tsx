import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { todoService } from '../../../services/todoService';
import { projectService } from '../../../services/projectService';
import type { Todo, TodoStatus, PatchTodoRequest } from '../../../types/todo';
import styles from './TodoListPage.module.css';

const STATUSES = new Set<string>(['TODO', 'IN_PROGRESS', 'DONE']);

function sortByOrder(list: Todo[]): Todo[] {
  return [...list].sort((a, b) => (b.order ?? 1) - (a.order ?? 1));
}

const COLUMNS: { status: TodoStatus; label: string; accent: string }[] = [
  { status: 'TODO',        label: 'Todo',        accent: 'var(--color-status-todo)' },
  { status: 'IN_PROGRESS', label: 'In Progress',  accent: 'var(--color-status-progress)' },
  { status: 'DONE',        label: 'Done',         accent: 'var(--color-status-done)' },
];

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  todo: Todo;
  onNavigate: (id: string) => void;
  onUpdate: (id: string, patch: { title?: string; description?: string }) => Promise<void>;
  overlay?: boolean;
}

function TodoCard({ todo, onNavigate, onUpdate, overlay = false }: CardProps) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: todo.id });
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({ id: todo.id });
  const dragged = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const setRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  function handlePointerDown() { dragged.current = false; }
  function handlePointerMove() { dragged.current = true; }
  function handleClick() {
    if (!dragged.current && !isEditing) onNavigate(todo.id);
  }

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? '');
    setIsEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) return;
    try {
      await onUpdate(todo.id, { title: editTitle.trim(), description: editDescription.trim() || undefined });
      setIsEditing(false);
    } catch {
      // keep form open; parent shows the error
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (e.key === 'Escape') setIsEditing(false);
  }

  return (
    <div
      ref={setRef}
      style={style}
      className={[
        styles.card,
        isDragging   ? styles.cardGhost      : '',
        overlay      ? styles.cardOverlay    : '',
        isDropOver && !isEditing ? styles.cardDropTarget : '',
        todo.status === 'DONE' ? styles.cardDone : '',
      ].join(' ')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      {...(isEditing ? {} : listeners)}
      {...(isEditing ? {} : attributes)}
    >
      {isEditing ? (
        <form className={styles.cardEditForm} onSubmit={handleSave}>
          <input
            autoFocus
            className={styles.cardInput}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Title"
          />
          <textarea
            className={styles.cardTextarea}
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Description (optional)"
          />
          <div className={styles.cardEditActions}>
            <button className={styles.cardSaveBtn} type="submit" disabled={!editTitle.trim()}>
              Save
            </button>
            <button className={styles.cardCancelBtn} type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.cardBody}>
            <div className={styles.cardContent}>
              <p className={styles.cardTitle}>{todo.title}</p>
              {todo.description && (
                <p className={styles.cardDescription}>{todo.description}</p>
              )}
            </div>
            <button className={styles.cardEditBtn} onClick={startEdit} title="Edit todo">
              ✎
            </button>
          </div>
          <span className={styles.cardDate}>{new Date(todo.updatedAt).toLocaleDateString()}</span>
        </>
      )}
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

interface ColumnProps {
  status: TodoStatus;
  label: string;
  accent: string;
  todos: Todo[];
  onNavigate: (id: string) => void;
  onAddClick: () => void;
  onUpdate: (id: string, patch: { title?: string; description?: string }) => Promise<void>;
}

function KanbanColumn({ status, label, accent, todos, onNavigate, onAddClick, onUpdate }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <span className={styles.columnDot} style={{ background: accent }} />
        <span className={styles.columnLabel}>{label}</span>
        <span className={styles.columnCount}>{todos.length}</span>
        {status === 'TODO' && (
          <button className={styles.addInlineBtn} onClick={onAddClick} title="Add todo">
            +
          </button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={[styles.columnBody, isOver ? styles.columnOver : ''].join(' ')}
      >
        {todos.map(todo => (
          <TodoCard key={todo.id} todo={todo} onNavigate={onNavigate} onUpdate={onUpdate} />
        ))}

        {todos.length === 0 && (
          <div className={[styles.emptyZone, isOver ? styles.emptyZoneOver : ''].join(' ')}>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TodoListPage() {
  const [todos, setTodos]             = useState<Todo[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [newTitle, setNewTitle]       = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating]       = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') ?? undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    setLoading(true);
    todoService.list({ projectId })
      .then(setTodos)
      .catch(() => setError('Failed to load todos.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      projectService.getById(projectId)
        .then(p => setProjectName(p.name))
        .catch(() => setProjectName(null));
    } else {
      setProjectName(null);
    }
  }, [projectId]);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const todoId = active.id as string;
    const activeTodo = todos.find(t => t.id === todoId);
    if (!activeTodo) return;

    if (STATUSES.has(over.id as string)) {
      // Column drop: status change only
      const newStatus = over.id as TodoStatus;
      if (activeTodo.status === newStatus) return;

      setTodos(prev => prev.map(t => t.id === todoId ? { ...t, status: newStatus } : t));
      try {
        const updated = await todoService.update(todoId, { status: newStatus });
        setTodos(prev => prev.map(t => t.id === todoId ? updated : t));
      } catch {
        setTodos(prev => prev.map(t => t.id === todoId ? activeTodo : t));
        setError('Failed to move todo.');
      }
    } else {
      // Card drop: reorder (and optionally status change)
      if (over.id === todoId) return;

      const overTodo = todos.find(t => t.id === over.id);
      if (!overTodo) return;

      const newStatus = overTodo.status;
      const activeOrder = activeTodo.order ?? 1;
      const overOrder = overTodo.order ?? 1;
      // Dragging down within the same column → active sits above over in the list
      // (higher order = higher position), so place it below by taking order - 1.
      // Dragging up, or cross-column → place above the target with order + 1.
      const draggingDown = activeTodo.status === newStatus && activeOrder > overOrder;
      const newOrder = draggingDown ? overOrder - 1 : overOrder + 1;

      const patch: PatchTodoRequest = {};
      if (activeTodo.status !== newStatus) patch.status = newStatus;
      if (activeTodo.order !== newOrder)   patch.order  = newOrder;
      if (Object.keys(patch).length === 0) return;

      setTodos(prev => prev.map(t => t.id === todoId ? { ...t, ...patch } : t));
      try {
        const updated = await todoService.update(todoId, patch);
        setTodos(prev => prev.map(t => t.id === todoId ? updated : t));
      } catch {
        setTodos(prev => prev.map(t => t.id === todoId ? activeTodo : t));
        setError('Failed to reorder todo.');
      }
    }
  }

  async function handleUpdateTodo(id: string, patch: { title?: string; description?: string }) {
    const original = todos.find(t => t.id === id);
    if (!original) return;
    try {
      const updated = await todoService.update(id, patch);
      setTodos(prev => prev.map(t => t.id === id ? updated : t));
    } catch (err) {
      setError('Failed to update todo.');
      throw err;
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const todo = await todoService.create({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        projectId,
      });
      setTodos(prev => [todo, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setShowForm(false);
    } catch {
      setError('Failed to create todo.');
    } finally {
      setCreating(false);
    }
  }

  const activeTodo = activeId ? todos.find(t => t.id === activeId) : null;

  if (loading) return <p className={styles.state}>Loading…</p>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{projectName ?? 'My Todos'}</h1>
          <span className={styles.badge}>{todos.length}</span>
        </div>
        <button className={styles.newBtn} onClick={() => setShowForm(true)}>
          + New Todo
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {showForm && (
        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.formFields}>
            <input
              autoFocus
              className={styles.input}
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <input
              className={styles.input}
              placeholder="Description (optional)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
            />
          </div>
          <button className={styles.submitBtn} type="submit" disabled={creating || !newTitle.trim()}>
            {creating ? 'Adding…' : 'Add'}
          </button>
          <button
            className={styles.cancelBtn}
            type="button"
            onClick={() => { setShowForm(false); setNewTitle(''); setNewDescription(''); }}
          >
            Cancel
          </button>
        </form>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              accent={col.accent}
              todos={sortByOrder(todos.filter(t => t.status === col.status))}
              onNavigate={id => navigate(`/app/todos/${id}`)}
              onAddClick={() => setShowForm(true)}
              onUpdate={handleUpdateTodo}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeTodo && (
            <TodoCard todo={activeTodo} onNavigate={() => {}} onUpdate={async () => {}} overlay />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
