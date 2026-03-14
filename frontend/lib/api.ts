import axios from 'axios'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE,
})

export async function uploadPerson(formData: FormData) {
  const res = await api.post('/upload-person', formData)
  return res.data
}

export async function scanVideo(formData: FormData) {
  const res = await api.post('/scan-video', formData)
  return res.data
}

export async function scanFrame(formData: FormData) {
  const res = await api.post('/scan-frame', formData)
  return res.data
}

export async function getPersons() {
  const res = await api.get('/persons')
  return res.data
}

export async function getAlerts() {
  const res = await api.get('/alerts')
  return res.data
}

export async function getMatches() {
  const res = await api.get('/matches')
  return res.data
}

export async function markAlertRead(alertId: string) {
  const res = await api.post(`/alerts/${alertId}/read`)
  return res.data
}

export async function deletePerson(personId: string) {
  const res = await api.delete(`/persons/${personId}`)
  return res.data
}
