import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

/**
 * GlyphAtlasMaterial
 * Permet de rendre des instances avec des zones UV différentes (Atlas)
 * et de gérer une couleur émissive.
 */

const vertexShader = `
  attribute vec4 aAtlasUV; // [u, v, width, height] par instance
  attribute float aActive; // 0.0 ou 1.0 par instance
  
  varying vec2 vUv;
  varying float vActive;

  void main() {
    // Calcul des UVs basés sur l'atlas
    // uv est l'UV standard du PlaneGeometry (0..1)
    // On le mappe vers la sous-région de l'atlas
    vUv = uv * aAtlasUV.zw + aAtlasUV.xy;
    
    vActive = aActive;

    vec4 modelViewPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const fragmentShader = `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform vec3 uEmissive;
  uniform float uOpacity;
  
  varying vec2 vUv;
  varying float vActive;

  void main() {
    vec4 texColor = texture2D(uMap, vUv);
    
    // Si la texture est transparente (alpha < 0.1), on discard ou on réduit
    if (texColor.a < 0.1) discard;

    // Mix couleur de base + emission si actif
    vec3 finalColor = mix(uColor, uEmissive, vActive * 0.8);
    
    // Application de la texture (en assumant que la texture est blanche avec alpha)
    // ou colorée. Ici on teinte la texture.
    gl_FragColor = vec4(finalColor * texColor.rgb, texColor.a * uOpacity);
    
    // Ajout d'un glow artificiel si actif
    if (vActive > 0.5) {
      gl_FragColor.rgb += uEmissive * 0.5;
    }
  }
`;

const GlyphAtlasMaterial = shaderMaterial(
  {
    uMap: new THREE.Texture(), // Texture vide par défaut
    uColor: new THREE.Color('#94a3b8'), // Gris pierre (Slate-400)
    uEmissive: new THREE.Color('#f59e0b'), // Orange/Ambre (Accent)
    uOpacity: 0.9,
  },
  vertexShader,
  fragmentShader
);

extend({ GlyphAtlasMaterial });

export { GlyphAtlasMaterial };
