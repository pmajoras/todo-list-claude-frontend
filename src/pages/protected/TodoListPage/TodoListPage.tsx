import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { Todo, TodoStatus } from '../../../types/todo';
import styles from './TodoListPage.module.css';

const COLUMNS: { status: TodoStatus; label: string; accent: string }[] = [
  { status: 'TODO',        label: 'Todo',        accent: 'var(--color-status-todo)' },
  { status: 'IN_PROGRESS', label: 'In Progress',  accent: 'var(--color-status-progress)' },
  { status: 'DONE',        label: 'Done',         accent: 'var(--color-status-done)' },
];

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  todo: Todo;
  onNavigate: (id: string) => void;
  overlay?: boolean;
}

function TodoCard({ todo, onNavigate, overlay = false }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: todo.id });
  const dragged = useRef(false);

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  function handlePointerDown() {
    dragged.current = false;
  }

  function handlePointerMove() {
    dragged.current = true;
  }

  function handleClick() {
    if (!dragged.current) onNavigate(todo.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        styles.card,
        isDragging  ? styles.cardGhost   : '',
        overlay     ? styles.cardOverlay : '',
        todo.status === 'DONE' ? styles.cardDone : '',
      ].join(' ')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      <p className={styles.cardText}>{todo.description}</p>
      <span className={styles.cardDate}>{new Date(todo.updatedAt).toLocaleDateString()}</span>
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
}

function KanbanColumn({ status, label, accent, todos, onNavigate, onAddClick }: ColumnProps) {
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
          <TodoCard key={todo.id} todo={todo} onNavigate={onNavigate} />
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
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating]       = useState(false);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    todoService.list()
      .then(setTodos)
      .catch(() => setError('Failed to load todos.'))
      .finally(() => setLoading(false));
  }, []);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const todoId   = active.id as string;
    const newStatus = over.id as TodoStatus;
    const todo     = todos.find(t => t.id === todoId);
    if (!todo || todo.status === newStatus) return;

    // Optimistic update
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, status: newStatus } : t));
    try {
      const updated = await todoService.update(todoId, { status: newStatus });
      setTodos(prev => prev.map(t => t.id === todoId ? updated : t));
    } catch {
      setTodos(prev => prev.map(t => t.id === todoId ? todo : t)); // revert
      setError('Failed to move todo.');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDescription.trim()) return;
    setCreating(true);
    try {
      const todo = await todoService.create({ description: newDescription.trim() });
      setTodos(prev => [todo, ...prev]);
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
          <h1 className={styles.title}>My Todos</h1>
          <span className={styles.badge}>{todos.length}</span>
        </div>
        <button className={styles.newBtn} onClick={() => setShowForm(true)}>
          + New Todo
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {showForm && (
        <form className={styles.form} onSubmit={handleCreate}>
          <input
            autoFocus
            className={styles.input}
            placeholder="What needs to be done?"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
          <button className={styles.submitBtn} type="submit" disabled={creating}>
            {creating ? 'Adding…' : 'Add'}
          </button>
          <button
            className={styles.cancelBtn}
            type="button"
            onClick={() => { setShowForm(false); setNewDescription(''); }}
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
              todos={todos.filter(t => t.status === col.status)}
              onNavigate={id => navigate(`/app/todos/${id}`)}
              onAddClick={() => setShowForm(true)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeTodo && (
            <TodoCard todo={activeTodo} onNavigate={() => {}} overlay />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
