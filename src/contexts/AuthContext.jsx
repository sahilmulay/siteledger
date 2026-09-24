import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { EXPENSE_CATEGORIES } from '../lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Local state for categories and vendors with localStorage fallback for fast load
  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('siteledger_categories')
      return cached ? JSON.parse(cached) : EXPENSE_CATEGORIES
    } catch {
      return EXPENSE_CATEGORIES
    }
  })

  const [vendors, setVendors] = useState(() => {
    try {
      const cached = localStorage.getItem('siteledger_vendors')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      const u = session?.user ?? null
      setUser(u)
      if (u?.user_metadata?.custom_categories) {
        setCategories(u.user_metadata.custom_categories)
        localStorage.setItem('siteledger_categories', JSON.stringify(u.user_metadata.custom_categories))
      }
      if (u?.user_metadata?.custom_vendors) {
        setVendors(u.user_metadata.custom_vendors)
        localStorage.setItem('siteledger_vendors', JSON.stringify(u.user_metadata.custom_vendors))
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      const u = session?.user ?? null
      setUser(u)
      if (u?.user_metadata?.custom_categories) {
        setCategories(u.user_metadata.custom_categories)
        localStorage.setItem('siteledger_categories', JSON.stringify(u.user_metadata.custom_categories))
      }
      if (u?.user_metadata?.custom_vendors) {
        setVendors(u.user_metadata.custom_vendors)
        localStorage.setItem('siteledger_vendors', JSON.stringify(u.user_metadata.custom_vendors))
      }
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
    localStorage.setItem('siteledger_categories', JSON.stringify(newCategories))
    if (user) {
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
    localStorage.setItem('siteledger_vendors', JSON.stringify(newVendors))
    if (user) {
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
