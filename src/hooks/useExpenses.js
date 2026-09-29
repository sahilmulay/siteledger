import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { invalidateProjectCache } from '../lib/cache'

export function useExpenses() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchExpenses = useCallback(async (projectId, filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('project_id', projectId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.category) query = query.eq('category', filters.category)
      if (filters.subCategory) query = query.eq('sub_category', filters.subCategory)
      if (filters.paymentMode) query = query.eq('payment_mode', filters.paymentMode)
      if (filters.startDate) query = query.gte('expense_date', filters.startDate)
      if (filters.endDate) query = query.lte('expense_date', filters.endDate)
      if (filters.vendorName) query = query.ilike('vendor_name', `%${filters.vendorName}%`)

      const from = (filters.page || 0) * (filters.limit || 20)
      query = query.range(from, from + (filters.limit || 20) - 1)

      const { data, error } = await query
      if (error) throw error
      return { data: data || [] }
    } catch (err) {
      setError(err.message)
      return { data: [] }
    } finally {
      setLoading(false)
    }
  }, [])

  const addExpense = useCallback(async (projectId, expenseData) => {
    setLoading(true)
    setError(null)
    try {
      let payload = { ...expenseData, project_id: projectId }
      let { data, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select()
        .single()
      if (error && (error.message?.includes('quantity') || error.message?.includes('vendor_mobile') || error.message?.includes('location'))) {
        let fallbackData = { ...payload }
        if (error.message.includes('quantity')) {
          const qty = fallbackData.quantity
          delete fallbackData.quantity
          if (qty) {
            fallbackData.remarks = `${fallbackData.remarks ? fallbackData.remarks + ' | ' : ''}Qty: ${qty}`
          }
        }
        if (error.message.includes('vendor_mobile')) {
          const vm = fallbackData.vendor_mobile
          delete fallbackData.vendor_mobile
          if (vm) {
            fallbackData.remarks = `${fallbackData.remarks ? fallbackData.remarks + ' | ' : ''}Phone: ${vm}`
          }
        }
        if (error.message.includes('location')) {
          delete fallbackData.location
        }
        const retry = await supabase.from('expenses').insert(fallbackData).select().single()
        if (retry.error) throw retry.error
        data = retry.data
      } else if (error) {
        throw error
      }
      invalidateProjectCache(projectId)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchExpense = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('expenses')
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

  const updateExpense = useCallback(async (id, updates) => {
    setLoading(true)
    setError(null)
    try {
      let { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error && (error.message?.includes('quantity') || error.message?.includes('vendor_mobile') || error.message?.includes('location'))) {
        let fallbackUpdates = { ...updates }
        if (error.message.includes('quantity')) {
          const qty = fallbackUpdates.quantity
          delete fallbackUpdates.quantity
          if (qty) {
            fallbackUpdates.remarks = `${fallbackUpdates.remarks ? fallbackUpdates.remarks + ' | ' : ''}Qty: ${qty}`
          }
        }
        if (error.message.includes('vendor_mobile')) {
          const vm = fallbackUpdates.vendor_mobile
          delete fallbackUpdates.vendor_mobile
          if (vm) {
            fallbackUpdates.remarks = `${fallbackUpdates.remarks ? fallbackUpdates.remarks + ' | ' : ''}Phone: ${vm}`
          }
        }
        if (error.message.includes('location')) {
          delete fallbackUpdates.location
        }
        const retry = await supabase.from('expenses').update(fallbackUpdates).eq('id', id).select().single()
        if (retry.error) throw retry.error
        data = retry.data
      } else if (error) {
        throw error
      }
      invalidateProjectCache(data?.project_id)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteExpense = useCallback(async (id, projectId) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      invalidateProjectCache(projectId)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadBillImage = useCallback(async (userId, projectId, file) => {
    // Compress image before upload
    const compressed = await compressImage(file)
    const ext = file.name.split('.').pop()
    const fileName = `${userId}/${projectId}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('bill-images')
      .upload(fileName, compressed, { contentType: file.type, upsert: false })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('bill-images')
      .getPublicUrl(data.path)

    return publicUrl
  }, [])

  return { loading, error, fetchExpenses, fetchExpense, addExpense, updateExpense, deleteExpense, uploadBillImage }
}

async function compressImage(file) {
  if (!file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 1200
        let { width, height } = img
        if (width > MAX) { height = (height * MAX) / width; width = MAX }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.8)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
