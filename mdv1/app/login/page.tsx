'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur de connexion')
        return
      }

      // Store auth token
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      router.push('/dashboard')
    } catch {
      setError('Impossible de se connecter au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden flex items-center justify-center bg-deep-space"
         style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1a2a40 0%, #000000 100%)' }}>

      {/* Starfield */}
      <div className="starfield absolute inset-0 animate-drift z-0" />

      {/* Hex overlay */}
      <div className="hex-overlay absolute inset-0 z-[11]" />

      {/* Planet */}
      <div
        className="absolute w-[300px] h-[300px] rounded-full z-[1] animate-float"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #4a90e2, #001f3f)',
          boxShadow: '0 0 50px rgba(74, 144, 226, 0.2)',
          top: '10%',
          left: '10%',
          transform: 'translateZ(-100px)',
        }}
      />

      {/* Moon */}
      <div
        className="absolute w-20 h-20 rounded-full z-[2] animate-float-reverse"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #d3d3d3, #696969)',
          top: '15%',
          left: '28%',
        }}
      />

      {/* Aurora-class ship */}
      <div className="absolute bottom-[15%] right-[10%] w-[250px] h-[150px] z-[2] animate-ship-hover"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
          border: '1px solid var(--gold-accent)',
          clipPath: 'polygon(10% 0, 100% 20%, 90% 100%, 0% 80%)',
          backdropFilter: 'blur(2px)',
        }}>
        <span className="absolute -bottom-5 right-0 text-[10px] text-gold-accent tracking-[2px]">
          CLASS AURORA DETECTED
        </span>
      </div>

      {/* Stargate */}
      <div className="absolute z-[1] w-[600px] h-[600px] flex items-center justify-center opacity-80">
        {/* Ring */}
        <div
          className="w-full h-full rounded-full relative animate-spin-slow"
          style={{
            border: '15px solid #3a4a5a',
            boxShadow: '0 0 30px var(--lantean-blue), inset 0 0 20px black',
          }}
        >
          {/* Symbols */}
          <div className="absolute w-5 h-5 bg-gold-accent rounded-full top-[10px] left-1/2 -translate-x-1/2"
               style={{ boxShadow: '0 0 10px var(--gold-accent)' }} />
          <div className="absolute w-5 h-5 bg-gold-accent rounded-full bottom-[10px] left-1/2 -translate-x-1/2"
               style={{ boxShadow: '0 0 10px var(--gold-accent)' }} />
          <div className="absolute w-5 h-5 bg-gold-accent rounded-full left-[10px] top-1/2 -translate-y-1/2"
               style={{ boxShadow: '0 0 10px var(--gold-accent)' }} />
          <div className="absolute w-5 h-5 bg-gold-accent rounded-full right-[10px] top-1/2 -translate-y-1/2"
               style={{ boxShadow: '0 0 10px var(--gold-accent)' }} />
        </div>

        {/* Event Horizon */}
        <div
          className="absolute w-[85%] h-[85%] rounded-full animate-pulse-water"
          style={{
            background: 'radial-gradient(circle, rgba(0,229,255,0.8) 0%, rgba(0,100,255,0.4) 70%, transparent 100%)',
            boxShadow: '0 0 60px var(--lantean-blue)',
          }}
        />
      </div>

      {/* Login Panel */}
      <div className="relative z-10 w-[400px] p-10 text-center clip-tech lantean-border"
           style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(15px)' }}>
        {/* Top deco line */}
        <div className="absolute top-0 left-0 w-full h-[2px]"
             style={{ background: 'linear-gradient(90deg, transparent, var(--lantean-blue), transparent)' }} />

        <h1 className="font-orbitron text-lantean-blue text-2xl uppercase tracking-[3px] mb-2"
            style={{ textShadow: '0 0 10px var(--lantean-blue)' }}>
          Splash Banana
        </h1>
        <p className="text-gold-accent text-sm tracking-wider mb-8">
          AUTHORIZATION CODE: ATLANTIS
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-5">
            <input
              type="email"
              placeholder="IDENTIFIANT (Email)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-3 bg-black/40 border border-[#334] border-l-[3px] border-l-lantean-blue text-white font-rajdhani text-lg outline-none transition-all duration-300 focus:bg-[rgba(0,229,255,0.1)] focus:shadow-[0_0_15px_rgba(0,229,255,0.3)] focus:border-l-gold-accent placeholder:text-muted"
            />
          </div>

          <div className="mb-5">
            <input
              type="password"
              placeholder="CODE D'ACCÈS"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-5 py-3 bg-black/40 border border-[#334] border-l-[3px] border-l-lantean-blue text-white font-rajdhani text-lg outline-none transition-all duration-300 focus:bg-[rgba(0,229,255,0.1)] focus:shadow-[0_0_15px_rgba(0,229,255,0.3)] focus:border-l-gold-accent placeholder:text-muted"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 font-orbitron font-bold uppercase tracking-[2px] text-white cursor-pointer transition-all duration-300 border-none relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_var(--lantean-blue)]"
            style={{
              background: isLoading
                ? 'linear-gradient(45deg, #334, #445)'
                : 'linear-gradient(45deg, #005f73, #0a9396)',
            }}
          >
            {isLoading ? 'CONNEXION...' : 'ENCLENCHER'}
          </button>

          <div className="mt-5 flex justify-between text-sm">
            <a href="#" className="text-muted transition-colors duration-300 hover:text-lantean-blue hover:[text-shadow:0_0_5px_var(--lantean-blue)]">
              Mot de passe oublié ?
            </a>
            <a href="#" className="text-muted transition-colors duration-300 hover:text-lantean-blue hover:[text-shadow:0_0_5px_var(--lantean-blue)]">
              Créer un compte
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
