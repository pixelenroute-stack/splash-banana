
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot, User, Loader2, Zap, Activity, Wifi, WifiOff, Terminal, Wrench, BrainCircuit, MessageSquare, Globe, PlayCircle } from 'lucide-react';
import { ChatMessage } from '../types';
import { n8nAgentService } from '../lib/n8nAgentService';
import { GeminiService, geminiService } from '../services/geminiService'; 
import { apiRouter } from '../services/apiRouter'; 
import { db } from '../services/mockDatabase';
import { telegramService } from '../services/telegramService';
import { executeToolByName, toolRegistry } from '../services/toolRegistry';
import { useNotification } from '../context/NotificationContext';

export const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
        id: '0', 
        role: 'system', 
        text: 'Agent de Production connecté. En mode développeur, j\'utilise Perplexity (Sonar Pro) et Telegram. En production, je passe par les Webhooks n8n.', 
        timestamp: new Date(),
        modelUsed: 'System'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeProviderDisplay, setActiveProviderDisplay] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const settings = db.getSystemSettings();
  const telegramIntervalRef = useRef<any>(null);
  const { notify } = useNotification();

  const isDevMode = settings.appMode === 'developer';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Met à jour l'affichage du provider
  useEffect(() => {
      const display = isDevMode ? 'DEV MODE: Perplexity & Telegram' : 'PROD: N8N Agent';
      setActiveProviderDisplay(display);
  }, [isDevMode]);

  // --- TELEGRAM POLLING & SYNC (DEV MODE ONLY or IF ENABLED) ---
  useEffect(() => {
      // En mode développeur, on force l'activation du polling Telegram si la clé est présente
      if (isDevMode && settings.telegram?.botToken) {
          startTelegramPolling();
      } else if (settings.telegram?.enabled) {
          startTelegramPolling();
      }
      return () => stopTelegramPolling();
  }, [isDevMode, settings.telegram?.enabled, settings.telegram?.botToken]);

  const startTelegramPolling = () => {
      stopTelegramPolling();
      telegramIntervalRef.current = setInterval(async () => {
          const updates = await telegramService.pollMessages();
          for (const update of updates) {
              if (update.message?.text) {
                  // Traitement comme un nouveau message utilisateur mais flaggué Telegram
                  const telegramMsg: ChatMessage = {
                      id: `tg_${update.update_id}`,
                      role: 'user',
                      text: update.message.text,
                      timestamp: new Date(update.message.date * 1000),
                      source: 'telegram',
                      telegramChatId: update.message.chat.id.toString()
                  };
                  
                  // Ajout au state
                  setMessages(prev => {
                      // Eviter les doublons si le polling se chevauche
                      if (prev.find(m => m.id === telegramMsg.id)) return prev;
                      return [...prev, telegramMsg];
                  });

                  // Exécution automatique de la commande + Réponse Telegram
                  handleTelegramCommand(telegramMsg);
              }
          }
      }, 3000); // Poll toutes les 3s
  };

  const stopTelegramPolling = () => {
      if (telegramIntervalRef.current) {
          clearInterval(telegramIntervalRef.current);
          telegramIntervalRef.current = null;
      }
  };

  // Traitement spécifique pour les commandes venant de Telegram
  // Cela assure la "Synchronisation" : Web voit les messages Telegram, Telegram reçoit les réponses Web/IA
  const handleTelegramCommand = async (msg: ChatMessage) => {
      if (!msg.telegramChatId) return;
      
      const chatId = msg.telegramChatId;
      // Indicateur de frappe côté Telegram (optionnel, simulé par message)
      // await telegramService.sendMessage(chatId, "⏳ Recherche en cours...");

      // On réutilise la logique principale
      const response = await processMessageLogic(msg.text);
      
      // Envoi de la réponse textuelle vers Telegram
      if (response.text) {
          await telegramService.sendMessage(chatId, response.text);
      }

      // Envoi des médias générés vers Telegram
      if (response.toolResponse && response.toolResponse.result) {
          const mediaUrl = response.toolResponse.result.url; // url standardisée
          if (mediaUrl) {
              await telegramService.sendPhoto(chatId, mediaUrl, "Résultat généré");
          }
      }

      // Ajout de la réponse dans le chat UI Web aussi pour cohérence
      setMessages(prev => [...prev, {
          ...response,
          source: 'telegram' // Marquer la réponse comme liée à Telegram
      }]);
  };

  // --- SIMULATION SCRIPT ---
  const runSimulation = async () => {
      if (isLoading) return;
      setIsLoading(true);
      notify("Démarrage de la simulation de conversation...", "info");

      // 1. User Message
      const t1 = Date.now();
      const msg1: ChatMessage = {
          id: `sim_${t1}`,
          role: 'user',
          text: "Trouve un concept de publicité pour une marque de Café Spatial 'Gravity Brew'.",
          timestamp: new Date(),
          source: 'web'
      };
      setMessages(prev => [...prev, msg1]);

      await new Promise(r => setTimeout(r, 1500));

      // 2. AI Text Response
      const msg2: ChatMessage = {
          id: `sim_${t1+1}`,
          role: 'assistant',
          text: "Voici un concept :\n\n**Titre :** L'Éveil en Apesanteur\n**Accroche :** \"Même à zéro G, gardez les pieds sur terre.\"\n**Visuel suggéré :** Une tasse de café transparente flottant devant un hublot de station spatiale avec la Terre en arrière-plan.",
          timestamp: new Date(),
          modelUsed: 'Simulation (Gemini Pro)'
      };
      setMessages(prev => [...prev, msg2]);

      await new Promise(r => setTimeout(r, 2000));

      // 3. User Request Image
      const msg3: ChatMessage = {
          id: `sim_${t1+2}`,
          role: 'user',
          text: "Génial ! Génère l'image de ce visuel.",
          timestamp: new Date(),
          source: 'web'
      };
      setMessages(prev => [...prev, msg3]);

      await new Promise(r => setTimeout(r, 2500));

      // 4. AI Image Tool Response
      // Placeholder image URL that works reliably
      const demoImageUrl = "https://image.pollinations.ai/prompt/cup%20of%20coffee%20floating%20zero%20gravity%20space%20station%20window%20earth%20background%20cinematic%20lighting%204k?width=1024&height=1024&nologo=true";
      
      const msg4: ChatMessage = {
          id: `sim_${t1+3}`,
          role: 'assistant',
          text: "Je lance la génération avec Banana Pro (Gemini Image)...",
          timestamp: new Date(),
          modelUsed: 'Simulation (Banana Pro)',
          toolResponse: {
              id: 'sim_tool_gen',
              name: 'generation',
              result: {
                  type: 'image',
                  url: demoImageUrl
              }
          }
      };
      setMessages(prev => [...prev, msg4]);
      
      setIsLoading(false);
      notify("Simulation terminée.", "success");
  };

  // --- LOGIQUE COMMUNE (Réutilisable Web & Telegram) ---
  
  // Retourne l'objet ChatMessage réponse (sans l'ajouter au state directement)
  const processMessageLogic = async (text: string): Promise<ChatMessage> => {
      const lowerInput = text.toLowerCase();
      let responseText = "";
      let agentUsed: string = "Perplexity Sonar";
      let toolResult: any = null;

      try {
        // 1. ROUTAGE MÉDIA (Géré séparément pour simplicité de démo)
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
        // 2. ROUTAGE STANDARD
        else {
            if (isDevMode) {
                // --- MODE DÉVELOPPEUR : UTILISATION API PERPLEXITY VIA API ROUTER ---
                
                // Note: apiRouter est configuré par défaut pour router 'chat_simple' vers 'perplexity'
                let requestType: any = 'chat_simple';
                
                if (lowerInput.includes('moodboard') || lowerInput.includes('style')) {
                    requestType = 'moodboard_generation'; // Utilise Gemini Pro (Meilleur JSON)
                }

                // Contexte Outils Système injecté dans le prompt pour le routeur
                const toolSystemPrompt = `
                    Tu es l'IA principale du studio "Splash Banana".
                    OUTILS DISPONIBLES :
                    ${Object.keys(toolRegistry).map(k => `- ${k}: ${toolRegistry[k].description}`).join('\n')}
                    
                    Si l'utilisateur demande une action, réponds UNIQUEMENT avec ce JSON :
                    { "tool": "nom_outil", "args": { ... } }
                `;

                const fullPrompt = `${toolSystemPrompt}\n\nUtilisateur: ${text}`;

                const routerResponse = await apiRouter.routeRequest({
                    type: requestType,
                    prompt: fullPrompt,
                    qualityRequired: 'medium'
                });

                responseText = routerResponse.content;
                agentUsed = `Router (${routerResponse.provider})`;

            } else {
                // --- MODE PRODUCTION : UTILISATION N8N WEBHOOKS ---
                const n8nRes = await n8nAgentService.sendMessage("user_1", text);
                if (n8nRes.status === 'success') {
                    responseText = n8nRes.response;
                    agentUsed = 'n8n Workflow';
                } else {
                    throw new Error("Erreur de communication avec n8n. Vérifiez le webhook en Production.");
                }
            }
        }

        // 3. Traitement post-réponse (Outils) - Uniquement pertinent si l'IA renvoie un appel d'outil JSON
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

  // --- HANDLE WEB INPUT ---
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

  const isConnected = settings.chat.status === 'success' || settings.chat.value.length > 5;

  return (
    // Suppression du bg-black pour laisser passer le dégradé global en mode dev
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Header Statut Agent */}
      <div className="p-4 border-b border-slate-800 bg-surface/50 backdrop-blur flex justify-between items-center z-10 shadow-lg">
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-all duration-500 bg-slate-800 text-primary border border-slate-700`}>
                  <Globe size={20} />
              </div>
              <div className="flex flex-col">
                  <h2 className="text-white font-bold text-sm">
                      Studio Chat ({isDevMode ? 'Perplexity' : 'n8n'})
                  </h2>
                  <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'text-blue-400' : 'text-amber-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-blue-400' : 'bg-amber-500'}`}></span>
                          {isDevMode ? 'Live Web Search Active' : 'Webhook Active'}
                      </span>
                      {isDevMode && (
                          <div className="flex items-center gap-2 ml-2 border-l border-slate-700 pl-2">
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-400">
                                  <MessageSquare size={10} /> Telegram Sync
                              </span>
                              <button 
                                onClick={runSimulation}
                                disabled={isLoading}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/20 transition-all disabled:opacity-50"
                                title="Lancer une simulation de conversation (Test)"
                              >
                                  <PlayCircle size={10} /> Simuler
                              </button>
                          </div>
                      )}
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
              {msg.role === 'assistant' ? <Bot size={16} /> : (msg.role === 'system' ? <Terminal size={14} className="text-green-400"/> : <User size={16} />)}
              
              {/* Badge Telegram */}
              {msg.source === 'telegram' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border border-black" title="Via Telegram">
                      <MessageSquare size={8} className="text-white"/>
                  </div>
              )}
            </div>

            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-2xl text-sm shadow-xl border relative group
                  ${msg.role === 'user' ? 'bg-primary text-white border-primary/20' : 
                    msg.role === 'system' ? 'bg-black/50 text-green-400 border-green-900/30 font-mono text-xs' : 
                    'bg-surface text-slate-200 border-slate-700'}`}>
                  
                  {msg.modelUsed && msg.role === 'assistant' && (
                      <span className="absolute -top-6 left-1 text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold tracking-widest bg-background/50 px-1 rounded">
                          Source : {msg.modelUsed}
                      </span>
                  )}

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
                Recherche et génération via {activeProviderDisplay}...
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
                placeholder={`Rechercher sur le web ou discuter avec le Studio...`}
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
