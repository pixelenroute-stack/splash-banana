'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import type { ChatMessage } from '@/types'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini',
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content || data.error || 'Erreur de réponse',
        timestamp: new Date().toISOString(),
        model: data.model,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Erreur de connexion au serveur',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Chat IA - Gemini</h1>
          <p className="text-xs text-muted">Assistant IA propulse par Gemini 2.5 Flash</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <Bot className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg">Commencez une conversation</p>
            <p className="text-sm mt-1">Posez une question a l&apos;assistant IA</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-lantean-blue" />
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-lg px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary/20 text-white'
                  : 'bg-surface text-white'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.model && (
                <p className="text-[10px] text-muted mt-2">{msg.model}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gold-accent/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gold-accent" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-lantean-blue animate-spin" />
            </div>
            <div className="bg-surface rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ecrivez votre message..."
            className="flex-1 px-4 py-3 bg-surface border border-border rounded-lg text-white placeholder:text-muted outline-none focus:border-lantean-blue transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-primary/20 text-lantean-blue rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
