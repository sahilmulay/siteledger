import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { HardHat, TrendingUp, TrendingDown, Wallet, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatINR, formatDate } from '../../lib/formatters'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'

export function OwnerPortal() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [project, setProject] = useState(null)
  const [income, setIncome] = useState([])
  const [expenses, setExpenses] = useState([])
  const [stats, setStats] = useState({})

  useEffect(() => {
    async function loadPortalData() {
      try {
        const [projRes, incRes, expRes] = await Promise.all([
          supabase.rpc('get_project_by_share_token', { p_token: token }),
          supabase.rpc('get_income_by_share_token', { p_token: token }),
          supabase.rpc('get_expenses_by_share_token', { p_token: token })
        ])

        if (projRes.error) throw projRes.error
        if (!projRes.data || projRes.data.length === 0) {
          setError('Project not found. The share link may be invalid or expired.')
          return
        }

        const proj = projRes.data[0]
        const incomeData = incRes.data || []
        const expenseData = expRes.data || []

        const totalReceived = incomeData.reduce((s, r) => s + Number(r.amount), 0)
        const totalExpenses = expenseData.reduce((s, r) => s + Number(r.amount), 0)
        const balance = totalReceived - totalExpenses

        const categoryBreakdown = {}
        expenseData.forEach(e => {
          categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + Number(e.amount)
        })

        setProject(proj)
        setIncome(incomeData)
        setExpenses(expenseData)
        setStats({ totalReceived, totalExpenses, balance, categoryBreakdown })
      } catch (err) {
        setError(err.message || 'Failed to load project data')
      } finally {
        setLoading(false)
      }
    }

    if (token) loadPortalData()
  }, [token])

  if (loading) return <PageLoader />

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Access Error</h2>
        <p className="text-gray-500 text-center max-w-xs">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-900 px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <HardHat className="h-5 w-5 text-blue-200" />
            <span className="text-blue-200 text-sm">SiteLedger</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{project.project_name}</h1>
          <p className="text-blue-200 text-sm mt-1">
            Code: {project.project_code} · {project.owner_name}
          </p>
          {project.site_address && (
            <p className="text-blue-300 text-xs mt-1">{project.site_address}</p>
          )}
          <div className="mt-3">
            <StatusBadge status={project.project_status} />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-10">
        {/* Read-only notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 my-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">This is a read-only view. You cannot edit any data.</p>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Money Received</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{formatINR(stats.totalReceived)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Expenses Incurred</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatINR(stats.totalExpenses)}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Balance</p>
                <p className={['text-2xl font-bold mt-1', stats.balance >= 0 ? 'text-blue-700' : 'text-red-600'].join(' ')}>
                  {formatINR(stats.balance)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Received − Expenses</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Category Breakdown */}
        {Object.keys(stats.categoryBreakdown).length > 0 && (
          <Card className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-3">Expense Categories</h3>
            <div className="space-y-2">
              {Object.entries(stats.categoryBreakdown)
                .sort(([,a],[,b]) => b - a)
                .map(([cat, amt]) => {
                  const pct = stats.totalExpenses > 0 ? (amt / stats.totalExpenses * 100) : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">{cat}</span>
                        <span className="text-sm font-semibold">{formatINR(amt)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Income</h3>
          {income.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No income records</p>
          ) : (
            <div className="space-y-2">
              {income.slice(0, 10).map(item => (
                <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-green-700">{formatINR(item.amount)}</p>
                    <p className="text-xs text-gray-400">{item.payment_mode} · {formatDate(item.date)}</p>
                  </div>
                  {item.remarks && <p className="text-xs text-gray-500 truncate max-w-[120px]">{item.remarks}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Expenses</h3>
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No expense records</p>
          ) : (
            <div className="space-y-2">
              {expenses.slice(0, 10).map(item => (
                <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-red-600">{formatINR(item.amount)}</p>
                    <p className="text-xs text-gray-400">{item.category} · {formatDate(item.expense_date)}</p>
                    {item.vendor_name && <p className="text-xs text-gray-400">{item.vendor_name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by SiteLedger · Construction Finance Tracker
        </p>
      </div>
    </div>
  )
}
