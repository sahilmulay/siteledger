import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { UploadCloud, File as FileIcon, Download, Trash2 } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Spinner'
import { formatDate } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function SitePlans() {
  const { id: projectId } = useParams()
  const { fetchProject } = useProjects()
  const [project, setProject] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

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
    }
  }, [projectId])

  useEffect(() => {
    Promise.all([
      fetchProject(projectId),
      loadPlans()
    ]).then(([proj]) => {
      setProject(proj)
      setLoading(false)
    })
  }, [projectId, fetchProject, loadPlans])

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
      toast.success('Site plan uploaded!')
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
      await supabase.storage.from('project-files').remove([plan.storage_path])
      await supabase.from('site_plans').delete().eq('id', plan.id)
      toast.success('Plan deleted')
      loadPlans()
    } catch (err) {
      toast.error('Failed to delete plan: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Site Plans" backTo={`/projects/${projectId}`} />
        <PageWrapper>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </PageWrapper>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Site Plans"
        subtitle={project?.project_name ? `${project.project_name} (${project.project_code})` : 'Project Plans'}
        backTo={`/projects/${projectId}`}
      />

      <PageWrapper>
        <div className="space-y-4 pb-20">
          {/* Upload card */}
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
              {uploading ? 'Uploading plan...' : 'Upload Site Plan'}
            </span>
            <span className="text-xs text-gray-400">Supports PDF, DWG, DXF, PNG, JPG</span>
          </button>

          {/* Plan list */}
          {plans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <FileIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">No site plans uploaded yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload blueprints, layout drawings, or PDFs above</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                Uploaded Plans ({plans.length})
              </p>
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
    </div>
  )
}
