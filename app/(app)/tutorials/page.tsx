'use client'

import { useState, FormEvent } from 'react'
import { GraduationCap, Loader2, ChevronDown, ChevronRight, Wand2, AlertCircle, Clock, BookOpen, Keyboard } from 'lucide-react'
import type { Tutorial, TutorialStep } from '@/types'

const SOFTWARE_OPTIONS = [
  { id: 'after-effects', label: 'After Effects', color: 'bg-purple-500/10 text-purple-400', icon: '🎬' },
  { id: 'premiere-pro', label: 'Premiere Pro', color: 'bg-blue-500/10 text-blue-400', icon: '🎞️' },
  { id: 'blender', label: 'Blender', color: 'bg-orange-500/10 text-orange-400', icon: '🧊' },
  { id: 'illustrator', label: 'Illustrator', color: 'bg-amber-500/10 text-amber-400', icon: '✏️' },
  { id: 'photoshop', label: 'Photoshop', color: 'bg-sky-500/10 text-sky-400', icon: '🖼️' },
]

const DIFFICULTY_OPTIONS = [
  { id: 'beginner', label: 'Debutant', color: 'bg-green-500/10 text-green-400' },
  { id: 'intermediate', label: 'Intermediaire', color: 'bg-yellow-500/10 text-yellow-400' },
  { id: 'advanced', label: 'Avance', color: 'bg-red-500/10 text-red-400' },
]

const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  'after-effects': [
    'Creer un effet glitch/distortion sur du texte',
    'Animation de particules avec CC Particle World',
    'Creer un effet neon lumineux (Glow)',
    'Compositing 3D avec camera tracker',
    'Transitions fluides avec Displacement Map',
    'Motion Graphics: infographie animee',
    'Effet de fumee et brouillard realiste',
    'Animation de logo cinematique',
  ],
  'premiere-pro': [
    'Etalonnage couleur cinematique avec Lumetri',
    'Montage multicam professionnel',
    'Creer des titres animes avec Essential Graphics',
    'Stabilisation video avec Warp Stabilizer',
    'Masquage et tracking d\'objets',
    'Workflow de montage avec proxys',
    'Incrustation fond vert (Ultra Key)',
    'Correction audio et mixage professionnel',
  ],
  'blender': [
    'Modelisation d\'un personnage low-poly',
    'Creation de materiaux PBR realistes (Shader Editor)',
    'Animation de fluide realiste (Mantaflow)',
    'Geometry Nodes: environnement procedural',
    'Sculpture organique avec multires',
    'Rendu photorealiste Cycles (eclairage et compositing)',
    'Simulation de tissu et vetements',
    'Rigging et animation de personnage',
  ],
  'illustrator': [
    'Creer un logo vectoriel professionnel',
    'Illustration isometrique 3D',
    'Typographie creative avec effets',
    'Motif seamless pour textile',
    'Icones flat design pour application',
    'Infographie data visualization',
    'Illustration de personnage cartoon',
    'Affiche evenementielle avec grille',
  ],
  'photoshop': [
    'Retouche portrait beaute professionnelle',
    'Compositing photo manipulation fantastique',
    'Creation de mockup produit realiste',
    'Effet double exposition cinematique',
    'Restauration et colorisation photo ancienne',
    'Digital painting paysage concept art',
    'Design banniere web responsive',
    'Effet texte 3D metallique',
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
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    if (!topic.trim() || isGenerating) return

    setIsGenerating(true)
    setError(null)
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
      } else {
        setError(data.error || 'Erreur lors de la generation du tutoriel')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion au serveur')
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

  function expandAllSteps(tutorial: Tutorial) {
    setExpandedSteps(new Set(tutorial.steps.map((s) => s.order)))
  }

  function collapseAllSteps() {
    setExpandedSteps(new Set())
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tutoriels Creator Studio</h1>
        <p className="text-muted text-sm mt-1">Generation de tutoriels detailles avec parametres exacts pour 5 logiciels professionnels</p>
      </div>

      {/* Software selector */}
      <div className="flex flex-wrap gap-3">
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
            <span>{isGenerating ? 'Generation...' : 'Generer'}</span>
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

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">Erreur de generation</p>
            <p className="text-sm text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tutorial list */}
      {tutorials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <GraduationCap className="w-12 h-12 mb-4 opacity-30" />
          <p>Generez votre premier tutoriel</p>
          <p className="text-xs mt-2 opacity-60">Selectionnez un logiciel, entrez un sujet et cliquez sur Generer</p>
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
                  onClick={() => {
                    setExpandedTutorial(isExpanded ? null : tut.id)
                    if (!isExpanded) setExpandedSteps(new Set())
                  }}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sw?.color || ''}`}>
                        {sw?.icon} {sw?.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${diff?.color || ''}`}>
                        {diff?.label}
                      </span>
                      {tut.estimatedTime && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {tut.estimatedTime}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {tut.steps.length} etapes
                      </span>
                    </div>
                    <h3 className="font-bold text-lg">{tut.title}</h3>
                    <p className="text-sm text-muted mt-1">{tut.description}</p>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-muted flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-muted flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="mt-4 border-t border-border pt-4 space-y-4">
                    {/* Prerequisites section */}
                    {tut.prerequisites && tut.prerequisites.length > 0 && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Prerequis
                        </h4>
                        <ul className="space-y-1">
                          {tut.prerequisites.map((prereq, i) => (
                            <li key={i} className="text-sm text-amber-400/80 flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">-</span>
                              {prereq}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Expand/Collapse all */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => expandAllSteps(tut)}
                        className="text-xs px-3 py-1.5 bg-surface border border-border rounded-lg text-muted hover:text-white transition-colors"
                      >
                        Tout deplier
                      </button>
                      <button
                        onClick={collapseAllSteps}
                        className="text-xs px-3 py-1.5 bg-surface border border-border rounded-lg text-muted hover:text-white transition-colors"
                      >
                        Tout replier
                      </button>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      {tut.steps.map((step) => (
                        <StepCard
                          key={step.order}
                          step={step}
                          isExpanded={expandedSteps.has(step.order)}
                          onToggle={() => toggleStep(step.order)}
                        />
                      ))}
                    </div>
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
    <div className="bg-background/50 rounded-lg border border-border/50 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface/30 transition-colors">
        <div className="w-8 h-8 rounded-full bg-lantean-blue/20 text-lantean-blue flex items-center justify-center text-sm font-bold flex-shrink-0">
          {step.order}
        </div>
        <span className="font-medium text-sm flex-1">{step.title}</span>
        {step.parameters && step.parameters.length > 0 && (
          <span className="text-xs text-muted bg-surface/50 px-2 py-0.5 rounded-full flex-shrink-0">
            {step.parameters.length} params
          </span>
        )}
        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Step description */}
          <p className="text-sm text-muted pl-11 leading-relaxed">{step.description}</p>

          {/* Parameters table */}
          {step.parameters && step.parameters.length > 0 && (
            <div className="ml-11">
              <div className="flex items-center gap-2 mb-2">
                <Keyboard className="w-3.5 h-3.5 text-gold-accent" />
                <p className="text-xs text-gold-accent font-semibold uppercase tracking-wide">Parametres & Reglages</p>
              </div>
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface/60 border-b border-border/50">
                      <th className="text-left px-3 py-2 text-muted font-medium w-[200px]">Parametre</th>
                      <th className="text-left px-3 py-2 text-muted font-medium w-[140px]">Valeur</th>
                      <th className="text-left px-3 py-2 text-muted font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.parameters.map((param, i) => (
                      <tr key={i} className={`border-b border-border/30 last:border-b-0 ${i % 2 === 0 ? 'bg-background/30' : 'bg-surface/20'}`}>
                        <td className="px-3 py-2 font-mono text-lantean-blue font-medium align-top">{param.name}</td>
                        <td className="px-3 py-2 text-gold-accent font-bold align-top whitespace-nowrap">
                          {param.value}{param.unit ? ` ${param.unit}` : ''}
                        </td>
                        <td className="px-3 py-2 text-muted align-top leading-relaxed">
                          {param.description || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
