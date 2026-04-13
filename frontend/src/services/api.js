import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const API = axios.create({
  baseURL: API_BASE_URL
})

let isRefreshing = false
let pendingQueue = []

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  pendingQueue = []
}

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token')
  if (token) req.headers.Authorization = `Bearer ${token}`
  return req
})

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`
        return API(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const refreshRes = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refreshToken}` } }
      )
      const newToken = refreshRes.data.token
      localStorage.setItem('token', newToken)
      processQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return API(original)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('role')
      localStorage.removeItem('name')
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  }
)

export const getErrorMessage = (err, fallback = 'Something went wrong') => {
  return err?.response?.data?.error || fallback
}

export const logout = async () => {
  try {
    await API.post('/auth/logout')
  } catch {
    // Ignore backend logout errors and clear local session anyway.
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('role')
    localStorage.removeItem('name')
  }
}

export const login = (data) => API.post('/auth/login', data)
export const register = (data) => API.post('/auth/register', data)
export const submitReport = (data) => API.post('/reports', data)
export const getMyReports = () => API.get('/reports/my')
export const getAllReports = (params) => API.get('/reports', { params })
export const updateStatus = (id, status) => API.patch(`/reports/${id}`, { status })
export const assignDepartment = (id, payload) => API.patch(`/reports/${id}/department`, payload)
export const getNotifications = () => API.get('/reports/notifications')
export const getPublicReport = (id) => API.get(`/reports/public/${id}`)
export const getReportActivity = (id) => API.get(`/reports/${id}/activity`)
export const uploadReportImage = (id, file, stage = 'before') => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('stage', stage)
  return API.post(`/reports/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
export const editReport = (id, data) => API.patch(`/reports/${id}/edit`, data)
export const cancelReport = (id) => API.patch(`/reports/${id}/cancel`)

// Admin
export const createStaff = (data) => API.post('/admin/staff', data)
export const getAllStaff = () => API.get('/admin/staff')
export const getStats = () => API.get('/admin/stats')
export const getCategories = () => API.get('/admin/categories')
export const addCategory = (name) => API.post('/admin/categories', { name })
export const deleteCategory = (id) => API.delete(`/admin/categories/${id}`)
export const getUsers = () => API.get('/admin/users')
export const disableUser = (id) => API.patch(`/admin/users/${id}/disable`)
export const resetUserPassword = (id) => API.post(`/admin/users/${id}/reset-password`)
export const getTrends = (days = 30) => API.get('/admin/analytics/trends', { params: { days } })
export const exportCsv = (month) => API.get('/admin/export/csv', {
  params: { month },
  responseType: 'blob'
})
export const exportPdf = (month) => API.get('/admin/export/pdf', {
  params: { month },
  responseType: 'blob'
})