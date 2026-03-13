import { useParams } from 'react-router-dom';
import styles from './TodoDetailPage.module.css';

export function TodoDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Todo Detail</h1>
      <p className={styles.id}>Todo ID: <strong>{id}</strong></p>
    </div>
  );
}
