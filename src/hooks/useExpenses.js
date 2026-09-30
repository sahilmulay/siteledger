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
      if (filters.all) {
        const PAGE_SIZE = 1000
        let allData = []
        let from = 0
        while (true) {
          let q = supabase
            .from('expenses')
            .select('*')
            .eq('project_id', projectId)
            .order('expense_date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1)

          if (filters.category) q = q.eq('category', filters.category)
          if (filters.subCategory) q = q.eq('sub_category', filters.subCategory)
          if (filters.paymentMode) q = q.eq('payment_mode', filters.paymentMode)
          if (filters.startDate) q = q.gte('expense_date', filters.startDate)
          if (filters.endDate) q = q.lte('expense_date', filters.endDate)
          if (filters.vendorName) q = q.ilike('vendor_name', `%${filters.vendorName}%`)
          if (filters.search) {
            const term = filters.search.trim().replace(/[(),]/g, '')
            if (term) {
              q = q.or(`category.ilike.%${term}%,sub_category.ilike.%${term}%,vendor_name.ilike.%${term}%,remarks.ilike.%${term}%,payment_mode.ilike.%${term}%,location.ilike.%${term}%,quantity.ilike.%${term}%`)
            }
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
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.category) query = query.eq('category', filters.category)
      if (filters.subCategory) query = query.eq('sub_category', filters.subCategory)
      if (filters.paymentMode) query = query.eq('payment_mode', filters.paymentMode)
      if (filters.startDate) query = query.gte('expense_date', filters.startDate)
      if (filters.endDate) query = query.lte('expense_date', filters.endDate)
      if (filters.vendorName) query = query.ilike('vendor_name', `%${filters.vendorName}%`)
      if (filters.search) {
        const term = filters.search.trim().replace(/[(),]/g, '')
        if (term) {
          query = query.or(`category.ilike.%${term}%,sub_category.ilike.%${term}%,vendor_name.ilike.%${term}%,remarks.ilike.%${term}%,payment_mode.ilike.%${term}%,location.ilike.%${term}%,quantity.ilike.%${term}%`)
        }
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
      throw err
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
  if (!file || !file.type || !file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    const fallback = () => resolve(file)

    reader.onerror = fallback
    reader.onabort = fallback

    reader.onload = (e) => {
      img.onerror = fallback
      img.onabort = fallback
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const MAX = 1200
          let { width, height } = img
          if (!width || !height) return fallback()
          if (width > MAX) { height = (height * MAX) / width; width = MAX }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) return fallback()
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.8)
        } catch {
          fallback()
        }
      }
      img.src = e.target.result
    }

    try {
      reader.readAsDataURL(file)
    } catch {
      fallback()
    }
  })
}
