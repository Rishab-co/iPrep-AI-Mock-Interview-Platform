import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { interviewService } from '../services/interviewService'
import {
  Zap, Plus, LogOut, Clock, TrendingUp, Award, ChevronRight,
  BookOpen, BarChart2, CheckCircle, AlertCircle, XCircle
} from 'lucide-react'

const VERDICT_CONFIG = {
  READY_FOR_PLACEMENT: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Ready' },
  BORDERLINE:          { icon: AlertCircle, color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',  label: 'Borderline' },
  NEEDS_MORE_PRACTICE: { icon: XCircle,     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',        label: 'Needs Practice' },
}

const DIFF_COLOR = { EASY: 'text-emerald-400 bg-emerald-500/10', MEDIUM: 'text-yellow-400 bg-yellow-500/10', HARD: 'text-red-400 bg-red-500/10' }

function ScoreRing({ score = 0 }) {
  const r = 30, circ = 2 * Math.PI * r
  const pct = Math.min(score / 10, 1)
  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="#6366f1" strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold font-display text-white">{score?.toFixed(1) ?? '–'}</span>
        <span className="text-xs text-white/40">/ 10</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    interviewService.list()
      .then(r => setInterviews(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const completed  = interviews.filter(i => i.status === 'COMPLETED')
  const avgScore   = completed.length
    ? (completed.reduce((s, i) => s + (i.overallScore || 0), 0) / completed.length).toFixed(1)
    : '–'
  const bestScore  = completed.length
    ? Math.max(...completed.map(i => i.overallScore || 0)).toFixed(1)
    : '–'

  const fmtDuration = (secs) => {
    if (!secs) return '–'
    const m = Math.floor(secs / 60), s = secs % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-brand-800/8 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg">iPrep</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/50 text-sm hidden sm:block">
              {user?.fullName}
            </span>
            <button onClick={logout}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-sm">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-1">
              Hey, {user?.fullName?.split(' ')[0]} 👋
            </h1>
            <p className="text-white/50">Ready to ace your next interview?</p>
          </div>
          <button onClick={() => navigate('/interview/new')}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 glow-brand">
            <Plus className="w-4 h-4" />
            <span>New Interview</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: BookOpen, label: 'Total Sessions', value: interviews.length, color: 'text-brand-400' },
            { icon: BarChart2, label: 'Avg Score', value: avgScore, color: 'text-purple-400' },
            { icon: Award, label: 'Best Score', value: bestScore, color: 'text-yellow-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass rounded-2xl p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-white/5 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-display font-bold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Interview List */}
        <div>
          <h2 className="font-display text-lg font-bold text-white mb-4">Interview History</h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : interviews.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center">
              <div className="w-16 h-16 bg-brand-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">No interviews yet</h3>
              <p className="text-white/40 mb-6">Start your first mock interview to see your results here.</p>
              <button onClick={() => navigate('/interview/new')}
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
                Start Interview
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {interviews.map(interview => {
                const verdict = VERDICT_CONFIG[interview.verdict] || {}
                const VIcon = verdict.icon
                const isCompleted = interview.status === 'COMPLETED'
                return (
                  <div key={interview.id}
                    className="glass rounded-2xl p-5 flex items-center gap-5 hover:border-brand-500/30 transition-all duration-200 cursor-pointer group"
                    onClick={() => isCompleted && navigate(`/interview/${interview.id}/report`)}>

                    {isCompleted
                      ? <ScoreRing score={interview.overallScore} />
                      : <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-white/30 text-xs">In Progress</div>
                    }

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-white">{interview.targetRole}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[interview.difficulty] || 'text-white/40 bg-white/5'}`}>
                          {interview.difficulty}
                        </span>
                        {interview.experienceLevel && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                            {interview.experienceLevel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        {interview.startedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(interview.startedAt).toLocaleDateString()}
                          </span>
                        )}
                        {interview.durationSeconds && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {fmtDuration(interview.durationSeconds)}
                          </span>
                        )}
                        {verdict.label && VIcon && (
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${verdict.bg} ${verdict.color}`}>
                            <VIcon className="w-3 h-3" />{verdict.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {isCompleted && (
                      <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-brand-400 transition-colors shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
