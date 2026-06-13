import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 60000,
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('iprep_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('iprep_token')
      localStorage.removeItem('iprep_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
