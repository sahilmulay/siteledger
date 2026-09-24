import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Wallet, ReceiptText,
  Plus, Edit2, FileText, Image, File as FileIcon, PieChart
} from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Spinner'
import { formatINR, formatDate } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'

// ── Clickable Stat Card ─────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'text-left w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100',
        onClick ? 'active:scale-95 transition-transform cursor-pointer' : ''
      ].join(' ')}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={['w-9 h-9 rounded-xl flex items-center justify-center', color].join(' ')}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </button>
  )
}

export function ProjectDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchProject, fetchProjectStats } = useProjects()
  const [project, setProject] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [planCount, setPlanCount] = useState(0)
  const [photoCount, setPhotoCount] = useState(0)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [proj, s] = await Promise.all([
        fetchProject(id),
        fetchProjectStats(id)
      ])
      setProject(proj)
      setStats(s)

      // Fetch site plans and photos count
      supabase.from('site_plans').select('id', { count: 'exact', head: true }).eq('project_id', id)
        .then(({ count }) => setPlanCount(count || 0))
      supabase.from('site_photos').select('id', { count: 'exact', head: true }).eq('project_id', id)
        .then(({ count }) => setPhotoCount(count || 0))
    } finally {
      setLoading(false)
    }
  }, [id, fetchProject, fetchProjectStats])

  useEffect(() => { loadAll() }, [loadAll])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Loading..." backTo="/projects" />
        <PageWrapper>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </PageWrapper>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Project not found.</p>
      </div>
    )
  }

  const balance = (stats?.totalReceived || 0) - (stats?.totalExpenses || 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={project.project_name}
        badge={<StatusBadge status={project.project_status} />}
        subtitle={`${project.project_code} · ${project.owner_name}`}
        backTo="/projects"
        rightAction={
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/projects/${id}/reports`)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              title="PDF Report"
            >
              <FileText className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              title="Edit Project"
            >
              <Edit2 className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        }
      />

      <PageWrapper>
        {/* Optional site address subtitle under header */}
        {project.site_address && (
          <p className="text-xs text-gray-400 mb-3 truncate px-0.5">{project.site_address}</p>
        )}

        <div className="pb-32">
          {/* Summary Cards Grid (6 cards) */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              label="Total Received"
              value={formatINR(stats?.totalReceived)}
              icon={TrendingUp}
              color="bg-green-500"
              onClick={() => navigate(`/projects/${id}/income`)}
            />
            <StatCard
              label="Total Expenses"
              value={formatINR(stats?.totalExpenses)}
              icon={TrendingDown}
              color="bg-red-500"
              onClick={() => navigate(`/projects/${id}/expenses`)}
            />
            <StatCard
              label="Current Balance"
              value={formatINR(balance)}
              icon={Wallet}
              color={balance >= 0 ? 'bg-blue-600' : 'bg-orange-500'}
            />
            <StatCard
              label="Expense Entries"
              value={stats?.expenseCount || 0}
              icon={ReceiptText}
              color="bg-purple-500"
              sub={stats?.lastTransactionDate ? `Last: ${formatDate(stats.lastTransactionDate)}` : 'No transactions'}
              onClick={() => navigate(`/projects/${id}/expenses`)}
            />
            <StatCard
              label="Site Plans"
              value={planCount}
              icon={FileIcon}
              color="bg-sky-500"
              sub={planCount === 0 ? 'Tap to view / upload' : `${planCount} plan${planCount !== 1 ? 's' : ''}`}
              onClick={() => navigate(`/projects/${id}/plans`)}
            />
            <StatCard
              label="Site Photos"
              value={photoCount}
              icon={Image}
              color="bg-pink-500"
              sub={photoCount === 0 ? 'Tap to view / add' : `${photoCount} photo${photoCount !== 1 ? 's' : ''}`}
              onClick={() => navigate(`/projects/${id}/photos`)}
            />
            <StatCard
              label="Expense Charts"
              value="Pie Charts"
              icon={PieChart}
              color="bg-indigo-600"
              sub="Category & Sub-cat"
              onClick={() => navigate(`/projects/${id}/charts`)}
            />
            <StatCard
              label="PDF Reports"
              value="Statements"
              icon={FileText}
              color="bg-teal-600"
              sub="Download & Share"
              onClick={() => navigate(`/projects/${id}/reports`)}
            />
          </div>

          {/* Expense Breakdown */}
          {(stats?.totalExpenses || 0) > 0 && (
            <Card className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">Expense Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(stats?.categoryBreakdown || {})
                  .filter(([k]) => k && k !== 'undefined')
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amt]) => {
                    const pct = stats.totalExpenses > 0 ? (amt / stats.totalExpenses * 100) : 0
                    const colors = ['bg-indigo-500', 'bg-amber-500', 'bg-blue-400', 'bg-pink-400', 'bg-teal-400', 'bg-orange-400']
                    const colorIdx = Math.abs(cat.charCodeAt(0)) % colors.length
                    return (
                      <div key={cat}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">{cat}</span>
                          <span className="text-sm font-semibold text-gray-900">{formatINR(amt)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={['h-2 rounded-full', colors[colorIdx]].join(' ')} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </Card>
          )}
        </div>
      </PageWrapper>

      {/* Sticky bottom action buttons */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate(`/projects/${id}/income/new`)}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold rounded-2xl py-3.5 shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Income
          </button>
          <button
            onClick={() => navigate(`/projects/${id}/expenses/new`)}
            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-semibold rounded-2xl py-3.5 shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>
    </div>
  )
}
