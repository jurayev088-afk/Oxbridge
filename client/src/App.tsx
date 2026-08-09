import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Finance } from './pages/Finance';
import { Groups } from './pages/Groups';
import { Teachers } from './pages/Teachers';
import { Leads } from './pages/Leads';
import { Students } from './pages/Students';
import { GroupAccount } from './pages/GroupAccount';
import { UserAccount } from './pages/UserAccount';
import { Login } from './pages/Login';
import { TeacherHome } from './pages/TeacherHome';
import { StudentHome } from './pages/StudentHome';
import { Admins } from './pages/Admins';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastStack } from './components/ToastStack';
import { useAuth, getHomePath } from './context/AuthContext';
import './index.css';

function AuthLoader() {
  return (
    <div className="dashboard loading">
      <div className="loader">Yuklanmoqda...</div>
    </div>
  );
}

function FallbackRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomePath(user.role)} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute roles={['director', 'admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/moliya" element={<ProtectedRoute roles={['director', 'admin']}><Finance /></ProtectedRoute>} />
        <Route path="/guruhlar" element={<ProtectedRoute roles={['director', 'admin']}><Groups /></ProtectedRoute>} />
        <Route path="/oqituvchilar" element={<ProtectedRoute roles={['director', 'admin']}><Teachers /></ProtectedRoute>} />
        <Route path="/lidlar" element={<ProtectedRoute roles={['director', 'admin']}><Leads /></ProtectedRoute>} />
        <Route path="/oquvchilar" element={<ProtectedRoute roles={['director', 'admin']}><Students /></ProtectedRoute>} />
        <Route path="/adminlar" element={<ProtectedRoute roles={['director']}><Admins /></ProtectedRoute>} />

        <Route path="/oqituvchi-kabinet" element={<ProtectedRoute roles={['teacher']}><TeacherHome /></ProtectedRoute>} />
        <Route path="/mening-kabinetim" element={<ProtectedRoute roles={['student']}><StudentHome /></ProtectedRoute>} />

        <Route path="/guruh/:id" element={<ProtectedRoute roles={['director', 'admin', 'teacher']}><GroupAccount /></ProtectedRoute>} />
        <Route path="/foydalanuvchi/:id" element={<ProtectedRoute><UserAccount /></ProtectedRoute>} />

        <Route path="*" element={<FallbackRedirect />} />
      </Routes>
      <ToastStack />
    </BrowserRouter>
  );
}

export default App;
