/**
 * useAudioPlayer
 *
 * PRIMARY:   Browser Web Speech API (SpeechSynthesis) — completely free,
 *            works in all modern browsers, no API key needed.
 *
 * FALLBACK:  If the backend still returns a non-empty Base64 audio blob
 *            (e.g. you later swap back to OpenAI TTS), it plays that instead.
 *
 * Usage:
 *   const { isPlaying, speak, playBase64Audio, stop } = useAudioPlayer()
 *   await speak("Hello, welcome to your interview.")
 */
import { useState, useRef, useCallback, useEffect } from 'react'

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef   = useRef(null)
  const utterRef   = useRef(null)

  // Cancel any speech on unmount
  useEffect(() => () => {
    window.speechSynthesis?.cancel()
    audioRef.current?.pause()
  }, [])

  // ── Web Speech API TTS (primary, free) ─────────────────────────────────
  const speak = useCallback((text, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('SpeechSynthesis not supported'))
        return
      }

      window.speechSynthesis.cancel() // stop anything currently playing

      const utterance = new SpeechSynthesisUtterance(text)
      utterRef.current = utterance

      // Voice selection: prefer a natural English voice
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v =>
        v.name.includes('Google UK English Male') ||
        v.name.includes('Google US English') ||
        v.name.includes('Daniel') ||                // macOS
        v.name.includes('Alex') ||                  // macOS
        (v.lang.startsWith('en') && !v.localService === false)
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0]

      if (preferred) utterance.voice = preferred
      utterance.rate   = options.rate   ?? 0.95
      utterance.pitch  = options.pitch  ?? 1.0
      utterance.volume = options.volume ?? 1.0
      utterance.lang   = 'en-US'

      utterance.onstart = () => setIsPlaying(true)
      utterance.onend   = () => { setIsPlaying(false); resolve() }
      utterance.onerror = e  => { setIsPlaying(false); reject(e) }

      // Chrome bug: voices may not be loaded on first call — retry once
      setTimeout(() => window.speechSynthesis.speak(utterance), 50)
    })
  }, [])

  // ── Base64 audio fallback (if backend sends TTS audio bytes) ──────────
  const playBase64Audio = useCallback((b64, mimeType = 'audio/mpeg') => {
    // If backend sends empty bytes (our Groq setup), fall back to speak()
    if (!b64 || b64.length < 10) return Promise.resolve()

    return new Promise((resolve, reject) => {
      window.speechSynthesis?.cancel()
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

      const raw   = atob(b64)
      const bytes = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
      const blob  = new Blob([bytes], { type: mimeType })
      const url   = URL.createObjectURL(blob)

      const audio = new Audio(url)
      audioRef.current = audio
      audio.onplay  = () => setIsPlaying(true)
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); resolve() }
      audio.onerror = e  => { setIsPlaying(false); URL.revokeObjectURL(url); reject(e) }
      audio.play().catch(reject)
    })
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    audioRef.current?.pause()
    audioRef.current = null
    setIsPlaying(false)
  }, [])

  return { isPlaying, speak, playBase64Audio, stop }
}
