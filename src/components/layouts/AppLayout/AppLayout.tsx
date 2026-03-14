import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link to="/app/todos" className={styles.logo}>TodoApp</Link>
        <nav className={styles.nav}>
          <Link to="/app/todos">Todos</Link>
          <Link to="/app/profile">Profile</Link>
          <span className={styles.userEmail}>{user?.name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </nav>
      </header>
      <div className={styles.body}>
        <ProjectSidebar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
