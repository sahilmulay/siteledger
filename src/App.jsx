import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { BottomNav } from './components/layout/BottomNav'
import { PageLoader } from './components/ui/Spinner'

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('./pages/Auth/Login').then(m => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Auth/Register').then(m => ({ default: m.Register })))
const ProjectList = lazy(() => import('./pages/Projects/ProjectList').then(m => ({ default: m.ProjectList })))
const ProjectForm = lazy(() => import('./pages/Projects/ProjectForm').then(m => ({ default: m.ProjectForm })))
const ProjectDashboard = lazy(() => import('./pages/Dashboard/ProjectDashboard').then(m => ({ default: m.ProjectDashboard })))
const AddIncome = lazy(() => import('./pages/Income/AddIncome').then(m => ({ default: m.AddIncome })))
const IncomeList = lazy(() => import('./pages/Income/IncomeList').then(m => ({ default: m.IncomeList })))
const AddExpense = lazy(() => import('./pages/Expenses/AddExpense').then(m => ({ default: m.AddExpense })))
const ExpenseList = lazy(() => import('./pages/Expenses/ExpenseList').then(m => ({ default: m.ExpenseList })))
const ProjectReports = lazy(() => import('./pages/Reports/ProjectReports').then(m => ({ default: m.ProjectReports })))
const ReportsHub = lazy(() => import('./pages/Reports/ReportsHub').then(m => ({ default: m.ReportsHub })))
const SitePlans = lazy(() => import('./pages/SitePlans/SitePlans').then(m => ({ default: m.SitePlans })))
const SitePhotos = lazy(() => import('./pages/SitePhotos/SitePhotos').then(m => ({ default: m.SitePhotos })))
const ExpenseCharts = lazy(() => import('./pages/Charts/ExpenseCharts').then(m => ({ default: m.ExpenseCharts })))
const Settings = lazy(() => import('./pages/Settings/Settings').then(m => ({ default: m.Settings })))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route path="/" element={<Navigate to="/projects" replace />} />

            <Route path="/projects" element={
              <ProtectedRoute><ProjectList /></ProtectedRoute>
            } />
            <Route path="/projects/new" element={
              <ProtectedRoute><ProjectForm mode="create" /></ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute><ProjectDashboard /></ProtectedRoute>
            } />
            <Route path="/projects/:id/edit" element={
              <ProtectedRoute><ProjectForm mode="edit" /></ProtectedRoute>
            } />
            <Route path="/projects/:id/income" element={
              <ProtectedRoute><IncomeList /></ProtectedRoute>
            } />
            <Route path="/projects/:id/income/new" element={
              <ProtectedRoute><AddIncome /></ProtectedRoute>
            } />
            <Route path="/projects/:id/expenses" element={
              <ProtectedRoute><ExpenseList /></ProtectedRoute>
            } />
            <Route path="/projects/:id/expenses/new" element={
              <ProtectedRoute><AddExpense /></ProtectedRoute>
            } />
            <Route path="/projects/:id/reports" element={
              <ProtectedRoute><ProjectReports /></ProtectedRoute>
            } />
            <Route path="/projects/:id/plans" element={
              <ProtectedRoute><SitePlans /></ProtectedRoute>
            } />
            <Route path="/projects/:id/photos" element={
              <ProtectedRoute><SitePhotos /></ProtectedRoute>
            } />
            <Route path="/projects/:id/charts" element={
              <ProtectedRoute><ExpenseCharts /></ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute><ReportsHub /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><Settings /></ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </Suspense>

        <BottomNav />

        <Toaster
          position="top-center"
          gutter={8}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              borderRadius: '12px',
              fontSize: '14px',
              maxWidth: '340px'
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
