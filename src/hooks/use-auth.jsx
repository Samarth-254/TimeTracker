import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { supabase, subscribeToUserPresence } from '@/lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, setLocation] = useLocation()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Set up presence tracking when user is authenticated
    let presenceSubscription
    if (user?.id) {
      presenceSubscription = subscribeToUserPresence((presenceState) => {
        // Update user's online status in the UI if needed
        console.log('Presence state:', presenceState)
      })
    }

    return () => {
      subscription?.unsubscribe()
      presenceSubscription?.unsubscribe()
    }
  }, [user?.id])

  const value = {
    signUp: async ({ email, password, fullName }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (error) throw error
      return data
    },
    
    signIn: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      return data
    },
    
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setLocation('/auth')
    },
    
    user,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
