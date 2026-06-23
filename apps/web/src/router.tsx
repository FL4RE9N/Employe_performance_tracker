import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import GoalsPage from './pages/GoalsPage';
import ReviewsPage from './pages/ReviewsPage';
import ReviewCyclePage from './pages/ReviewCyclePage';
import NotificationsPage from './pages/NotificationsPage';
import AppreciationPage from './pages/AppreciationPage';
import FeedbackPage from './pages/FeedbackPage';
import OneOnOnesPage from './pages/OneOnOnesPage';

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
            element: <OneOnOnesPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          { path: 'admin', element: <AdminUsersPage /> },
          { path: 'admin/dashboard', element: <AdminDashboardPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
