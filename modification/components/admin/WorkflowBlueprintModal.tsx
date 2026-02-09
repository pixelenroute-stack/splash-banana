
import React from 'react';
import { X, Copy, Workflow, Info, Lightbulb, Code } from 'lucide-react';

interface BlueprintData {
  title: string;
  description: string;
  n8n_nodes: string[];
  json_structure: string;
  tips: string[];
}

interface WorkflowBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BlueprintData;
}

export const WorkflowBlueprintModal: React.FC<WorkflowBlueprintModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copié dans le presse-papier !");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Workflow size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{data.title}</h2>
              <p className="text-xs text-slate-400">Documentation technique pour l'implémentation n8n</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
          
          {/* DESCRIPTION */}
          <div>
            <p className="text-slate-300 leading-relaxed text-sm">
              {data.description}
            </p>
          </div>

          {/* NODES STRUCTURE */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Workflow size={16} className="text-blue-400"/> Structure des Nœuds
            </h3>
            <ul className="space-y-3 font-mono text-xs text-slate-300">
              {data.n8n_nodes.map((node, i) => (
                <li key={i} className="pl-4 border-l-2 border-slate-700 py-1">
                  {node}
                </li>
              ))}
            </ul>
          </div>

          {/* JSON PAYLOAD */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Code size={16} className="text-purple-400"/> Payload JSON Attendu
              </h3>
              <button 
                onClick={() => copyToClipboard(data.json_structure)}
                className="text-xs flex items-center gap-1 text-primary hover:text-blue-300 transition-colors"
              >
                <Copy size={12}/> Copier JSON
              </button>
            </div>
            <div className="bg-black rounded-xl border border-slate-800 p-4 font-mono text-xs text-green-400 overflow-x-auto">
              <pre>{data.json_structure}</pre>
            </div>
          </div>

          {/* TIPS */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Lightbulb size={16}/> Conseils de Configuration
            </h3>
            <ul className="space-y-2">
              {data.tips.map((tip, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/30 text-center shrink-0">
          <a 
            href="https://n8n.io/workflows" 
            target="_blank" 
            rel="noreferrer"
            className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Info size={14}/> Voir la bibliothèque officielle de templates n8n
          </a>
        </div>
      </div>
    </div>
  );
};
