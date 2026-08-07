import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/authProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { MainLayout } from './components/layout'
import './App.css'
import { BoardsPage } from './pages/BoardsPage'
import { BoardDetailPage } from './pages/BoardDetailPage'
import CalendarView  from './components/CalendarView';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/access-denied"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AccessDeniedPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="boards">
              <Route index element={<BoardsPage />} />
              <Route path=":boardId" element={<BoardDetailPage />} />
            </Route>
            <Route path="schedule" element={<CalendarView />} />
            <Route
              path="pm"
              element={
                <ProtectedRoute allowedRoles={['PM']}>
                  <DashboardPage variant="pm" />
                </ProtectedRoute>
              }
            />
            <Route
              path="team"
              element={
                <ProtectedRoute allowedRoles={['PM', 'User']}>
                  <DashboardPage variant="team" />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
