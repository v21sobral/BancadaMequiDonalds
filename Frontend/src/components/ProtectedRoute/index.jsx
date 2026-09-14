import { Navigate, Outlet, useLocation } from 'react-router-dom';

function ProtectedRoute({ usuario }) {
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
