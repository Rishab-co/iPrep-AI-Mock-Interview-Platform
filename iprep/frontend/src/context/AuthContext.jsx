import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('iprep_token')
    const saved = localStorage.getItem('iprep_user')
    if (token && saved) setUser(JSON.parse(saved))
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/v1/auth/login', { email, password })
    localStorage.setItem('iprep_token', data.accessToken)
    localStorage.setItem('iprep_user', JSON.stringify({ email: data.email, fullName: data.fullName }))
    setUser({ email: data.email, fullName: data.fullName })
    return data
  }, [])

  const register = useCallback(async (fullName, email, password) => {
    const { data } = await api.post('/api/v1/auth/register', { fullName, email, password })
    localStorage.setItem('iprep_token', data.accessToken)
    localStorage.setItem('iprep_user', JSON.stringify({ email: data.email, fullName: data.fullName }))
    setUser({ email: data.email, fullName: data.fullName })
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('iprep_token')
    localStorage.removeItem('iprep_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
