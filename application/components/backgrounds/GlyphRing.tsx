// @ts-nocheck
import React, { useLayoutEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, extend } from '@react-three/fiber';
import { GlyphAtlasMaterial } from './materials/GlyphAtlasMaterial';
import { generateProceduralGlyphAtlas } from './utils/glyphGenerator';

// Register the material with R3F to ensure <glyphAtlasMaterial> is recognized
extend({ GlyphAtlasMaterial });

interface GlyphRingProps {
  radius?: number;
  count?: number;
  glyphSize?: number;
  rotationSpeed?: number;
}

export const GlyphRing: React.FC<GlyphRingProps> = ({
  radius = 3.5, // Rayon légèrement supérieur à l'anneau (3.0)
  count = 39,   // Standard Stargate
  glyphSize = 0.4,
  rotationSpeed = 0.05
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Détection Reduce Motion
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Génération des données (Texture + UVs)
  const { texture, uvAttributes } = useMemo(() => {
    return generateProceduralGlyphAtlas(count);
  }, [count]);

  // 2. Initialisation des Instances (Position & Attributs)
  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const tempObject = new THREE.Object3D();
    const activeArray = new Float32Array(count); // Pour stocker l'état "glow"

    for (let i = 0; i < count; i++) {
      // Positionnement en cercle
      const angle = (i / count) * Math.PI * 2;
      
      // x, y sur le cercle
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      tempObject.position.set(x, y, 0.05); // z très légèrement devant l'anneau
      
      // Orientation: Les glyphes regardent le centre (ou la caméra, selon le choix).
      // Ici, on veut qu'ils soient "à plat" sur l'anneau, donc rotation Z alignée avec l'angle.
      tempObject.rotation.z = angle - Math.PI / 2; // -PI/2 pour orienter le "haut" du glyphe vers l'extérieur

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      // Activation aléatoire (pour effet visuel statique initial)
      activeArray[i] = Math.random() > 0.9 ? 1.0 : 0.0;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Ajout de l'attribut aAtlasUV à la géométrie
    meshRef.current.geometry.setAttribute(
      'aAtlasUV',
      new THREE.InstancedBufferAttribute(uvAttributes, 4)
    );

    // Ajout de l'attribut aActive
    meshRef.current.geometry.setAttribute(
      'aActive',
      new THREE.InstancedBufferAttribute(activeArray, 1)
    );

  }, [count, radius, uvAttributes]);

  // 3. Animation
  useFrame((state, delta) => {
    if (reduceMotion) return;

    // Rotation de l'anneau complet (comme le dial)
    if (groupRef.current) {
      groupRef.current.rotation.z -= delta * rotationSpeed;
    }

    // Animation aléatoire de l'activation (Glow)
    // On met à jour l'attribut 'aActive' occasionnellement
    /* 
       Note: Mettre à jour un buffer attribut à chaque frame peut être coûteux.
       Pour un effet "dialing", on pourrait utiliser un uniforme 'uCurrentIndex' dans le shader.
       Ici, on garde simple.
    */
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <planeGeometry args={[glyphSize, glyphSize]} />
        {/* @ts-ignore */}
        <glyphAtlasMaterial
          ref={materialRef}
          uMap={texture}
          uColor={new THREE.Color('#64748b') as any}    // Slate-500 (Base pierre)
          uEmissive={new THREE.Color('#f59e0b') as any} // Amber-500 (Glow)
          uOpacity={0.8}
          transparent
          depthWrite={false}  // Pour éviter z-fighting avec l'anneau
          blending={THREE.NormalBlending}
        />
      </instancedMesh>
    </group>
  );
};