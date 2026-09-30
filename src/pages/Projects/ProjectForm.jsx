import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useProjects } from '../../hooks/useProjects'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Input, Select, Textarea, AmountInput } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PROJECT_STATUSES } from '../../lib/constants'
import { todayInputDate, formatIndianAmount, parseIndianAmount } from '../../lib/formatters'

export function ProjectForm({ mode = 'create' }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const { createProject, updateProject, fetchProject, fetchProjects, loading } = useProjects()

  const {
    register, handleSubmit, reset, setValue, watch, control,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      project_status: 'Active',
      start_date: todayInputDate(),
      floor_areas: [],
      rate_per_sqft: ''
    }
  })

  // Auto-generate project code (e.g. PR01, PR02) on create
  useEffect(() => {
    if (mode === 'create') {
      fetchProjects().then(projects => {
        let nextNum = (projects?.length || 0) + 1
        const prNumbers = (projects || [])
          .map(p => {
            const match = p.project_code?.match(/^PR-?0*(\d+)$/i)
            return match ? parseInt(match[1], 10) : null
          })
          .filter(n => n !== null && !isNaN(n))

        if (prNumbers.length > 0) {
          nextNum = Math.max(Math.max(...prNumbers) + 1, nextNum)
        }
        const autoCode = `PR${String(nextNum).padStart(2, '0')}`
        setValue('project_code', autoCode, { shouldValidate: true })
      })
    }
  }, [mode, fetchProjects, setValue])

  const watchFloors = watch('number_of_floors')

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'floor_areas'
  })

  useEffect(() => {
    const floors = parseInt(watchFloors) || 0
    const currentCount = fields.length
    if (floors > currentCount) {
      for (let i = currentCount; i < floors; i++) {
        append({ floor_name: `Floor ${i + 1}`, area: '' })
      }
    } else if (floors < currentCount && floors >= 0) {
      for (let i = currentCount - 1; i >= floors; i--) {
        remove(i)
      }
    }
  }, [watchFloors, fields.length, append, remove])

  useEffect(() => {
    if (mode === 'edit' && id) {
      fetchProject(id).then(data => {
        if (data) {
          if (!data.floor_areas) data.floor_areas = []
          reset({
            ...data,
            rate_per_sqft: data.rate_per_sqft ? formatIndianAmount(data.rate_per_sqft) : ''
          })
        }
      })
    }
  }, [mode, id, reset, fetchProject])

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        total_area: data.total_area !== '' && data.total_area != null ? parseFloat(data.total_area) : null,
        number_of_floors: data.number_of_floors !== '' && data.number_of_floors != null ? parseInt(data.number_of_floors, 10) : null,
        rate_per_sqft: data.rate_per_sqft ? parseIndianAmount(data.rate_per_sqft) : null,
        start_date: data.start_date || null,
        owner_mobile: data.owner_mobile?.trim() || null,
        site_address: data.site_address?.trim() || null,
        notes: data.notes?.trim() || null
      }
      if (mode === 'create') {
        const project = await createProject(payload)
        toast.success('Project created successfully!')
        navigate(`/projects/${project.id}`, { replace: true })
      } else {
        await updateProject(id, payload)
        toast.success('Project updated successfully!')
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
        info={{
          title: mode === 'create' ? 'Create New Project' : 'Edit Project',
          description: 'Fill in this form to set up a new construction site or update its details.',
          points: [
            'Project Code & Name: Keep project codes short (like PR01, PR02) and name easy to identify.',
            'Owner / Client details: Save client name and phone number for quick access and WhatsApp reports.',
            'Site Address: Physical location of the construction site.',
            'Total Area & Rate (Optional): Enter built-up area (sq ft) and construction rate to auto-calculate the estimated project budget.'
          ]
        }}
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
              <Input
                label="Start Date"
                type="date"
                required
                {...register('start_date', { required: 'Start date is required' })}
                error={errors.start_date?.message}
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
            <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Area & Dimensions</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Total Area (sq ft)"
                  type="number"
                  placeholder="e.g. 1500"
                  {...register('total_area', { min: { value: 0, message: 'Must be positive' } })}
                  error={errors.total_area?.message}
                />
                <Controller
                  name="rate_per_sqft"
                  control={control}
                  rules={{
                    validate: (val) => {
                      if (!val) return true
                      const num = parseIndianAmount(val)
                      return num >= 0 || 'Must be positive'
                    }
                  }}
                  render={({ field: { value, onChange, onBlur } }) => (
                    <AmountInput
                      label="Rate of Construction (₹ / sq ft)"
                      placeholder="e.g. 1,500"
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      error={errors.rate_per_sqft?.message}
                      hint="Used to calculate estimated construction cost"
                    />
                  )}
                />
              </div>
              <Input
                label="Number of Floors"
                type="number"
                placeholder="e.g. 2"
                {...register('number_of_floors', {
                  min: { value: 0, message: 'Must be 0 or more' },
                  max: { value: 50, message: 'Max 50 floors supported' }
                })}
                error={errors.number_of_floors?.message}
              />

              {fields.length > 0 && (
                <div className="pt-2 space-y-3">
                  <label className="text-sm font-medium text-gray-700 block">Floor-wise Area (sq ft)</label>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3">
                      <div className="w-1/3">
                        <Input
                          placeholder="Floor Name"
                          {...register(`floor_areas.${index}.floor_name`)}
                        />
                      </div>
                      <div className="w-2/3">
                        <Input
                          type="number"
                          placeholder="Area in sq ft"
                          {...register(`floor_areas.${index}.area`)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
