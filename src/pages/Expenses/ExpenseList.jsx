import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Filter, Trash2, Receipt, ExternalLink, Search,
  Download, Phone, X, RefreshCw, Edit
} from 'lucide-react'
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon'
import { PdfIcon } from '../../components/ui/PdfIcon'

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
  const location = useLocation()
  const { firmName, categories: userCategories, vendors } = useAuth()
  const { fetchExpenses, deleteExpense, loading } = useExpenses()
  const { fetchProject } = useProjects()

  const [project, setProject] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState({ category: '', subCategory: '', paymentMode: '', startDate: '', endDate: '', vendorName: '' })
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

  const loadExpenses = useCallback(async (p = 0, f = filters, s = search) => {
    try {
      const { data } = await fetchExpenses(projectId, { ...f, search: s, page: p, limit: 20 })
      if (p === 0) setExpenses(data)
      else setExpenses(prev => [...prev, ...data])
      setHasMore(data.length === 20)
    } catch (err) {
      toast.error('Failed to load expenses')
      console.error(err)
    }
  }, [projectId, filters, search, fetchExpenses])

  useEffect(() => {
    fetchProject(projectId).then(setProject)
  }, [projectId, fetchProject])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0)
      loadExpenses(0, filters, search)
    }, 250)
    return () => clearTimeout(timer)
  }, [search, filters, projectId, location.key])

  const applyFilters = (f) => {
    setFilters(f)
    setPage(0)
    loadExpenses(0, f, search)
    setShowFilters(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteExpense(deleteTarget, projectId)
      setExpenses(prev => prev.filter(e => e.id !== deleteTarget))
      toast.success('Expense deleted successfully!')
    } catch {
      toast.error('Failed to delete expense')
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

  const groupedExpenses = useMemo(() => {
    const groups = {}
    filteredExpenses.forEach(exp => {
      const dateStr = formatDate(exp.expense_date)
      if (!groups[dateStr]) groups[dateStr] = []
      groups[dateStr].push(exp)
    })
    return Object.entries(groups)
  }, [filteredExpenses])

  const totalShown = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)

  // Collect all unique categories and subcategories
  const allCategories = useMemo(() => {
    return Array.from(new Set([
      ...Object.keys(categoryDict),
      ...expenses.map(e => e.category).filter(Boolean)
    ])).sort((a, b) => a.localeCompare(b))
  }, [categoryDict, expenses])

  const allSubCategories = useMemo(() => {
    const subs = new Set()
    Object.values(categoryDict).forEach(list => {
      if (Array.isArray(list)) list.forEach(s => subs.add(s))
    })
    expenses.forEach(e => {
      if (e.sub_category) subs.add(e.sub_category)
    })
    return Array.from(subs).sort((a, b) => a.localeCompare(b))
  }, [categoryDict, expenses])

  // Download filtered expenses PDF
  const handleDownloadFilteredPDF = async () => {
    setDownloadingPDF(true)
    try {
      const allRes = await fetchExpenses(projectId, {
        ...filters,
        search: search.trim(),
        all: true
      })
      const exportExpenses = allRes.data || []
      if (exportExpenses.length === 0) {
        toast.error('No expenses to download')
        return
      }

      const filterSummary = {
        category: filters.category,
        subCategory: filters.subCategory,
        paymentMode: filters.paymentMode,
        startDate: filters.startDate,
        endDate: filters.endDate,
        vendorName: filters.vendorName,
        search: search.trim()
      }
      await generateFilteredExpensesPDF({
        project,
        expenses: exportExpenses,
        filterSummary,
        firmName,
        save: true
      })
      toast.success(hasActiveFilters ? 'Filtered expenses PDF downloaded!' : 'Expenses PDF downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleViewBill = async (e, billUrl) => {
    e.preventDefault()
    try {
      const match = billUrl.match(/bill-images\/(.+)$/)
      if (match && match[1]) {
        const storagePath = decodeURIComponent(match[1].split('?')[0])
        const { data } = await supabase.storage.from('bill-images').createSignedUrl(storagePath, 3600)
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank')
          return
        }
      }
    } catch (err) {
      console.error('Error generating signed bill URL:', err)
    }
    window.open(billUrl, '_blank')
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
    
    // Automatically trigger PDF download when sharing to WhatsApp
    handleDownloadVoucher(item)

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

  const hasActiveFilters = filters.category || filters.subCategory || filters.paymentMode || filters.startDate || filters.endDate || filters.vendorName || search.trim()

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
                (filters.category || filters.subCategory || filters.paymentMode || filters.startDate || filters.endDate || filters.vendorName)
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title="Filter Expenses"
            >
              <Filter className="h-4 w-4" />
            </button>
            <Button size="sm" onClick={() => navigate(`/projects/${projectId}/expenses/new`, { state: { from: 'expenses' } })}>
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
            {filters.vendorName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Vendor: {filters.vendorName} <X className="h-3 w-3 cursor-pointer" onClick={() => applyFilters({ ...filters, vendorName: '' })} />
              </span>
            )}
            {(filters.startDate || filters.endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {filters.startDate ? formatDate(filters.startDate) : 'Start'} → {filters.endDate ? formatDate(filters.endDate) : 'Now'} <X className="h-3 w-3 cursor-pointer" onClick={() => applyFilters({ ...filters, startDate: '', endDate: '' })} />
              </span>
            )}
            <button
              onClick={() => {
                setSearch('')
                applyFilters({ category: '', subCategory: '', paymentMode: '', startDate: '', endDate: '', vendorName: '' })
              }}
              className="text-xs text-red-600 hover:underline ml-1 font-medium"
            >
              Reset
            </button>
          </div>
        )}

        {/* Filter Drawer Card */}
        {showFilters && (
          <Card className="mb-4 overflow-visible">
            <h3 className="font-semibold text-sm mb-3">Filters</h3>
            <ExpenseFilterForm
              categories={allCategories}
              categoryDict={categoryDict}
              allSubCategories={allSubCategories}
              vendors={vendors}
              filters={filters}
              onApply={applyFilters}
              onClear={() => applyFilters({ category: '', subCategory: '', paymentMode: '', startDate: '', endDate: '', vendorName: '' })}
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
              title={hasActiveFilters ? "Download PDF containing only filtered entries" : "Download Expenses PDF"}
            >
              <Download className="h-4 w-4" />
              {hasActiveFilters ? 'Download Filtered PDF' : 'Download PDF'}
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
                <Button variant="secondary" size="sm" onClick={() => { setSearch(''); applyFilters({ category: '', subCategory: '', paymentMode: '', startDate: '', endDate: '', vendorName: '' }) }}>
                  Clear Filters
                </Button>
              ) : (
                <Button variant="danger" onClick={() => navigate(`/projects/${projectId}/expenses/new`, { state: { from: 'expenses' } })}>
                  <Plus className="h-4 w-4" /> Add Expense
                </Button>

              )
            }
          />
        ) : (
          <div className="space-y-3">
            {groupedExpenses.map(([dateKey, items]) => (
              <div key={dateKey} className="mb-5">
                <div className="sticky top-14 z-10 bg-gray-50/95 backdrop-blur py-1.5 mb-2 px-1">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">{dateKey}</span>
                </div>
                <div className="space-y-2">
                  {items.map(item => {
                    const vendorMobile = item.vendor_mobile || (item.remarks?.match(/Phone:\s*(\d{10})/)?.[1])
                    const timeString = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    
                    return (
                      <Card key={item.id} className="p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="min-w-0 flex-1 pr-2">
                            <h4 className="text-sm font-bold text-gray-900 truncate">
                              {item.vendor_name || item.category} {item.vendor_name && <span className="text-gray-400 font-normal">({item.category})</span>}
                            </h4>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-red-600">{formatINR(item.amount)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {item.sub_category || item.category}
                          </span>
                          <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {item.payment_mode}
                          </span>
                          {item.location && (
                            <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                              {item.location}
                            </span>
                          )}
                        </div>

                        {(item.quantity || item.remarks) && (
                          <p className="text-xs text-gray-700 mb-2 leading-relaxed flex items-center flex-wrap gap-1.5">
                            {item.quantity && (
                              <span className="font-bold text-gray-900 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-[11px]">
                                Qty: {item.quantity}
                              </span>
                            )}
                            {item.remarks && <span>{item.remarks}</span>}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                          <div className="text-[10px] font-medium text-emerald-700">
                            Entry by You <span className="text-gray-400 font-normal">at {timeString}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {item.bill_image_url && (
                              <a
                                href={item.bill_image_url}
                                onClick={(e) => handleViewBill(e, item.bill_image_url)}
                                target="_blank"
                                rel="noreferrer"
                                title="View Bill"
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button onClick={() => handleDownloadVoucher(item)} title="Download PDF" className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center">
                              <PdfIcon className="h-4 w-4" />
                            </button>

                            <button onClick={() => sendWhatsAppReceipt(item)} title="Share on WhatsApp" className="p-1 hover:bg-emerald-50 rounded transition-transform active:scale-95 flex items-center justify-center">
                              <WhatsAppIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => navigate(`/projects/${projectId}/expenses/${item.id}/edit`)} title="Edit Expense" className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(item.id)} title="Delete" className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <Button variant="ghost" fullWidth onClick={() => { const np = page + 1; setPage(np); loadExpenses(np, filters, search) }}>
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
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <WhatsAppIcon className="h-5 w-5" />
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
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
                <WhatsAppIcon className="h-4 w-4" />
                <span>Send via WhatsApp</span>
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

function ExpenseFilterForm({ categories = [], categoryDict = {}, allSubCategories = [], vendors = [], filters, onApply, onClear }) {
  const [f, setF] = useState(filters)
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
  const [showSubCategorySuggestions, setShowSubCategorySuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Sorted categories and suggestions
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.localeCompare(b))
  }, [categories])

  const matchingCategories = useMemo(() => {
    const q = (f.category || '').trim().toLowerCase()
    if (!q) return sortedCategories
    return sortedCategories.filter(c => c.toLowerCase().includes(q))
  }, [f.category, sortedCategories])

  // Sorted sub-categories list based on selected category or all sub-categories
  const availableSubCategories = useMemo(() => {
    let list = []
    if (f.category && categoryDict[f.category]) {
      list = categoryDict[f.category]
    } else {
      list = allSubCategories
    }
    return [...list].sort((a, b) => a.localeCompare(b))
  }, [f.category, categoryDict, allSubCategories])

  const matchingSubCategories = useMemo(() => {
    const q = (f.subCategory || '').trim().toLowerCase()
    if (!q) return availableSubCategories
    return availableSubCategories.filter(s => s.toLowerCase().includes(q))
  }, [f.subCategory, availableSubCategories])

  // Sorted vendors and suggestions
  const sortedVendors = useMemo(() => {
    return [...vendors].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [vendors])

  const trimmedVendorName = (f.vendorName || '').trim()
  const matchingSuggestions = useMemo(() => {
    if (!sortedVendors || sortedVendors.length === 0) return []
    if (!trimmedVendorName) return sortedVendors
    const q = trimmedVendorName.toLowerCase()
    return sortedVendors.filter(v => v.name && v.name.toLowerCase().includes(q))
  }, [trimmedVendorName, sortedVendors])

  return (
    <div className="space-y-3">
      {/* Category searchable with alphabetical suggestions */}
      <div className="relative">
        <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
        <div className="relative">
          <input
            type="text"
            placeholder="All Categories (Search or select)"
            value={f.category || ''}
            onChange={e => {
              setF(prev => ({ ...prev, category: e.target.value, subCategory: '' }))
              if (!showCategorySuggestions) setShowCategorySuggestions(true)
            }}
            onFocus={() => setShowCategorySuggestions(true)}
            onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
            autoComplete="off"
            className="w-full px-3 py-2 pr-7 rounded-xl border border-gray-200 text-sm bg-white"
          />
          {f.category && (
            <button
              type="button"
              onClick={() => setF(prev => ({ ...prev, category: '', subCategory: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1"
              title="Clear Category"
            >
              ✕
            </button>
          )}
        </div>
        {showCategorySuggestions && matchingCategories.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-40 max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setF(prev => ({ ...prev, category: '', subCategory: '' }))
                setShowCategorySuggestions(false)
              }}
              className="w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 text-xs font-semibold text-gray-500"
            >
              All Categories (Clear)
            </button>
            {matchingCategories.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setF(prev => ({ ...prev, category: c, subCategory: '' }))
                  setShowCategorySuggestions(false)
                }}
                className={`w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors border-b last:border-0 border-gray-50 text-sm ${
                  f.category === c ? 'font-bold text-blue-700 bg-blue-50/50' : 'text-gray-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Category searchable with alphabetical suggestions */}
      <div className="relative">
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Sub-Category {f.category ? `(${f.category})` : ''}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="All Sub-Categories (Search or select)"
            value={f.subCategory || ''}
            onChange={e => {
              setF(prev => ({ ...prev, subCategory: e.target.value }))
              if (!showSubCategorySuggestions) setShowSubCategorySuggestions(true)
            }}
            onFocus={() => setShowSubCategorySuggestions(true)}
            onBlur={() => setTimeout(() => setShowSubCategorySuggestions(false), 200)}
            autoComplete="off"
            className="w-full px-3 py-2 pr-7 rounded-xl border border-gray-200 text-sm bg-white"
          />
          {f.subCategory && (
            <button
              type="button"
              onClick={() => setF(prev => ({ ...prev, subCategory: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1"
              title="Clear Sub-Category"
            >
              ✕
            </button>
          )}
        </div>
        {showSubCategorySuggestions && matchingSubCategories.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-40 max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setF(prev => ({ ...prev, subCategory: '' }))
                setShowSubCategorySuggestions(false)
              }}
              className="w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 text-xs font-semibold text-gray-500"
            >
              All Sub-Categories (Clear)
            </button>
            {matchingSubCategories.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setF(prev => ({ ...prev, subCategory: s }))
                  setShowSubCategorySuggestions(false)
                }}
                className={`w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors border-b last:border-0 border-gray-50 text-sm ${
                  f.subCategory === s ? 'font-bold text-blue-700 bg-blue-50/50' : 'text-gray-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
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
        <div className="relative">
          <label className="text-xs font-medium text-gray-600 block mb-1">Vendor Name</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search vendor"
              value={f.vendorName || ''}
              onChange={e => {
                setF(prev => ({ ...prev, vendorName: e.target.value }))
                if (!showSuggestions) setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              autoComplete="off"
              className="w-full px-3 py-2 pr-7 rounded-xl border border-gray-200 text-sm bg-white"
            />
            {f.vendorName && (
              <button
                type="button"
                onClick={() => setF(prev => ({ ...prev, vendorName: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1"
                title="Clear Vendor"
              >
                ✕
              </button>
            )}
          </div>
          {showSuggestions && matchingSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-40 max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setF(prev => ({ ...prev, vendorName: '' }))
                  setShowSuggestions(false)
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 text-xs font-semibold text-gray-500"
              >
                All Vendors (Clear)
              </button>
              {matchingSuggestions.map(v => (
                <button
                  key={v.id || v.name}
                  type="button"
                  onClick={() => {
                    setF(prev => ({ ...prev, vendorName: v.name }))
                    setShowSuggestions(false)
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors border-b last:border-0 border-gray-50 flex flex-col"
                >
                  <span className="text-sm font-medium text-gray-900 block truncate">{v.name}</span>
                  {v.mobile && <span className="text-[10px] text-gray-500">{v.mobile}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
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
