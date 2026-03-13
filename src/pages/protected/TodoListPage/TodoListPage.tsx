import styles from './TodoListPage.module.css';

export function TodoListPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Todos</h1>
      <p className={styles.placeholder}>Your todos will appear here.</p>
    </div>
  );
}
