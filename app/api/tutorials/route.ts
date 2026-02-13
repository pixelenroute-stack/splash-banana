import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const SOFTWARE_INFO: Record<string, { name: string; effects: string }> = {
  'after-effects': {
    name: 'Adobe After Effects',
    effects: 'Glow, Fractal Noise, CC Particle World, Particular, Optical Flares, Gaussian Blur, Curves, Levels, Hue/Saturation, Displacement Map, Turbulent Displace, Echo, Time Stretch, Wiggle Expression, Puppet Pin, Roto Brush, 3D Camera Tracker, Lumetri Color',
  },
  'premiere-pro': {
    name: 'Adobe Premiere Pro',
    effects: 'Lumetri Color, Warp Stabilizer, Ultra Key, Crop, Speed/Duration, Gaussian Blur, Cross Dissolve, Dip to Black, Film Dissolve, Audio Gain, Loudness Radar, Essential Graphics, Mask, Adjustment Layer, Nested Sequence, Multicam, Proxy Workflow',
  },
  'blender': {
    name: 'Blender',
    effects: 'Shader Editor (Principled BSDF, Glass, Emission, Mix Shader), Modifier Stack (Subdivision Surface, Mirror, Array, Solidify, Bevel, Boolean, Shrinkwrap), Geometry Nodes, Particle System (Hair, Emitter), Physics (Rigid Body, Cloth, Fluid), Compositor (Glare, Bloom, Lens Distortion, Color Balance), Cycles/EEVEE Render Settings, UV Mapping, Weight Paint',
  },
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY non configurée' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { software, topic, difficulty } = body

    const info = SOFTWARE_INFO[software]
    if (!info) {
      return NextResponse.json({ success: false, error: 'Logiciel non supporté. Utilisez: after-effects, premiere-pro, blender' }, { status: 400 })
    }

    const prompt = `Tu es un expert formateur en ${info.name}. Génère un tutoriel TRÈS DÉTAILLÉ en français sur le sujet : "${topic}".

Niveau de difficulté : ${difficulty || 'intermediate'}

IMPORTANT : Pour CHAQUE étape, tu DOIS donner les paramètres EXACTS des effets/outils utilisés. Par exemple :
- Nom de l'effet/outil exact
- Chaque paramètre avec sa valeur précise (ex: "Blur Radius: 15px", "Opacity: 75%", "Frequency: 3.5")
- Les raccourcis clavier
- Les chemins de menu exacts

Effets et outils disponibles dans ${info.name} : ${info.effects}

Réponds en JSON valide avec ce format exact :
{
  "title": "Titre du tutoriel",
  "description": "Description courte",
  "difficulty": "${difficulty || 'intermediate'}",
  "steps": [
    {
      "order": 1,
      "title": "Titre de l'étape",
      "description": "Description détaillée de l'étape avec les instructions précises",
      "parameters": [
        {
          "name": "Nom du paramètre ou effet",
          "value": "Valeur exacte",
          "unit": "px/% etc",
          "description": "Explication du paramètre"
        }
      ]
    }
  ]
}

Génère au minimum 8 étapes détaillées avec au moins 3 paramètres par étape.`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ success: false, error: `Gemini error: ${err}` }, { status: res.status })
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

    let tutorial
    try {
      tutorial = JSON.parse(text)
    } catch {
      tutorial = { title: topic, description: '', difficulty: difficulty || 'intermediate', steps: [] }
    }

    const result = {
      id: `TUT-${Date.now()}`,
      software,
      title: tutorial.title || topic,
      description: tutorial.description || '',
      difficulty: tutorial.difficulty || difficulty || 'intermediate',
      steps: (tutorial.steps || []).map((s: Record<string, unknown>, i: number) => ({
        order: s.order || i + 1,
        title: s.title || `Étape ${i + 1}`,
        description: s.description || '',
        parameters: (s.parameters as Array<Record<string, unknown>>) || [],
      })),
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur tutoriel'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
