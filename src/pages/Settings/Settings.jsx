import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, User, HardHat, Shield, Building2, Save,
  Plus, Trash2, X, Phone, Tag, RotateCcw, ChevronDown, ChevronUp, Users,
  BookUser, Edit2, FileSpreadsheet, Database, Download
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Badge } from '../../components/ui/Badge'
import { EXPENSE_CATEGORIES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function Settings() {
  const {
    user,
    firmName,
    categories,
    vendors,
    updateFirmName,
    updateCategories,
    updateVendors,
    signOut
  } = useAuth()

  const navigate = useNavigate()

  // Firm Name state
  const [currentFirmName, setCurrentFirmName] = useState(firmName || '')
  const [savingFirm, setSavingFirm] = useState(false)

  // Vendor state
  const [vendorName, setVendorName] = useState('')
  const [vendorMobile, setVendorMobile] = useState('')
  const [vendorCategory, setVendorCategory] = useState('')
  const [savingVendor, setSavingVendor] = useState(false)

  // Edit Vendor state
  const [editingVendor, setEditingVendor] = useState(null)
  const [editVendorName, setEditVendorName] = useState('')
  const [editVendorMobile, setEditVendorMobile] = useState('')
  const [editVendorCategory, setEditVendorCategory] = useState('')
  const [savingEditVendor, setSavingEditVendor] = useState(false)

  // Category state
  const [newCatName, setNewCatName] = useState('')
  const [activeSubInput, setActiveSubInput] = useState(null)
  const [newSubName, setNewSubName] = useState('')
  const [expandedCats, setExpandedCats] = useState({})

  // Sign out state
  const [signOutDialog, setSignOutDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  // Data Export state
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingJSON, setExportingJSON] = useState(false)

  // --- Handlers ---
  const handleExportCSV = async () => {
    setExportingCSV(true)
    try {
      const [projectsRes, expensesRes, incomeRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('income').select('*').order('date', { ascending: false })
      ])

      if (projectsRes.error) throw projectsRes.error
      if (expensesRes.error) throw expensesRes.error
      if (incomeRes.error) throw incomeRes.error

      const projectsMap = (projectsRes.data || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {})

      const rows = []
      // Column Headers
      rows.push([
        'Date',
        'Transaction Type',
        'Project Code',
        'Project Name',
        'Category',
        'Sub-Category',
        'Vendor / Received From',
        'Mobile Number',
        'Payment Mode',
        'Reference / UTR',
        'Bill Number',
        'Amount (Rs)',
        'Remarks / Description'
      ])

      // Add Incomes
      ;(incomeRes.data || []).forEach(inc => {
        const proj = projectsMap[inc.project_id] || {}
        rows.push([
          inc.date || '',
          'INCOME',
          proj.project_code || '',
          proj.project_name || '',
          'Client Payment',
          '',
          proj.owner_name || 'Client',
          '',
          inc.payment_mode || '',
          '',
          '',
          inc.amount || 0,
          inc.remarks || ''
        ])
      })

      // Add Expenses
      ;(expensesRes.data || []).forEach(exp => {
        const proj = projectsMap[exp.project_id] || {}
        const mobile = exp.vendor_mobile || (exp.remarks?.match(/Phone:\s*(\d+)/)?.[1]) || ''
        rows.push([
          exp.expense_date || '',
          'EXPENSE',
          proj.project_code || '',
          proj.project_name || '',
          exp.category || '',
          exp.sub_category || '',
          exp.vendor_name || 'Cash / Bearer',
          mobile,
          exp.payment_mode || '',
          exp.transaction_reference || '',
          exp.bill_number || '',
          exp.amount || 0,
          exp.remarks || ''
        ])
      })

      const headerRow = rows[0]
      const dataRows = rows.slice(1).sort((a, b) => new Date(b[0]) - new Date(a[0]))
      const allRows = [headerRow, ...dataRows]

      // Format as CSV with UTF-8 BOM
      const csvContent = allRows.map(row =>
        row.map(val => {
          if (val === null || val === undefined) return '""'
          const s = String(val)
          return `"${s.replace(/"/g, '""')}"`
        }).join(',')
      ).join('\r\n')

      const dateStr = new Date().toISOString().split('T')[0]
      const prefix = (firmName || 'SiteLedger').replace(/\s+/g, '_')
      const filename = `${prefix}_Full_Ledger_${dateStr}.csv`

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Exported ${dataRows.length} transactions to Excel/CSV!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to export data: ' + err.message)
    } finally {
      setExportingCSV(false)
    }
  }

  const handleExportJSON = async () => {
    setExportingJSON(true)
    try {
      const [projectsRes, expensesRes, incomeRes, plansRes, photosRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('income').select('*').order('date', { ascending: false }),
        supabase.from('site_plans').select('*').order('created_at', { ascending: false }),
        supabase.from('site_photos').select('*').order('created_at', { ascending: false })
      ])

      const backupData = {
        backup_version: '1.0',
        exported_at: new Date().toISOString(),
        firm_name: firmName,
        user_email: user?.email,
        vendors: vendors || [],
        categories: categories || {},
        projects: projectsRes.data || [],
        expenses: expensesRes.data || [],
        income: incomeRes.data || [],
        site_plans: plansRes.data || [],
        site_photos: photosRes.data || []
      }

      const jsonStr = JSON.stringify(backupData, null, 2)
      const dateStr = new Date().toISOString().split('T')[0]
      const prefix = (firmName || 'SiteLedger').replace(/\s+/g, '_')
      const filename = `${prefix}_Full_Database_Backup_${dateStr}.json`

      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Complete database backup downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to backup: ' + err.message)
    } finally {
      setExportingJSON(false)
    }
  }
  const handleSaveFirmName = async (e) => {
    e.preventDefault()
    if (!currentFirmName.trim()) {
      toast.error('Firm name cannot be empty')
      return
    }
    setSavingFirm(true)
    try {
      await updateFirmName(currentFirmName.trim())
      toast.success('Firm name updated!')
    } catch (err) {
      toast.error(err.message || 'Failed to update firm name')
    } finally {
      setSavingFirm(false)
    }
  }

  // --- Vendor Handlers ---
  const handlePickContactForNew = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      toast((t) => (
        <div className="text-xs">
          <p className="font-semibold text-gray-800 mb-0.5">Contact Book Access</p>
          <p className="text-gray-500">Contact Picker is supported on mobile devices (Android Chrome/Edge/PWA). On other devices, please enter the name and phone number directly.</p>
        </div>
      ), { duration: 5000, icon: '📱' })
      return
    }
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false })
      if (contacts && contacts.length > 0) {
        const contact = contacts[0]
        const name = Array.isArray(contact.name) ? (contact.name[0] || '') : (contact.name || '')
        const tel = Array.isArray(contact.tel) ? (contact.tel[0] || '') : (contact.tel || '')
        const cleanMobile = tel.replace(/\D/g, '').slice(-10)

        if (name) setVendorName(name)
        if (cleanMobile) setVendorMobile(cleanMobile)
        toast.success(`Fetched ${name || 'contact'}! You can edit the details below before saving.`)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err)
        toast.error('Failed to open contacts: ' + (err.message || 'Permission denied'))
      }
    }
  }

  const handleAddVendor = async (e) => {
    e.preventDefault()
    if (!vendorName.trim()) {
      toast.error('Vendor name is required')
      return
    }

    const cleanMobile = vendorMobile.replace(/\D/g, '')
    if (vendorMobile && cleanMobile.length !== 10 && !(cleanMobile.length === 12 && cleanMobile.startsWith('91'))) {
      toast.error('Enter a valid 10-digit mobile number')
      return
    }

    setSavingVendor(true)
    try {
      const newVendor = {
        id: Date.now().toString(),
        name: vendorName.trim(),
        mobile: cleanMobile.slice(-10),
        category: vendorCategory || ''
      }
      const updated = [...(vendors || []), newVendor]
      await updateVendors(updated)
      setVendorName('')
      setVendorMobile('')
      setVendorCategory('')
      toast.success('Vendor added!')
    } catch (err) {
      toast.error('Failed to add vendor')
    } finally {
      setSavingVendor(false)
    }
  }

  const openEditVendor = (v) => {
    setEditingVendor(v)
    setEditVendorName(v.name || '')
    setEditVendorMobile(v.mobile || '')
    setEditVendorCategory(v.category || '')
  }

  const handlePickContactForEdit = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      toast('Contact Picker is supported on mobile devices (Android Chrome/PWA).', { icon: '📱' })
      return
    }
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false })
      if (contacts && contacts.length > 0) {
        const contact = contacts[0]
        const name = Array.isArray(contact.name) ? (contact.name[0] || '') : (contact.name || '')
        const tel = Array.isArray(contact.tel) ? (contact.tel[0] || '') : (contact.tel || '')
        const cleanMobile = tel.replace(/\D/g, '').slice(-10)

        if (name) setEditVendorName(name)
        if (cleanMobile) setEditVendorMobile(cleanMobile)
        toast.success('Contact info fetched!')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to access contacts')
      }
    }
  }

  const handleUpdateVendor = async (e) => {
    e.preventDefault()
    if (!editVendorName.trim()) {
      toast.error('Vendor name is required')
      return
    }
    const cleanMobile = editVendorMobile.replace(/\D/g, '')
    if (editVendorMobile && cleanMobile.length !== 10 && !(cleanMobile.length === 12 && cleanMobile.startsWith('91'))) {
      toast.error('Enter a valid 10-digit mobile number')
      return
    }

    setSavingEditVendor(true)
    try {
      const updated = vendors.map(v => {
        if (v.id === editingVendor.id) {
          return {
            ...v,
            name: editVendorName.trim(),
            mobile: cleanMobile.slice(-10),
            category: editVendorCategory || ''
          }
        }
        return v
      })
      await updateVendors(updated)
      setEditingVendor(null)
      toast.success('Vendor updated!')
    } catch (err) {
      toast.error('Failed to update vendor')
    } finally {
      setSavingEditVendor(false)
    }
  }

  const handleDeleteVendor = async (id) => {
    try {
      const updated = vendors.filter(v => v.id !== id)
      await updateVendors(updated)
      toast.success('Vendor removed')
    } catch {
      toast.error('Failed to remove vendor')
    }
  }

  // --- Category Handlers ---
  const toggleCatExpand = (cat) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    const name = newCatName.trim()
    if (!name) return
    if (categories[name]) {
      toast.error('Category already exists')
      return
    }
    const updated = { ...categories, [name]: [] }
    try {
      await updateCategories(updated)
      setNewCatName('')
      toast.success(`Category "${name}" added!`)
    } catch {
      toast.error('Failed to save category')
    }
  }

  const handleDeleteCategory = async (catName) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return
    const updated = { ...categories }
    delete updated[catName]
    try {
      await updateCategories(updated)
      toast.success(`Category "${catName}" removed`)
    } catch {
      toast.error('Failed to remove category')
    }
  }

  const handleAddSubCategory = async (catName) => {
    const sub = newSubName.trim()
    if (!sub) return
    const currentSubs = categories[catName] || []
    if (currentSubs.includes(sub)) {
      toast.error('Sub-category already exists')
      return
    }
    const updated = {
      ...categories,
      [catName]: [...currentSubs, sub]
    }
    try {
      await updateCategories(updated)
      setNewSubName('')
      setActiveSubInput(null)
      toast.success(`Sub-category "${sub}" added`)
    } catch {
      toast.error('Failed to save sub-category')
    }
  }

  const handleDeleteSubCategory = async (catName, subName) => {
    const currentSubs = categories[catName] || []
    const updated = {
      ...categories,
      [catName]: currentSubs.filter(s => s !== subName)
    }
    try {
      await updateCategories(updated)
      toast.success(`Sub-category "${subName}" removed`)
    } catch {
      toast.error('Failed to remove sub-category')
    }
  }

  const handleResetCategories = async () => {
    if (!confirm('Reset all categories back to default standard construction categories?')) return
    try {
      await updateCategories(EXPENSE_CATEGORIES)
      toast.success('Categories reset to defaults')
    } catch {
      toast.error('Failed to reset categories')
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Settings" />
      <PageWrapper>
        {/* Profile & Firm Name */}
        <Card className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <User className="h-6 w-6 text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user?.email}</p>
              <p className="text-xs text-gray-400">Contractor Account</p>
            </div>
          </div>

          <form onSubmit={handleSaveFirmName} className="space-y-3 pt-3 border-t border-gray-100">
            <Input
              label="Firm / Company Name"
              placeholder="e.g. JadhavPatil Construction"
              value={currentFirmName}
              onChange={e => setCurrentFirmName(e.target.value)}
              hint="Displayed in your app header, reports, and bills"
            />
            <Button type="submit" size="sm" loading={savingFirm} className="gap-2">
              <Save className="h-4 w-4" /> Save Firm Name
            </Button>
          </form>
        </Card>

        {/* Pre-Load Vendors Directory */}
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-blue-700" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Vendor Directory (Pre-Loaded Vendors)</h3>
              <p className="text-xs text-gray-500">Save frequent vendors so you don't have to type them every time</p>
            </div>
          </div>

          {/* Add Vendor Form */}
          <form onSubmit={handleAddVendor} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 mb-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Add New Vendor</p>
              <button
                type="button"
                onClick={handlePickContactForNew}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                title="Fetch name and phone number from your device contact book"
              >
                <BookUser className="h-3.5 w-3.5 text-blue-600" />
                <span>Add from Contacts</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-0.5">Vendor / Worker Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Hardware, Suresh Painter"
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-0.5">Mobile Number (10 digits)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={vendorMobile}
                  onChange={e => setVendorMobile(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <select
                value={vendorCategory}
                onChange={e => setVendorCategory(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Default Category (Optional)</option>
                {Object.keys(categories || {}).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button type="submit" size="sm" loading={savingVendor} className="gap-1 flex-shrink-0">
                <Plus className="h-4 w-4" /> Save Vendor
              </Button>
            </div>
          </form>

          {/* Vendor List */}
          {(!vendors || vendors.length === 0) ? (
            <p className="text-xs text-gray-400 text-center py-2">No vendors saved yet. Add your suppliers and subcontractors above.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {vendors.map(v => (
                <div key={v.id} className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {v.mobile && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400" /> {v.mobile}
                        </span>
                      )}
                      {v.category && (
                        <Badge color="blue">{v.category}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditVendor(v)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Vendor"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVendor(v.id)}
                      className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Vendor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Manage Categories & Sub-Categories */}
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-700" />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Expense Categories & Sub-Categories</h3>
                <p className="text-xs text-gray-500">Add, edit, or customize your categories</p>
              </div>
            </div>
            <button
              onClick={handleResetCategories}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              title="Reset to standard categories"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="New Category Name (e.g. Electrical, Plumbing)"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button type="submit" size="sm" className="gap-1 flex-shrink-0">
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          </form>

          {/* Categories List */}
          <div className="space-y-2.5">
            {Object.entries(categories || {}).map(([catName, subs]) => {
              const isExpanded = expandedCats[catName] !== false
              return (
                <div key={catName} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  {/* Category Header */}
                  <div className="flex items-center justify-between p-3 bg-gray-50/70 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => toggleCatExpand(catName)}
                      className="flex items-center gap-2 text-left font-semibold text-gray-800 text-sm flex-1 min-w-0"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      <span className="truncate">{catName}</span>
                      <span className="text-xs text-gray-400 font-normal">({subs?.length || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(catName)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors ml-2"
                      title="Delete category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Sub-categories */}
                  {isExpanded && (
                    <div className="p-3 space-y-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {(!subs || subs.length === 0) ? (
                          <span className="text-xs text-gray-400 italic">No sub-categories yet</span>
                        ) : (
                          subs.map(sub => (
                            <span
                              key={sub}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
                            >
                              {sub}
                              <button
                                type="button"
                                onClick={() => handleDeleteSubCategory(catName, sub)}
                                className="text-gray-400 hover:text-red-600 ml-0.5"
                                title={`Remove ${sub}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Add Sub-category Inline Form */}
                      {activeSubInput === catName ? (
                        <div className="flex gap-2 items-center pt-1">
                          <input
                            type="text"
                            placeholder={`New sub-category for ${catName}`}
                            value={newSubName}
                            onChange={e => setNewSubName(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddSubCategory(catName)
                              }
                            }}
                          />
                          <Button size="sm" onClick={() => handleAddSubCategory(catName)} className="text-xs py-1 px-2.5">
                            Add
                          </Button>
                          <button
                            type="button"
                            onClick={() => { setActiveSubInput(null); setNewSubName('') }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setActiveSubInput(catName); setNewSubName('') }}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Sub-category
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Data Backup & Export */}
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-700 text-sm">Data Backup & Export</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Export all your project ledgers, income, expenses, and vendor records. Open in Microsoft Excel, Google Sheets, or keep as a safe offline backup.
          </p>

          <div className="space-y-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleExportCSV}
              loading={exportingCSV}
              className="flex items-center justify-center gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-50 bg-emerald-50/50"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export Full Data (Excel / CSV)</span>
            </Button>

            <Button
              variant="ghost"
              fullWidth
              onClick={handleExportJSON}
              loading={exportingJSON}
              size="sm"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download Full Database Backup (JSON)
            </Button>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>🔒 100% encrypted & private to your account</span>
            <span>Offline compatible</span>
          </div>
        </Card>

        {/* Security & App Info */}
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-700" />
            <h3 className="font-semibold text-gray-700 text-sm">Security & Privacy</h3>
          </div>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p>✓ All financial records secured by PostgreSQL Row Level Security (RLS)</p>
            <p>✓ Vendor directory & custom categories synced to your account</p>
            <p>✓ Permanent cloud database with on-demand offline Excel backups</p>
          </div>
        </Card>

        {/* Sign Out */}
        <div className="pb-4">
          <Button
            variant="danger"
            fullWidth
            size="lg"
            onClick={() => setSignOutDialog(true)}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </PageWrapper>

      {/* Edit Vendor Modal */}
      {editingVendor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl animate-scale-up">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-blue-700" />
                Edit Vendor Details
              </h4>
              <button
                onClick={() => setEditingVendor(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateVendor} className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePickContactForEdit}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <BookUser className="h-3.5 w-3.5 text-blue-600" />
                  <span>Re-pick from Contacts</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Vendor / Worker Name *</label>
                <input
                  type="text"
                  value={editVendorName}
                  onChange={e => setEditVendorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Mobile Number (10 digits)</label>
                <input
                  type="tel"
                  value={editVendorMobile}
                  onChange={e => setEditVendorMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Default Category</label>
                <select
                  value={editVendorCategory}
                  onChange={e => setEditVendorCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">No Default Category</option>
                  {Object.keys(categories || {}).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setEditingVendor(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  fullWidth
                  loading={savingEditVendor}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={signOutDialog}
        onClose={() => setSignOutDialog(false)}
        onConfirm={handleSignOut}
        loading={loading}
        title="Sign Out"
        message="Are you sure you want to sign out of SiteLedger?"
        confirmLabel="Sign Out"
      />
    </div>
  )
}
