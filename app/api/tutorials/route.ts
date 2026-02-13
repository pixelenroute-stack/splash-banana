import { NextRequest, NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings-service'

const SOFTWARE_INFO: Record<string, { name: string; docUrl: string; effects: string }> = {
  'after-effects': {
    name: 'Adobe After Effects',
    docUrl: 'experienceleague.adobe.com/fr/docs/after-effects',
    effects: 'Glow, Fractal Noise, CC Particle World, Particular, Optical Flares, Gaussian Blur, Curves, Levels, Hue/Saturation, Displacement Map, Turbulent Displace, Echo, Time Stretch, Wiggle Expression, Puppet Pin, Roto Brush, 3D Camera Tracker, Lumetri Color, Warp Stabilizer, Motion Tile, CC Radial Blur, Beam, Vegas, Audio Spectrum, Keylight, Minimax, Set Matte, Track Matte',
  },
  'premiere-pro': {
    name: 'Adobe Premiere Pro',
    docUrl: 'experienceleague.adobe.com/fr/docs/premiere-pro',
    effects: 'Lumetri Color (Basic Correction, Creative, Curves, Color Wheels, HSL Secondary, Vignette), Warp Stabilizer, Ultra Key, Crop, Speed/Duration, Gaussian Blur, Cross Dissolve, Dip to Black, Film Dissolve, Audio Gain, Loudness Radar, Essential Graphics (MOGRT), Mask (Opacity, Feather, Expansion), Adjustment Layer, Nested Sequence, Multicam, Proxy Workflow, Audio Track Mixer, Essential Sound Panel, Captions, Auto Reframe',
  },
  'blender': {
    name: 'Blender',
    docUrl: 'docs.blender.org/manual/en/latest',
    effects: 'Shader Editor (Principled BSDF, Glass BSDF, Emission, Mix Shader, Noise Texture, Voronoi Texture, Color Ramp, Bump, Normal Map), Modifier Stack (Subdivision Surface, Mirror, Array, Solidify, Bevel, Boolean, Shrinkwrap, Decimate, Remesh, Lattice), Geometry Nodes (Distribute Points, Instance on Points, Curve to Mesh, Mesh to Curve), Particle System (Hair, Emitter), Physics (Rigid Body, Cloth, Fluid/Mantaflow, Smoke), Compositor (Glare, Bloom, Lens Distortion, Color Balance, Denoise), Cycles/EEVEE Render Settings, UV Mapping, Weight Paint, Sculpt Mode, Grease Pencil',
  },
  'illustrator': {
    name: 'Adobe Illustrator',
    docUrl: 'experienceleague.adobe.com/fr/docs/illustrator',
    effects: 'Pen Tool (Anchor Points, Handles, Convert), Pathfinder (Unite, Minus Front, Intersect, Exclude, Divide, Trim), Shape Builder Tool, Appearance Panel (Fill, Stroke, Effects stacking), Graphic Styles, Pattern Options (Tile Type, Width, Height, Overlap), Mesh Tool (Mesh Points, Colors), Gradient Tool (Linear, Radial, Freeform), Blend Tool (Specified Steps, Distance, Smooth Color), Width Tool (Width Points, Profiles), Warp Effects (Arc, Flag, Wave, Bulge, Shell), 3D Extrude & Bevel (Rotation, Perspective, Surface), Envelope Distort (Warp, Mesh, Top Object), Clipping Mask, Opacity Mask, Live Paint Bucket, Image Trace (Threshold, Paths, Corners, Noise), Symbols Panel, Character/Paragraph Styles, Artboard Tool, Global Swatches, Recolor Artwork',
  },
  'photoshop': {
    name: 'Adobe Photoshop',
    docUrl: 'experienceleague.adobe.com/fr/docs/photoshop',
    effects: 'Layers Panel (Blend Modes: Multiply, Screen, Overlay, Soft Light, Color Dodge, Linear Burn; Opacity, Fill, Layer Styles: Drop Shadow, Bevel & Emboss, Gradient Overlay, Stroke, Inner Glow, Outer Glow), Adjustment Layers (Curves, Levels, Hue/Saturation, Color Balance, Selective Color, Gradient Map, Channel Mixer, Vibrance, Black & White, Photo Filter, Color Lookup/LUT), Masks (Layer Mask, Vector Mask, Clipping Mask, Quick Mask, Refine Edge/Select and Mask), Filters (Gaussian Blur, Motion Blur, Lens Blur, Surface Blur, Liquify, Camera Raw Filter, Oil Paint, High Pass, Unsharp Mask, Neural Filters, Radial Blur), Smart Objects, Smart Filters, Content-Aware (Fill, Scale, Move, Patch), Healing Brush, Spot Healing, Clone Stamp, Dodge/Burn/Sponge, Pen Tool, Custom Brushes (Spacing, Scattering, Shape Dynamics, Transfer), Actions, Batch Processing, Color Range Selection, Select Subject, Sky Replacement',
  },
}

export async function POST(request: NextRequest) {
  const apiKey = await getSetting('gemini_api_key')
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY non configurée. Configurez-la dans Paramètres.' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { software, topic, difficulty } = body

    const info = SOFTWARE_INFO[software]
    if (!info) {
      return NextResponse.json({ success: false, error: `Logiciel non supporté. Utilisez: ${Object.keys(SOFTWARE_INFO).join(', ')}` }, { status: 400 })
    }

    const prompt = `Tu es un expert formateur certifié en ${info.name} avec 15 ans d'expérience. Tu crées des tutoriels professionnels utilisés dans des écoles de design et de post-production.

Génère un tutoriel EXTRÊMEMENT DÉTAILLÉ et PROFESSIONNEL en français sur le sujet : "${topic}"
Niveau de difficulté : ${difficulty || 'intermediate'}

RÈGLES CRITIQUES pour un tutoriel de qualité professionnelle :

1. CHAQUE ÉTAPE doit contenir :
   - Le chemin de menu EXACT (ex: "Effect > Blur & Sharpen > Gaussian Blur" ou "Fenêtre > Propriétés")
   - Les raccourcis clavier entre parenthèses (ex: Ctrl+T, Cmd+Shift+E)
   - Une description détaillée de CE QU'ON FAIT et POURQUOI on le fait
   - Au minimum 4-6 paramètres avec leurs valeurs EXACTES

2. CHAQUE PARAMÈTRE doit contenir :
   - Le nom EXACT tel qu'il apparaît dans l'interface (en anglais si l'interface est en anglais)
   - La valeur PRÉCISE (nombre, pourcentage, mode, etc.)
   - L'unité (px, %, dB, frames, etc.)
   - Une explication de l'IMPACT de ce paramètre sur le résultat

3. RÉFÉRENCES aux bonnes pratiques de la documentation officielle : ${info.docUrl}

4. Le tutoriel doit être suffisamment détaillé pour être suivi PAS À PAS sans aucune autre référence.

Outils et effets disponibles dans ${info.name} : ${info.effects}

Réponds en JSON valide avec ce format exact :
{
  "title": "Titre professionnel du tutoriel",
  "description": "Description détaillée de ce que l'apprenant va réaliser (2-3 phrases)",
  "difficulty": "${difficulty || 'intermediate'}",
  "estimatedTime": "Durée estimée (ex: 45 min, 1h30)",
  "prerequisites": ["Liste des prérequis nécessaires", "Connaissances de base requises"],
  "steps": [
    {
      "order": 1,
      "title": "Titre de l'étape (ex: Configuration du projet)",
      "description": "Description complète avec chemin de menu, raccourci clavier, explication du pourquoi. Minimum 3 phrases détaillées.",
      "parameters": [
        {
          "name": "Nom exact du paramètre/réglage",
          "value": "Valeur précise",
          "unit": "px/% /dB/frames etc.",
          "description": "Explication de l'impact de ce réglage sur le résultat"
        }
      ]
    }
  ]
}

IMPORTANT : Génère au minimum 10 à 15 étapes détaillées avec au minimum 4 paramètres par étape. Chaque description d'étape doit faire au moins 3 phrases. C'est un tutoriel PROFESSIONNEL, pas un guide rapide.`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: 'application/json' },
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
      estimatedTime: tutorial.estimatedTime || '',
      prerequisites: tutorial.prerequisites || [],
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
