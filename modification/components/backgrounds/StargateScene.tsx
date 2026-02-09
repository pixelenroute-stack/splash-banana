// @ts-nocheck
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import './shaders/portalMaterial'; 
import { GlyphRing } from './GlyphRing'; 

// IMPORTANT: Le shader est enregistré dans './shaders/portalMaterial.ts'
// via extend({ PortalMaterial }). Il est donc disponible en JSX sous <portalMaterial />

const Vortex = () => {
  const materialRef = useRef<any>(null);
  
  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime += delta;
    }
  });

  return (
    // Le vortex est placé légèrement derrière l'anneau (z = -0.1)
    <mesh position={[0, 0, -0.1]}>
      {/* Géométrie circulaire */}
      <circleGeometry args={[2.85, 64]} />
      {/* Matériau Shader personnalisé */}
      <portalMaterial 
        ref={materialRef} 
        transparent 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        uColorStart={new THREE.Color("#0f172a")} // Dark slate
        uColorEnd={new THREE.Color("#06b6d4")}   // Cyan neon
      />
    </mesh>
  );
};

const StargateRing = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Flottement léger de toute la structure
      // Note: <Float> gère déjà une partie, mais on ajoute une rotation subtile
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. Anneau Principal (Métal sombre) */}
      <mesh>
        <torusGeometry args={[3, 0.4, 32, 100]} />
        <meshStandardMaterial 
          color="#1e293b" 
          roughness={0.3} 
          metalness={0.9} 
        />
      </mesh>

      {/* 2. Détails Tech (Wireframe lumineux) */}
      <mesh rotation={[0,0,Math.PI/8]}>
        <torusGeometry args={[3.2, 0.02, 4, 8]} />
        <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.1} />
      </mesh>

      {/* 3. Chevrons (Marqueurs oranges) */}
      {[...Array(9)].map((_, i) => {
        const angle = (i / 9) * Math.PI * 2;
        return (
          <mesh 
            key={i} 
            position={[Math.cos(angle) * 3, Math.sin(angle) * 3, 0.25]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.5, 0.2, 0.1]} />
            <meshStandardMaterial color="#334155" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
        );
      })}

      {/* 4. Le Vortex (Event Horizon) */}
      <Vortex />
      
      {/* 5. L'anneau de Glyphes rotatif (Composant existant) */}
      <GlyphRing radius={3.0} count={39} glyphSize={0.35} rotationSpeed={0.02} />
      
    </group>
  );
};

export const StargateScene = () => {
  // Détection Préférences Mouvement
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <Canvas
      dpr={[1, 1.5]} // Limite DPR pour performance mobile
      camera={{ position: [0, 0, 8], fov: 50 }}
      gl={{ 
        antialias: true, 
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping 
      }}
    >
      <color attach="background" args={['#020617']} /> {/* Fond très sombre */}
      
      {/* Éclairage Scène */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#3b82f6" />
      <pointLight position={[-10, -10, 5]} intensity={0.8} color="#f59e0b" />

      {/* Contenu Flottant */}
      <Float 
        speed={reduceMotion ? 0 : 1.5} 
        rotationIntensity={0.2} 
        floatIntensity={0.5} 
        floatingRange={[-0.1, 0.1]}
      >
        <StargateRing />
      </Float>

      {/* Champ d'étoiles (Fond) */}
      <Stars 
        radius={50} 
        depth={50} 
        count={reduceMotion ? 500 : 3000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={reduceMotion ? 0 : 0.8} 
      />
      
      {/* Brouillard pour fondre la géométrie dans le fond */}
      <fog attach="fog" args={['#020617', 5, 25]} />
    </Canvas>
  );
};

export default StargateScene;
