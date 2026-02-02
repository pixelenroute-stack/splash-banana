
import React from 'react';
import { MediaAsset } from '../../types';
import { X, Download, Calendar, Ruler, Hash, Info, FileText } from 'lucide-react';

interface PreviewModalProps {
    asset: MediaAsset | null;
    isOpen: boolean;
    onClose: () => void;
    onDownload: (asset: MediaAsset) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ asset, isOpen, onClose, onDownload }) => {
    if (!isOpen || !asset) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            
            {/* Close Button (Absolute Top Right) */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50"
            >
                <X size={24} />
            </button>

            <div className="w-full max-w-6xl h-[85vh] flex flex-col md:flex-row bg-surface border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                
                {/* LEFT: MEDIA VIEWER */}
                <div className="flex-1 bg-black flex items-center justify-center relative p-4">
                    {asset.type === 'image' ? (
                        <img 
                            src={asset.publicUrl} 
                            alt={asset.prompt} 
                            className="max-w-full max-h-full object-contain" 
                        />
                    ) : asset.type === 'video' ? (
                        <video 
                            src={asset.downloadUrl || asset.publicUrl} // Use downloadUrl if available for video src
                            controls 
                            autoPlay 
                            className="max-w-full max-h-full object-contain" 
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 gap-4">
                            <div className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                                <FileText size={48} className="text-slate-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-medium text-slate-300">Aperçu non disponible pour ce fichier</p>
                                <p className="text-sm text-slate-500 mt-1">Utilisez le bouton télécharger pour accéder au contenu.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: DETAILS SIDEBAR */}
                <div className="w-full md:w-80 bg-surface border-l border-slate-700 flex flex-col">
                    <div className="p-6 border-b border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-1">Détails du média</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase 
                            ${asset.type === 'video' ? 'bg-purple-500/20 text-purple-400' : 
                              asset.type === 'image' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-orange-500/20 text-orange-400'}`}>
                            {asset.type}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Prompt */}
                        <div>
                            <h4 className="text-xs text-slate-500 font-bold uppercase mb-2 flex items-center gap-2">
                                <Info size={12}/> {asset.type === 'file' ? 'Nom du fichier' : 'Prompt'}
                            </h4>
                            <p className="text-sm text-slate-200 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800 break-words">
                                {asset.prompt}
                            </p>
                        </div>

                        {/* Metadata Grid */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-slate-800">
                                <span className="text-xs text-slate-500 flex items-center gap-2"><Calendar size={12}/> Créé le</span>
                                <span className="text-sm text-white">{new Date(asset.createdAt).toLocaleDateString()}</span>
                            </div>
                            {(asset.width && asset.height) ? (
                                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                                    <span className="text-xs text-slate-500 flex items-center gap-2"><Ruler size={12}/> Dimensions</span>
                                    <span className="text-sm text-white font-mono">{asset.width} x {asset.height}</span>
                                </div>
                            ) : null}
                            {asset.duration && (
                                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                                    <span className="text-xs text-slate-500 flex items-center gap-2"><Hash size={12}/> Durée</span>
                                    <span className="text-sm text-white font-mono">{asset.duration}s</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between py-2 border-b border-slate-800">
                                <span className="text-xs text-slate-500">ID Job</span>
                                <span className="text-xs text-slate-400 font-mono truncate max-w-[150px]">{asset.jobId || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-700 bg-slate-800/30">
                        <button 
                            onClick={() => onDownload(asset)}
                            className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
                        >
                            <Download size={18} />
                            Télécharger
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
