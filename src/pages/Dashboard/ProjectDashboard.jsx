import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Wallet,
  Plus, Edit2, FileText, File as FileIcon, PieChart, ChevronRight
} from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Spinner'
import { InfoButton } from '../../components/ui/InfoButton'
import { formatINR, formatDate } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'

// ── Horizontal Rectangular Stat Card ────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        'text-left w-full bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-3',
        onClick ? 'active:scale-[0.98] transition-all cursor-pointer hover:border-gray-200' : ''
      ].join(' ')}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={['w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm', color].join(' ')}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          {label && <p className="text-xs font-semibold text-gray-500 truncate">{label}</p>}
          {value && <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate mt-0.5">{value}</p>}
          {sub && <p className="text-[11px] text-gray-400 truncate mt-0.5">{sub}</p>}
        </div>
      </div>
      {onClick && (
        <div className="text-gray-300 flex-shrink-0 pr-0.5">
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      )}
    </button>
  )
}

export function ProjectDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { fetchProject, fetchProjectStats } = useProjects()
  const [project, setProject] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [planCount, setPlanCount] = useState(0)

  const loadAll = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const [proj, s] = await Promise.all([
        fetchProject(id),
        fetchProjectStats(id, force)
      ])
      setProject(proj)
      setStats(s)

      // Fetch site plans count
      supabase.from('site_plans').select('id', { count: 'exact', head: true }).eq('project_id', id)
        .then(({ count }) => setPlanCount(count || 0))
    } finally {
      setLoading(false)
    }
  }, [id, fetchProject, fetchProjectStats])

  useEffect(() => { 
    loadAll(true) 
  }, [loadAll, location.key])


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
        subtitle={`${project.project_code} · ${project.owner_name}`}
        backTo="/projects"
        info={{
          title: 'Project Dashboard',
          description: 'This is the main overview of this project. It tracks money received, expenses spent, running cash balance, and project assets.',
          points: [
            'Total Received: Total payments and advances collected from the client.',
            'Total Expenses: Total money spent on materials, labor, machinery, and daily site work.',
            'Current Balance: Money in hand (Received minus Expenses).',
            'Stat Cards: Tap any card to view detailed records, plans, charts, or reports.',
            'Quick Action: Use the green "Add Income" and red "Add Expense" buttons at the bottom for instant entries.'
          ]
        }}
        rightAction={
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/projects/${id}/reports`)}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 transition-colors"
              title="PDF Report"
            >
              <FileText className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 transition-colors"
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
          {/* Rectangular Summary Cards */}
          <div className="space-y-2.5 mb-5">
            <StatCard
              label="Total Received"
              value={formatINR(stats?.totalReceived)}
              icon={TrendingUp}
              color="bg-green-500"
              sub="Tap to view client payments & advances"
              onClick={() => navigate(`/projects/${id}/income`)}
            />
            <StatCard
              label="Total Expenses"
              value={formatINR(stats?.totalExpenses)}
              icon={TrendingDown}
              color="bg-red-500"
              sub={stats?.lastTransactionDate ? `Last: ${formatDate(stats.lastTransactionDate)} · Tap for list` : 'Tap to view all expenses'}
              onClick={() => navigate(`/projects/${id}/expenses`)}
            />
            <StatCard
              label="Current Balance"
              value={formatINR(balance)}
              icon={Wallet}
              color={balance >= 0 ? 'bg-blue-600' : 'bg-orange-500'}
              sub={balance >= 0 ? 'Net Available Balance' : 'Negative Cashflow / Overspent'}
            />
            <StatCard
              label="Site Details"
              value="Site & Area Details"
              icon={FileIcon}
              color="bg-sky-500"
              sub={planCount > 0 ? `${planCount} site plan${planCount !== 1 ? 's' : ''} & budget` : 'Budget, extra work & site plans'}
              onClick={() => navigate(`/projects/${id}/plans`)}
            />
            <StatCard
              label="Expense Charts"
              value="Category Breakdown"
              icon={PieChart}
              color="bg-indigo-600"
              sub="Visual pie charts for labor, materials & more"
              onClick={() => navigate(`/projects/${id}/charts`)}
            />
            <StatCard
              label="PDF Reports"
              value="Statements & Summaries"
              icon={FileText}
              color="bg-teal-600"
              sub="Download & share full project reports"
              onClick={() => navigate(`/projects/${id}/reports`)}
            />
          </div>

          {/* Expense Breakdown */}
          {(stats?.totalExpenses || 0) > 0 && (
            <Card className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 text-sm">Expense Breakdown</h3>
                <InfoButton
                  title="Expense Breakdown"
                  description="This section shows which construction categories (such as Cement, Steel, Labor, etc.) have consumed your budget."
                  points={[
                    'Shows the exact amount spent in each category.',
                    'Progress bars indicate the percentage share of each category against total expenses.',
                    'Helps you quickly check which materials or services cost the most.'
                  ]}
                  size="xs"
                />
              </div>
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
            onClick={() => navigate(`/projects/${id}/income/new`, { state: { from: 'dashboard' } })}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold rounded-2xl py-3.5 shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Income
          </button>
          <button
            onClick={() => navigate(`/projects/${id}/expenses/new`, { state: { from: 'dashboard' } })}
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
