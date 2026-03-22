async function apiFetch(path, options = {}) {
  const { body, ...rest } = options
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...rest
  }
  if (body !== undefined) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  const res = await fetch(path, config)

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`
    try {
      const errData = await res.json()
      errMsg = errData.message || errMsg
    } catch {
      // ignore parse error
    }
    const err = new Error(errMsg)
    err.status = res.status
    throw err
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return res
}

// Trees
export const getTrees = () => apiFetch('/api/trees')

export const createTree = (name) =>
  apiFetch('/api/trees', { method: 'POST', body: { name } })

export const getTree = (id) => apiFetch(`/api/trees/${id}`)

export const updateTree = (id, data) =>
  apiFetch(`/api/trees/${id}`, { method: 'PUT', body: data })

export const deleteTree = (id) =>
  apiFetch(`/api/trees/${id}`, { method: 'DELETE' })

// Sharing
export const shareTree = (id, email, role) =>
  apiFetch(`/api/trees/${id}/share`, { method: 'POST', body: { email, role } })

export const removeShare = (id, userId) =>
  apiFetch(`/api/trees/${id}/share/${userId}`, { method: 'DELETE' })

// Public links
export const createPublicLink = (id, password, ttlDays) =>
  apiFetch(`/api/trees/${id}/public-link`, {
    method: 'POST',
    body: { password, ttlDays }
  })

export const deletePublicLink = (id) =>
  apiFetch(`/api/trees/${id}/public-link`, { method: 'DELETE' })

// Export / Import
export const exportTree = (id, format) =>
  fetch(`/api/trees/${id}/export?format=${format}`, { credentials: 'include' })

export const importTree = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return fetch(`/api/trees/${id}/import`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || `HTTP ${res.status}`)
    }
    return res.json()
  })
}

// Admin
export const getAdminConfig = () => apiFetch('/api/admin/config')

export const updateAdminConfig = (data) =>
  apiFetch('/api/admin/config', { method: 'PUT', body: data })

export const getUsers = () => apiFetch('/api/admin/users')

export const updateUser = (id, data) =>
  apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body: data })

export const deleteUser = (id) =>
  apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })

// Public tree
export const getPublicTree = (token, password) =>
  apiFetch(`/api/public/${token}`, {
    method: password ? 'POST' : 'GET',
    ...(password ? { body: { password } } : {})
  })

export const clonePublicTree = (token, password) =>
  apiFetch(`/api/public/${token}/clone`, {
    method: 'POST',
    body: { password }
  })
