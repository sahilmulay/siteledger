import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Filter, Trash2, Receipt, ExternalLink, Search } from 'lucide-react'
import { useExpenses } from '../../hooks/useExpenses'
import { useProjects } from '../../hooks/useProjects'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CardSkeleton } from '../../components/ui/Spinner'
import { formatINR, formatDate } from '../../lib/formatters'
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../lib/constants'
import toast from 'react-hot-toast'

const CATEGORY_BADGE_COLORS = {
  Labour: 'purple', Materials: 'amber', Machinery: 'red',
  Transport: 'green', 'Professional Services': 'blue', Miscellaneous: 'gray'
}

export function ExpenseList() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { fetchExpenses, deleteExpense, loading } = useExpenses()
  const { fetchProject } = useProjects()

  const [project, setProject] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState({ category: '', subCategory: '', paymentMode: '', startDate: '', endDate: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadExpenses = useCallback(async (p = 0, f = filters) => {
    const { data } = await fetchExpenses(projectId, { ...f, page: p, limit: 20 })
    if (p === 0) setExpenses(data)
    else setExpenses(prev => [...prev, ...data])
    setHasMore(data.length === 20)
  }, [projectId, filters])

  useEffect(() => {
    fetchProject(projectId).then(setProject)
    loadExpenses(0)
  }, [projectId])

  const applyFilters = (f) => {
    setFilters(f)
    setPage(0)
    loadExpenses(0, f)
    setShowFilters(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteExpense(deleteTarget)
      setExpenses(prev => prev.filter(e => e.id !== deleteTarget))
      toast.success('Expense deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  const filteredExpenses = expenses.filter(item => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    const matchCategory = item.category?.toLowerCase().includes(q)
    const matchSubCategory = item.sub_category?.toLowerCase().includes(q)
    const matchVendor = item.vendor_name?.toLowerCase().includes(q)
    const matchRemarks = item.remarks?.toLowerCase().includes(q)
    const matchPaymentMode = item.payment_mode?.toLowerCase().includes(q)
    const matchRef = item.transaction_reference?.toLowerCase().includes(q)
    const matchAmount = String(item.amount || '').includes(q)

    return matchCategory || matchSubCategory || matchVendor || matchRemarks || matchPaymentMode || matchRef || matchAmount
  })

  const totalShown = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)

  const allCategories = Array.from(new Set([
    ...Object.keys(EXPENSE_CATEGORIES),
    ...expenses.map(e => e.category).filter(Boolean)
  ]))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Expense History"
        subtitle={project?.project_name}
        backTo={`/projects/${projectId}`}
        rightAction={
          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="p-2 rounded-xl hover:bg-gray-100">
              <Filter className="h-4 w-4 text-gray-600" />
            </button>
            <Button size="sm" onClick={() => navigate(`/projects/${projectId}/expenses/new`)}>
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
            placeholder="Search category, vendor, amount, remarks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
        </div>

        {showFilters && (
          <Card className="mb-4">
            <h3 className="font-semibold text-sm mb-3">Filters</h3>
            <ExpenseFilterForm
              categories={allCategories}
              filters={filters}
              onApply={applyFilters}
              onClear={() => applyFilters({ category: '', subCategory: '', paymentMode: '', startDate: '', endDate: '' })}
            />
          </Card>
        )}

        {filteredExpenses.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center justify-between">
            <span className="text-sm text-red-700">Total Shown</span>
            <span className="font-bold text-red-800">{formatINR(totalShown)}</span>
          </div>
        )}

        {loading && expenses.length === 0 ? (
          <div className="space-y-3">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={search ? 'No matching expenses' : 'No expenses recorded'}
            description={search ? `No expenses matched "${search}".` : 'Add your first expense entry.'}
            action={
              search ? (
                <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                  Clear Search
                </Button>
              ) : (
                <Button variant="danger" onClick={() => navigate(`/projects/${projectId}/expenses/new`)}>
                  <Plus className="h-4 w-4" /> Add Expense
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map(item => (
              <Card key={item.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge color={CATEGORY_BADGE_COLORS[item.category] || 'gray'}>{item.category}</Badge>
                      {item.sub_category && <span className="text-xs text-gray-400">{item.sub_category}</span>}
                    </div>
                    <p className="text-lg font-bold text-red-700">{formatINR(item.amount)}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge color="gray">{item.payment_mode}</Badge>
                      <span className="text-xs text-gray-400">{formatDate(item.expense_date)}</span>
                      {item.vendor_name && <span className="text-xs text-gray-500">{item.vendor_name}</span>}
                    </div>
                    {item.transaction_reference && (
                      <p className="text-xs text-gray-400 mt-1">Ref: {item.transaction_reference}</p>
                    )}
                    {item.remarks && <p className="text-sm text-gray-600 mt-1">{item.remarks}</p>}
                    {item.bill_number && <p className="text-xs text-gray-400 mt-0.5">Bill: {item.bill_number}</p>}
                    {item.bill_image_url && (
                      <a href={item.bill_image_url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600">
                        <ExternalLink className="h-3 w-3" /> View Bill
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteTarget(item.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
            {hasMore && (
              <Button variant="ghost" fullWidth onClick={() => { const np = page + 1; setPage(np); loadExpenses(np) }}>
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
        title="Delete Expense"
        message="Are you sure? This cannot be undone."
      />
    </div>
  )
}

function ExpenseFilterForm({ categories = [], filters, onApply, onClear }) {
  const [f, setF] = useState(filters)
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
        <select value={f.category} onChange={e => setF(prev => ({ ...prev, category: e.target.value, subCategory: '' }))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {f.category && EXPENSE_CATEGORIES[f.category] && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Sub-Category</label>
          <select value={f.subCategory} onChange={e => setF(prev => ({ ...prev, subCategory: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm">
            <option value="">All Sub-Categories</option>
            {EXPENSE_CATEGORIES[f.category].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
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
