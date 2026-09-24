import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, User, HardHat, Shield, Building2, Save,
  Plus, Trash2, X, Phone, Tag, RotateCcw, ChevronDown, ChevronUp, Users
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

  // Category state
  const [newCatName, setNewCatName] = useState('')
  const [activeSubInput, setActiveSubInput] = useState(null)
  const [newSubName, setNewSubName] = useState('')
  const [expandedCats, setExpandedCats] = useState({})

  // Sign out state
  const [signOutDialog, setSignOutDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  // --- Handlers ---
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
          <form onSubmit={handleAddVendor} className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-3 space-y-2.5">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Add New Vendor</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Vendor / Worker Name *"
                value={vendorName}
                onChange={e => setVendorName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <input
                type="tel"
                placeholder="Mobile Number (10 digits)"
                value={vendorMobile}
                onChange={e => setVendorMobile(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
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
                <Plus className="h-4 w-4" /> Add Vendor
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
                  <button
                    type="button"
                    onClick={() => handleDeleteVendor(v.id)}
                    className="p-1.5 text-gray-300 hover:text-red-600 transition-colors"
                    title="Delete Vendor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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

        {/* Security & App Info */}
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-700" />
            <h3 className="font-semibold text-gray-700 text-sm">Security & Privacy</h3>
          </div>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p>✓ All data protected by Row Level Security (RLS)</p>
            <p>✓ Vendor directory & custom categories synced to your account</p>
            <p>✓ Owner portal is strictly read-only</p>
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
