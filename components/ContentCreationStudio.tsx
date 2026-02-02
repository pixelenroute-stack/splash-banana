import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { Send, Bot, User, Loader2, Image as ImageIcon, Video, AlertTriangle, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

export const ContentCreationStudio: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
        id: '0', 
        role: 'system', 
        text: 'Bienvenue dans le Studio de Création. Je suis connecté aux agents Banana Pro (Images) et Veo 3.1 (Vidéos). Que voulez-vous créer ?', 
        timestamp: new Date(),
        modelUsed: 'Studio Director'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const geminiRef = useRef(new GeminiService());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        // Logique de routing simple pour la démo
        // Si le prompt contient "image", on appelle Banana. Si "vidéo", Veo. Sinon chat.
        const lowerInput = userMsg.text.toLowerCase();
        let responseText = '';
        let toolResult: any = null;
        let modelUsed = 'Gemini 3 Pro';

        if (lowerInput.includes('image') || lowerInput.includes('dessine') || lowerInput.includes('photo')) {
            modelUsed = 'Banana Pro (Image)';
            setMessages(prev => [...prev, { id: 'temp', role: 'assistant', text: 'Génération de l\'image en cours avec Nano Banana Pro...', timestamp: new Date(), isLoading: true }]);
            
            const imageUrl = await geminiRef.current.generateImage(userMsg.text, '1:1');
            responseText = "Voici l'image générée :";
            toolResult = { type: 'image', url: imageUrl };
            
            // Remove temp loading message
            setMessages(prev => prev.filter(m => m.id !== 'temp'));

        } else if (lowerInput.includes('vidéo') || lowerInput.includes('video') || lowerInput.includes('film')) {
            modelUsed = 'Veo 3.1 (Video)';
            setMessages(prev => [...prev, { id: 'temp', role: 'assistant', text: 'Génération de la vidéo en cours avec Veo 3.1 (cela peut prendre quelques instants)...', timestamp: new Date(), isLoading: true }]);
            
            try {
                const videoUrl = await geminiRef.current.generateVideo(userMsg.text);
                responseText = "Voici la vidéo générée :";
                toolResult = { type: 'video', url: videoUrl };
            } catch (e) {
                responseText = "Erreur lors de la génération vidéo. Vérifiez que vous avez sélectionné une clé API valide dans l'interface Veo.";
            }
            
            setMessages(prev => prev.filter(m => m.id !== 'temp'));

        } else {
            // Chat standard
            const res = await geminiRef.current.sendMessage(userMsg.text);
            responseText = res.text || "Je n'ai pas compris.";
        }

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            text: responseText,
            timestamp: new Date(),
            modelUsed: modelUsed,
            toolResponse: toolResult ? { id: 'gen', name: 'generation', result: toolResult } : undefined
        }]);

    } catch (error) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            text: "Une erreur est survenue lors du traitement.",
            timestamp: new Date()
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] relative">
      <header className="p-4 border-b border-slate-800 bg-surface/50 backdrop-blur z-10 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Sparkles size={18} className="text-primary"/> Création de Contenu (IA Studio)
          </h2>
          <div className="flex gap-2 text-[10px]">
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-400 border border-slate-700">Images: Banana Pro</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-400 border border-slate-700">Vidéo: Veo 3.1</span>
          </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/10 shadow-inner
              ${msg.role === 'assistant' ? 'bg-indigo-600' : 'bg-slate-700'}`}>
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>

            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-2xl text-sm shadow-xl border relative group
                  ${msg.role === 'user' ? 'bg-primary text-white border-primary/20' : 'bg-surface text-slate-200 border-slate-700'}
                  ${msg.isLoading ? 'animate-pulse' : ''}`}>
                  
                  {msg.modelUsed && (
                      <span className="absolute -top-5 left-1 text-[9px] text-slate-500 uppercase font-bold tracking-widest bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                          Agent : {msg.modelUsed}
                      </span>
                  )}

                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                  {/* MEDIA DISPLAY */}
                  {msg.toolResponse && msg.toolResponse.result && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-slate-600 shadow-lg">
                          {msg.toolResponse.result.type === 'image' ? (
                              <img src={msg.toolResponse.result.url} className="w-full h-auto max-h-[400px] object-contain bg-black"/>
                          ) : (
                              <div className="relative">
                                  <video src={msg.toolResponse.result.url} controls className="w-full h-auto max-h-[400px] bg-black"/>
                                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-[10px]">Veo Generated</div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
              <span className="text-[10px] text-slate-500 px-2">{msg.timestamp.toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre d'input */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent backdrop-blur-sm border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto flex gap-2 items-end bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl focus-within:border-primary/50 transition-all">
            <button className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-lg" title="Générer Image"><ImageIcon size={20}/></button>
            <button className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-lg" title="Générer Vidéo"><Video size={20}/></button>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                placeholder="Décrivez ce que vous voulez créer (ex: 'Génère une image de chat cyberpunk' ou 'Crée une vidéo de drone')..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 text-sm py-2 resize-none h-10 min-h-[40px] max-h-120px scrollbar-hide"
                rows={1}
            />
            <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-xl transition-all shadow-lg ${!input.trim() || isLoading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-primary hover:bg-blue-600 text-white active:scale-95'}`}>
                {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
            </button>
        </div>
      </div>
    </div>
  );
};