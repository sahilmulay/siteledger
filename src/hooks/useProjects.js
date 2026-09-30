import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getCached, setCached, invalidateCache, invalidateProjectCache } from '../lib/cache'

export function useProjects() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProjects = useCallback(async () => {
    if (!user) return []
    const cacheKey = `projects:${user.id}`
    const cached = getCached(cacheKey)
    if (cached) return cached
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const raw = data || []
      const result = raw.map(p => ({
        ...p,
        rate_per_sqft: p.rate_per_sqft ?? p.metadata?.rate_per_sqft ?? null,
        extra_works: p.extra_works ?? p.metadata?.extra_works ?? []
      }))
      setCached(cacheKey, result)
      return result
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchProject = useCallback(async (id) => {
    const cacheKey = `project:${id}`
    const cached = getCached(cacheKey)
    if (cached) return cached
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      if (data) {
        data.rate_per_sqft = data.rate_per_sqft ?? data.metadata?.rate_per_sqft ?? null
        data.extra_works = data.extra_works ?? data.metadata?.extra_works ?? []
      }
      setCached(cacheKey, data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createProject = useCallback(async (projectData) => {
    if (!user) throw new Error('Not authenticated')
    setLoading(true)
    setError(null)
    try {
      const payload = { ...projectData, user_id: user.id }
      let { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single()
      if (error) {
        if (error.message?.includes('rate_per_sqft') || error.message?.includes('extra_works')) {
          const { rate_per_sqft, extra_works, ...rest } = payload
          const fallbackPayload = {
            ...rest,
            metadata: {
              ...(rest.metadata || {}),
              ...(rate_per_sqft !== undefined ? { rate_per_sqft } : {}),
              ...(extra_works !== undefined ? { extra_works } : {})
            }
          }
          const retry = await supabase.from('projects').insert(fallbackPayload).select().single()
          if (retry.error) throw retry.error
          data = retry.data
        } else {
          throw error
        }
      }
      if (data) {
        data.rate_per_sqft = data.rate_per_sqft ?? data.metadata?.rate_per_sqft ?? null
        data.extra_works = data.extra_works ?? data.metadata?.extra_works ?? []
      }
      invalidateCache(`projects:${user.id}`)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const updateProject = useCallback(async (id, updates) => {
    setLoading(true)
    setError(null)
    try {
      let { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) {
        if (error.message?.includes('rate_per_sqft') || error.message?.includes('extra_works')) {
          const { data: curr } = await supabase.from('projects').select('metadata').eq('id', id).single()
          const { rate_per_sqft, extra_works, ...rest } = updates
          const fallbackUpdates = {
            ...rest,
            metadata: {
              ...(curr?.metadata || {}),
              ...(rate_per_sqft !== undefined ? { rate_per_sqft } : {}),
              ...(extra_works !== undefined ? { extra_works } : {})
            }
          }
          const retry = await supabase.from('projects').update(fallbackUpdates).eq('id', id).select().single()
          if (retry.error) throw retry.error
          data = retry.data
        } else {
          throw error
        }
      }
      if (data) {
        data.rate_per_sqft = data.rate_per_sqft ?? data.metadata?.rate_per_sqft ?? null
        data.extra_works = data.extra_works ?? data.metadata?.extra_works ?? []
      }
      invalidateProjectCache(id)
      if (user) invalidateCache(`projects:${user.id}`)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const deleteProject = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      invalidateCache(`project:${id}`)
      if (user) invalidateCache(`projects:${user.id}`)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchProjectStats = useCallback(async (projectId, force = false) => {
    const cacheKey = `stats:${projectId}`
    if (!force) {
      const cached = getCached(cacheKey)
      if (cached) return cached
    }
    try {
      const fetchAllProjectRows = async (table, selectFields) => {
        const PAGE_SIZE = 1000
        let rows = []
        let from = 0
        while (true) {
          const { data, error } = await supabase
            .from(table)
            .select(selectFields)
            .eq('project_id', projectId)
            .range(from, from + PAGE_SIZE - 1)
          if (error) throw error
          if (!data || data.length === 0) break
          rows.push(...data)
          if (data.length < PAGE_SIZE) break
          from += PAGE_SIZE
        }
        return rows
      }

      const [incomeData, expenseData] = await Promise.all([
        fetchAllProjectRows('income', 'amount, date'),
        fetchAllProjectRows('expenses', 'amount, category, expense_date')
      ])

      const totalReceived = incomeData.reduce((s, r) => s + Number(r.amount), 0)
      const totalExpenses = expenseData.reduce((s, r) => s + Number(r.amount), 0)
      const balance = totalReceived - totalExpenses

      const categoryBreakdown = {}
      expenseData.forEach(e => {
        categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + Number(e.amount)
      })

      const allDates = [
        ...incomeData.map(r => r.date),
        ...expenseData.map(r => r.expense_date)
      ].filter(Boolean).sort().reverse()

      const result = {
        totalReceived,
        totalExpenses,
        balance,
        expenseCount: expenseData.length,
        incomeCount: incomeData.length,
        lastTransactionDate: allDates[0] || null,
        categoryBreakdown
      }
      setCached(cacheKey, result)
      return result
    } catch (err) {
      console.error('fetchProjectStats error:', err)
      setError(err.message)
      throw err
    }
  }, [])

  return { loading, error, fetchProjects, fetchProject, createProject, updateProject, deleteProject, fetchProjectStats }
}
