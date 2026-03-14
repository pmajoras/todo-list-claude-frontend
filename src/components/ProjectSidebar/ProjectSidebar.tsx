import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/project';
import styles from './ProjectSidebar.module.css';

export function ProjectSidebar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get('projectId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    projectService.list()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function selectProject(id: string | null) {
    if (id) navigate(`/app/todos?projectId=${encodeURIComponent(id)}`);
    else navigate('/app/todos');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newDescription.trim()) return;
    setCreating(true);
    try {
      const project = await projectService.create({ name: newName.trim(), description: newDescription.trim() });
      setProjects(prev => [project, ...prev]);
      setNewName('');
      setNewDescription('');
      setShowCreate(false);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDescription(project.description ?? '');
  }

  async function handleSaveEdit(project: Project, e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      const updated = await projectService.update(project.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        status: project.status,
      });
      setProjects(prev => prev.map(p => p.id === project.id ? updated : p));
      setEditingId(null);
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await projectService.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedId === id) navigate('/app/todos');
    } catch {
      // ignore
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Projects</span>
        <button
          className={styles.addBtn}
          onClick={() => { setShowCreate(v => !v); setNewName(''); setNewDescription(''); }}
          title="New project"
        >
          +
        </button>
      </div>

      {showCreate && (
        <form className={styles.form} onSubmit={handleCreate}>
          <input
            autoFocus
            className={styles.input}
            placeholder="Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Description"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
          <div className={styles.formActions}>
            <button
              className={styles.saveBtn}
              type="submit"
              disabled={creating || !newName.trim() || !newDescription.trim()}
            >
              {creating ? '…' : 'Add'}
            </button>
            <button
              className={styles.cancelBtn}
              type="button"
              onClick={() => { setShowCreate(false); setNewName(''); setNewDescription(''); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className={styles.list}>
        <li
          className={[styles.item, !selectedId ? styles.itemActive : ''].join(' ')}
          onClick={() => selectProject(null)}
        >
          <span className={styles.itemName}>All todos</span>
        </li>

        {loading && <li className={styles.loadingItem}>Loading…</li>}

        {projects.map(project => (
          <li key={project.id}>
            {editingId === project.id ? (
              <form className={styles.form} onSubmit={e => handleSaveEdit(project, e)}>
                <input
                  autoFocus
                  className={styles.input}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
                <input
                  className={styles.input}
                  placeholder="Description (optional)"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                />
                <div className={styles.formActions}>
                  <button className={styles.saveBtn} type="submit">Save</button>
                  <button
                    className={styles.cancelBtn}
                    type="button"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div
                className={[styles.item, selectedId === project.id ? styles.itemActive : ''].join(' ')}
                onClick={() => selectProject(project.id)}
              >
                <span className={styles.itemName}>{project.name}</span>
                <span className={styles.itemActions}>
                  <button
                    className={styles.iconBtn}
                    onClick={e => { e.stopPropagation(); startEdit(project); }}
                    title="Edit project"
                  >
                    ✎
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={e => { e.stopPropagation(); handleDelete(project.id); }}
                    title="Delete project"
                  >
                    ✕
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
