import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Vertex Shader: Standard, passe les UVs
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment Shader: Création du tourbillon énergétique procédural
// Inspiré par l'horizon des événements de Stargate (Eau bleue/blanche)
const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColorStart; // Couleur profonde (centre/fond)
  uniform vec3 uColorEnd;   // Couleur énergétique (ondes)
  varying vec2 vUv;

  // Pseudo-random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // 2D Noise function
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    // 1. Centrer les coordonnées UV (-0.5 à 0.5)
    vec2 centeredUv = vUv - 0.5;
    float dist = length(centeredUv);
    
    // 2. Coordonnées polaires
    float angle = atan(centeredUv.y, centeredUv.x);
    
    // 3. Effet de tourbillon (Swirl)
    // L'angle est déformé par la distance et le temps
    float swirlAngle = angle + dist * 8.0 - uTime * 2.0;
    
    // 4. Bruit fluide
    // On échantillonne le bruit avec ces coordonnées déformées
    float n = noise(vec2(dist * 6.0 - uTime * 0.5, swirlAngle));
    
    // 5. Calcul de la couleur
    // Mélange basé sur la distance et le bruit
    vec3 color = mix(uColorStart, uColorEnd, dist * 1.5 + n * 0.4);
    
    // 6. Masque circulaire (Alpha)
    // On rend transparent tout ce qui est en dehors du cercle (radius 0.5)
    // Smoothstep pour l'antialiasing des bords
    float alpha = 1.0 - smoothstep(0.48, 0.5, dist);
    
    // Ajout d'une lueur interne (kawoosh effect static)
    alpha *= smoothstep(0.0, 0.1, dist) + 0.5;

    // Variation d'intensité globale (pulsation légère)
    float pulse = 0.9 + 0.1 * sin(uTime * 3.0);

    gl_FragColor = vec4(color * pulse, alpha);
  }
`;

// Création du matériau R3F
const PortalMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorStart: new THREE.Color('#020617'), // Slate-950 (Fond sombre)
    uColorEnd: new THREE.Color('#0ea5e9'),   // Sky-500 (Ondes lumineuses)
  },
  vertexShader,
  fragmentShader
);

// Enregistrement dans R3F
extend({ PortalMaterial });

export { PortalMaterial };
