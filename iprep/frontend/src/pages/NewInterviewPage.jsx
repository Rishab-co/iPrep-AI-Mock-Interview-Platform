import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { interviewService } from '../services/interviewService'
import { Zap, ArrowLeft, ArrowRight, Briefcase, GraduationCap, Target } from 'lucide-react'

const ROLES = [
  "Java Full Stack Developer","Frontend Developer","Backend Developer",
  "React Developer","Spring Boot Engineer","DevOps Engineer",
  "Data Engineer","Machine Learning Engineer","Software Engineer",
  "System Design Architect"
]

const LEVELS    = ["FRESHER","MID","SENIOR"]
const DIFFS     = ["EASY","MEDIUM","HARD"]
const Q_COUNTS  = [3, 5, 7, 10]

const LEVEL_DESC = {
  FRESHER: "0–2 years experience",
  MID:     "2–5 years experience",
  SENIOR:  "5+ years experience",
}
const DIFF_DESC = {
  EASY:   "Conceptual & fundamentals",
  MEDIUM: "Applied & problem-solving",
  HARD:   "Advanced & system design",
}

export default function NewInterviewPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    targetRole: 'Java Full Stack Developer',
    experienceLevel: 'MID',
    difficulty: 'MEDIUM',
    questionCount: 5,
  })
  const [customRole, setCustomRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const start = async () => {
    setLoading(true); setError('')
    const role = form.targetRole === '__custom__' ? customRole : form.targetRole
    try {
      const { data } = await interviewService.start(
        role, form.experienceLevel, form.difficulty, form.questionCount)
      navigate(`/interview/${data.interviewId}/live`, { state: { startData: data } })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start interview')
      setLoading(false)
    }
  }

  const steps = [
    {
      icon: Briefcase,
      title: "Choose your role",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROLES.map(r => (
              <button key={r} onClick={() => set('targetRole', r)}
                className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                  form.targetRole === r
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-white/10 bg-white/3 text-white/60 hover:border-white/20 hover:text-white/80'
                }`}>{r}
              </button>
            ))}
            <button onClick={() => set('targetRole', '__custom__')}
              className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                form.targetRole === '__custom__'
                  ? 'border-brand-500 bg-brand-500/10 text-white'
                  : 'border-white/10 bg-white/3 text-white/60 hover:border-white/20'
              }`}>Custom role…</button>
          </div>
          {form.targetRole === '__custom__' && (
            <input value={customRole} onChange={e => setCustomRole(e.target.value)}
              placeholder="e.g. iOS Developer"
              className="w-full bg-surface-800 border border-brand-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-500"
            />
          )}
        </div>
      )
    },
    {
      icon: GraduationCap,
      title: "Experience & difficulty",
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-white/50 text-sm mb-3 font-medium">Experience Level</p>
            <div className="grid grid-cols-3 gap-3">
              {LEVELS.map(l => (
                <button key={l} onClick={() => set('experienceLevel', l)}
                  className={`p-4 rounded-xl border text-center transition-all duration-150 ${
                    form.experienceLevel === l
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-white/10 bg-white/3 hover:border-white/20'
                  }`}>
                  <p className="font-semibold text-white text-sm">{l}</p>
                  <p className="text-xs text-white/40 mt-1">{LEVEL_DESC[l]}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white/50 text-sm mb-3 font-medium">Difficulty</p>
            <div className="grid grid-cols-3 gap-3">
              {DIFFS.map(d => (
                <button key={d} onClick={() => set('difficulty', d)}
                  className={`p-4 rounded-xl border text-center transition-all duration-150 ${
                    form.difficulty === d
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-white/10 bg-white/3 hover:border-white/20'
                  }`}>
                  <p className="font-semibold text-white text-sm">{d}</p>
                  <p className="text-xs text-white/40 mt-1">{DIFF_DESC[d]}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      icon: Target,
      title: "Number of questions",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Q_COUNTS.map(n => (
              <button key={n} onClick={() => set('questionCount', n)}
                className={`p-6 rounded-xl border text-center transition-all duration-150 ${
                  form.questionCount === n
                    ? 'border-brand-500 bg-brand-500/10 glow-brand'
                    : 'border-white/10 bg-white/3 hover:border-white/20'
                }`}>
                <p className="text-3xl font-display font-bold text-white">{n}</p>
                <p className="text-xs text-white/40 mt-1">
                  {n <= 3 ? 'Quick' : n <= 5 ? 'Standard' : n <= 7 ? 'Thorough' : 'Full'}
                </p>
              </button>
            ))}
          </div>
          {/* Summary */}
          <div className="mt-6 glass-light rounded-xl p-4 space-y-2">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Summary</p>
            <p className="text-white font-semibold">
              {form.targetRole === '__custom__' ? (customRole || 'Custom Role') : form.targetRole}
            </p>
            <p className="text-white/60 text-sm">
              {form.experienceLevel} · {form.difficulty} · {form.questionCount} questions
            </p>
          </div>
        </div>
      )
    }
  ]

  const currentStep = steps[step]
  const Icon = currentStep.icon
  const canNext = step < steps.length - 1
  const isLast  = step === steps.length - 1
  const roleOk  = form.targetRole !== '__custom__' || customRole.trim().length > 1

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-600/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Back */}
        <button onClick={() => step === 0 ? navigate('/dashboard') : setStep(s => s - 1)}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> {step === 0 ? 'Dashboard' : 'Back'}
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-brand-500' : 'bg-white/10'}`} />
          ))}
        </div>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-brand-400" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white">{currentStep.title}</h2>
          </div>

          {currentStep.content}

          {error && (
            <p className="mt-4 text-red-400 text-sm">{error}</p>
          )}

          <div className="flex justify-end mt-8">
            {canNext ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!roleOk}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={start} disabled={loading || !roleOk}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl transition-all glow-brand">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Preparing…</>
                  : <><Zap className="w-4 h-4" /> Start Interview</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
