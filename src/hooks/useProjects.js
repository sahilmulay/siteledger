import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useProjects() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProjects = useCallback(async () => {
    if (!user) return []
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchProject = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
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
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...projectData, user_id: user.id })
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
  }, [user])

  const updateProject = useCallback(async (id, updates) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('projects')
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

  const deleteProject = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProjectStats = useCallback(async (projectId) => {
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        supabase.from('income').select('amount, date').eq('project_id', projectId),
        supabase.from('expenses').select('amount, category, expense_date').eq('project_id', projectId)
      ])
      if (incomeRes.error) throw incomeRes.error
      if (expenseRes.error) throw expenseRes.error

      const incomeData = incomeRes.data || []
      const expenseData = expenseRes.data || []

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

      return {
        totalReceived,
        totalExpenses,
        balance,
        expenseCount: expenseData.length,
        incomeCount: incomeData.length,
        lastTransactionDate: allDates[0] || null,
        categoryBreakdown
      }
    } catch (err) {
      console.error('fetchProjectStats error:', err)
      return {
        totalReceived: 0, totalExpenses: 0, balance: 0,
        expenseCount: 0, incomeCount: 0, lastTransactionDate: null,
        categoryBreakdown: {}
      }
    }
  }, [])

  return { loading, error, fetchProjects, fetchProject, createProject, updateProject, deleteProject, fetchProjectStats }
}
