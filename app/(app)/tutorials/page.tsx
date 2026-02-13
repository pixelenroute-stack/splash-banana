'use client'

import { useState, FormEvent } from 'react'
import { GraduationCap, Loader2, ChevronDown, ChevronRight, Wand2 } from 'lucide-react'
import type { Tutorial, TutorialStep } from '@/types'

const SOFTWARE_OPTIONS = [
  { id: 'after-effects', label: 'After Effects', color: 'bg-purple-500/10 text-purple-400', icon: '🎬' },
  { id: 'premiere-pro', label: 'Premiere Pro', color: 'bg-blue-500/10 text-blue-400', icon: '🎞️' },
  { id: 'blender', label: 'Blender', color: 'bg-orange-500/10 text-orange-400', icon: '🧊' },
]

const DIFFICULTY_OPTIONS = [
  { id: 'beginner', label: 'Débutant', color: 'bg-green-500/10 text-green-400' },
  { id: 'intermediate', label: 'Intermédiaire', color: 'bg-yellow-500/10 text-yellow-400' },
  { id: 'advanced', label: 'Avancé', color: 'bg-red-500/10 text-red-400' },
]

const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  'after-effects': [
    'Créer un effet glitch/distortion sur du texte',
    'Animation de particules avec CC Particle World',
    'Créer un effet néon lumineux (Glow)',
    'Compositing 3D avec caméra tracker',
    'Transitions fluides avec Displacement Map',
    'Motion Graphics: infographie animée',
    'Effet de fumée et brouillard réaliste',
    'Animation de logo cinématique',
  ],
  'premiere-pro': [
    'Étalonnage couleur cinématique avec Lumetri',
    'Montage multicam professionnel',
    'Créer des titres animés avec Essential Graphics',
    'Stabilisation vidéo avec Warp Stabilizer',
    'Masquage et tracking d\'objets',
    'Workflow de montage avec proxys',
    'Incrustation fond vert (Ultra Key)',
    'Correction audio et mixage professionnel',
  ],
  'blender': [
    'Modélisation d\'un personnage low-poly',
    'Création de matériaux PBR réalistes (Shader Editor)',
    'Animation de fluide réaliste (Mantaflow)',
    'Geometry Nodes: environnement procédural',
    'Sculpture organique avec multires',
    'Rendu photoréaliste Cycles (éclairage et compositing)',
    'Simulation de tissu et vêtements',
    'Rigging et animation de personnage',
  ],
}

export default function TutorialsPage() {
  const [software, setSoftware] = useState<string>('after-effects')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [expandedTutorial, setExpandedTutorial] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!topic.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      const res = await fetch('/api/tutorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ software, topic: topic.trim(), difficulty }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setTutorials((prev) => [data.data, ...prev])
        setExpandedTutorial(data.data.id)
        setExpandedSteps(new Set())
        setTopic('')
      }
    } catch {
      // Error
    } finally {
      setIsGenerating(false)
    }
  }

  function toggleStep(stepOrder: number) {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepOrder)) next.delete(stepOrder)
      else next.add(stepOrder)
      return next
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tutoriels Creator Studio</h1>
        <p className="text-muted text-sm mt-1">Génération de tutoriels détaillés avec paramètres exacts</p>
      </div>

      {/* Software selector */}
      <div className="flex gap-3">
        {SOFTWARE_OPTIONS.map((sw) => (
          <button
            key={sw.id}
            onClick={() => setSoftware(sw.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
              software === sw.id
                ? 'border-lantean-blue bg-primary/20 text-white'
                : 'border-border bg-surface text-muted hover:text-white hover:border-border'
            }`}
          >
            <span>{sw.icon}</span>
            <span className="text-sm font-medium">{sw.label}</span>
          </button>
        ))}
      </div>

      {/* Generator form */}
      <form onSubmit={handleGenerate} className="card space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={`Sujet du tutoriel ${SOFTWARE_OPTIONS.find((s) => s.id === software)?.label}...`}
            className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-4 py-3 bg-background border border-border rounded-lg text-white outline-none focus:border-lantean-blue"
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            <span>{isGenerating ? 'Génération...' : 'Générer'}</span>
          </button>
        </div>

        {/* Topic suggestions */}
        <div>
          <p className="text-xs text-muted mb-2">Suggestions :</p>
          <div className="flex flex-wrap gap-2">
            {(TOPIC_SUGGESTIONS[software] || []).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTopic(s)}
                className="text-xs px-3 py-1.5 bg-surface border border-border rounded-full text-muted hover:text-white hover:border-lantean-blue transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Tutorial list */}
      {tutorials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <GraduationCap className="w-12 h-12 mb-4 opacity-30" />
          <p>Générez votre premier tutoriel</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tutorials.map((tut) => {
            const sw = SOFTWARE_OPTIONS.find((s) => s.id === tut.software)
            const diff = DIFFICULTY_OPTIONS.find((d) => d.id === tut.difficulty)
            const isExpanded = expandedTutorial === tut.id

            return (
              <div key={tut.id} className="card">
                <button
                  onClick={() => setExpandedTutorial(isExpanded ? null : tut.id)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sw?.color || ''}`}>
                        {sw?.icon} {sw?.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${diff?.color || ''}`}>
                        {diff?.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg">{tut.title}</h3>
                    <p className="text-sm text-muted mt-1">{tut.description}</p>
                    <p className="text-xs text-muted mt-1">{tut.steps.length} étapes</p>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-muted" /> : <ChevronRight className="w-5 h-5 text-muted" />}
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    {tut.steps.map((step) => (
                      <StepCard
                        key={step.order}
                        step={step}
                        isExpanded={expandedSteps.has(step.order)}
                        onToggle={() => toggleStep(step.order)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StepCard({ step, isExpanded, onToggle }: { step: TutorialStep; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-background/50 rounded-lg border border-border/50">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        <div className="w-7 h-7 rounded-full bg-lantean-blue/20 text-lantean-blue flex items-center justify-center text-sm font-bold flex-shrink-0">
          {step.order}
        </div>
        <span className="font-medium text-sm flex-1">{step.title}</span>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-sm text-muted pl-10">{step.description}</p>
          {step.parameters && step.parameters.length > 0 && (
            <div className="ml-10">
              <p className="text-xs text-gold-accent font-medium mb-2">Paramètres :</p>
              <div className="grid gap-1.5">
                {step.parameters.map((param, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-surface/50 rounded px-3 py-2">
                    <span className="font-mono text-lantean-blue font-medium min-w-[140px]">{param.name}</span>
                    <span className="text-gold-accent font-bold">{param.value}{param.unit ? ` ${param.unit}` : ''}</span>
                    {param.description && <span className="text-muted ml-2">— {param.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
