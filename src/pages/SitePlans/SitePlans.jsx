import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  UploadCloud, File as FileIcon, Download, Trash2,
  Plus, Edit2, Calculator, CheckCircle2, TrendingUp, AlertCircle, Info
} from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Input, AmountInput } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { InfoButton } from '../../components/ui/InfoButton'
import { Skeleton } from '../../components/ui/Spinner'
import { formatDate, formatINR, formatIndianAmount, parseIndianAmount } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function SitePlans() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { fetchProject, updateProject, fetchProjectStats } = useProjects()

  const [project, setProject] = useState(null)
  const [stats, setStats] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  // Extra work modal state
  const [showWorkModal, setShowWorkModal] = useState(false)
  const [editingWork, setEditingWork] = useState(null)
  const [workTypeInput, setWorkTypeInput] = useState('')
  const [costInput, setCostInput] = useState('')
  const [savingWork, setSavingWork] = useState(false)

  // Rate of construction modal state
  const [showRateModal, setShowRateModal] = useState(false)
  const [rateInput, setRateInput] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  // Formula info modal state
  const [showFormulaModal, setShowFormulaModal] = useState(false)

  const loadPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_plans')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPlans(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load site plans')
    }
  }, [projectId])

  const loadData = useCallback(async () => {
    try {
      const [proj, st] = await Promise.all([
        fetchProject(projectId),
        fetchProjectStats(projectId, true),
        loadPlans()
      ])
      setProject(proj)
      setStats(st)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }, [projectId, fetchProject, fetchProjectStats, loadPlans])

  useEffect(() => {
    loadData()
  }, [loadData])

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
      const { error: dbErr } = await supabase.from('site_plans').insert({
        project_id: projectId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: ext.replace('.', '').toUpperCase(),
        storage_path: path
      })
      if (dbErr) throw dbErr
      toast.success('Site plan uploaded successfully!')
      loadPlans()
    } catch (err) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete "${plan.file_name}"?`)) return
    try {
      const { error: storageErr } = await supabase.storage.from('project-files').remove([plan.storage_path])
      if (storageErr) throw new Error(storageErr.message || 'Storage deletion failed')
      const { error: dbErr } = await supabase.from('site_plans').delete().eq('id', plan.id)
      if (dbErr) throw new Error(dbErr.message || 'Database deletion failed')
      toast.success('Site plan deleted successfully!')
      loadPlans()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete plan: ' + err.message)
    }
  }

  // --- Extra Work Handlers ---
  const handleSaveExtraWork = async (e) => {
    e.preventDefault()
    if (!workTypeInput.trim()) {
      toast.error('Please enter the work type')
      return
    }
    const costNum = parseIndianAmount(costInput)
    if (isNaN(costNum) || costNum <= 0) {
      toast.error('Please enter a valid cost')
      return
    }

    setSavingWork(true)
    try {
      const currentList = Array.isArray(project?.extra_works) ? [...project.extra_works] : []
      let updatedList
      if (editingWork) {
        updatedList = currentList.map(item =>
          (item.id === editingWork.id || item === editingWork)
            ? { ...item, work_type: workTypeInput.trim(), cost: costNum }
            : item
        )
      } else {
        updatedList = [
          ...currentList,
          {
            id: Date.now().toString(),
            work_type: workTypeInput.trim(),
            cost: costNum
          }
        ]
      }

      await updateProject(projectId, { extra_works: updatedList })
      setProject(prev => ({ ...prev, extra_works: updatedList }))
      setShowWorkModal(false)
      setEditingWork(null)
      setWorkTypeInput('')
      setCostInput('')
      toast.success(editingWork ? 'Extra work updated!' : 'Extra work added successfully!')
    } catch (err) {
      toast.error('Failed to save extra work: ' + err.message)
    } finally {
      setSavingWork(false)
    }
  }

  const handleDeleteWork = async (targetIdOrIndex) => {
    if (!window.confirm('Are you sure you want to remove this extra work?')) return
    try {
      const currentList = Array.isArray(project?.extra_works) ? [...project.extra_works] : []
      const updatedList = currentList.filter((item, idx) => (item.id ? item.id !== targetIdOrIndex : idx !== targetIdOrIndex))
      await updateProject(projectId, { extra_works: updatedList })
      setProject(prev => ({ ...prev, extra_works: updatedList }))
      toast.success('Extra work removed')
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  // --- Rate per sq ft Handler ---
  const handleSaveRate = async (e) => {
    e.preventDefault()
    const rateNum = parseIndianAmount(rateInput)
    if (isNaN(rateNum) || rateNum < 0) {
      toast.error('Please enter a valid rate')
      return
    }
    setSavingRate(true)
    try {
      await updateProject(projectId, { rate_per_sqft: rateNum || null })
      setProject(prev => ({ ...prev, rate_per_sqft: rateNum || null }))
      setShowRateModal(false)
      toast.success('Construction rate updated!')
    } catch (err) {
      toast.error('Failed to update rate: ' + err.message)
    } finally {
      setSavingRate(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Site Details" backTo={`/projects/${projectId}`} />
        <PageWrapper>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </PageWrapper>
      </div>
    )
  }

  // Calculations
  const totalArea = Number(project?.total_area) || 0
  const ratePerSqft = Number(project?.rate_per_sqft) || 0
  const baseConstructionCost = totalArea * ratePerSqft

  const extraWorks = Array.isArray(project?.extra_works) ? project.extra_works : []
  const totalExtraWorkCost = extraWorks.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0)

  const totalEstimatedCost = baseConstructionCost + totalExtraWorkCost
  const amountReceived = Number(stats?.totalReceived) || 0
  const amountDue = totalEstimatedCost - amountReceived

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Site Details"
        subtitle={project?.project_name ? `${project.project_name} (${project.project_code})` : 'Project Plans'}
        backTo={`/projects/${projectId}`}
        info={{
          title: 'Site Details & Plans',
          description: 'Manage construction budgeting, rate per sq ft, extra work charges, and architectural blueprint files.',
          points: [
            'Total Construction Cost: Live budget calculation based on Total Area × Rate + Extra Work.',
            'Extra Work: Add and price additional tasks requested by the client.',
            'Site Area & Floors: Review plot and floor area breakdown.',
            'Site Plans & Blueprints: Upload layout drawings and PDF blueprints to view directly on site.'
          ]
        }}
      />

      <PageWrapper>
        <div className="space-y-4 pb-20">

          {/* 1. Total Estimated Construction Cost & Financial Summary Card */}
          <Card padding="p-4" className="bg-white border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs uppercase tracking-wider text-gray-700 font-bold">
                  Total Construction Cost
                </span>
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(true)}
                  className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-full transition-all focus:outline-none"
                  title="View Calculation Formulas"
                  aria-label="View calculation formulas"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => {
                  setRateInput(formatIndianAmount(project?.rate_per_sqft || ''))
                  setShowRateModal(true)
                }}
                className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium px-2.5 py-1 rounded-lg border border-gray-200 flex items-center gap-1 transition-colors"
                title="Edit Rate of Construction"
              >
                <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                {ratePerSqft > 0 ? `Rate: ₹${ratePerSqft}/sq ft` : 'Set Rate / sq ft'}
              </button>
            </div>

            <div className="mb-3">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                {formatINR(totalEstimatedCost)}
              </div>
            </div>

            {/* Formula Breakdown Card */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80 space-y-2 text-xs mb-3">
              <div className="flex items-center justify-between text-gray-600">
                <span>Base Construction</span>
                <span className="font-semibold text-gray-900">{formatINR(baseConstructionCost)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>
                  Estimated Extra Work ({extraWorks.length} {extraWorks.length === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold text-indigo-600">+ {formatINR(totalExtraWorkCost)}</span>
              </div>
              <div className="border-t border-gray-200 pt-1.5 flex items-center justify-between text-sm font-bold">
                <span className="text-gray-900">Total Estimated Cost</span>
                <span className="text-blue-600">{formatINR(totalEstimatedCost)}</span>
              </div>
            </div>

            {/* Financial Status: Amount Received & Amount Due */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                onClick={() => navigate(`/projects/${projectId}/income`)}
                className="bg-emerald-50/70 hover:bg-emerald-100/70 transition-colors cursor-pointer border border-emerald-200/80 rounded-xl p-2.5"
                title="View Income Entries"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-800 font-semibold">Amount Received</span>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <span className="text-base font-bold text-emerald-700 block mt-0.5">{formatINR(amountReceived)}</span>
                <span className="text-[10px] text-emerald-600/80 block mt-0.5">Total Income Collected</span>
              </div>

              <div className={`rounded-xl p-2.5 border ${
                amountDue > 0
                  ? 'bg-rose-50/70 border-rose-200/80'
                  : 'bg-blue-50/70 border-blue-200/80'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${
                    amountDue > 0 ? 'text-rose-800' : 'text-blue-800'
                  }`}>
                    {amountDue > 0 ? 'Amount Due' : 'Balance Settled'}
                  </span>
                  {amountDue > 0 ? (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  )}
                </div>
                <span className={`text-base font-bold block mt-0.5 ${
                  amountDue > 0 ? 'text-rose-700' : 'text-blue-700'
                }`}>
                  {amountDue > 0 ? formatINR(amountDue) : '₹0 (Paid)'}
                </span>
                <span className={`text-[10px] block mt-0.5 ${
                  amountDue > 0 ? 'text-rose-600/80' : 'text-blue-600/80'
                }`}>
                  {amountDue > 0 ? 'Estimated Outstanding' : 'All Dues Cleared'}
                </span>
              </div>
            </div>
          </Card>

          {/* 2. Estimated Charges for Extra Work Section */}
          <Card padding="p-4" className="border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-gray-900 text-sm">Estimated Charges for Extra Work</h3>
                <InfoButton
                  title="Extra Work Charges"
                  description="Record any additional jobs or modifications requested by the client that are outside the original contract."
                  points={[
                    'Add items like Compound Wall, False Ceiling, Underground Water Tank, Elevation, etc.',
                    'Enter the agreed cost for each job.',
                    'The sum of all extra work is automatically added to Total Construction Cost.'
                  ]}
                  size="xs"
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingWork(null)
                  setWorkTypeInput('')
                  setCostInput('')
                  setShowWorkModal(true)
                }}
                className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0"
              >
                <Plus className="h-4 w-4" /> Add Work
              </Button>
            </div>

            {extraWorks.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/60">
                <p className="text-xs font-semibold text-gray-700">No extra work added yet</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
                  Click "+ Add Work" to add extra construction charges like Compound Wall, Water Tank, Elevation, etc.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {extraWorks.map((work, idx) => (
                  <div
                    key={work.id || idx}
                    className="p-2.5 bg-gray-50 hover:bg-indigo-50/40 border border-gray-100 rounded-xl flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md flex-shrink-0">
                        Work {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-800 truncate">
                        {work.work_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-bold text-gray-900 mr-1">{formatINR(work.cost)}</span>
                      <button
                        onClick={() => {
                          setEditingWork(work)
                          setWorkTypeInput(work.work_type)
                          setCostInput(formatIndianAmount(work.cost))
                          setShowWorkModal(true)
                        }}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-indigo-600 transition-colors"
                        title="Edit Work"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWork(work.id || idx)}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete Work"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2 px-1 border-t border-gray-100 text-xs font-semibold">
                  <span className="text-gray-600">Total Extra Work:</span>
                  <span className="text-indigo-700 font-bold text-sm">{formatINR(totalExtraWorkCost)}</span>
                </div>
              </div>
            )}
          </Card>

          {/* 3. Site Area Overview Card */}
          {project && (project.total_area || (project.floor_areas && project.floor_areas.length > 0)) && (
            <Card padding="p-4" className="bg-indigo-50/50 border-indigo-100">
              <div className="flex items-center justify-between mb-3 border-b border-indigo-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-indigo-900 text-sm">Site Area Overview</h3>
                  <InfoButton
                    title="Site Area & Floors"
                    description="Displays the total built-up construction area and individual floor areas for this site."
                    points={[
                      'Total Area (sq ft) is multiplied by Rate per sq ft to calculate the Base Construction Cost.',
                      'Floor areas can be adjusted anytime from Edit Project.'
                    ]}
                    size="xs"
                  />
                </div>
                {project.total_area && (
                  <span className="text-xs font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-full shadow-sm">
                    Total: {project.total_area} sq ft
                  </span>
                )}
              </div>
              
              {project.floor_areas && project.floor_areas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-indigo-800/70 uppercase tracking-wide">Floor Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    {project.floor_areas.map((f, i) => (
                      <div key={i} className="bg-white rounded-lg p-2.5 shadow-sm border border-indigo-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 truncate mr-2">{f.floor_name || `Floor ${i+1}`}</span>
                        <span className="text-xs font-bold text-indigo-700 whitespace-nowrap">{f.area} sq ft</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 4. Upload Site Plan Card */}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-6 bg-white hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <UploadCloud className="h-7 w-7 text-blue-500" />
            <span className="text-sm font-semibold text-gray-700">
              {uploading ? 'Uploading plan...' : 'Upload Site Detail'}
            </span>
            <span className="text-xs text-gray-400">Supports PDF, DWG, DXF, PNG, JPG</span>
          </button>

          {/* 5. Uploaded Plans List */}
          {plans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <FileIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">No site plans uploaded yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload blueprints, layout drawings, or PDFs above</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 px-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Uploaded Plans ({plans.length})
                </p>
                <InfoButton
                  title="Site Plans & Blueprints"
                  description="Store and view architectural blueprints, floor layouts, and approval PDFs."
                  points={[
                    'Upload PDF documents or images directly from your phone.',
                    'Tap any document to open and view high resolution plans on site.',
                    'Helps site supervisors and contractors verify dimensions anytime.'
                  ]}
                  size="xs"
                />
              </div>
              {plans.map(plan => (
                <Card key={plan.id} padding="p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{plan.file_name}</p>
                      <p className="text-xs text-gray-400">
                        <span className="font-semibold text-blue-600">{plan.file_type}</span> · {formatDate(plan.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a
                        href={plan.file_url}
                        onClick={async (e) => {
                          e.preventDefault()
                          try {
                            const { data } = await supabase.storage.from('project-files').createSignedUrl(plan.storage_path, 3600)
                            if (data?.signedUrl) {
                              window.open(data.signedUrl, '_blank')
                              return
                            }
                          } catch (err) {
                            console.error('Error generating signed URL:', err)
                          }
                          window.open(plan.file_url, '_blank')
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
                        title="Download / View"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(plan)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageWrapper>

      {/* Extra Work Modal */}
      <Modal
        isOpen={showWorkModal}
        onClose={() => {
          setShowWorkModal(false)
          setEditingWork(null)
        }}
        title={editingWork ? 'Edit Extra Work' : 'Add Extra Work'}
        size="md"
      >
        <form onSubmit={handleSaveExtraWork} className="space-y-4">
          <Input
            label="Work Type / Description"
            placeholder="e.g. Compound Wall, Water Tank, Elevation..."
            value={workTypeInput}
            onChange={(e) => setWorkTypeInput(e.target.value)}
            required
            autoFocus
          />
          <AmountInput
            label="Cost of Work (₹)"
            placeholder="e.g. 50,000"
            value={costInput}
            onChange={(val) => setCostInput(val)}
            required
          />
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => {
                setShowWorkModal(false)
                setEditingWork(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              loading={savingWork}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {editingWork ? 'Update Work' : 'Add Work'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rate of Construction Modal */}
      <Modal
        isOpen={showRateModal}
        onClose={() => setShowRateModal(false)}
        title="Rate of Construction"
        size="sm"
      >
        <form onSubmit={handleSaveRate} className="space-y-4">
          <AmountInput
            label="Rate per sq ft (₹)"
            placeholder="e.g. 1,500"
            value={rateInput}
            onChange={(val) => setRateInput(val)}
            hint="Used to calculate base construction cost = Total Area × Rate"
            autoFocus
          />
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setShowRateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              loading={savingRate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Rate
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Formula Calculation Info Modal */}
      <Modal
        isOpen={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        title="Cost Calculation Formulas"
        size="lg"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <p className="text-xs text-gray-500">
            Below is the complete step-by-step breakdown of how all totals, extra works, and outstanding balances are calculated for this project:
          </p>

          {/* Formula 1: Base Construction Cost */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700">
                1. Base Construction Cost
              </span>
              <span className="font-bold text-gray-900">{formatINR(baseConstructionCost)}</span>
            </div>
            <div className="text-xs font-mono bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-blue-700 font-semibold">
              Base Cost = Total Area (sq ft) × Rate per sq ft
            </div>
            <div className="text-xs text-gray-600 flex items-center justify-between pt-1">
              <span>Current Values:</span>
              <span className="font-medium text-gray-800">
                {totalArea > 0 ? `${totalArea.toLocaleString('en-IN')} sq ft` : '0 sq ft'} × {ratePerSqft > 0 ? `₹${ratePerSqft.toLocaleString('en-IN')}/sq ft` : '₹0/sq ft'} = {formatINR(baseConstructionCost)}
              </span>
            </div>
          </div>

          {/* Formula 2: Estimated Extra Work Charges */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700">
                2. Extra Work Charges
              </span>
              <span className="font-bold text-indigo-700">+{formatINR(totalExtraWorkCost)}</span>
            </div>
            <div className="text-xs font-mono bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-indigo-700 font-semibold">
              Extra Work = Sum of all individual extra work items
            </div>
            <div className="text-xs text-gray-600 pt-1 space-y-1">
              <div className="flex items-center justify-between">
                <span>Items Added:</span>
                <span className="font-medium text-gray-800">
                  {extraWorks.length} {extraWorks.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              {extraWorks.length > 0 ? (
                <div className="bg-white rounded-lg p-2 border border-gray-200 divide-y divide-gray-100 max-h-32 overflow-y-auto">
                  {extraWorks.map((w, idx) => (
                    <div key={w.id || idx} className="py-1 flex items-center justify-between text-xs">
                      <span className="text-gray-700 truncate pr-2">• {w.type}</span>
                      <span className="font-medium text-gray-900 whitespace-nowrap">{formatINR(Number(w.cost) || 0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">No extra work items added yet.</p>
              )}
            </div>
          </div>

          {/* Formula 3: Total Estimated Construction Cost */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-blue-900">
                3. Total Construction Cost
              </span>
              <span className="font-extrabold text-blue-700 text-base">{formatINR(totalEstimatedCost)}</span>
            </div>
            <div className="text-xs font-mono bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-800 font-semibold">
              Total Cost = Base Construction Cost + Extra Work Charges
            </div>
            <div className="text-xs text-blue-950 flex items-center justify-between pt-1">
              <span>Calculation:</span>
              <span className="font-medium">
                {formatINR(baseConstructionCost)} + {formatINR(totalExtraWorkCost)} = {formatINR(totalEstimatedCost)}
              </span>
            </div>
          </div>

          {/* Formula 4: Amount Received */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                4. Amount Received (Client Payments)
              </span>
              <span className="font-extrabold text-emerald-700 text-base">{formatINR(amountReceived)}</span>
            </div>
            <div className="text-xs font-mono bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 font-semibold">
              Amount Received = Total of all recorded income entries
            </div>
            <div className="text-xs text-emerald-950 flex items-center justify-between pt-1">
              <span>Income Collected:</span>
              <span className="font-medium">{formatINR(amountReceived)}</span>
            </div>
          </div>

          {/* Formula 5: Amount Due (Outstanding) */}
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${
            amountDue > 0 ? 'border-rose-200 bg-rose-50/50' : 'border-gray-200 bg-gray-50/70'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold text-xs uppercase tracking-wider ${
                amountDue > 0 ? 'text-rose-900' : 'text-gray-700'
              }`}>
                5. Amount Due (Estimated Outstanding)
              </span>
              <span className={`font-extrabold text-base ${
                amountDue > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {amountDue > 0 ? formatINR(amountDue) : '₹0 (All Cleared)'}
              </span>
            </div>
            <div className={`text-xs font-mono bg-white px-2.5 py-1.5 rounded-lg border font-semibold ${
              amountDue > 0 ? 'border-rose-200 text-rose-800' : 'border-gray-200 text-gray-800'
            }`}>
              Amount Due = Total Construction Cost - Amount Received
            </div>
            <div className="text-xs text-gray-700 flex items-center justify-between pt-1">
              <span>Calculation:</span>
              <span className="font-medium">
                {formatINR(totalEstimatedCost)} - {formatINR(amountReceived)} = {amountDue > 0 ? formatINR(amountDue) : '₹0'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setShowFormulaModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
