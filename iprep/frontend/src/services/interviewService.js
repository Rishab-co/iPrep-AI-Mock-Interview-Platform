import api from './api'
const B = '/api/v1/interviews'
export const interviewService = {
  start: (targetRole, experienceLevel, difficulty, questionCount = 5) =>
    api.post(B, { targetRole, experienceLevel, difficulty, questionCount }),
  respond: (id, content) =>
    api.post(`${B}/${id}/respond`, { content }),
  transcribeAudio: (id, blob) => {
    const fd = new FormData()
    fd.append('audio', blob, 'recording.webm')
    return api.post(`${B}/${id}/transcribe`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  end:       id => api.post(`${B}/${id}/end`),
  list:      ()  => api.get(B),
  getDetail: id  => api.get(`${B}/${id}`),
}
