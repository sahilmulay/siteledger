import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useProjects } from '../../hooks/useProjects'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PROJECT_STATUSES } from '../../lib/constants'

export function ProjectForm({ mode = 'create' }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const { createProject, updateProject, fetchProject, loading } = useProjects()

  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      project_status: 'Active'
    }
  })

  useEffect(() => {
    if (mode === 'edit' && id) {
      fetchProject(id).then(data => {
        if (data) reset(data)
      })
    }
  }, [mode, id])

  const onSubmit = async (data) => {
    try {
      if (mode === 'create') {
        const project = await createProject(data)
        toast.success('Project created!')
        navigate(`/projects/${project.id}`, { replace: true })
      } else {
        await updateProject(id, data)
        toast.success('Project updated!')
        navigate(`/projects/${id}`, { replace: true })
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save project')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={mode === 'create' ? 'New Project' : 'Edit Project'}
        backTo="/projects"
      />
      <PageWrapper>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Project Details</h3>
            <div className="space-y-4">
              <Input
                label="Project Code"
                placeholder="e.g. PR001, DB001"
                required
                {...register('project_code', {
                  required: 'Project code is required',
                  pattern: { value: /^[A-Za-z0-9_-]+$/, message: 'Only letters, numbers, and dashes allowed' },
                  maxLength: { value: 10, message: 'Max 10 characters' }
                })}
                error={errors.project_code?.message}
                hint="Short unique code (e.g. PR001)"
              />
              <Input
                label="Project Name"
                placeholder="e.g. Patil Residence"
                required
                {...register('project_name', { required: 'Project name is required', maxLength: { value: 100, message: 'Max 100 characters' } })}
                error={errors.project_name?.message}
              />
              <Select
                label="Status"
                required
                {...register('project_status', { required: true })}
                error={errors.project_status?.message}
              >
                {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Owner Details</h3>
            <div className="space-y-4">
              <Input
                label="Owner Name"
                placeholder="e.g. Rajesh Patil"
                required
                {...register('owner_name', { required: 'Owner name is required' })}
                error={errors.owner_name?.message}
              />
              <Input
                label="Owner Mobile"
                type="tel"
                placeholder="e.g. 9876543210"
                {...register('owner_mobile', {
                  validate: (v) => {
                    if (!v) return true
                    const digits = v.replace(/\D/g, '')
                    return (digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))) || 'Enter a valid 10-digit mobile number'
                  }
                })}
                error={errors.owner_mobile?.message}
              />
              <Textarea
                label="Site Address"
                placeholder="Full site address"
                rows={3}
                {...register('site_address')}
              />
            </div>
          </Card>

          <div className="flex gap-3 pb-4">
            <Button
              type="button" variant="secondary" fullWidth
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={isSubmitting}>
              {mode === 'create' ? 'Create Project' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </PageWrapper>
    </div>
  )
}
