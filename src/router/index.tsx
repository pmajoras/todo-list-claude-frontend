import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { HomePage } from '@/pages/public/HomePage';
import { LoginPage } from '@/pages/public/LoginPage';
import { OAuthRedirectPage } from '@/pages/public/OAuthRedirectPage';
import { TodoListPage } from '@/pages/protected/TodoListPage';
import { TodoDetailPage } from '@/pages/protected/TodoDetailPage';
import { ProfilePage } from '@/pages/protected/ProfilePage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/oauth2/redirect', element: <OAuthRedirectPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/app/todos', element: <TodoListPage /> },
          { path: '/app/todos/:id', element: <TodoDetailPage /> },
          { path: '/app/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
