import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { EXPENSE_CATEGORIES } from '../lib/constants'
import { clearCache } from '../lib/cache'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Local state for categories and vendors with default fallbacks
  const [categories, setCategories] = useState(EXPENSE_CATEGORIES)
  const [vendors, setVendors] = useState([])

  // Helper to sync user metadata and user-scoped localStorage
  const syncUserData = (u) => {
    // Clean up legacy unscoped keys if any
    try {
      localStorage.removeItem('siteledger_categories')
      localStorage.removeItem('siteledger_vendors')
    } catch {
      // ignore
    }

    if (!u) {
      setCategories(EXPENSE_CATEGORIES)
      setVendors([])
      return
    }

    const catKey = `siteledger_categories_${u.id}`
    const venKey = `siteledger_vendors_${u.id}`

    if (u.user_metadata?.custom_categories) {
      setCategories(u.user_metadata.custom_categories)
      try { localStorage.setItem(catKey, JSON.stringify(u.user_metadata.custom_categories)) } catch {}
    } else {
      try {
        const cached = localStorage.getItem(catKey)
        setCategories(cached ? JSON.parse(cached) : EXPENSE_CATEGORIES)
      } catch {
        setCategories(EXPENSE_CATEGORIES)
      }
    }

    if (u.user_metadata?.custom_vendors) {
      setVendors(u.user_metadata.custom_vendors)
      try { localStorage.setItem(venKey, JSON.stringify(u.user_metadata.custom_vendors)) } catch {}
    } else {
      try {
        const cached = localStorage.getItem(venKey)
        setVendors(cached ? JSON.parse(cached) : [])
      } catch {
        setVendors([])
      }
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      const u = session?.user ?? null
      setUser(u)
      syncUserData(u)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      const u = session?.user ?? null
      setUser(u)
      syncUserData(u)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    if (error) throw error
    return data
  }

  const updateFirmName = async (firmName) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { firm_name: firmName }
    })
    if (error) throw error
    setUser(data.user)
    return data
  }

  const updateCategories = async (newCategories) => {
    setCategories(newCategories)
    if (user) {
      try { localStorage.setItem(`siteledger_categories_${user.id}`, JSON.stringify(newCategories)) } catch {}
      const { data, error } = await supabase.auth.updateUser({
        data: { custom_categories: newCategories }
      })
      if (error) throw error
      setUser(data.user)
      return data
    }
  }

  const updateVendors = async (newVendors) => {
    setVendors(newVendors)
    if (user) {
      try { localStorage.setItem(`siteledger_vendors_${user.id}`, JSON.stringify(newVendors)) } catch {}
      const { data, error } = await supabase.auth.updateUser({
        data: { custom_vendors: newVendors }
      })
      if (error) throw error
      setUser(data.user)
      return data
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    clearCache()
    setCategories(EXPENSE_CATEGORIES)
    setVendors([])
    setUser(null)
    setSession(null)

    // Purge CacheStorage to prevent cross-account API response leaks (Finding 4)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheKeys = await window.caches.keys()
        await Promise.all(cacheKeys.map(k => window.caches.delete(k)))
      } catch (err) {
        console.warn('Failed to clear CacheStorage on signOut:', err)
      }
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const firmName = user?.user_metadata?.firm_name || ''

  const value = {
    user,
    session,
    loading,
    firmName,
    categories,
    vendors,
    signUp,
    signIn,
    signOut,
    updateFirmName,
    updateCategories,
    updateVendors
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
