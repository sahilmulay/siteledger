import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useIncome() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchIncome = useCallback(async (projectId, filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('income')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.paymentMode) query = query.eq('payment_mode', filters.paymentMode)
      if (filters.startDate) query = query.gte('date', filters.startDate)
      if (filters.endDate) query = query.lte('date', filters.endDate)

      const from = (filters.page || 0) * (filters.limit || 20)
      query = query.range(from, from + (filters.limit || 20) - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data || [], count }
    } catch (err) {
      setError(err.message)
      return { data: [], count: 0 }
    } finally {
      setLoading(false)
    }
  }, [])

  const addIncome = useCallback(async (projectId, incomeData) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('income')
        .insert({ ...incomeData, project_id: projectId })
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateIncome = useCallback(async (id, updates) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('income')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteIncome = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.from('income').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, fetchIncome, addIncome, updateIncome, deleteIncome }
}
