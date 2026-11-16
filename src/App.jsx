import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { BottomNav } from './components/layout/BottomNav'
import { PageLoader } from './components/ui/Spinner'
import { OfflineIndicator } from './components/ui/OfflineIndicator'

import { ErrorBoundary } from './components/layout/ErrorBoundary'

// Wrapper to automatically hard reload the app once if a chunk fails to load (e.g. due to new deployment)
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const key = 'chunk-failed-retry'
    try {
      const component = await componentImport()
      window.sessionStorage.removeItem(key)
      return component
    } catch (error) {
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, 'true')
        window.location.reload()
      } else {
        throw error
      }
    }
  })

// Lazy-loaded pages for code splitting
const Login = lazyWithRetry(() => import('./pages/Auth/Login').then(m => ({ default: m.Login })))
const Register = lazyWithRetry(() => import('./pages/Auth/Register').then(m => ({ default: m.Register })))
const ProjectList = lazyWithRetry(() => import('./pages/Projects/ProjectList').then(m => ({ default: m.ProjectList })))
const ProjectForm = lazyWithRetry(() => import('./pages/Projects/ProjectForm').then(m => ({ default: m.ProjectForm })))
const ProjectDashboard = lazyWithRetry(() => import('./pages/Dashboard/ProjectDashboard').then(m => ({ default: m.ProjectDashboard })))
const AddIncome = lazyWithRetry(() => import('./pages/Income/AddIncome').then(m => ({ default: m.AddIncome })))
const IncomeList = lazyWithRetry(() => import('./pages/Income/IncomeList').then(m => ({ default: m.IncomeList })))
const AddExpense = lazyWithRetry(() => import('./pages/Expenses/AddExpense').then(m => ({ default: m.AddExpense })))
const ExpenseList = lazyWithRetry(() => import('./pages/Expenses/ExpenseList').then(m => ({ default: m.ExpenseList })))
const ProjectReports = lazyWithRetry(() => import('./pages/Reports/ProjectReports').then(m => ({ default: m.ProjectReports })))
const ReportsHub = lazyWithRetry(() => import('./pages/Reports/ReportsHub').then(m => ({ default: m.ReportsHub })))
const SitePlans = lazyWithRetry(() => import('./pages/SitePlans/SitePlans').then(m => ({ default: m.SitePlans })))
const SitePhotos = lazyWithRetry(() => import('./pages/SitePhotos/SitePhotos').then(m => ({ default: m.SitePhotos })))
const ExpenseCharts = lazyWithRetry(() => import('./pages/Charts/ExpenseCharts').then(m => ({ default: m.ExpenseCharts })))
const Settings = lazyWithRetry(() => import('./pages/Settings/Settings').then(m => ({ default: m.Settings })))
const NotFound = lazyWithRetry(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })))
const PrivacyPolicy = lazyWithRetry(() => import('./pages/Legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })))
const TermsOfService = lazyWithRetry(() => import('./pages/Legal/TermsOfService').then(m => ({ default: m.TermsOfService })))

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <OfflineIndicator />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Legal routes */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

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
              <ProtectedRoute><AddExpense mode="create" /></ProtectedRoute>
            } />
            <Route path="/projects/:id/expenses/:expenseId/edit" element={
              <ProtectedRoute><AddExpense mode="edit" /></ProtectedRoute>
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

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        <BottomNav />

        <Toaster
          position="top-center"
          gutter={12}
          containerStyle={{
            top: '45%',
          }}
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '500',
              padding: '16px 24px',
              maxWidth: '380px',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
          }}
        />
        <Analytics />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
