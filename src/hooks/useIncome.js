import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { invalidateProjectCache } from '../lib/cache'

export function useIncome() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchIncome = useCallback(async (projectId, filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      if (filters.all) {
        const PAGE_SIZE = 1000
        let allData = []
        let from = 0
        while (true) {
          let q = supabase
            .from('income')
            .select('*')
            .eq('project_id', projectId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1)

          if (filters.paymentMode) q = q.eq('payment_mode', filters.paymentMode)
          if (filters.startDate) q = q.gte('date', filters.startDate)
          if (filters.endDate) q = q.lte('date', filters.endDate)
          if (filters.search) {
            const term = filters.search.trim()
            if (term) q = q.or(`payment_mode.ilike.%${term}%,remarks.ilike.%${term}%,transaction_reference.ilike.%${term}%,location.ilike.%${term}%`)
          }

          const { data, error } = await q
          if (error) throw error
          if (!data || data.length === 0) break
          allData.push(...data)
          if (data.length < PAGE_SIZE) break
          from += PAGE_SIZE
        }
        return { data: allData, count: allData.length }
      }

      let query = supabase
        .from('income')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.paymentMode) query = query.eq('payment_mode', filters.paymentMode)
      if (filters.startDate) query = query.gte('date', filters.startDate)
      if (filters.endDate) query = query.lte('date', filters.endDate)
      if (filters.search) {
        const term = filters.search.trim()
        if (term) query = query.or(`payment_mode.ilike.%${term}%,remarks.ilike.%${term}%,transaction_reference.ilike.%${term}%,location.ilike.%${term}%`)
      }

      const limit = filters.limit || 20
      const from = (filters.page || 0) * limit
      query = query.range(from, from + limit - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data || [], count: count ?? (data || []).length }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const addIncome = useCallback(async (projectId, incomeData) => {
    setLoading(true)
    setError(null)
    try {
      let payload = { ...incomeData, project_id: projectId }
      let { data, error } = await supabase
        .from('income')
        .insert(payload)
        .select()
        .single()

      if (error && error.message?.includes('location')) {
        const loc = payload.location
        delete payload.location
        if (loc) {
          payload.remarks = `${payload.remarks ? payload.remarks + ' | ' : ''}Location: ${loc}`
        }
        const retry = await supabase
          .from('income')
          .insert(payload)
          .select()
          .single()
        data = retry.data
        error = retry.error
      }

      if (error) throw error
      invalidateProjectCache(projectId)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateIncome = useCallback(async (id, updates, projectId) => {
    setLoading(true)
    setError(null)
    try {
      let payload = { ...updates }
      let { data, error } = await supabase
        .from('income')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error && error.message?.includes('location')) {
        const loc = payload.location
        delete payload.location
        if (loc) {
          payload.remarks = `${payload.remarks ? payload.remarks + ' | ' : ''}Location: ${loc}`
        }
        const retry = await supabase
          .from('income')
          .update(payload)
          .eq('id', id)
          .select()
          .single()
        data = retry.data
        error = retry.error
      }

      if (error) throw error
      invalidateProjectCache(projectId || data?.project_id)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteIncome = useCallback(async (id, projectId) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.from('income').delete().eq('id', id)
      if (error) throw error
      invalidateProjectCache(projectId)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, fetchIncome, addIncome, updateIncome, deleteIncome }
}
