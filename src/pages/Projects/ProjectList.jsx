import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, FolderOpen, Filter, Download, Calendar } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { CardSkeleton } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { formatINR, formatDate } from '../../lib/formatters'
import { PROJECT_STATUSES } from '../../lib/constants'
import { generateAllProjectsPDF } from '../../lib/pdfReport'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

export function ProjectList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { firmName } = useAuth()

  const { fetchProjects, fetchProjectStats, loading } = useProjects()
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [statsLoading, setStatsLoading] = useState(false)
  const [downloadingSummary, setDownloadingSummary] = useState(false)

  const loadProjects = useCallback(async () => {
    const data = await fetchProjects()
    setProjects(data)
    if (data.length === 0) return

    // Bulk-load stats: 2 queries total instead of 2 per project
    setStatsLoading(true)
    try {
      const projectIds = data.map(p => p.id)
      const fetchAllRowsForProjects = async (table, cols) => {
        const PAGE_SIZE = 1000
        let all = []
        let from = 0
        while (true) {
          const { data: rows, error } = await supabase
            .from(table)
            .select(cols)
            .in('project_id', projectIds)
            .range(from, from + PAGE_SIZE - 1)
          if (error) throw error
          if (!rows || rows.length === 0) break
          all.push(...rows)
          if (rows.length < PAGE_SIZE) break
          from += PAGE_SIZE
        }
        return all
      }

      const [incomeRows, expenseRows] = await Promise.all([
        fetchAllRowsForProjects('income', 'project_id, amount'),
        fetchAllRowsForProjects('expenses', 'project_id, amount, category, expense_date')
      ])

      const statsMap = {}
      data.forEach(p => {
        statsMap[p.id] = { totalReceived: 0, totalExpenses: 0, balance: 0, expenseCount: 0, lastTransactionDate: null, categoryBreakdown: {} }
      })
      incomeRows.forEach(r => {
        if (statsMap[r.project_id]) statsMap[r.project_id].totalReceived += Number(r.amount)
      })
      expenseRows.forEach(r => {
        if (!statsMap[r.project_id]) return
        statsMap[r.project_id].totalExpenses += Number(r.amount)
        statsMap[r.project_id].expenseCount += 1
        const cat = r.category || 'Other'
        statsMap[r.project_id].categoryBreakdown[cat] = (statsMap[r.project_id].categoryBreakdown[cat] || 0) + Number(r.amount)
        if (!statsMap[r.project_id].lastTransactionDate || r.expense_date > statsMap[r.project_id].lastTransactionDate) {
          statsMap[r.project_id].lastTransactionDate = r.expense_date
        }
      })
      data.forEach(p => {
        statsMap[p.id].balance = statsMap[p.id].totalReceived - statsMap[p.id].totalExpenses
      })
      setStats(statsMap)
    } catch (err) {
      console.error('Failed to load project stats:', err)
      toast.error('Failed to load project statistics')
    } finally {
      setStatsLoading(false)
    }
  }, [fetchProjects])

  useEffect(() => { loadProjects() }, [loadProjects, location.key])

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.project_name.toLowerCase().includes(q) ||
      p.project_code.toLowerCase().includes(q) ||
      p.owner_name.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || p.project_status === statusFilter
    return matchSearch && matchStatus
  })

  const handleDownloadSummary = async () => {
    if (projects.length === 0) {
      toast.error('No projects to export')
      return
    }
    setDownloadingSummary(true)
    try {
      await generateAllProjectsPDF({ projects, stats, firmName })
      toast.success('Summary PDF downloaded!')
    } catch (err) {
      toast.error('Failed to generate summary PDF')
      console.error(err)
    } finally {
      setDownloadingSummary(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={firmName || 'SiteLedger'}
        subtitle="My Projects"
        rightAction={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownloadSummary}
              loading={downloadingSummary}
              title="Download Summary Report PDF"
              className="gap-1 px-2.5"
            >
              <Download className="h-4 w-4 text-gray-700" />
              <span className="hidden xs:inline">PDF</span>
            </Button>
            <Button size="sm" onClick={() => navigate('/projects/new')} className="gap-1">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
        }
      />
      <PageWrapper>
        {/* Search & Filter */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search project, code, owner..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {PROJECT_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={[
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Project List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={search ? 'No projects found' : 'No projects yet'}
            description={search ? 'Try a different search term.' : 'Create your first project to get started.'}
            action={
              !search && (
                <Button onClick={() => navigate('/projects/new')}>
                  <Plus className="h-4 w-4" /> Create Project
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(project => {
              const s = stats[project.id] || {}
              const balance = (s.totalReceived || 0) - (s.totalExpenses || 0)
              return (
                <Card
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      {(project.start_date || project.created_at) && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                          <Calendar className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          <span>Start Date: <strong className="font-semibold text-gray-800">{formatDate(project.start_date || project.created_at)}</strong></span>
                        </div>
                      )}
                      <h3 className="font-bold text-gray-900 text-base leading-tight">{project.project_name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{project.owner_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="text-xs text-gray-500">Received</p>
                      <p className="text-sm font-bold text-green-700">{formatINR(s.totalReceived || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Expenses</p>
                      <p className="text-sm font-bold text-red-600">{formatINR(s.totalExpenses || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Balance</p>
                      <p className={['text-sm font-bold', balance >= 0 ? 'text-blue-700' : 'text-red-600'].join(' ')}>
                        {formatINR(balance)}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PageWrapper>
    </div>
  )
}
