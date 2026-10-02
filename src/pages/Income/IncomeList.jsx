import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Plus, Filter, Trash2, IndianRupee, Search, Download } from 'lucide-react'
import { useIncome } from '../../hooks/useIncome'
import { useProjects } from '../../hooks/useProjects'
import { useAuth } from '../../contexts/AuthContext'
import { generateIncomePDF } from '../../lib/pdfReport'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CardSkeleton } from '../../components/ui/Spinner'
import { formatINR, formatDate, formatTime } from '../../lib/formatters'
import { PAYMENT_MODES } from '../../lib/constants'
import toast from 'react-hot-toast'

export function IncomeList() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { firmName } = useAuth()
  const { fetchIncome, deleteIncome, loading } = useIncome()
  const { fetchProject } = useProjects()

  const [project, setProject] = useState(null)
  const [income, setIncome] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState({ paymentMode: '', startDate: '', endDate: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  const loadIncome = useCallback(async (p = 0, f = filters, s = search) => {
    try {
      const { data } = await fetchIncome(projectId, { ...f, search: s, page: p, limit: 20 })
      if (p === 0) setIncome(data)
      else setIncome(prev => [...prev, ...data])
      setHasMore(data.length === 20)
    } catch (err) {
      toast.error('Failed to load income entries')
      console.error(err)
    }
  }, [projectId, filters, search, fetchIncome])

  useEffect(() => {
    fetchProject(projectId).then(setProject)
  }, [projectId, fetchProject])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0)
      loadIncome(0, filters, search)
    }, 250)
    return () => clearTimeout(timer)
  }, [search, filters, projectId, location.key])

  const applyFilters = (f) => {
    setFilters(f)
    setPage(0)
    loadIncome(0, f, search)
    setShowFilters(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteIncome(deleteTarget, projectId)
      setIncome(prev => prev.filter(i => i.id !== deleteTarget))
      toast.success('Income deleted successfully!')

    } catch (err) {
      toast.error('Failed to delete income entry')
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  const filteredIncome = income.filter(item => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    const matchMode = item.payment_mode?.toLowerCase().includes(q)
    const matchRemarks = item.remarks?.toLowerCase().includes(q)
    const matchRef = item.transaction_reference?.toLowerCase().includes(q)
    const matchAmount = String(item.amount || '').includes(q)
    return matchMode || matchRemarks || matchRef || matchAmount
  })

  const totalShown = filteredIncome.reduce((s, i) => s + Number(i.amount), 0)

  // Download Income PDF
  const handleDownloadPDF = async () => {
    setDownloadingPDF(true)
    try {
      const allRes = await fetchIncome(projectId, {
        ...filters,
        search: search.trim(),
        all: true
      })
      const exportIncome = allRes.data || []
      if (exportIncome.length === 0) {
        toast.error('No income entries to download')
        return
      }

      await generateIncomePDF({
        project,
        income: exportIncome,
        filterSummary: {
          paymentMode: filters.paymentMode,
          startDate: filters.startDate,
          endDate: filters.endDate,
          search: search.trim()
        },
        firmName,
        save: true
      })
      toast.success('Income history PDF downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate Income PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Income History"
        subtitle={project?.project_name}
        backTo={`/projects/${projectId}`}
        info={{
          title: 'Income History (Client Payments)',
          description: 'This section tracks all money, stage payments, and advances received from the client for this project.',
          points: [
            'View date, amount received, payment mode (Cash, UPI, Cheque, Bank Transfer), and reference notes.',
            'Filter payments by payment method or date range.',
            'Click the download icon on the top right to export an Income PDF statement.',
            'Click "+" to record a new client payment.'
          ]
        }}
        rightAction={
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF || filteredIncome.length === 0}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 disabled:opacity-40 transition-colors"
              title="Download Income PDF"
            >
              <Download className="h-4 w-4 text-gray-600" />
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Filter Income">
              <Filter className="h-4 w-4 text-gray-600" />
            </button>
            <Button size="sm" className="px-2.5 sm:px-3" onClick={() => navigate(`/projects/${projectId}/income/new`, { state: { from: 'income' } })}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <PageWrapper>
        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search amount, payment mode, reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-4">
            <h3 className="font-semibold text-sm mb-3">Filters</h3>
            <FilterForm filters={filters} onApply={applyFilters} onClear={() => applyFilters({ paymentMode: '', startDate: '', endDate: '' })} />
          </Card>
        )}

        {/* Summary & Download Button */}
        {filteredIncome.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-xs text-green-700 font-medium block">
                Total Received ({filteredIncome.length} {filteredIncome.length === 1 ? 'entry' : 'entries'})
              </span>
              <span className="font-bold text-green-800 text-lg">{formatINR(totalShown)}</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownloadPDF}
              loading={downloadingPDF}
              className="bg-white border-green-300 text-green-700 hover:bg-green-100/60 shadow-sm"
              title="Download Income History PDF"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        )}

        {/* List */}
        {loading && income.length === 0 ? (
          <div className="space-y-3">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
        ) : filteredIncome.length === 0 ? (
          <EmptyState
            icon={IndianRupee}
            title={search ? 'No matching income' : 'No income recorded'}
            description={search ? `No income matched "${search}".` : 'Add your first income entry.'}
            action={
              search ? (
                <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                  Clear Search
                </Button>
              ) : (
                <Button onClick={() => navigate(`/projects/${projectId}/income/new`, { state: { from: 'income' } })}>
                  <Plus className="h-4 w-4" /> Add Income
                </Button>
              )
            }
          />

        ) : (
          <div className="space-y-3">
            {filteredIncome.map(item => (
              <Card key={item.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-green-700">{formatINR(item.amount)}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge color="green">{item.payment_mode}</Badge>
                      <span className="text-xs font-bold text-gray-800">{formatDate(item.date)}</span>
                      {item.location && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          📍 {item.location}
                        </span>
                      )}
                    </div>
                    {item.transaction_reference && (
                      <p className="text-xs text-gray-400 mt-1">Ref: {item.transaction_reference}</p>
                    )}
                    {item.remarks && <p className="text-sm text-gray-600 mt-1">{item.remarks}</p>}
                    {item.created_at && formatTime(item.created_at) && (
                      <div className="text-[10px] font-medium text-emerald-700 mt-2 pt-1.5 border-t border-gray-50">
                        Entry by You <span className="text-gray-400 font-normal">at {formatTime(item.created_at)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteTarget(item.id)}
                    className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors ml-2 flex-shrink-0"
                    title="Delete Income Entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
            {hasMore && (
              <Button variant="ghost" fullWidth onClick={() => { const np = page + 1; setPage(np); loadIncome(np, filters, search) }}>
                Load More
              </Button>
            )}
          </div>
        )}
      </PageWrapper>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Income Entry"
        message="Are you sure you want to delete this income entry? This cannot be undone."
      />
    </div>
  )
}

function FilterForm({ filters, onApply, onClear }) {
  const [f, setF] = useState(filters)
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Payment Mode</label>
        <select value={f.paymentMode} onChange={e => setF(prev => ({ ...prev, paymentMode: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm">
          <option value="">All Modes</option>
          {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">From Date</label>
          <input type="date" value={f.startDate} onChange={e => setF(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">To Date</label>
          <input type="date" value={f.endDate} onChange={e => setF(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" fullWidth onClick={onClear}>Clear</Button>
        <Button size="sm" fullWidth onClick={() => onApply(f)}>Apply</Button>
      </div>
    </div>
  )
}
