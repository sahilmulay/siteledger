import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Upload, X, Image, Users } from 'lucide-react'
import { useExpenses } from '../../hooks/useExpenses'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../lib/constants'
import { todayInputDate } from '../../lib/formatters'

export function AddExpense() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { addExpense, uploadBillImage } = useExpenses()
  const { user, categories: userCategories, vendors = [] } = useAuth()

  const categories = (userCategories && Object.keys(userCategories).length > 0)
    ? userCategories
    : EXPENSE_CATEGORIES

  const [customCategory, setCustomCategory] = useState('')
  const [billFile, setBillFile] = useState(null)
  const [billPreview, setBillPreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: { expense_date: todayInputDate(), payment_mode: 'Cash' }
  })

  const watchCategory = watch('category')

  const handleSelectSavedVendor = (e) => {
    const selectedId = e.target.value
    if (!selectedId) return
    const v = vendors.find(item => item.id === selectedId)
    if (v) {
      setValue('vendor_name', v.name)
      if (v.mobile) setValue('vendor_mobile', v.mobile)
      if (v.category && categories[v.category]) {
        setValue('category', v.category)
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

      let billImageUrl = null
      if (billFile) {
        setUploading(true)
        billImageUrl = await uploadBillImage(user.id, projectId, billFile)
        setUploading(false)
      }

      await addExpense(projectId, {
        category: finalCategory,
        sub_category: data.category === 'Other' ? null : (data.sub_category || null),
        amount: parseFloat(data.amount),
        payment_mode: data.payment_mode,
        transaction_reference: data.transaction_reference || null,
        vendor_name: data.vendor_name || null,
        vendor_mobile: data.vendor_mobile ? data.vendor_mobile.replace(/\D/g, '').slice(-10) : null,
        expense_date: data.expense_date,
        remarks: data.remarks || null,
        bill_image_url: billImageUrl
      })
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
                }}
              >
                <option value="">Select Category</option>
                {Object.keys(categories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Other">Other (Type custom)</option>
              </Select>

              {watchCategory === 'Other' && (
                <Input
                  label="Specify Custom Category *"
                  placeholder="e.g. Site Cleaning, Municipal Fees, Tea/Snacks"
                  required
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
              )}

              {watchCategory && watchCategory !== 'Other' && categories[watchCategory] && (
                <Select label="Sub-Category" {...register('sub_category')}>
                  <option value="">Select Sub-Category</option>
                  {categories[watchCategory].map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </Select>
              )}

              {/* Pre-Loaded Vendor Selection */}
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
                        {v.name} {v.mobile ? `(${v.mobile})` : ''} {v.category ? `• ${v.category}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Vendor / Worker Name"
                placeholder="e.g. Sharma Cement Store, Patil JCB"
                {...register('vendor_name')}
              />

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
    </div>
  )
}
