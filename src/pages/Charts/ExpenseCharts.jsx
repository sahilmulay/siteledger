import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PieChart as PieIcon, ArrowLeft, TrendingDown, Layers, FileText } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { useExpenses } from '../../hooks/useExpenses'
import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Spinner'
import { formatINR } from '../../lib/formatters'

// Color palette for charts
const CATEGORY_PALETTE = [
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#e11d48', // Rose
  '#64748b'  // Slate
]

const SUB_CATEGORY_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#84cc16',
  '#d946ef', '#e11d48', '#0284c7', '#78716c', '#64748b'
]

// SVG Arc Math Helper
function describeArc(cx, cy, r, innerR, startAngle, endAngle) {
  if (endAngle - startAngle >= 2 * Math.PI - 0.0001) {
    endAngle = startAngle + 2 * Math.PI - 0.0001
  }
  const x1 = cx + r * Math.sin(startAngle)
  const y1 = cy - r * Math.cos(startAngle)
  const x2 = cx + r * Math.sin(endAngle)
  const y2 = cy - r * Math.cos(endAngle)

  const x3 = cx + innerR * Math.sin(endAngle)
  const y3 = cy - innerR * Math.cos(endAngle)
  const x4 = cx + innerR * Math.sin(startAngle)
  const y4 = cy - innerR * Math.cos(startAngle)

  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0

  return [
    `M ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
    'Z'
  ].join(' ')
}

// ── Donut Pie Component ─────────────────────────────────────
function DonutPieChart({ data, total, selectedItem, onSelect }) {
  const size = 260
  const center = size / 2
  const radius = 100
  const innerRadius = 62

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-xs">
        No data to display
      </div>
    )
  }

  // Calculate arc slices
  let accumulatedAngle = 0
  const slices = data.map((item, idx) => {
    const angle = (item.value / total) * 2 * Math.PI
    const startAngle = accumulatedAngle
    const endAngle = accumulatedAngle + angle
    accumulatedAngle += angle

    return {
      ...item,
      startAngle,
      endAngle,
      path: describeArc(center, center, radius, innerRadius, startAngle, endAngle)
    }
  })

  const isSingle = data.length === 1

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          {isSingle ? (
            <circle
              cx={center}
              cy={center}
              r={(radius + innerRadius) / 2}
              fill="none"
              stroke={data[0].color}
              strokeWidth={radius - innerRadius}
              className="cursor-pointer transition-opacity"
              onClick={() => onSelect(selectedItem === data[0].label ? null : data[0].label)}
            />
          ) : (
            slices.map((slice, idx) => {
              const isSelected = selectedItem === slice.label
              const opacity = selectedItem ? (isSelected ? 1 : 0.4) : 1
              return (
                <path
                  key={idx}
                  d={slice.path}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  opacity={opacity}
                  className="cursor-pointer transition-all duration-200 hover:opacity-90"
                  onClick={() => onSelect(isSelected ? null : slice.label)}
                />
              )
            })
          )}
        </svg>

        {/* Center Total / Selection Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
          {selectedItem ? (
            (() => {
              const active = data.find(d => d.label === selectedItem)
              return active ? (
                <>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide truncate max-w-[110px]">
                    {active.label}
                  </span>
                  <span className="text-base font-bold text-gray-900 mt-0.5">
                    {formatINR(active.value)}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
                    {active.percentage.toFixed(1)}%
                  </span>
                </>
              ) : null
            })()
          ) : (
            <>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Total
              </span>
              <span className="text-base font-bold text-gray-900 mt-0.5">
                {formatINR(total)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">
                {data.length} {data.length === 1 ? 'slice' : 'slices'}
              </span>
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 mt-1">
        {selectedItem ? 'Tap slice again to reset' : 'Tap any slice to highlight details'}
      </p>
    </div>
  )
}

// ── Breakdown List Table ────────────────────────────────────
function BreakdownList({ data, total, selectedItem, onSelect }) {
  return (
    <div className="space-y-2.5 mt-4">
      {data.map((item, idx) => {
        const isSelected = selectedItem === item.label
        return (
          <div
            key={idx}
            onClick={() => onSelect(isSelected ? null : item.label)}
            className={[
              'p-2.5 rounded-xl border transition-all cursor-pointer',
              isSelected
                ? 'bg-blue-50/60 border-blue-300 shadow-sm'
                : 'bg-white border-gray-100 hover:border-gray-200'
            ].join(' ')}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-semibold text-gray-800 truncate">
                  {item.label}
                </span>
                {item.parentCategory && (
                  <span className="text-[10px] text-gray-400 truncate">
                    ({item.parentCategory})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold text-gray-900">
                  {formatINR(item.value)}
                </span>
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Relative Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, item.percentage)}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ExpenseCharts Page ─────────────────────────────────
export function ExpenseCharts() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { fetchProject } = useProjects()
  const { fetchExpenses } = useExpenses()

  const [project, setProject] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('both') // 'both' | 'category' | 'subcategory'

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubCategory, setSelectedSubCategory] = useState(null)

  useEffect(() => {
    Promise.all([
      fetchProject(projectId),
      fetchExpenses(projectId, { limit: 1000 })
    ]).then(([proj, expRes]) => {
      setProject(proj)
      setExpenses(expRes.data || [])
      setLoading(false)
    })
  }, [projectId, fetchProject, fetchExpenses])

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expenses])

  // Aggregate by Category
  const categoryData = useMemo(() => {
    if (totalExpenses === 0) return []
    const map = {}
    expenses.forEach(e => {
      const cat = e.category || 'Other'
      map[cat] = (map[cat] || 0) + Number(e.amount || 0)
    })

    return Object.entries(map)
      .map(([label, value], idx) => ({
        label,
        value,
        percentage: (value / totalExpenses) * 100,
        color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length]
      }))
      .sort((a, b) => b.value - a.value)
  }, [expenses, totalExpenses])

  // Aggregate by Sub-Category
  const subCategoryData = useMemo(() => {
    if (totalExpenses === 0) return []
    const map = {}
    const parentMap = {}
    expenses.forEach(e => {
      const sub = e.sub_category || 'General / Unspecified'
      map[sub] = (map[sub] || 0) + Number(e.amount || 0)
      if (!parentMap[sub] && e.category) {
        parentMap[sub] = e.category
      }
    })

    return Object.entries(map)
      .map(([label, value], idx) => ({
        label,
        value,
        parentCategory: parentMap[label] || '',
        percentage: (value / totalExpenses) * 100,
        color: SUB_CATEGORY_PALETTE[idx % SUB_CATEGORY_PALETTE.length]
      }))
      .sort((a, b) => b.value - a.value)
  }, [expenses, totalExpenses])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Expense Charts" backTo={`/projects/${projectId}`} />
        <PageWrapper>
          <div className="space-y-4">
            <Skeleton className="h-14 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageWrapper>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Expense Charts"
        subtitle={project?.project_name ? `${project.project_name} (${project.project_code})` : 'Visual Analytics'}
        backTo={`/projects/${projectId}`}
        rightAction={
          <button
            onClick={() => navigate(`/projects/${projectId}/expenses`)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-xs font-semibold text-blue-700 flex items-center gap-1"
          >
            <span>History</span>
          </button>
        }
      />

      <PageWrapper>
        {/* Top Summary Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-100 font-medium">Total Expenses Analyzed</p>
              <p className="text-2xl font-black tracking-tight mt-0.5">{formatINR(totalExpenses)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
              </span>
              <p className="text-[10px] text-blue-200 mt-1">{categoryData.length} categories</p>
            </div>
          </div>
        </div>

        {/* View Filter Pills */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
          {[
            { id: 'both', label: 'All Charts' },
            { id: 'category', label: 'Category' },
            { id: 'subcategory', label: 'Sub-Category' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 text-xs font-semibold py-2 rounded-xl transition-all',
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <PieIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 text-sm">No expenses recorded</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Add expense entries to this project to view category and sub-category pie charts.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {/* ── 1. Category Pie Chart Section ── */}
            {(activeTab === 'both' || activeTab === 'category') && (
              <Card>
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <PieIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Category Breakdown</h3>
                      <p className="text-[11px] text-gray-400">{categoryData.length} categories active</p>
                    </div>
                  </div>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <DonutPieChart
                  data={categoryData}
                  total={totalExpenses}
                  selectedItem={selectedCategory}
                  onSelect={setSelectedCategory}
                />

                <BreakdownList
                  data={categoryData}
                  total={totalExpenses}
                  selectedItem={selectedCategory}
                  onSelect={setSelectedCategory}
                />
              </Card>
            )}

            {/* ── 2. Sub-Category Pie Chart Section ── */}
            {(activeTab === 'both' || activeTab === 'subcategory') && (
              <Card>
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Sub-Category Breakdown</h3>
                      <p className="text-[11px] text-gray-400">{subCategoryData.length} sub-categories active</p>
                    </div>
                  </div>
                  {selectedSubCategory && (
                    <button
                      onClick={() => setSelectedSubCategory(null)}
                      className="text-xs text-amber-600 hover:underline font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <DonutPieChart
                  data={subCategoryData}
                  total={totalExpenses}
                  selectedItem={selectedSubCategory}
                  onSelect={setSelectedSubCategory}
                />

                <BreakdownList
                  data={subCategoryData}
                  total={totalExpenses}
                  selectedItem={selectedSubCategory}
                  onSelect={setSelectedSubCategory}
                />
              </Card>
            )}
          </div>
        )}
      </PageWrapper>
    </div>
  )
}
