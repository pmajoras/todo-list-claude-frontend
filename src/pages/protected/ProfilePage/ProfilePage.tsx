import { useAuth } from '@/contexts/AuthContext';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profile</h1>
      <dl className={styles.details}>
        <dt>Name</dt>
        <dd>{user?.name}</dd>

      </dl>
    </div>
  );
}
