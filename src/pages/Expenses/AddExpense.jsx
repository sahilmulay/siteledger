import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Upload, X, Image, Users, BookUser, Search } from 'lucide-react'
import { useExpenses } from '../../hooks/useExpenses'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PhoneChoiceModal } from '../../components/ui/PhoneChoiceModal'
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../lib/constants'
import { todayInputDate } from '../../lib/formatters'
import { parseContactNumbers } from '../../lib/contactHelper'

export function AddExpense() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { addExpense, uploadBillImage } = useExpenses()
  const { user, categories: userCategories, vendors = [], updateCategories } = useAuth()

  const categories = (userCategories && Object.keys(userCategories).length > 0)
    ? userCategories
    : EXPENSE_CATEGORIES

  const [customCategory, setCustomCategory] = useState('')
  const [customSubCategory, setCustomSubCategory] = useState('')
  const [billFile, setBillFile] = useState(null)
  const [billPreview, setBillPreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Vendor Search & Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [vendorSearchModal, setVendorSearchModal] = useState(false)
  const [vendorSearchQuery, setVendorSearchQuery] = useState('')
  const [phoneChoiceData, setPhoneChoiceData] = useState(null)
  const suggestionRef = useRef(null)

  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: { expense_date: todayInputDate(), payment_mode: 'Cash', vendor_name: '', vendor_mobile: '' }
  })

  const watchCategory = watch('category')
  const watchSubCategory = watch('sub_category')
  const watchVendorName = watch('vendor_name') || ''

  // Filter suggestions as user types in Vendor Name field
  const matchingSuggestions = useMemo(() => {
    if (!watchVendorName.trim() || !vendors || vendors.length === 0) return []
    const q = watchVendorName.trim().toLowerCase()
    return vendors.filter(v => v.name && v.name.toLowerCase().includes(q))
  }, [watchVendorName, vendors])

  // Filter vendors in Search Modal
  const filteredModalVendors = useMemo(() => {
    if (!vendors || vendors.length === 0) return []
    if (!vendorSearchQuery.trim()) return vendors
    const q = vendorSearchQuery.trim().toLowerCase()
    return vendors.filter(v =>
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.mobile && v.mobile.includes(q))
    )
  }, [vendors, vendorSearchQuery])

  const selectVendor = (v) => {
    setValue('vendor_name', v.name, { shouldValidate: true })
    if (v.mobile) {
      setValue('vendor_mobile', v.mobile, { shouldValidate: true })
    }
    setShowSuggestions(false)
    toast.success(`Selected "${v.name}"`)
  }

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePickContact = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      toast((t) => (
        <span className="text-xs">
          Contact Picker is supported on mobile devices (Android Chrome/PWA). You can enter vendor details directly below.
        </span>
      ), { duration: 4500, icon: '📱' })
      return
    }
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false })
      if (contacts && contacts.length > 0) {
        const contact = contacts[0]
        const { name, validNumbers } = parseContactNumbers(contact)

        if (name) setValue('vendor_name', name, { shouldValidate: true })

        if (validNumbers.length > 1) {
          // Multiple numbers: ask user to choose
          setPhoneChoiceData({
            name,
            numbers: validNumbers,
            onSelect: (chosenClean) => {
              setValue('vendor_mobile', chosenClean, { shouldValidate: true })
              toast.success(`Selected ${chosenClean} for ${name}`)
            }
          })
        } else if (validNumbers.length === 1) {
          setValue('vendor_mobile', validNumbers[0].clean, { shouldValidate: true })
          toast.success(`Imported ${name || 'contact'}!`)
        } else {
          toast.success(`Imported ${name || 'contact'} (No 10-digit mobile found)`)
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Could not access contacts: ' + (err.message || 'Permission denied'))
      }
    }
  }

  const handleSelectSavedVendor = (e) => {
    const selectedId = e.target.value
    if (!selectedId) return
    const v = vendors.find(item => item.id === selectedId)
    if (v) {
      selectVendor(v)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB.')
      return
    }
    setBillFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setBillPreview(e.target.result)
      reader.readAsDataURL(file)
    } else {
      setBillPreview('pdf')
    }
  }

  const onSubmit = async (data) => {
    try {
      const finalCategory = data.category === 'Other' ? customCategory.trim() : data.category
      if (!finalCategory) {
        toast.error('Please specify the category name')
        return
      }

      const finalSubCategory = data.sub_category === 'Other' ? customSubCategory.trim() : (data.sub_category || null)

      let billImageUrl = null
      if (billFile) {
        setUploading(true)
        billImageUrl = await uploadBillImage(user.id, projectId, billFile)
        setUploading(false)
      }

      await addExpense(projectId, {
        category: finalCategory,
        sub_category: finalSubCategory,
        amount: parseFloat(data.amount),
        payment_mode: data.payment_mode,
        transaction_reference: data.transaction_reference || null,
        vendor_name: data.vendor_name || null,
        vendor_mobile: data.vendor_mobile ? data.vendor_mobile.replace(/\D/g, '').slice(-10) : null,
        expense_date: data.expense_date,
        remarks: data.remarks || null,
        bill_image_url: billImageUrl
      })

      // Update global categories silently if new ones were added
      let updatedCats = { ...categories }
      let catsChanged = false

      if (data.category === 'Other' && finalCategory) {
        if (!updatedCats[finalCategory]) {
          updatedCats[finalCategory] = []
          catsChanged = true
        }
      }

      if (finalCategory && data.sub_category === 'Other' && finalSubCategory) {
        if (!updatedCats[finalCategory]) {
          updatedCats[finalCategory] = []
        }
        if (!updatedCats[finalCategory].includes(finalSubCategory)) {
          updatedCats[finalCategory] = [...updatedCats[finalCategory], finalSubCategory]
          catsChanged = true
        }
      }

      if (catsChanged && updateCategories) {
        try {
          await updateCategories(updatedCats)
        } catch (err) {
          console.error("Failed to update global categories:", err)
        }
      }

      toast.success('Expense added successfully!')
      navigate(`/projects/${projectId}`)
    } catch (err) {
      setUploading(false)
      toast.error(err.message || 'Failed to add expense')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Add Expense" subtitle="Record a new expense" backTo={`/projects/${projectId}`} />
      <PageWrapper>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Card>
            <div className="space-y-4">
              <Input
                label="Amount (₹)"
                type="number"
                placeholder="0.00"
                required
                inputMode="decimal"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 1, message: 'Amount must be positive' }
                })}
                error={errors.amount?.message}
              />

              <Select
                label="Category"
                required
                {...register('category', { required: 'Category is required' })}
                error={errors.category?.message}
                onChange={(e) => {
                  setValue('category', e.target.value)
                  setValue('sub_category', '')
                  setCustomCategory('')
                  setCustomSubCategory('')
                }}
              >
                <option value="">Select Category</option>
                {Object.keys(categories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Other">+ Add New Category</option>
              </Select>

              {watchCategory === 'Other' && (
                <Input
                  label="New Category Name *"
                  placeholder="e.g. Site Cleaning, Municipal Fees, Tea/Snacks"
                  required
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
              )}

              {/* Sub Category Selection */}
              {watchCategory && (
                <Select 
                  label="Sub-Category" 
                  {...register('sub_category')}
                  onChange={(e) => {
                    setValue('sub_category', e.target.value)
                    setCustomSubCategory('')
                  }}
                >
                  <option value="">Select Sub-Category (Optional)</option>
                  {watchCategory !== 'Other' && categories[watchCategory] && categories[watchCategory].map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  <option value="Other">+ Add New Sub-Category</option>
                </Select>
              )}

              {watchSubCategory === 'Other' && (
                <Input
                  label="New Sub-Category Name *"
                  placeholder="e.g. Labour, Material"
                  required
                  value={customSubCategory}
                  onChange={e => setCustomSubCategory(e.target.value)}
                />
              )}

              {/* Pre-Loaded Vendor Selection & Contacts */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Vendor / Worker Details
                  </span>
                  <div className="flex items-center gap-1.5">
                    {vendors && vendors.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setVendorSearchModal(true); setVendorSearchQuery('') }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-200 transition-colors"
                        title="Search vendor directory"
                      >
                        <Search className="h-3.5 w-3.5 text-gray-600" />
                        <span>Search</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handlePickContact}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      title="Pick vendor from device contact book"
                    >
                      <BookUser className="h-3.5 w-3.5 text-blue-600" />
                      <span>Contacts</span>
                    </button>
                  </div>
                </div>

                {vendors && vendors.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      Quick Pick Saved Vendor
                    </label>
                    <select
                      onChange={handleSelectSavedVendor}
                      defaultValue=""
                      className="w-full px-3 py-2 text-sm bg-blue-50/50 border border-blue-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                    >
                      <option value="">-- Choose from saved directory --</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Vendor Name input with autocomplete suggestion dropdown */}
              <div className="relative" ref={suggestionRef}>
                <Input
                  label="Vendor / Worker Name"
                  placeholder="e.g. Sharma Cement Store, Patil JCB"
                  {...register('vendor_name', {
                    onChange: () => {
                      if (!showSuggestions) setShowSuggestions(true)
                    }
                  })}
                  onFocus={() => setShowSuggestions(true)}
                  autoComplete="off"
                />

                {/* Dropdown Suggestions */}
                {showSuggestions && matchingSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                      <span>Matching Saved Vendors</span>
                      <button
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {matchingSuggestions.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => selectVendor(v)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 active:bg-blue-100 transition-colors border-b last:border-0 border-gray-50 flex items-center justify-between group"
                      >
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {v.name}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Input
                label="Vendor Mobile (Optional - for WhatsApp receipt)"
                type="tel"
                placeholder="e.g. 9876543210"
                {...register('vendor_mobile')}
                hint="Used to send payment voucher/receipt directly to vendor on WhatsApp"
              />

              <Select
                label="Payment Mode"
                required
                {...register('payment_mode', { required: true })}
              >
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>

              <Input
                label="Transaction Reference"
                placeholder="UPI ID / Cheque No / Bank Ref (optional)"
                {...register('transaction_reference')}
              />

              <Input
                label="Expense Date"
                type="date"
                required
                max={todayInputDate()}
                {...register('expense_date', {
                  required: 'Date is required',
                  validate: v => v <= todayInputDate() || 'Cannot select a future date'
                })}
                error={errors.expense_date?.message}
              />

              {/* Bill Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bill / Receipt Photo (Optional)</label>
                {billPreview ? (
                  <div className="relative">
                    {billPreview === 'pdf' ? (
                      <div className="w-full h-28 bg-red-50 rounded-xl flex flex-col items-center justify-center border border-red-200">
                        <Image className="h-8 w-8 text-red-400 mb-1" />
                        <p className="text-sm text-red-600 truncate max-w-xs">{billFile?.name}</p>
                      </div>
                    ) : (
                      <img src={billPreview} alt="Bill preview" className="w-full h-44 object-cover rounded-xl border border-gray-200" />
                    )}
                    <button
                      type="button"
                      onClick={() => { setBillFile(null); setBillPreview(null) }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <Upload className="h-6 w-6 text-gray-400 mb-1" />
                    <p className="text-sm font-medium text-gray-600">Tap to upload bill photo</p>
                    <p className="text-xs text-gray-400">JPG, PNG, PDF · Max 5MB</p>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              <Textarea
                label="Remarks"
                placeholder="Additional notes (optional)"
                rows={2}
                {...register('remarks')}
              />
            </div>
          </Card>

          <div className="flex gap-3 pb-4">
            <Button type="button" variant="secondary" fullWidth onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" fullWidth loading={isSubmitting || uploading}>
              {uploading ? 'Uploading...' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </PageWrapper>

      {/* Search Saved Vendors Modal */}
      {vendorSearchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Search className="h-4 w-4 text-blue-600" />
                Search Saved Vendors
              </h4>
              <button
                type="button"
                onClick={() => setVendorSearchModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search vendor name..."
                value={vendorSearchQuery}
                onChange={e => setVendorSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredModalVendors.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No matching vendors found</p>
              ) : (
                filteredModalVendors.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      selectVendor(v)
                      setVendorSearchModal(false)
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center justify-between border border-transparent hover:border-blue-100 group"
                  >
                    <span className="text-sm font-semibold text-gray-800 truncate">{v.name}</span>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      Select
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Multiple Phone Choice Modal */}
      <PhoneChoiceModal
        data={phoneChoiceData}
        onClose={() => setPhoneChoiceData(null)}
      />
    </div>
  )
}
