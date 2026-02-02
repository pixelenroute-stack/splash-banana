import * as THREE from 'three';

/**
 * Génère une texture d'atlas contenant des glyphes procéduraux.
 * Utilisé comme fallback si l'image /public/glyphs/glyph_atlas.png n'existe pas.
 * 
 * @param count Nombre de glyphes (ex: 39)
 * @returns { texture: THREE.CanvasTexture, uvData: Float32Array }
 */
export const generateProceduralGlyphAtlas = (count: number = 39) => {
  // Configuration de l'atlas (Grille)
  const cols = 8;
  const rows = Math.ceil(count / cols);
  const cellSize = 64;
  const width = cols * cellSize;
  const height = rows * cellSize;

  // Création du Canvas offscreen
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not supported');
  }

  // Fond transparent
  ctx.clearRect(0, 0, width, height);
  
  // Style des glyphes
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 4;
  ctx.shadowColor = '#ffffff';

  const uvAttributes: number[] = []; // [u, v, w, h] pour chaque glyphe

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const x = col * cellSize;
    const y = row * cellSize;
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    
    // Dessin d'un glyphe aléatoire "Alien"
    ctx.save();
    ctx.translate(cx, cy);
    
    // Cercle ou Carré de base
    if (Math.random() > 0.5) {
      ctx.beginPath();
      ctx.arc(0, 0, cellSize * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(-cellSize * 0.25, -cellSize * 0.25, cellSize * 0.5, cellSize * 0.5);
    }

    // Lignes internes aléatoires
    ctx.beginPath();
    for (let j = 0; j < 3; j++) {
      ctx.moveTo((Math.random() - 0.5) * cellSize * 0.6, (Math.random() - 0.5) * cellSize * 0.6);
      ctx.lineTo((Math.random() - 0.5) * cellSize * 0.6, (Math.random() - 0.5) * cellSize * 0.6);
    }
    ctx.stroke();
    ctx.restore();

    // Calcul UV (Normalisés 0..1)
    // Three.js UV origin is bottom-left usually, but Canvas is top-left.
    // TextureLoader flips Y by default usually. Let's map standard UVs.
    // v start from bottom (rows are inverted for UV mapping logic usually)
    const u = col / cols;
    const v = 1.0 - ((row + 1) / rows); // Invert Y for GL
    const w = 1.0 / cols;
    const h = 1.0 / rows;

    uvAttributes.push(u, v, w, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter; // Pas de mipmap pour éviter le bleeding sur canvas texture simple

  return { texture, uvAttributes: new Float32Array(uvAttributes) };
};
