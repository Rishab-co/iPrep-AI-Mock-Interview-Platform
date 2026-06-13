import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useAudioPlayer }   from '../hooks/useAudioPlayer'
import { interviewService } from '../services/interviewService'
import {
  Mic, MicOff, Send, StopCircle, Volume2, VolumeX,
  AlertCircle, Loader2, User, Bot
} from 'lucide-react'

/* ── Animated waveform ─────────────────────────────────────────────────── */
function Waveform({ active }) {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {[...Array(9)].map((_, i) => (
        <div key={i}
          className={`w-1 rounded-full ${active ? 'bg-brand-400' : 'bg-white/20'}`}
          style={{
            height: active ? `${30 + Math.sin((i * 1.4)) * 70}%` : '30%',
            animation: active ? `waveform ${0.8 + i * 0.1}s ease-in-out infinite` : 'none',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Transcript bubble ─────────────────────────────────────────────────── */
function Bubble({ msg }) {
  const isAI = msg.speaker === 'AI'
  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isAI ? 'bg-brand-600/30 text-brand-400' : 'bg-white/10 text-white/60'
      }`}>
        {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isAI
          ? 'bg-surface-700 text-white/90 rounded-tl-sm'
          : 'bg-brand-600/20 border border-brand-500/20 text-white/90 rounded-tr-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  )
}

/* ── MAIN ──────────────────────────────────────────────────────────────── */
export default function LiveInterviewPage() {
  const { id }    = useParams()
  const location  = useLocation()
  const navigate  = useNavigate()
  const startData = location.state?.startData

  const [transcript,     setTranscript]     = useState([])
  const [inputText,      setInputText]      = useState('')
  const [status,         setStatus]         = useState('idle')
  // status: idle | recording | transcribing | thinking | speaking
  const [error,          setError]          = useState('')
  const [isEnding,       setIsEnding]       = useState(false)
  const [muteAI,         setMuteAI]         = useState(false)
  const [interviewDone,  setInterviewDone]  = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  const scrollRef   = useRef(null)
  const textareaRef = useRef(null)

  const recorder = useAudioRecorder()
  const player   = useAudioPlayer()   // now uses Web Speech API

  /* ── Play AI text via Web Speech API ──────────────────────────────── */
  const speakAI = useCallback(async (text, audioBase64, mimeType) => {
    if (muteAI) return
    setStatus('speaking')
    try {
      // If backend sent real audio bytes, play those; otherwise use browser TTS
      if (audioBase64 && audioBase64.length > 20) {
        await player.playBase64Audio(audioBase64, mimeType || 'audio/mpeg')
      } else {
        await player.speak(text)      // ← Free Web Speech API
      }
    } catch { /* ignore audio errors */ }
    finally { setStatus('idle') }
  }, [muteAI, player])

  /* ── On mount: play opening message ───────────────────────────────── */
  useEffect(() => {
    if (!startData) { navigate('/dashboard'); return }
    setTranscript([{ speaker: 'AI', content: startData.aiMessage }])
    speakAI(startData.aiMessage, startData.audioBase64, startData.mimeType)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Auto-scroll ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [transcript])

  /* ── Submit user text response ─────────────────────────────────────── */
  const submitResponse = useCallback(async (content) => {
    if (!content.trim() || status !== 'idle') return
    setError('')
    setInputText('')
    setTranscript(prev => [...prev, { speaker: 'USER', content: content.trim() }])
    setStatus('thinking')

    try {
      const { data } = await interviewService.respond(id, content.trim())
      setTranscript(prev => [...prev, { speaker: 'AI', content: data.aiMessage }])
      if (data.isLastQuestion) setInterviewDone(true)
      await speakAI(data.aiMessage, data.audioBase64, data.mimeType)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
      setStatus('idle')
    }
  }, [id, status, speakAI])

  /* ── Start mic recording ────────────────────────────────────────────── */
  const startRecording = async () => {
    if (status !== 'idle') return
    player.stop()
    await recorder.startRecording()
    setStatus('recording')
  }

  /* ── Stop mic → Groq Whisper STT → submit ──────────────────────────── */
  const stopAndTranscribe = async () => {
    setStatus('transcribing')
    const blob = await recorder.stopRecording()
    if (!blob || blob.size < 500) {
      setStatus('idle')
      setError('Recording too short — please try again.')
      return
    }
    try {
      const { data } = await interviewService.transcribeAudio(id, blob)
      const text = data.transcript?.trim()
      if (!text) { setStatus('idle'); setError('Could not transcribe. Try typing instead.'); return }
      setInputText(text)
      setStatus('idle')
      await submitResponse(text)
    } catch (err) {
      setError('Transcription failed. Please type your answer.')
      setStatus('idle')
    }
  }

  /* ── End interview → get evaluation → navigate to report ───────────── */
  const endInterview = async () => {
    setIsEnding(true)
    player.stop()
    try {
      const { data } = await interviewService.end(id)
      navigate(`/interview/${id}/report`, { state: { evaluation: data } })
    } catch (err) {
      setError('Failed to generate report. Please try again.')
      setIsEnding(false)
    }
  }

  const isBusy = status !== 'idle'

  const STATUS_LABEL = {
    idle:         'Your turn',
    recording:    'Listening…',
    transcribing: 'Transcribing…',
    thinking:     'Alex is thinking…',
    speaking:     'Alex is speaking…',
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-brand-900/15 rounded-full blur-3xl" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-white/5 px-4 py-3 flex items-center justify-between glass">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            status === 'speaking' ? 'bg-brand-600 glow-brand' : 'bg-brand-600/20'
          }`}>
            <Bot className="w-4 h-4 text-brand-300" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Alex</p>
            <p className="text-white/40 text-xs mt-0.5">Senior Technical Interviewer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status pill */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            status === 'recording'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : status === 'speaking'
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : status === 'thinking' || status === 'transcribing'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-white/5 text-white/40 border border-white/10'
          }`}>
            {(status === 'thinking' || status === 'transcribing') && <Loader2 className="w-3 h-3 animate-spin" />}
            {status === 'recording' && <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />}
            {status === 'speaking'  && <Waveform active />}
            <span>{STATUS_LABEL[status]}</span>
          </div>

          {/* Mute toggle */}
          <button onClick={() => { setMuteAI(m => !m); player.stop() }}
            title={muteAI ? 'Unmute AI voice' : 'Mute AI voice'}
            className={`p-2 rounded-xl border transition-all ${
              muteAI ? 'border-white/20 text-white/40' : 'border-brand-500/30 text-brand-400'
            }`}>
            {muteAI ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* End button */}
          <button onClick={() => setShowEndConfirm(true)} disabled={isEnding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-sm">
            <StopCircle className="w-4 h-4" />
            <span className="hidden sm:block">End</span>
          </button>
        </div>
      </header>

      {/* ── Transcript ─────────────────────────────────────────────────── */}
      <div ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl w-full mx-auto">

        {transcript.map((msg, i) => <Bubble key={i} msg={msg} />)}

        {/* Thinking indicator */}
        {status === 'thinking' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-brand-400" />
            </div>
            <div className="bg-surface-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Done banner */}
        {interviewDone && (
          <div className="glass border border-brand-500/30 rounded-2xl p-5 text-center">
            <p className="text-brand-400 font-semibold mb-1">Interview Complete 🎉</p>
            <p className="text-white/50 text-sm mb-4">Generate your evaluation report now.</p>
            <button onClick={endInterview} disabled={isEnding}
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 mx-auto">
              {isEnding ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : 'Generate Report'}
            </button>
          </div>
        )}
      </div>

      {/* ── Input area ─────────────────────────────────────────────────── */}
      {!interviewDone && (
        <div className="relative z-20 border-t border-white/5 glass px-4 py-4">
          {error && (
            <div className="flex items-center gap-2 mb-3 text-red-400 text-sm max-w-3xl mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (inputText.trim() && !isBusy) submitResponse(inputText)
                }
              }}
              placeholder={
                status === 'recording'    ? '🎙  Listening — click ■ when done…' :
                status === 'transcribing' ? 'Transcribing your audio…' :
                status === 'thinking'     ? 'Alex is thinking…' :
                status === 'speaking'     ? 'Alex is speaking…' :
                'Type your answer, or use the mic…  (Enter to send)'
              }
              disabled={isBusy && status !== 'idle'}
              rows={2}
              className="flex-1 bg-surface-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-500 transition-colors resize-none text-sm leading-relaxed disabled:opacity-50"
            />

            {/* Mic button */}
            <button
              onClick={status === 'recording' ? stopAndTranscribe : startRecording}
              disabled={isBusy && status !== 'recording'}
              title={status === 'recording' ? 'Stop recording' : 'Start recording'}
              className={`p-3 rounded-xl border transition-all shrink-0 ${
                status === 'recording'
                  ? 'bg-red-500 border-red-500 text-white animate-pulse'
                  : 'border-white/20 text-white/50 hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-30'
              }`}>
              {status === 'recording' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Send button */}
            <button
              onClick={() => submitResponse(inputText)}
              disabled={!inputText.trim() || isBusy}
              className="p-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white transition-all shrink-0">
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-white/20 text-xs mt-2">
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono text-xs">Enter</kbd> to send &nbsp;·&nbsp;
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono text-xs">Shift+Enter</kbd> for new line &nbsp;·&nbsp;
            🎙 voice powered by Groq Whisper &nbsp;·&nbsp; 🔊 voice by browser
          </p>
        </div>
      )}

      {/* ── End confirm modal ───────────────────────────────────────────── */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-display text-lg font-bold text-white mb-2">End interview?</h3>
            <p className="text-white/50 text-sm mb-6">
              This will stop the session and generate your full evaluation report.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-white/60 rounded-xl hover:border-white/20 transition-colors text-sm">
                Continue
              </button>
              <button onClick={() => { setShowEndConfirm(false); endInterview() }} disabled={isEnding}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl transition-colors text-sm font-semibold flex items-center justify-center gap-2">
                {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                End & Evaluate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
