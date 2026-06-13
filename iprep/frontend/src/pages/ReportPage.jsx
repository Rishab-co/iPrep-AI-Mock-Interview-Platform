import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { interviewService } from '../services/interviewService'
import {
  Award, TrendingUp, AlertTriangle, CheckCircle, XCircle,
  BookOpen, ArrowLeft, RotateCcw, ChevronDown, ChevronUp,
  Zap, BarChart2, MessageSquare, Brain
} from 'lucide-react'

const VERDICT = {
  READY_FOR_PLACEMENT: {
    label:   'Ready for Placement',
    icon:    CheckCircle,
    color:   'text-emerald-400',
    bg:      'bg-emerald-500/10 border-emerald-500/30',
    glow:    '0 0 40px rgba(16,185,129,0.2)',
  },
  BORDERLINE: {
    label:   'Borderline',
    icon:    AlertTriangle,
    color:   'text-yellow-400',
    bg:      'bg-yellow-500/10 border-yellow-500/30',
    glow:    '0 0 40px rgba(234,179,8,0.2)',
  },
  NEEDS_MORE_PRACTICE: {
    label:   'Needs More Practice',
    icon:    XCircle,
    color:   'text-red-400',
    bg:      'bg-red-500/10 border-red-500/30',
    glow:    '0 0 40px rgba(239,68,68,0.2)',
  },
}

function ScoreBar({ label, score, icon: Icon, color }) {
  const pct = Math.min((score / 10) * 100, 100)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Icon className={`w-4 h-4 ${color}`} />
          {label}
        </div>
        <span className="font-display font-bold text-white text-sm">{score?.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            background: score >= 7 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
    </div>
  )
}

function TranscriptSection({ transcript }) {
  const [open, setOpen] = useState(false)
  if (!transcript?.length) return null
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/2 transition-colors">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-400" />
          <span className="font-semibold text-white">Full Transcript</span>
          <span className="text-white/30 text-sm">({transcript.length} messages)</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>
      {open && (
        <div className="border-t border-white/5 px-6 py-4 space-y-3 max-h-96 overflow-y-auto">
          {transcript.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.speaker === 'USER' ? 'flex-row-reverse' : ''}`}>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 mt-1 ${
                msg.speaker === 'AI'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'bg-white/10 text-white/50'
              }`}>{msg.speaker === 'AI' ? 'Alex' : 'You'}</span>
              <p className={`text-sm leading-relaxed rounded-xl px-3 py-2 ${
                msg.speaker === 'AI'
                  ? 'bg-surface-700 text-white/80'
                  : 'bg-brand-600/10 text-white/80'
              }`}>{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportPage() {
  const { id }      = useParams()
  const location    = useLocation()
  const navigate    = useNavigate()
  const [data, setData]       = useState(location.state?.evaluation || null)
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(!data)

  useEffect(() => {
    // Load full interview detail (for transcript + evaluation if not in state)
    interviewService.getDetail(id)
      .then(r => {
        setDetail(r.data)
        if (!data && r.data.evaluation) setData(r.data.evaluation)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50">Generating your report…</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/50 mb-4">Report not found.</p>
        <button onClick={() => navigate('/dashboard')}
          className="text-brand-400 hover:text-brand-300">← Back to Dashboard</button>
      </div>
    </div>
  )

  const verdict = VERDICT[data.verdict] || VERDICT['BORDERLINE']
  const VIcon   = verdict.icon
  const scores  = [
    { label: 'Technical',        score: data.technicalScore,       icon: Brain,    color: 'text-brand-400'   },
    { label: 'Communication',    score: data.communicationScore,   icon: MessageSquare, color: 'text-purple-400' },
    { label: 'Problem Solving',  score: data.problemSolvingScore,  icon: TrendingUp, color: 'text-cyan-400'  },
    { label: 'Depth of Knowledge', score: data.depthScore,         icon: BarChart2, color: 'text-pink-400'  },
  ]

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-brand-900/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        {/* Back */}
        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        {/* Verdict Card */}
        <div className={`glass rounded-3xl p-8 mb-6 border text-center ${verdict.bg}`}
          style={{ boxShadow: verdict.glow }}>
          <div className={`inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4 ${verdict.bg}`}>
            <VIcon className={`w-8 h-8 ${verdict.color}`} />
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">
            {data.verdictTitle || verdict.label}
          </h1>
          <p className="text-white/50 text-sm max-w-lg mx-auto leading-relaxed">
            {data.verdictDescription}
          </p>
          {/* Overall Score */}
          <div className="mt-6 inline-flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl">
            <Award className="w-5 h-5 text-yellow-400" />
            <span className="text-white/60 text-sm">Overall Score</span>
            <span className="font-display text-2xl font-bold text-white">
              {data.overallScore?.toFixed(1)}
              <span className="text-white/30 text-sm font-normal"> / 10</span>
            </span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-400" /> Score Breakdown
          </h2>
          <div className="space-y-4">
            {scores.map(s => (
              <ScoreBar key={s.label} {...s} />
            ))}
          </div>
        </div>

        {/* Analysis */}
        {data.correctnessAnalysis && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="font-display font-bold text-white mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" /> Technical Analysis
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">{data.correctnessAnalysis}</p>
          </div>
        )}

        {/* Strengths & Improvements */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {data.strengths?.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Strengths
              </h2>
              <ul className="space-y-2">
                {data.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.areasForImprovement?.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-400" /> Areas to Improve
              </h2>
              <ul className="space-y-2">
                {data.areasForImprovement.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recommended Topics */}
        {data.recommendedTopics?.length > 0 && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" /> Recommended Topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.recommendedTopics.map((t, i) => (
                <span key={i}
                  className="px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-300 text-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Per-question scores */}
        {data.questionScores?.length > 0 && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400" /> Per-Question Breakdown
            </h2>
            <div className="space-y-3">
              {data.questionScores.map(q => (
                <div key={q.questionNumber} className="glass-light rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/60 text-sm font-medium">Q{q.questionNumber}</span>
                    <span className={`font-display font-bold text-sm ${
                      q.score >= 7 ? 'text-emerald-400' :
                      q.score >= 5 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{q.score}/10</span>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">{q.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        {detail?.transcript && <TranscriptSection transcript={detail.transcript} />}

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button onClick={() => navigate('/interview/new')}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors glow-brand">
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <button onClick={() => navigate('/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 glass border-white/10 text-white/70 hover:text-white py-3 rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
