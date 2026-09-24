import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Wallet, ReceiptText,
  Plus, Edit2, FileText, Image, UploadCloud, X, Download,
  File as FileIcon, Trash2, Calendar
} from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { useIncome } from '../../hooks/useIncome'
import { useExpenses } from '../../hooks/useExpenses'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { formatINR, formatDate } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── Clickable Stat Card ─────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'text-left w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100',
        onClick ? 'active:scale-95 transition-transform cursor-pointer' : ''
      ].join(' ')}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={['w-9 h-9 rounded-xl flex items-center justify-center', color].join(' ')}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </button>
  )
}

// ── Site Plans Tab ─────────────────────────────────────────
function SitePlansTab({ projectId }) {
  const [plans, setPlans] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const loadPlans = useCallback(async () => {
    const { data } = await supabase
      .from('site_plans')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    setPlans(data || [])
  }, [projectId])

  useEffect(() => { loadPlans() }, [loadPlans])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['.pdf', '.dwg', '.dxf', '.png', '.jpg', '.jpeg']
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowed.includes(ext)) {
      toast.error('Only PDF, DWG, DXF, PNG, JPG files are allowed')
      return
    }
    setUploading(true)
    try {
      const path = `site-plans/${projectId}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('project-files').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(path)
      await supabase.from('site_plans').insert({
        project_id: projectId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: ext.replace('.', '').toUpperCase(),
        storage_path: path
      })
      toast.success('Plan uploaded!')
      loadPlans()
    } catch (err) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete "${plan.file_name}"?`)) return
    await supabase.storage.from('project-files').remove([plan.storage_path])
    await supabase.from('site_plans').delete().eq('id', plan.id)
    toast.success('Plan deleted')
    loadPlans()
  }

  return (
    <div className="space-y-3 pb-32">
      {/* Upload button */}
      <input ref={fileRef} type="file" accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg" className="hidden" onChange={handleUpload} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        <UploadCloud className="h-5 w-5" />
        {uploading ? 'Uploading...' : 'Upload Site Plan (PDF, DWG, PNG…)'}
      </button>

      {plans.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">No site plans uploaded yet</p>
      ) : (
        plans.map(plan => (
          <Card key={plan.id} padding="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{plan.file_name}</p>
                <p className="text-xs text-gray-400">{plan.file_type} · {formatDate(plan.created_at)}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <a
                  href={plan.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Download / View"
                >
                  <Download className="h-4 w-4 text-gray-500" />
                </a>
                <button
                  onClick={() => handleDelete(plan)}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

// ── Site Photos Tab ────────────────────────────────────────
function SitePhotosTab({ projectId }) {
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  const loadPhotos = useCallback(async () => {
    const { data } = await supabase
      .from('site_photos')
      .select('*')
      .eq('project_id', projectId)
      .order('taken_at', { ascending: false })
    setPhotos(data || [])
  }, [projectId])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    let successCount = 0
    for (const file of files) {
      try {
        const path = `site-photos/${projectId}/${Date.now()}_${file.name}`
        const { error: upErr } = await supabase.storage.from('project-files').upload(path, file)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(path)
        const takenAt = new Date().toISOString()
        await supabase.from('site_photos').insert({
          project_id: projectId,
          file_name: file.name,
          photo_url: publicUrl,
          storage_path: path,
          taken_at: takenAt
        })
        successCount++
      } catch (err) {
        toast.error(`Failed: ${file.name}`)
      }
    }
    if (successCount > 0) toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded!`)
    setUploading(false)
    fileRef.current.value = ''
    loadPhotos()
  }

  const handleDelete = async (photo) => {
    if (!window.confirm('Delete this photo?')) return
    await supabase.storage.from('project-files').remove([photo.storage_path])
    await supabase.from('site_photos').delete().eq('id', photo.id)
    toast.success('Photo deleted')
    loadPhotos()
  }

  // Group photos by date
  const grouped = photos.reduce((acc, p) => {
    const day = new Date(p.taken_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    if (!acc[day]) acc[day] = []
    acc[day].push(p)
    return acc
  }, {})

  return (
    <div className="pb-32">
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors mb-4"
      >
        <Image className="h-5 w-5" />
        {uploading ? 'Uploading...' : 'Add Site Photos'}
      </button>

      {photos.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">No site photos yet. Start documenting progress!</p>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([day, dayPhotos]) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <p className="text-xs font-semibold text-gray-500">{day}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {dayPhotos.map(photo => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.photo_url}
                      alt={photo.file_name}
                      className="w-full aspect-square object-cover rounded-xl cursor-pointer"
                      onClick={() => setPreview(photo)}
                    />
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(photo)}
                        className="bg-red-500 text-white rounded-lg p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-0.5 text-center truncate">
                      {new Date(photo.taken_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo lightbox preview */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button className="absolute top-4 right-4 text-white" onClick={() => setPreview(null)}>
            <X className="h-6 w-6" />
          </button>
          <div onClick={e => e.stopPropagation()} className="max-w-full max-h-full">
            <img src={preview.photo_url} alt={preview.file_name} className="max-w-full max-h-[80vh] rounded-xl object-contain" />
            <p className="text-white text-center text-xs mt-2">
              {new Date(preview.taken_at).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Overview Tab ───────────────────────────────────────────
function OverviewTab({ project, stats, navigate, id, onTabSwitch }) {
  const balance = (stats?.totalReceived || 0) - (stats?.totalExpenses || 0)
  const [planCount, setPlanCount] = useState(0)
  const [photoCount, setPhotoCount] = useState(0)

  useEffect(() => {
    supabase.from('site_plans').select('id', { count: 'exact', head: true }).eq('project_id', id)
      .then(({ count }) => setPlanCount(count || 0))
    supabase.from('site_photos').select('id', { count: 'exact', head: true }).eq('project_id', id)
      .then(({ count }) => setPhotoCount(count || 0))
  }, [id])

  return (
    <div className="pb-32">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard
          label="Total Received"
          value={formatINR(stats?.totalReceived)}
          icon={TrendingUp}
          color="bg-green-500"
          onClick={() => navigate(`/projects/${id}/income`)}
        />
        <StatCard
          label="Total Expenses"
          value={formatINR(stats?.totalExpenses)}
          icon={TrendingDown}
          color="bg-red-500"
          onClick={() => navigate(`/projects/${id}/expenses`)}
        />
        <StatCard
          label="Current Balance"
          value={formatINR(balance)}
          icon={Wallet}
          color={balance >= 0 ? 'bg-blue-600' : 'bg-orange-500'}
        />
        <StatCard
          label="Expense Entries"
          value={stats?.expenseCount || 0}
          icon={ReceiptText}
          color="bg-purple-500"
          sub={stats?.lastTransactionDate ? `Last: ${formatDate(stats.lastTransactionDate)}` : 'No transactions'}
          onClick={() => navigate(`/projects/${id}/expenses`)}
        />
        <StatCard
          label="Site Plans"
          value={planCount}
          icon={FileIcon}
          color="bg-sky-500"
          sub={planCount === 0 ? 'Tap to upload' : `${planCount} file${planCount !== 1 ? 's' : ''}`}
          onClick={() => onTabSwitch(1)}
        />
        <StatCard
          label="Site Photos"
          value={photoCount}
          icon={Image}
          color="bg-pink-500"
          sub={photoCount === 0 ? 'Tap to add' : `${photoCount} photo${photoCount !== 1 ? 's' : ''}`}
          onClick={() => onTabSwitch(2)}
        />
      </div>

      {/* Expense Breakdown */}
      {(stats?.totalExpenses || 0) > 0 && (
        <Card className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Expense Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(stats?.categoryBreakdown || {})
              .filter(([k]) => k && k !== 'undefined')
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amt]) => {
                const pct = stats.totalExpenses > 0 ? (amt / stats.totalExpenses * 100) : 0
                const colors = ['bg-indigo-500', 'bg-amber-500', 'bg-blue-400', 'bg-pink-400', 'bg-teal-400', 'bg-orange-400']
                const colorIdx = Math.abs(cat.charCodeAt(0)) % colors.length
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">{cat}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatINR(amt)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={['h-2 rounded-full', colors[colorIdx]].join(' ')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────
const TABS = ['Overview', 'Site Plans', 'Photos']

export function ProjectDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchProject, fetchProjectStats } = useProjects()
  const [project, setProject] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [proj, s] = await Promise.all([
        fetchProject(id),
        fetchProjectStats(id)
      ])
      setProject(proj)
      setStats(s)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Loading..." backTo="/projects" />
        <PageWrapper>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </PageWrapper>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={project.project_name}
        subtitle={`${project.project_code} · ${project.owner_name}`}
        backTo="/projects"
        rightAction={
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/projects/${id}/reports`)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              title="PDF Report"
            >
              <FileText className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              title="Edit Project"
            >
              <Edit2 className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        }
      />

      <PageWrapper>
        {/* Status & address */}
        <div className="flex items-center gap-2 mb-4">
          <StatusBadge status={project.project_status} />
          {project.site_address && (
            <span className="text-xs text-gray-400 truncate">{project.site_address}</span>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={[
                'flex-1 text-xs font-semibold py-2 rounded-xl transition-all',
                activeTab === i
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              ].join(' ')}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 0 && <OverviewTab project={project} stats={stats} navigate={navigate} id={id} onTabSwitch={setActiveTab} />}
        {activeTab === 1 && <SitePlansTab projectId={id} />}
        {activeTab === 2 && <SitePhotosTab projectId={id} />}
      </PageWrapper>

      {/* Sticky bottom action buttons */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate(`/projects/${id}/income/new`)}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold rounded-2xl py-3.5 shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Income
          </button>
          <button
            onClick={() => navigate(`/projects/${id}/expenses/new`)}
            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-semibold rounded-2xl py-3.5 shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>
    </div>
  )
}
