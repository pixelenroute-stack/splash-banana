
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot, User, Loader2, Globe, Wrench } from 'lucide-react';
import { ChatMessage } from '../types';
import { n8nAgentService } from '../lib/n8nAgentService';
import { db } from '../services/mockDatabase';
import { executeToolByName, toolRegistry } from '../services/toolRegistry';
import { useNotification } from '../context/NotificationContext';
import { geminiService } from '../services/geminiService'; // Used for media generation fallback if needed

export const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
        id: '0', 
        role: 'system', 
        text: 'Agent de Production connecté via Webhooks n8n.', 
        timestamp: new Date(),
        modelUsed: 'System'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settings = db.getSystemSettings();
  const { notify } = useNotification();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // --- LOGIQUE COMMUNE ---
  const processMessageLogic = async (text: string): Promise<ChatMessage> => {
      const lowerInput = text.toLowerCase();
      let responseText = "";
      let agentUsed: string = "n8n Workflow";
      let toolResult: any = null;

      try {
        // 1. ROUTAGE MÉDIA (Client Side Fallback or N8N Intent)
        const isMediaIntent = 
            lowerInput.includes('créer une image') || 
            lowerInput.includes('génère une image') ||
            lowerInput.includes('créer une vidéo') ||
            lowerInput.includes('génère une vidéo') ||
            lowerInput.includes('dessine');

        if (isMediaIntent) {
            agentUsed = 'Media Factory';
            if (lowerInput.includes('vidéo') || lowerInput.includes('video')) {
                const videoUrl = await geminiService.generateVideo(text);
                responseText = "J'ai lancé la génération de votre vidéo avec Veo. Voici le résultat :";
                toolResult = { type: 'video', url: videoUrl };
            } else {
                const imageUrl = await geminiService.generateImage(text, '1:1');
                responseText = "Voici l'image générée avec Banana Pro :";
                toolResult = { type: 'image', url: imageUrl };
            }
        } 
        // 2. ROUTAGE STANDARD N8N
        else {
            const n8nRes = await n8nAgentService.sendMessage("user_1", text);
            if (n8nRes.status === 'success') {
                responseText = n8nRes.response;
                agentUsed = 'n8n Workflow';
            } else {
                throw new Error("Erreur de communication avec n8n. Vérifiez le webhook en Production.");
            }
        }

        // 3. Traitement post-réponse (Outils)
        if (responseText) {
            const jsonMatch = responseText.match(/\{[\s\S]*"tool"[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const toolCall = JSON.parse(jsonMatch[0]);
                    if (toolCall.tool && toolRegistry[toolCall.tool]) {
                        const result = await executeToolByName(toolCall.tool, toolCall.args || {}, notify);
                        toolResult = result.result;
                        responseText = responseText.replace(/\{[\s\S]*"tool"[\s\S]*\}/, '') + `\n[Action: ${toolCall.tool} exécutée]`;
                    }
                } catch (e) {
                    console.warn("Échec parsing outil", e);
                }
            }
        }

        return {
            id: Date.now().toString(),
            role: 'assistant',
            text: responseText.trim() || (toolResult ? "Média généré ci-dessous." : "Action effectuée."),
            timestamp: new Date(),
            modelUsed: agentUsed,
            toolResponse: toolResult ? { id: 'media', name: 'generation', result: toolResult } : undefined
        };

      } catch (error) {
          return {
            id: Date.now().toString(),
            role: 'assistant',
            text: `⚠️ Erreur : ${(error as Error).message}`,
            timestamp: new Date()
          };
      }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
      source: 'web'
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const response = await processMessageLogic(userMsg.text);
    
    setMessages(prev => [...prev, response]);
    setIsLoading(false);
  };

  const isConnected = settings.chat.value.length > 5;

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Header Statut Agent */}
      <div className="p-4 border-b border-slate-800 bg-surface/50 backdrop-blur flex justify-between items-center z-10 shadow-lg">
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-all duration-500 bg-slate-800 text-primary border border-slate-700`}>
                  <Globe size={20} />
              </div>
              <div className="flex flex-col">
                  <h2 className="text-white font-bold text-sm">
                      Studio Chat (Assistant de Production)
                  </h2>
                  <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'text-blue-400' : 'text-amber-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-blue-400' : 'bg-amber-500'}`}></span>
                          Webhook Active
                      </span>
                  </div>
              </div>
          </div>
          {isLoading && <Loader2 size={16} className="animate-spin text-primary" />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/10 shadow-inner relative
              ${msg.role === 'assistant' ? 'bg-indigo-600' : (msg.role === 'system' ? 'bg-slate-800' : 'bg-slate-700')}`}>
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>

            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-2xl text-sm shadow-xl border relative group
                  ${msg.role === 'user' ? 'bg-primary text-white border-primary/20' : 
                    msg.role === 'system' ? 'bg-black/50 text-green-400 border-green-900/30 font-mono text-xs' : 
                    'bg-surface text-slate-200 border-slate-700'}`}>
                  
                  {msg.toolResponse && msg.toolResponse.name === 'generation' ? (
                      // Display Generated Media
                      <div className="mt-2">
                          <p className="mb-2">{msg.text}</p>
                          <div className="rounded-xl overflow-hidden border border-slate-600 bg-black">
                              {msg.toolResponse.result.type === 'image' ? (
                                  <img src={msg.toolResponse.result.url} className="w-full h-auto max-h-[400px] object-contain"/>
                              ) : (
                                  <video src={msg.toolResponse.result.url} controls className="w-full h-auto max-h-[400px]"/>
                              )}
                          </div>
                      </div>
                  ) : (
                      // Standard Text
                      <>
                        {msg.toolResponse && (
                            <div className="mb-2 pb-2 border-b border-white/10 flex items-center gap-2 text-indigo-400 font-mono text-[10px] font-bold">
                                <Wrench size={12}/> Outil Système Exécuté
                            </div>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                      </>
                  )}
              </div>
              <span className="text-[10px] text-slate-500 px-2">{msg.timestamp.toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-2 p-4 text-xs text-slate-500 animate-pulse bg-slate-800/20 rounded-xl w-fit">
                <Loader2 size={14} className="animate-spin"/> 
                Traitement en cours via n8n...
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre d'input */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent backdrop-blur-sm border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto flex gap-2 items-end bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl focus-within:border-primary/50 transition-all">
            <button className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-lg"><Paperclip size={20}/></button>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                placeholder={`Discuter avec le Studio...`}
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 text-sm py-2 resize-none h-10 min-h-[40px] max-h-120px scrollbar-hide"
                rows={1}
            />
            <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-xl transition-all shadow-lg ${!input.trim() || isLoading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-primary hover:bg-blue-600 text-white active:scale-95'}`}>
                <Send size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};
