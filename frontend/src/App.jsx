/**
 * LifeOS AI — App Root with React Router
 *
 * Routes:
 *   /login  → Login page (Google Sign-In)
 *   /       → Dashboard (protected — redirects to /login if no token)
 *
 * A lightweight ProtectedRoute wrapper checks localStorage for the Firebase
 * ID token. Real token validation happens on the backend; this guard just
 * prevents an unauthenticated user from accidentally landing on the dashboard.
 *
 * Dashboard has been extracted to ./pages/Dashboard.jsx for clean separation.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login/Login';
import { getStoredToken } from './services/authService';

// ---------------------------------------------------------------------------
// ProtectedRoute — unchanged from original
// ---------------------------------------------------------------------------

function ProtectedRoute({ children }) {
  const hasToken = Boolean(getStoredToken());
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// ---------------------------------------------------------------------------
// App root — routing only
// ---------------------------------------------------------------------------

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch-all → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
