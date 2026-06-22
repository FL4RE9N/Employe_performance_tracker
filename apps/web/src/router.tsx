import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          // Placeholder routes — pages wired in Phase 1
          { path: 'goals', element: <PlaceholderPage title="Goals" /> },
          { path: 'reviews', element: <PlaceholderPage title="Reviews" /> },
          { path: 'feedback', element: <PlaceholderPage title="Feedback" /> },
          {
            path: 'appreciation',
            element: <PlaceholderPage title="Appreciation" />,
          },
          {
            path: 'one-on-ones',
            element: <PlaceholderPage title="1-on-1s" />,
          },
          {
            path: 'notifications',
            element: <PlaceholderPage title="Notifications" />,
          },
          { path: 'admin', element: <AdminUsersPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

/** Minimal placeholder used until Phase 1 wires real pages */
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>{title}</h2>
      <p style={{ color: '#64748b' }}>
        This section will be built in Phase 1.
      </p>
    </div>
  );
}

export default router;
