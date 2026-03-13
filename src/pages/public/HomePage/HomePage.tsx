import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>Hello World</h1>
      <p className={styles.subtitle}>
        A simple, clean todo app to keep your tasks in order.
      </p>
      <div className={styles.actions}>
        <Link to="/register" className={styles.btnPrimary}>Get Started</Link>
        <Link to="/login" className={styles.btnSecondary}>Sign In</Link>
      </div>
    </div>
  );
}
