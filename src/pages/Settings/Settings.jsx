import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, HardHat, Shield, Building2, Save } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

export function Settings() {
  const { user, firmName, updateFirmName, signOut } = useAuth()
  const navigate = useNavigate()
  const [currentFirmName, setCurrentFirmName] = useState(firmName || '')
  const [savingFirm, setSavingFirm] = useState(false)
  const [signOutDialog, setSignOutDialog] = useState(false)
  const [loading, setLoading] = useState(false)

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
        {/* Profile */}
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
              hint="This name replaces SiteLedger in your header and reports"
            />
            <Button type="submit" size="sm" loading={savingFirm} className="gap-2">
              <Save className="h-4 w-4" /> Save Firm Name
            </Button>
          </form>
        </Card>

        {/* App Info */}
        <Card className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center">
              <HardHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">SiteLedger</p>
              <p className="text-xs text-gray-400">v1.0.0 · Construction Finance</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>✓ Project-wise income & expense tracking</p>
            <p>✓ Bill image uploads</p>
            <p>✓ PDF report generation</p>
            <p>✓ Owner transparency portal</p>
            <p>✓ Offline-capable PWA</p>
          </div>
        </Card>

        {/* Security */}
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-blue-700" />
            <h3 className="font-semibold text-gray-700 text-sm">Security & Privacy</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>✓ All data secured with Row Level Security</p>
            <p>✓ Your data is isolated from other users</p>
            <p>✓ Owner portal is read-only</p>
            <p>✓ Hosted on Supabase (EU-West)</p>
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
