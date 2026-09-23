import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Wallet, ReceiptText,
  Plus, ArrowRight, Calendar, Edit2, Share2, FileText
} from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { useIncome } from '../../hooks/useIncome'
import { useExpenses } from '../../hooks/useExpenses'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { formatINR, formatDate, formatDateLong } from '../../lib/formatters'
import { CATEGORY_COLORS } from '../../lib/constants'
import toast from 'react-hot-toast'

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <Card padding="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={['w-9 h-9 rounded-xl flex items-center justify-center', color].join(' ')}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Card>
  )
}

export function ProjectDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchProject, fetchProjectStats } = useProjects()
  const { fetchIncome } = useIncome()
  const { fetchExpenses } = useExpenses()

  const [project, setProject] = useState(null)
  const [stats, setStats] = useState(null)
  const [recentIncome, setRecentIncome] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [proj, s, incRes, expRes] = await Promise.all([
        fetchProject(id),
        fetchProjectStats(id),
        fetchIncome(id, { limit: 5 }),
        fetchExpenses(id, { limit: 5 })
      ])
      setProject(proj)
      setStats(s)
      setRecentIncome(incRes.data)
      setRecentExpenses(expRes.data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  const handleCopyShareLink = () => {
    if (!project?.share_token) return
    const url = `${window.location.origin}/share/${project.share_token}`
    navigator.clipboard.writeText(url).then(() => toast.success('Share link copied!'))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Loading..." backTo="/projects" />
        <PageWrapper>
          <div className="space-y-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
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
  const labourTotal = stats?.categoryBreakdown?.Labour || 0
  const materialTotal = stats?.categoryBreakdown?.Materials || 0
  const otherTotal = Object.entries(stats?.categoryBreakdown || {})
    .filter(([k]) => k !== 'Labour' && k !== 'Materials')
    .reduce((s, [, v]) => s + v, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={project.project_name}
        subtitle={`${project.project_code} · ${project.owner_name}`}
        backTo="/projects"
        rightAction={
          <button
            onClick={() => navigate(`/projects/${id}/edit`)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Edit2 className="h-4 w-4 text-gray-600" />
          </button>
        }
      />

      <PageWrapper>
        {/* Status & address */}
        <div className="flex items-center gap-2 mb-4">
          <StatusBadge status={project.project_status} />
          {project.site_address && (
            <span className="text-xs text-gray-400 truncate">{project.site_address}</span>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="Total Received" value={formatINR(stats?.totalReceived)} icon={TrendingUp} color="bg-green-500" />
          <StatCard label="Total Expenses" value={formatINR(stats?.totalExpenses)} icon={TrendingDown} color="bg-red-500" />
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
          />
        </div>

        {/* Category Breakdown */}
        {(stats?.totalExpenses || 0) > 0 && (
          <Card className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Expense Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Labour', value: labourTotal, color: 'bg-indigo-500' },
                { label: 'Materials', value: materialTotal, color: 'bg-amber-500' },
                { label: 'Other', value: otherTotal, color: 'bg-gray-400' },
              ].filter(i => i.value > 0).map(item => {
                const pct = stats.totalExpenses > 0 ? (item.value / stats.totalExpenses * 100) : 0
                return (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatINR(item.value)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={['h-2 rounded-full', item.color].join(' ')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {Object.entries(stats?.categoryBreakdown || {})
                .filter(([k]) => !['Labour','Materials'].includes(k) && k !== 'undefined')
                .map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between text-xs text-gray-500">
                    <span>{cat}</span>
                    <span className="font-medium text-gray-700">{formatINR(amt)}</span>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button variant="success" onClick={() => navigate(`/projects/${id}/income/new`)} fullWidth>
            <Plus className="h-4 w-4" />
            Add Income
          </Button>
          <Button variant="danger" onClick={() => navigate(`/projects/${id}/expenses/new`)} fullWidth>
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>

        {/* Recent Income */}
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">Recent Income</h3>
            <button
              onClick={() => navigate(`/projects/${id}/income`)}
              className="text-xs text-blue-700 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {recentIncome.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No income yet</p>
          ) : (
            <div className="space-y-2">
              {recentIncome.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatINR(item.amount)}</p>
                    <p className="text-xs text-gray-400">{item.payment_mode} · {formatDate(item.date)}</p>
                  </div>
                  {item.remarks && <p className="text-xs text-gray-500 truncate max-w-[120px]">{item.remarks}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Expenses */}
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">Recent Expenses</h3>
            <button
              onClick={() => navigate(`/projects/${id}/expenses`)}
              className="text-xs text-blue-700 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No expenses yet</p>
          ) : (
            <div className="space-y-2">
              {recentExpenses.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatINR(item.amount)}</p>
                    <p className="text-xs text-gray-400">{item.category} · {formatDate(item.expense_date)}</p>
                  </div>
                  <span className="text-xs text-gray-500 truncate max-w-[100px]">{item.vendor_name || item.sub_category}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Share & Report Actions */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Button variant="secondary" onClick={handleCopyShareLink} fullWidth>
            <Share2 className="h-4 w-4" />
            Share Link
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/projects/${id}/reports`)} fullWidth>
            <FileText className="h-4 w-4" />
            PDF Report
          </Button>
        </div>
      </PageWrapper>
    </div>
  )
}
