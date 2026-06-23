import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import GoalsPage from './pages/GoalsPage';
import ReviewsPage from './pages/ReviewsPage';
import ReviewCyclePage from './pages/ReviewCyclePage';
import NotificationsPage from './pages/NotificationsPage';
import AppreciationPage from './pages/AppreciationPage';
import FeedbackPage from './pages/FeedbackPage';

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
          { path: 'goals', element: <GoalsPage /> },
          { path: 'reviews', element: <ReviewsPage /> },
          { path: 'reviews/:id', element: <ReviewCyclePage /> },
          { path: 'feedback', element: <FeedbackPage /> },
          {
            path: 'appreciation',
            element: <AppreciationPage />,
          },
          {
            path: 'one-on-ones',
            element: <PlaceholderPage title="1-on-1s" />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
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
