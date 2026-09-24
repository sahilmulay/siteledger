import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Image, Calendar, Trash2, X, Plus } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Skeleton } from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export function SitePhotos() {
  const { id: projectId } = useParams()
  const { fetchProject } = useProjects()
  const [project, setProject] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  const loadPhotos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_photos')
        .select('*')
        .eq('project_id', projectId)
        .order('taken_at', { ascending: false })
      if (error) throw error
      setPhotos(data || [])
    } catch (err) {
      console.error(err)
    }
  }, [projectId])

  useEffect(() => {
    Promise.all([
      fetchProject(projectId),
      loadPhotos()
    ]).then(([proj]) => {
      setProject(proj)
      setLoading(false)
    })
  }, [projectId, fetchProject, loadPhotos])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    let successCount = 0
    for (const file of files) {
      try {
        const path = `site-photos/${projectId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: upErr } = await supabase.storage.from('project-files').upload(path, file)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(path)
        const takenAt = new Date().toISOString()
        const { error: dbErr } = await supabase.from('site_photos').insert({
          project_id: projectId,
          file_name: file.name,
          photo_url: publicUrl,
          storage_path: path,
          taken_at: takenAt
        })
        if (dbErr) throw dbErr
        successCount++
      } catch (err) {
        console.error(err)
        toast.error(`Failed: ${file.name}`)
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded!`)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    loadPhotos()
  }

  const handleDelete = async (photo) => {
    if (!window.confirm('Delete this photo?')) return
    try {
      await supabase.storage.from('project-files').remove([photo.storage_path])
      await supabase.from('site_photos').delete().eq('id', photo.id)
      toast.success('Photo deleted')
      loadPhotos()
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  // Group photos by human-readable date
  const grouped = photos.reduce((acc, p) => {
    const day = new Date(p.taken_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    if (!acc[day]) acc[day] = []
    acc[day].push(p)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Site Photos" backTo={`/projects/${projectId}`} />
        <PageWrapper>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        </PageWrapper>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Site Photos"
        subtitle={project?.project_name ? `${project.project_name} (${project.project_code})` : 'Site Progress'}
        backTo={`/projects/${projectId}`}
        rightAction={
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        }
      />

      <PageWrapper>
        <div className="space-y-4 pb-20">
          {/* Upload trigger */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-6 bg-white hover:border-pink-400 hover:text-pink-600 transition-colors"
          >
            <Image className="h-7 w-7 text-pink-500" />
            <span className="text-sm font-semibold text-gray-700">
              {uploading ? 'Uploading photos...' : 'Upload Site Progress Photos'}
            </span>
            <span className="text-xs text-gray-400">Select one or multiple photos</span>
          </button>

          {/* Photo gallery */}
          {photos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <Image className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">No site photos yet</p>
              <p className="text-xs text-gray-400 mt-1">Take or upload photos to record site progress</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([day, dayPhotos]) => (
                <div key={day} className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-pink-500" />
                    <p className="text-xs font-bold text-gray-700">{day}</p>
                    <span className="text-[11px] text-gray-400">({dayPhotos.length} photo{dayPhotos.length > 1 ? 's' : ''})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {dayPhotos.map(photo => (
                      <div key={photo.id} className="relative group aspect-square">
                        <img
                          src={photo.photo_url}
                          alt={photo.file_name}
                          className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setPreview(photo)}
                          loading="lazy"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(photo)
                          }}
                          className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg p-1.5 shadow-md transition-colors"
                          title="Delete photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 rounded-b-xl pointer-events-none">
                          <p className="text-[10px] text-white text-center font-medium">
                            {new Date(photo.taken_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageWrapper>

      {/* Lightbox Modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10"
            onClick={() => setPreview(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <div onClick={e => e.stopPropagation()} className="max-w-full max-h-full flex flex-col items-center">
            <img
              src={preview.photo_url}
              alt={preview.file_name}
              className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl"
            />
            <div className="text-white text-center mt-3 text-xs bg-black/40 px-3 py-1.5 rounded-full">
              📅 {new Date(preview.taken_at).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
