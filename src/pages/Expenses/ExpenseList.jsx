import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus, Filter, Trash2, Receipt, ExternalLink, Search,
  Download, MessageSquare, FileText, Phone, X, RefreshCw
} from 'lucide-react'
import { useExpenses } from '../../hooks/useExpenses'
import { useProjects } from '../../hooks/useProjects'
import { useAuth } from '../../contexts/AuthContext'
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
import { generateFilteredExpensesPDF, generateSingleExpenseVoucherPDF } from '../../lib/pdfReport'
import toast from 'react-hot-toast'

const CATEGORY_BADGE_COLORS = {
  Labour: 'purple', Materials: 'amber', Machinery: 'red',
  Transport: 'green', 'Professional Services': 'blue', Miscellaneous: 'gray'
}

export function ExpenseList() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { firmName, categories: userCategories } = useAuth()
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
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  // WhatsApp quick-prompt state
  const [phonePromptExpense, setPhonePromptExpense] = useState(null)
  const [promptPhoneInput, setPromptPhoneInput] = useState('')

  const categoryDict = (userCategories && Object.keys(userCategories).length > 0)
    ? userCategories
    : EXPENSE_CATEGORIES

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

  // Collect all unique categories and subcategories
  const allCategories = Array.from(new Set([
    ...Object.keys(categoryDict),
    ...expenses.map(e => e.category).filter(Boolean)
  ]))

  const allSubCategories = useMemo(() => {
    const subs = new Set()
    Object.values(categoryDict).forEach(list => {
      if (Array.isArray(list)) list.forEach(s => subs.add(s))
    })
    expenses.forEach(e => {
      if (e.sub_category) subs.add(e.sub_category)
    })
    return Array.from(subs)
  }, [categoryDict, expenses])

  // Download filtered expenses PDF
  const handleDownloadFilteredPDF = async () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expenses to download')
      return
    }
    setDownloadingPDF(true)
    try {
      const filterSummary = {
        category: filters.category,
        subCategory: filters.subCategory,
        paymentMode: filters.paymentMode,
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: search.trim()
      }
      await generateFilteredExpensesPDF({
        project,
        expenses: filteredExpenses,
        filterSummary,
        firmName,
        save: true
      })
      toast.success('Filtered expenses PDF downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }

  // Format WhatsApp message
  const formatWhatsAppMessage = (item) => {
    return `*PAYMENT BILL*
━━━━━━━━━━━━━━━━━━━━
*From:* ${firmName || 'SiteLedger'}
*Project:* ${project?.project_name || 'Project'} (${project?.project_code || '—'})
*Date:* ${formatDate(item.expense_date)}

*Paid To:* ${item.vendor_name || 'Vendor'}
*Total Paid:* Rs. ${Number(item.amount).toLocaleString('en-IN')}
*Payment Mode:* ${item.payment_mode}
*Category:* ${item.category}${item.sub_category ? ` (${item.sub_category})` : ''}
${item.remarks ? `*Remarks:* ${item.remarks}\n` : ''}${item.bill_number ? `*Bill No:* ${item.bill_number}\n` : ''}━━━━━━━━━━━━━━━━━━━━
*Status:* Payment Confirmed
Thank you!`
  }

  const sendWhatsAppReceipt = (item, overridePhone = null) => {
    const rawPhone = overridePhone || item.vendor_mobile || (item.remarks?.match(/Phone:\s*(\d{10})/)?.[1])
    if (!rawPhone) {
      setPhonePromptExpense(item)
      return
    }
    const clean = rawPhone.replace(/\D/g, '')
    const phone = clean.length === 10 ? `91${clean}` : clean
    const msg = formatWhatsAppMessage(item)
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    toast.success('Opening WhatsApp with payment receipt...')
  }

  // Download single-expense Payment Bill PDF
  const handleDownloadVoucher = async (item) => {
    try {
      toast.loading('Generating bill...', { id: 'voucher-toast' })
      await generateSingleExpenseVoucherPDF({
        project,
        expense: item,
        firmName,
        save: true
      })
      toast.success('Payment Bill PDF downloaded!', { id: 'voucher-toast' })
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate bill PDF', { id: 'voucher-toast' })
    }
  }

  const hasActiveFilters = filters.category || filters.subCategory || filters.paymentMode || filters.startDate || filters.endDate || search.trim()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Expense History"
        subtitle={project?.project_name}
        backTo={`/projects/${projectId}`}
        rightAction={
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border transition-colors ${
                (filters.category || filters.subCategory || filters.paymentMode || filters.startDate || filters.endDate)
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title="Filter Expenses"
            >
              <Filter className="h-4 w-4" />
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
            placeholder="Search category, sub-category, vendor, amount..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3 text-xs">
            <span className="text-gray-400 font-medium">Active:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                "{search}" <X className="h-3 w-3 cursor-pointer" onClick={() => setSearch('')} />
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Cat: {filters.category} <X className="h-3 w-3 cursor-pointer" onClick={() => applyFilters({ ...filters, category: '', subCategory: '' })} />
              </span>
            )}
            {filters.subCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Sub: {filters.subCategory} <X className="h-3 w-3 cursor-pointer" onClick={() => applyFilters({ ...filters, subCategory: '' })} />
              </span>
            )}
            {filters.paymentMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                {filters.paymentMode} <X className="h-3 w-3 cursor-pointer" onClick={() => applyFilters({ ...filters, paymentMode: '' })} />
              </span>
            )}
            {(filters.startDate || filters.endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {filters.startDate || 'Start'} → {filters.endDate || 'Now'} <X className="h-3 w-3 cursor-pointer" onClick={() => applyFilters({ ...filters, startDate: '', endDate: '' })} />
              </span>
            )}
            <button
              onClick={() => {
                setSearch('')
                applyFilters({ category: '', subCategory: '', paymentMode: '', startDate: '', endDate: '' })
              }}
              className="text-xs text-red-600 hover:underline ml-1 font-medium"
            >
              Reset
            </button>
          </div>
        )}

        {/* Filter Drawer Card */}
        {showFilters && (
          <Card className="mb-4">
            <h3 className="font-semibold text-sm mb-3">Filters</h3>
            <ExpenseFilterForm
              categories={allCategories}
              categoryDict={categoryDict}
              allSubCategories={allSubCategories}
              filters={filters}
              onApply={applyFilters}
              onClear={() => applyFilters({ category: '', subCategory: '', paymentMode: '', startDate: '', endDate: '' })}
            />
          </Card>
        )}

        {/* Filtered Summary & Download PDF Button */}
        {filteredExpenses.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-xs text-red-600 font-medium block">
                {hasActiveFilters ? 'Filtered Total' : 'Total Expenses'} ({filteredExpenses.length} entries)
              </span>
              <span className="font-bold text-red-900 text-lg">{formatINR(totalShown)}</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownloadFilteredPDF}
              loading={downloadingPDF}
              className="bg-white border-red-300 text-red-700 hover:bg-red-100/60 shadow-sm"
              title="Download PDF containing only filtered entries"
            >
              <Download className="h-4 w-4" />
              Download Filtered PDF
            </Button>
          </div>
        )}

        {loading && expenses.length === 0 ? (
          <div className="space-y-3">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={hasActiveFilters ? 'No matching expenses' : 'No expenses recorded'}
            description={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Add your first expense entry.'}
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={() => { setSearch(''); applyFilters({ category: '', subCategory: '', paymentMode: '', startDate: '', endDate: '' }) }}>
                  Clear Filters
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
            {filteredExpenses.map(item => {
              const vendorMobile = item.vendor_mobile || (item.remarks?.match(/Phone:\s*(\d{10})/)?.[1])
              return (
                <Card key={item.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge color={CATEGORY_BADGE_COLORS[item.category] || 'gray'}>{item.category}</Badge>
                        {item.sub_category && (
                          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                            {item.sub_category}
                          </span>
                        )}
                      </div>

                      <p className="text-lg font-bold text-red-700">{formatINR(item.amount)}</p>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge color="gray">{item.payment_mode}</Badge>
                        <span className="text-xs text-gray-400">{formatDate(item.expense_date)}</span>
                        {item.vendor_name && (
                          <span className="text-xs font-medium text-gray-700">
                            {item.vendor_name}
                          </span>
                        )}
                        {vendorMobile && (
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                            <Phone className="h-3 w-3" /> {vendorMobile}
                          </span>
                        )}
                      </div>

                      {item.transaction_reference && (
                        <p className="text-xs text-gray-400 mt-1">Ref: {item.transaction_reference}</p>
                      )}
                      {item.remarks && <p className="text-sm text-gray-600 mt-1">{item.remarks}</p>}
                      {item.bill_number && <p className="text-xs text-gray-400 mt-0.5">Bill: {item.bill_number}</p>}
                      {item.bill_image_url && (
                        <a
                          href={item.bill_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> View Bill
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => sendWhatsAppReceipt(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        title="Send Payment Receipt on WhatsApp"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                        <span>WhatsApp Receipt</span>
                      </button>

                      <button
                        onClick={() => handleDownloadVoucher(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
                        title="Download Payment Bill PDF"
                      >
                        <FileText className="h-3.5 w-3.5 text-gray-500" />
                        <span>Bill PDF</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setDeleteTarget(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      title="Delete Expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              )
            })}

            {hasMore && (
              <Button variant="ghost" fullWidth onClick={() => { const np = page + 1; setPage(np); loadExpenses(np) }}>
                Load More
              </Button>
            )}
          </div>
        )}
      </PageWrapper>

      {/* Quick Prompt Modal to Enter Vendor Mobile for WhatsApp */}
      {phonePromptExpense && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl animate-scale-up">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                Send WhatsApp Receipt
              </h4>
              <button
                onClick={() => { setPhonePromptExpense(null); setPromptPhoneInput('') }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Enter the mobile number for <strong>{phonePromptExpense.vendor_name || 'Vendor'}</strong> to send payment details directly on WhatsApp:
            </p>
            <input
              type="tel"
              autoFocus
              placeholder="e.g. 9876543210"
              value={promptPhoneInput}
              onChange={e => setPromptPhoneInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => { setPhonePromptExpense(null); setPromptPhoneInput('') }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                fullWidth
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  const clean = promptPhoneInput.replace(/\D/g, '')
                  if (clean.length < 10) {
                    toast.error('Please enter a valid 10-digit mobile number')
                    return
                  }
                  sendWhatsAppReceipt(phonePromptExpense, clean)
                  setPhonePromptExpense(null)
                  setPromptPhoneInput('')
                }}
              >
                Send via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

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

function ExpenseFilterForm({ categories = [], categoryDict = {}, allSubCategories = [], filters, onApply, onClear }) {
  const [f, setF] = useState(filters)

  // Sub-categories list based on selected category or all sub-categories
  const availableSubCategories = useMemo(() => {
    if (f.category && categoryDict[f.category]) {
      return categoryDict[f.category]
    }
    return allSubCategories
  }, [f.category, categoryDict, allSubCategories])

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
        <select
          value={f.category}
          onChange={e => setF(prev => ({ ...prev, category: e.target.value, subCategory: '' }))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Sub-Category {f.category ? `(${f.category})` : ''}
        </label>
        <select
          value={f.subCategory}
          onChange={e => setF(prev => ({ ...prev, subCategory: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="">All Sub-Categories</option>
          {availableSubCategories.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Payment Mode</label>
        <select
          value={f.paymentMode}
          onChange={e => setF(prev => ({ ...prev, paymentMode: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="">All Modes</option>
          {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">From Date</label>
          <input
            type="date"
            value={f.startDate}
            onChange={e => setF(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">To Date</label>
          <input
            type="date"
            value={f.endDate}
            onChange={e => setF(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" size="sm" fullWidth onClick={onClear}>Clear</Button>
        <Button size="sm" fullWidth onClick={() => onApply(f)}>Apply Filters</Button>
      </div>
    </div>
  )
}
