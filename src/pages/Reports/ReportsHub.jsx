import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart2, FileText } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { CardSkeleton } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatINR } from '../../lib/formatters'

export function ReportsHub() {
  const navigate = useNavigate()
  const { fetchProjects, fetchProjectStats, loading } = useProjects()
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({})

  useEffect(() => {
    fetchProjects().then(async (data) => {
      setProjects(data)
      const map = {}
      await Promise.all(data.map(async p => {
        map[p.id] = await fetchProjectStats(p.id)
      }))
      setStats(map)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Reports" subtitle="Project Summaries & PDF" />
      <PageWrapper>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
        ) : projects.length === 0 ? (
          <EmptyState icon={BarChart2} title="No projects yet" description="Create a project first." />
        ) : (
          <div className="space-y-3">
            {projects.map(p => {
              const s = stats[p.id] || {}
              const balance = (s.totalReceived || 0) - (s.totalExpenses || 0)
              return (
                <Card
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}/reports`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {p.project_code}
                        </span>
                        <StatusBadge status={p.project_status} />
                      </div>
                      <h3 className="font-semibold text-gray-900">{p.project_name}</h3>
                      <p className="text-sm text-gray-500">{p.owner_name}</p>
                    </div>
                    <FileText className="h-5 w-5 text-gray-300" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="text-xs text-gray-500">Received</p>
                      <p className="text-sm font-bold text-green-700">{formatINR(s.totalReceived || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Expenses</p>
                      <p className="text-sm font-bold text-red-600">{formatINR(s.totalExpenses || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Balance</p>
                      <p className={['text-sm font-bold', balance >= 0 ? 'text-blue-700' : 'text-red-600'].join(' ')}>
                        {formatINR(balance)}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PageWrapper>
    </div>
  )
}
