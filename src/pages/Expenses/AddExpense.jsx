import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Upload, X, Image, Users, BookUser, Search, Plus, UserPlus, Check, ChevronDown } from 'lucide-react'
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

export function AddExpense({ mode = 'create' }) {
  const { id: projectId, expenseId } = useParams()
  const navigate = useNavigate()
  const { addExpense, updateExpense, fetchExpense, uploadBillImage } = useExpenses()
  const { user, categories: userCategories, vendors = [], updateCategories, updateVendors } = useAuth()

  const categories = (userCategories && Object.keys(userCategories).length > 0)
    ? userCategories
    : EXPENSE_CATEGORIES

  const [customCategory, setCustomCategory] = useState('')
  const [customSubCategory, setCustomSubCategory] = useState('')
  const [billFile, setBillFile] = useState(null)
  const [billPreview, setBillPreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Category & Sub-Category Autocomplete state
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
  const [showSubCategorySuggestions, setShowSubCategorySuggestions] = useState(false)
  const [newCategoryModal, setNewCategoryModal] = useState(null)
  const [newSubCategoryModal, setNewSubCategoryModal] = useState(null)
  const categoryRef = useRef(null)
  const subCategoryRef = useRef(null)

  // Vendor Search & Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [vendorSearchModal, setVendorSearchModal] = useState(false)
  const [vendorSearchQuery, setVendorSearchQuery] = useState('')
  const [phoneChoiceData, setPhoneChoiceData] = useState(null)
  const [newVendorModal, setNewVendorModal] = useState(null)
  const suggestionRef = useRef(null)

  const {
    register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: { expense_date: todayInputDate(), payment_mode: 'Cash', category: '', sub_category: '', vendor_name: '', vendor_mobile: '' }
  })

  useEffect(() => {
    if (mode === 'edit' && expenseId) {
      fetchExpense(expenseId).then(data => {
        if (data) {
          reset(data)
          if (data.bill_image_url) setBillPreview(data.bill_image_url)
          // Ensure category is in list, if not we could set custom category, but let's assume valid for now
        }
      })
    }
  }, [mode, expenseId, fetchExpense, reset])

  const watchCategory = watch('category') || ''
  const trimmedCategory = watchCategory.trim()
  const watchSubCategory = watch('sub_category') || ''
  const trimmedSubCategory = watchSubCategory.trim()
  const watchVendorName = watch('vendor_name') || ''
  const trimmedVendorName = watchVendorName.trim()

  const isCategorySaved = useMemo(() => {
    if (!trimmedCategory) return false
    return Object.keys(categories).some(c => c.toLowerCase() === trimmedCategory.toLowerCase())
  }, [trimmedCategory, categories])

  const matchingCategories = useMemo(() => {
    const all = Object.keys(categories)
    if (!trimmedCategory) return all
    const q = trimmedCategory.toLowerCase()
    return all.filter(c => c.toLowerCase().includes(q))
  }, [trimmedCategory, categories])

  const isSubCategorySaved = useMemo(() => {
    if (!trimmedSubCategory) return false
    const currentSubs = trimmedCategory && categories[trimmedCategory]
      ? categories[trimmedCategory]
      : Array.from(new Set(Object.values(categories).flat()))
    return currentSubs.some(s => s.toLowerCase() === trimmedSubCategory.toLowerCase())
  }, [trimmedSubCategory, trimmedCategory, categories])

  const matchingSubCategories = useMemo(() => {
    const currentSubs = trimmedCategory && categories[trimmedCategory]
      ? categories[trimmedCategory]
      : Array.from(new Set(Object.values(categories).flat()))
    if (!trimmedSubCategory) return currentSubs
    const q = trimmedSubCategory.toLowerCase()
    return currentSubs.filter(s => s.toLowerCase().includes(q))
  }, [trimmedSubCategory, trimmedCategory, categories])

  const saveCategoryToDirectory = async (categoryName) => {
    const cleanName = (categoryName || '').trim()
    if (!cleanName) return false

    const existing = Object.keys(categories).find(c => c.toLowerCase() === cleanName.toLowerCase())
    if (existing) {
      setValue('category', existing, { shouldValidate: true })
      toast.success(`Category "${existing}" selected`)
      return true
    }

    const updated = {
      ...categories,
      [cleanName]: []
    }

    try {
      if (updateCategories) {
        await updateCategories(updated)
      }
      setValue('category', cleanName, { shouldValidate: true })
      toast.success(`Category "${cleanName}" added!`)
      return true
    } catch (err) {
      console.error('Failed to save category:', err)
      toast.error('Failed to add category')
      return false
    }
  }

  const saveSubCategoryToDirectory = async (subName, targetCat) => {
    const cleanSub = (subName || '').trim()
    if (!cleanSub) return false
    const cat = (targetCat || trimmedCategory || Object.keys(categories)[0] || 'Miscellaneous').trim()

    const currentSubs = categories[cat] || []
    const existing = currentSubs.find(s => s.toLowerCase() === cleanSub.toLowerCase())
    if (existing) {
      setValue('sub_category', existing, { shouldValidate: true })
      toast.success(`Sub-category "${existing}" selected`)
      return true
    }

    const updated = {
      ...categories,
      [cat]: [...currentSubs, cleanSub]
    }

    try {
      if (updateCategories) {
        await updateCategories(updated)
      }
      if (!trimmedCategory || trimmedCategory.toLowerCase() !== cat.toLowerCase()) {
        setValue('category', cat, { shouldValidate: true })
      }
      setValue('sub_category', cleanSub, { shouldValidate: true })
      toast.success(`Sub-category "${cleanSub}" added under ${cat}!`)
      return true
    } catch (err) {
      console.error('Failed to save sub-category:', err)
      toast.error('Failed to add sub-category')
      return false
    }
  }

  const isVendorSaved = useMemo(() => {
    if (!trimmedVendorName || !vendors || vendors.length === 0) return false
    return vendors.some(v => v.name && v.name.toLowerCase().trim() === trimmedVendorName.toLowerCase())
  }, [trimmedVendorName, vendors])

  const saveVendorToDirectory = async (nameToSave, mobileToSave, showToast = true) => {
    const cleanName = (nameToSave || '').trim()
    if (!cleanName) return false
    const cleanMobile = (mobileToSave || '').replace(/\D/g, '').slice(-10)

    const currentVendors = vendors || []
    const existingIndex = currentVendors.findIndex(v => 
      v.name && v.name.toLowerCase().trim() === cleanName.toLowerCase()
    )

    let updated
    if (existingIndex >= 0) {
      const existing = currentVendors[existingIndex]
      if (cleanMobile && existing.mobile !== cleanMobile) {
        updated = [...currentVendors]
        updated[existingIndex] = { ...existing, mobile: cleanMobile }
      } else {
        if (showToast) toast.success(`"${cleanName}" is already in Vendor Directory`)
        return true
      }
    } else {
      const newVendor = {
        id: Date.now().toString(),
        name: cleanName,
        mobile: cleanMobile || ''
      }
      updated = [...currentVendors, newVendor]
    }

    try {
      if (updateVendors) {
        await updateVendors(updated)
        if (showToast) {
          toast.success(`"${cleanName}" saved to Vendor Directory!`)
        }
      }
      return true
    } catch (err) {
      console.error('Failed to save vendor to directory:', err)
      if (showToast) toast.error('Failed to save to Vendor Directory')
      return false
    }
  }

  // Filter suggestions as user types in Vendor Name field
  const matchingSuggestions = useMemo(() => {
    if (!trimmedVendorName || !vendors || vendors.length === 0) return []
    const q = trimmedVendorName.toLowerCase()
    return vendors.filter(v => v.name && v.name.toLowerCase().includes(q))
  }, [trimmedVendorName, vendors])

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
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategorySuggestions(false)
      }
      if (subCategoryRef.current && !subCategoryRef.current.contains(e.target)) {
        setShowSubCategorySuggestions(false)
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
            onSelect: async (chosenClean) => {
              setValue('vendor_mobile', chosenClean, { shouldValidate: true })
              await saveVendorToDirectory(name, chosenClean, false)
              toast.success(`Imported & saved "${name}" to Vendor Directory!`)
            }
          })
        } else if (validNumbers.length === 1) {
          const mobile = validNumbers[0].clean
          setValue('vendor_mobile', mobile, { shouldValidate: true })
          await saveVendorToDirectory(name, mobile, false)
          toast.success(`Imported & saved "${name || 'contact'}" to Vendor Directory!`)
        } else {
          if (name) {
            await saveVendorToDirectory(name, '', false)
            toast.success(`Imported & saved "${name}" to Vendor Directory!`)
          } else {
            toast.success('Contact imported!')
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Could not access contacts: ' + (err.message || 'Permission denied'))
      }
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

      let payload = {
        category: finalCategory,
        sub_category: finalSubCategory,
        amount: parseFloat(data.amount),
        payment_mode: data.payment_mode,
        transaction_reference: data.transaction_reference || null,
        vendor_name: data.vendor_name || null,
        vendor_mobile: data.vendor_mobile ? data.vendor_mobile.replace(/\D/g, '').slice(-10) : null,
        expense_date: data.expense_date,
        remarks: data.remarks || null,
        location: data.location || null
      }
      
      if (billImageUrl) payload.bill_image_url = billImageUrl

      if (mode === 'edit' && expenseId) {
        await updateExpense(expenseId, payload)
      } else {
        await addExpense(projectId, payload)
      }

      // Update global categories silently if new ones were added
      let updatedCats = { ...categories }
      let catsChanged = false

      if (finalCategory && !updatedCats[finalCategory]) {
        updatedCats[finalCategory] = []
        catsChanged = true
      }

      if (finalCategory && finalSubCategory) {
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

      // Auto-save vendor to Vendor Directory if not already saved
      if (data.vendor_name && data.vendor_name.trim()) {
        try {
          await saveVendorToDirectory(data.vendor_name, data.vendor_mobile, false)
        } catch (err) {
          console.error("Failed to auto-save vendor to directory:", err)
        }
      }

      toast.success(mode === 'edit' ? 'Expense updated successfully!' : 'Expense added successfully!')
      navigate(`/projects/${projectId}`)
    } catch (err) {
      setUploading(false)
      toast.error(err.message || `Failed to ${mode === 'edit' ? 'update' : 'add'} expense`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={mode === 'edit' ? 'Edit Expense' : 'Add Expense'} subtitle={mode === 'edit' ? 'Update expense details' : 'Record a new expense'} backTo={`/projects/${projectId}/expenses`} />
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

              {/* Category input with autocomplete & add-new */}
              <div className="relative" ref={categoryRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategorySuggestions(false)
                      setNewCategoryModal({ name: trimmedCategory || '' })
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-sm"
                    title="Add new category"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Category</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Select or type category (e.g. Materials, Labour)"
                    autoComplete="off"
                    {...register('category', {
                      required: 'Category is required',
                      onChange: () => {
                        if (!showCategorySuggestions) setShowCategorySuggestions(true)
                      }
                    })}
                    onFocus={() => setShowCategorySuggestions(true)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCategorySuggestions(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${showCategorySuggestions ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {errors.category?.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}

                {/* Category Dropdown */}
                {showCategorySuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                      <span>Available Categories</span>
                      <button
                        type="button"
                        onClick={() => setShowCategorySuggestions(false)}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    {matchingCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setValue('category', cat, { shouldValidate: true })
                          setValue('sub_category', '')
                          setShowCategorySuggestions(false)
                        }}
                        className={`w-full text-left px-3.5 py-2.5 hover:bg-blue-50 active:bg-blue-100 transition-colors border-b last:border-0 border-gray-50 flex items-center justify-between group ${watchCategory === cat ? 'bg-blue-50/60 font-semibold text-blue-700' : 'text-gray-900'}`}
                      >
                        <span className="text-sm truncate">{cat}</span>
                        {watchCategory === cat ? (
                          <span className="text-xs text-blue-600 font-semibold">Selected</span>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-400 group-hover:text-blue-600">Select</span>
                        )}
                      </button>
                    ))}

                    {trimmedCategory && !isCategorySaved && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategorySuggestions(false)
                          setNewCategoryModal({ name: trimmedCategory })
                        }}
                        className="w-full text-left px-3.5 py-2.5 bg-blue-50/90 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-between border-t border-blue-100 transition-colors"
                      >
                        <span className="flex items-center gap-1.5 truncate pr-2">
                          <Plus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span>Add <strong>"{trimmedCategory}"</strong> as New Category</span>
                        </span>
                        <span className="text-[11px] bg-blue-600 text-white font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 shadow-sm">
                          + Add
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Inline banner when typed category is not in list */}
                {trimmedCategory && !isCategorySaved && (
                  <div className="mt-1.5 flex items-center justify-between gap-2 p-2 px-3 bg-blue-50/90 border border-blue-200/90 rounded-xl text-xs text-blue-900 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <Plus className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                      <span className="truncate">
                        <strong>"{trimmedCategory}"</strong> not in categories
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewCategoryModal({ name: trimmedCategory })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg shadow-sm transition-all flex-shrink-0"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Category</span>
                    </button>
                  </div>
                )}
                {trimmedCategory && isCategorySaved && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700 px-1">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Saved Category</span>
                  </div>
                )}
              </div>

              {/* Sub-Category input with autocomplete & add-new */}
              <div className="relative" ref={subCategoryRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Sub-Category <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubCategorySuggestions(false)
                      setNewSubCategoryModal({
                        name: trimmedSubCategory || '',
                        category: trimmedCategory || Object.keys(categories)[0] || 'Materials'
                      })
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-sm"
                    title="Add new sub-category"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Sub-Category</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder={trimmedCategory ? `Select or type sub-category for ${trimmedCategory}` : "Select or type sub-category"}
                    autoComplete="off"
                    {...register('sub_category', {
                      onChange: () => {
                        if (!showSubCategorySuggestions) setShowSubCategorySuggestions(true)
                      }
                    })}
                    onFocus={() => setShowSubCategorySuggestions(true)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSubCategorySuggestions(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${showSubCategorySuggestions ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Sub-Category Dropdown */}
                {showSubCategorySuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                      <span>Available Sub-Categories {trimmedCategory ? `(${trimmedCategory})` : ''}</span>
                      <button
                        type="button"
                        onClick={() => setShowSubCategorySuggestions(false)}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    {matchingSubCategories.map(sub => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          setValue('sub_category', sub, { shouldValidate: true })
                          setShowSubCategorySuggestions(false)
                        }}
                        className={`w-full text-left px-3.5 py-2.5 hover:bg-blue-50 active:bg-blue-100 transition-colors border-b last:border-0 border-gray-50 flex items-center justify-between group ${watchSubCategory === sub ? 'bg-blue-50/60 font-semibold text-blue-700' : 'text-gray-900'}`}
                      >
                        <span className="text-sm truncate">{sub}</span>
                        {watchSubCategory === sub ? (
                          <span className="text-xs text-blue-600 font-semibold">Selected</span>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-400 group-hover:text-blue-600">Select</span>
                        )}
                      </button>
                    ))}

                    {trimmedSubCategory && !isSubCategorySaved && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSubCategorySuggestions(false)
                          setNewSubCategoryModal({
                            name: trimmedSubCategory,
                            category: trimmedCategory || Object.keys(categories)[0] || 'Materials'
                          })
                        }}
                        className="w-full text-left px-3.5 py-2.5 bg-blue-50/90 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-between border-t border-blue-100 transition-colors"
                      >
                        <span className="flex items-center gap-1.5 truncate pr-2">
                          <Plus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span>Add <strong>"{trimmedSubCategory}"</strong> as New Sub-Category</span>
                        </span>
                        <span className="text-[11px] bg-blue-600 text-white font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 shadow-sm">
                          + Add
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Inline banner when typed sub-category is not in list */}
                {trimmedSubCategory && !isSubCategorySaved && (
                  <div className="mt-1.5 flex items-center justify-between gap-2 p-2 px-3 bg-blue-50/90 border border-blue-200/90 rounded-xl text-xs text-blue-900 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <Plus className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                      <span className="truncate">
                        <strong>"{trimmedSubCategory}"</strong> not in sub-categories
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewSubCategoryModal({
                        name: trimmedSubCategory,
                        category: trimmedCategory || Object.keys(categories)[0] || 'Miscellaneous'
                      })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg shadow-sm transition-all flex-shrink-0"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Sub-Category</span>
                    </button>
                  </div>
                )}
                {trimmedSubCategory && isSubCategorySaved && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700 px-1">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Saved Sub-Category</span>
                  </div>
                )}
              </div>

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
                {showSuggestions && (matchingSuggestions.length > 0 || (trimmedVendorName && !isVendorSaved)) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                      <span>{matchingSuggestions.length > 0 ? 'Matching Saved Vendors' : 'Vendor Directory'}</span>
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
                        <div className="min-w-0 pr-2">
                          <span className="text-sm font-semibold text-gray-900 block truncate">
                            {v.name}
                          </span>
                          {v.mobile && (
                            <span className="text-[11px] text-gray-500 block truncate">
                              {v.mobile}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          Select
                        </span>
                      </button>
                    ))}

                    {trimmedVendorName && !isVendorSaved && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false)
                          setNewVendorModal({
                            name: trimmedVendorName,
                            mobile: watch('vendor_mobile') || ''
                          })
                        }}
                        className="w-full text-left px-3.5 py-2.5 bg-blue-50/90 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-between border-t border-blue-100 transition-colors"
                      >
                        <span className="flex items-center gap-1.5 truncate pr-2">
                          <UserPlus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span>Add <strong>"{trimmedVendorName}"</strong> as New Vendor</span>
                        </span>
                        <span className="text-[11px] bg-blue-600 text-white font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 shadow-sm">
                          + Add
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Indicator & quick add option below Vendor Name */}
              {trimmedVendorName && (
                <div className="-mt-2 mb-1">
                  {!isVendorSaved ? (
                    <div className="flex items-center justify-between gap-2 p-2 px-3 bg-blue-50/90 border border-blue-200/90 rounded-xl text-xs text-blue-900 shadow-sm">
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <UserPlus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="truncate">
                          <strong>"{trimmedVendorName}"</strong> not in directory
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false)
                          setNewVendorModal({
                            name: trimmedVendorName,
                            mobile: watch('vendor_mobile') || ''
                          })
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg shadow-sm transition-all flex-shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add as Vendor</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 px-1">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Saved in Vendor Directory</span>
                    </div>
                  )}
                </div>
              )}

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

              <Textarea
                label="Remarks"
                placeholder="Additional notes (optional)"
                rows={2}
                {...register('remarks')}
              />

              <Input
                label="Location"
                placeholder="Enter location (optional)"
                {...register('location')}
              />

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
            </div>
          </Card>

          <div className="flex gap-3 pb-4">
            <Button type="button" variant="secondary" fullWidth onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" fullWidth loading={isSubmitting || uploading}>
              {uploading ? 'Uploading...' : (mode === 'edit' ? 'Save Changes' : 'Save Expense')}
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
                <div className="py-6 text-center">
                  <p className="text-xs text-gray-400 mb-3">No matching vendors found</p>
                  {vendorSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        const name = vendorSearchQuery.trim()
                        setVendorSearchModal(false)
                        setNewVendorModal({
                          name,
                          mobile: watch('vendor_mobile') || ''
                        })
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add "{vendorSearchQuery.trim()}" as New Vendor</span>
                    </button>
                  )}
                </div>
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
                    <div className="min-w-0 pr-2">
                      <span className="text-sm font-semibold text-gray-800 block truncate">{v.name}</span>
                      {v.mobile && (
                        <span className="text-xs text-gray-500 block truncate">{v.mobile}</span>
                      )}
                    </div>
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

      {/* Modal to prompt for Vendor Name & Phone Number */}
      {newVendorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                Add Vendor to Directory
              </h4>
              <button
                type="button"
                onClick={() => setNewVendorModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Enter details for <strong>{newVendorModal.name || 'Vendor'}</strong> to save them in your directory.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const name = newVendorModal.name.trim()
                if (!name) {
                  toast.error('Vendor name is required')
                  return
                }

                const rawMobile = (newVendorModal.mobile || '').trim()
                const cleanMobile = rawMobile.replace(/\D/g, '')
                if (rawMobile && cleanMobile.length !== 10 && !(cleanMobile.length === 12 && cleanMobile.startsWith('91'))) {
                  toast.error('Please enter a valid 10-digit mobile number')
                  return
                }

                const finalMobile = cleanMobile ? cleanMobile.slice(-10) : ''
                const saved = await saveVendorToDirectory(name, finalMobile, true)
                if (saved) {
                  setValue('vendor_name', name, { shouldValidate: true })
                  if (finalMobile) {
                    setValue('vendor_mobile', finalMobile, { shouldValidate: true })
                  }
                  setNewVendorModal(null)
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Vendor / Worker Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chavan Store, Ramesh"
                  value={newVendorModal.name}
                  onChange={e => setNewVendorModal(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-gray-700 block">
                    Mobile Number (10 digits)
                  </label>
                  {'contacts' in navigator && 'ContactsManager' in window && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false })
                          if (contacts && contacts.length > 0) {
                            const { name: cName, validNumbers } = parseContactNumbers(contacts[0])
                            if (validNumbers.length > 0) {
                              setNewVendorModal(prev => ({
                                ...prev,
                                name: prev.name || cName,
                                mobile: validNumbers[0].clean
                              }))
                              toast.success('Fetched number from contacts!')
                            } else if (cName) {
                              setNewVendorModal(prev => ({ ...prev, name: prev.name || cName }))
                            }
                          }
                        } catch (err) {
                          if (err.name !== 'AbortError') {
                            toast.error('Could not access contacts')
                          }
                        }
                      }}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <BookUser className="h-3 w-3" />
                      <span>Pick from Contacts</span>
                    </button>
                  )}
                </div>
                <input
                  type="tel"
                  autoFocus
                  placeholder="e.g. 9876543210"
                  value={newVendorModal.mobile}
                  onChange={e => setNewVendorModal(prev => ({ ...prev, mobile: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Used to send payment voucher/receipt directly on WhatsApp
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setNewVendorModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  fullWidth
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Save Vendor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Add New Category */}
      {newCategoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                Add New Category
              </h4>
              <button
                type="button"
                onClick={() => setNewCategoryModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Create a new category to organize your project expenses.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const name = (newCategoryModal.name || '').trim()
                if (!name) {
                  toast.error('Category name is required')
                  return
                }
                const saved = await saveCategoryToDirectory(name)
                if (saved) {
                  setNewCategoryModal(null)
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Site Cleaning, Municipal Fees"
                  value={newCategoryModal.name || ''}
                  onChange={e => setNewCategoryModal(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setNewCategoryModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  fullWidth
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Save Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Add New Sub-Category */}
      {newSubCategoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                Add New Sub-Category
              </h4>
              <button
                type="button"
                onClick={() => setNewSubCategoryModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Add a sub-item under a category (e.g. Cement under Materials).
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const name = (newSubCategoryModal.name || '').trim()
                if (!name) {
                  toast.error('Sub-category name is required')
                  return
                }
                const cat = (newSubCategoryModal.category || '').trim()
                if (!cat) {
                  toast.error('Please select a parent category')
                  return
                }
                const saved = await saveSubCategoryToDirectory(name, cat)
                if (saved) {
                  setNewSubCategoryModal(null)
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Parent Category *
                </label>
                <select
                  value={newSubCategoryModal.category || Object.keys(categories)[0] || 'Miscellaneous'}
                  onChange={e => setNewSubCategoryModal(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                >
                  {Object.keys(categories).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Sub-Category Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Cement, Centring, Excavator"
                  value={newSubCategoryModal.name || ''}
                  onChange={e => setNewSubCategoryModal(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setNewSubCategoryModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  fullWidth
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Save Sub-Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
