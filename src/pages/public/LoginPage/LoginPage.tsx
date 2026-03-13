import { useAuth } from '@/contexts/AuthContext';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Sign In</h1>
      <button className={styles.btn} onClick={login}>
        Sign in with Google
      </button>
    </div>
  );
}
