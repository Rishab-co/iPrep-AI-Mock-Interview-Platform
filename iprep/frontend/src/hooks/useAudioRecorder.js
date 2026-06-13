import { useState, useRef, useCallback } from 'react'

/**
 * useAudioRecorder
 * Wraps the MediaRecorder API to capture mic audio as WebM blobs.
 * The blobs are sent to OpenAI Whisper for server-side transcription.
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError]             = useState(null)
  const recorderRef = useRef(null)
  const chunksRef   = useRef([])
  const streamRef   = useRef(null)

  const startRecording = useCallback(async () => {
    setError(null)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      const opts = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' } : {}
      const rec = new MediaRecorder(stream, opts)
      recorderRef.current = rec
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.start(250)
      setIsRecording(true)
    } catch (err) {
      setError(err.message || 'Microphone access denied')
    }
  }, [])

  const stopRecording = useCallback(() =>
    new Promise(resolve => {
      const rec = recorderRef.current
      if (!rec || rec.state === 'inactive') { resolve(null); return }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setIsRecording(false)
        resolve(blob)
      }
      rec.stop()
    }), [])

  const cancelRecording = useCallback(() => {
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    chunksRef.current = []
    setIsRecording(false)
  }, [])

  return { isRecording, error, startRecording, stopRecording, cancelRecording }
}
