import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, Share2, Copy, Download, ExternalLink, Check } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { useAuth } from '../../contexts/AuthContext'
import { useIncome } from '../../hooks/useIncome'
import { useExpenses } from '../../hooks/useExpenses'
import { generateProjectPDF } from '../../lib/pdfReport'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { formatINR, formatDate } from '../../lib/formatters'
import toast from 'react-hot-toast'

export function ProjectReports() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { firmName } = useAuth()
  const { fetchProject, fetchProjectStats } = useProjects()
  const { fetchIncome } = useIncome()
  const { fetchExpenses } = useExpenses()

  const [project, setProject] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [sharePdfLoading, setSharePdfLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchProject(projectId),
      fetchProjectStats(projectId)
    ]).then(([proj, s]) => {
      setProject(proj)
      setStats(s)
      setLoading(false)
    })
  }, [projectId])

  const shareLink = project?.share_token
    ? `${window.location.origin}/share/${project.share_token}`
    : ''

  const handleCopyLink = () => {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    toast.success('Share link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadPDF = async () => {
    if (!project || !stats) return
    setPdfLoading(true)
    try {
      // Fetch full history for PDF (up to 500 rows)
      const [incRes, expRes] = await Promise.all([
        fetchIncome(projectId, { limit: 500 }),
        fetchExpenses(projectId, { limit: 500 })
      ])
      await generateProjectPDF({
        project,
        stats: {
          ...stats,
          balance: (stats.totalReceived || 0) - (stats.totalExpenses || 0)
        },
        income: incRes.data,
        expenses: expRes.data,
        firmName,
        save: true
      })
      toast.success('PDF downloaded!')
    } catch (err) {
      toast.error('Failed to generate PDF')
      console.error(err)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleSharePDF = async () => {
    if (!project || !stats) return
    setSharePdfLoading(true)
    try {
      const [incRes, expRes] = await Promise.all([
        fetchIncome(projectId, { limit: 500 }),
        fetchExpenses(projectId, { limit: 500 })
      ])
      const { file, filename } = await generateProjectPDF({
        project,
        stats: {
          ...stats,
          balance: (stats.totalReceived || 0) - (stats.totalExpenses || 0)
        },
        income: incRes.data,
        expenses: expRes.data,
        firmName,
        save: false
      })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${project.project_name} Financial Statement`,
          text: `Financial report for ${project.project_name} (${project.project_code})`
        })
      } else {
        const blobUrl = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        a.click()
        URL.revokeObjectURL(blobUrl)
        toast('PDF downloaded. Direct file sharing is available on mobile/WhatsApp.', { icon: 'ℹ️' })
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share PDF')
        console.error(err)
      }
    } finally {
      setSharePdfLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Reports" backTo={`/projects/${projectId}`} />
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )

  const balance = (stats?.totalReceived || 0) - (stats?.totalExpenses || 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Reports"
        subtitle={project?.project_name}
        backTo={`/projects/${projectId}`}
      />
      <PageWrapper>
        {/* Project Info */}
        <Card className="mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {project?.project_code}
                </span>
                <StatusBadge status={project?.project_status} />
              </div>
              <h2 className="font-bold text-gray-900">{project?.project_name}</h2>
              <p className="text-sm text-gray-500">{project?.owner_name}</p>
            </div>
          </div>
        </Card>

        {/* Financial Summary */}
        <Card className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-600">Total Received</span>
              <span className="font-bold text-green-700">{formatINR(stats?.totalReceived)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-600">Total Expenses</span>
              <span className="font-bold text-red-600">{formatINR(stats?.totalExpenses)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold text-gray-800">Net Balance</span>
              <span className={['font-bold text-lg', balance >= 0 ? 'text-blue-700' : 'text-red-600'].join(' ')}>
                {formatINR(balance)}
              </span>
            </div>
          </div>
        </Card>

        {/* Category Breakdown */}
        {Object.keys(stats?.categoryBreakdown || {}).length > 0 && (
          <Card className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Category Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(stats.categoryBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{cat}</span>
                    <span className="text-sm font-semibold text-gray-900">{formatINR(amt)}</span>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <Card className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">PDF Report Actions</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button fullWidth onClick={handleDownloadPDF} loading={pdfLoading} size="md">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="secondary" fullWidth onClick={handleSharePDF} loading={sharePdfLoading} size="md">
                <Share2 className="h-4 w-4 text-blue-700" />
                Share PDF
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Owner Portal Link</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 truncate">
                  {shareLink || 'No share link available'}
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {shareLink && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => window.open(shareLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Owner Portal
                </Button>
              )}
            </div>
          </div>
        </Card>
      </PageWrapper>
    </div>
  )
}
