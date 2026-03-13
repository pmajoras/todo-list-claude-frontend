import { Outlet, Link } from 'react-router-dom';
import styles from './PublicLayout.module.css';

export function PublicLayout() {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>TodoApp</Link>
        <nav className={styles.nav}>
          <Link to="/login">Login</Link>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
