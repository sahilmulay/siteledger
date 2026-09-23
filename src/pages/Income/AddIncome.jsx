import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useIncome } from '../../hooks/useIncome'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PAYMENT_MODES } from '../../lib/constants'
import { todayInputDate } from '../../lib/formatters'

export function AddIncome() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { addIncome } = useIncome()

  const {
    register, handleSubmit, formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: { date: todayInputDate(), payment_mode: 'Cash' }
  })

  const onSubmit = async (data) => {
    try {
      await addIncome(projectId, {
        amount: parseFloat(data.amount),
        payment_mode: data.payment_mode,
        transaction_reference: data.transaction_reference || null,
        date: data.date,
        remarks: data.remarks || null
      })
      toast.success('Income added successfully!')
      navigate(`/projects/${projectId}`)
    } catch (err) {
      toast.error(err.message || 'Failed to add income')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Add Income" subtitle="Money Received" backTo={`/projects/${projectId}`} />
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
                hint="Optional: UPI transaction ID, cheque number, etc."
              />

              <Input
                label="Date"
                type="date"
                required
                max={todayInputDate()}
                {...register('date', {
                  required: 'Date is required',
                  validate: v => v <= todayInputDate() || 'Cannot select a future date'
                })}
                error={errors.date?.message}
              />

              <Textarea
                label="Remarks"
                placeholder="Notes about this payment (optional)"
                rows={2}
                {...register('remarks')}
              />
            </div>
          </Card>

          <div className="flex gap-3 pb-4">
            <Button type="button" variant="secondary" fullWidth onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" variant="success" fullWidth loading={isSubmitting}>
              Save Income
            </Button>
          </div>
        </form>
      </PageWrapper>
    </div>
  )
}
