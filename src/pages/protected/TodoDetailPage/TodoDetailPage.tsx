import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { todoService } from '../../../services/todoService';
import type { Todo, TodoStatus } from '../../../types/todo';
import styles from './TodoDetailPage.module.css';

const STATUS_LABELS: Record<TodoStatus, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

export function TodoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [todo, setTodo] = useState<Todo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TodoStatus>('TODO');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    todoService.getById(id)
      .then(data => {
        setTodo(data);
        setTitle(data.title);
        setDescription(data.description ?? '');
        setStatus(data.status);
      })
      .catch(() => setLoadError('Failed to load todo.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!id || !todo || !title.trim()) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const updated = await todoService.update(id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
      });
      setTodo(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  const isDirty = todo && (
    title !== todo.title ||
    description !== (todo.description ?? '') ||
    status !== todo.status
  );

  if (loading) return <p className={styles.state}>Loading…</p>;
  if (loadError) return <p className={`${styles.state} ${styles.errorState}`}>{loadError}</p>;
  if (!todo) return null;

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/app/todos')}>
        ← Back to todos
      </button>

      <div className={styles.card}>
        <label className={styles.label} htmlFor="title">Title</label>
        <input
          id="title"
          className={styles.titleInput}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Todo title…"
        />

        <label className={styles.label} htmlFor="description">Description</label>
        <textarea
          id="description"
          className={styles.textarea}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          placeholder="Add a description (optional)…"
        />

        <label className={styles.label}>Status</label>
        <div className={styles.statusGroup}>
          {(['TODO', 'IN_PROGRESS', 'DONE'] as TodoStatus[]).map(s => (
            <button
              key={s}
              className={`${styles.statusOption} ${status === s ? styles[`active_${s}`] : ''}`}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className={styles.meta}>
          <span>Created: {new Date(todo.createdAt).toLocaleString()}</span>
          <span>Updated: {new Date(todo.updatedAt).toLocaleString()}</span>
        </div>

        {saveError && <p className={styles.error}>{saveError}</p>}

        <div className={styles.actions}>
          <button
            className={`${styles.saveBtn} ${saved ? styles.savedBtn : ''}`}
            onClick={handleSave}
            disabled={saving || !isDirty || !title.trim()}
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
          <button className={styles.cancelBtn} onClick={() => navigate('/app/todos')}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
