
import React, { useRef } from 'react';
import { SystemSettings } from '../../types';
import { Palette, Layout, Upload, Image as ImageIcon, Type, Link, User } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

interface BrandingEditorProps {
    settings: SystemSettings;
    updateSetting: (path: string, value: any) => void;
}

export const BrandingEditor: React.FC<BrandingEditorProps> = ({ settings, updateSetting }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            updateSetting('branding.logoUrl', reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4">
            
            {/* MAIN CONFIGURATION COLUMN (Full Width Now) */}
            <div className="lg:col-span-12 space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 1. IDENTITÉ VISUELLE & LOGO */}
                    <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-xl h-full">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <Palette className="text-primary" size={20}/> Identité de l'Agence
                        </h3>
                        
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 bg-black border border-slate-700 rounded-2xl flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden group relative"
                                >
                                    <BrandLogo size="xl" overrideLogo={settings.branding.logoUrl} className="w-full h-full" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload size={24} className="text-white"/>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Logo Principal</label>
                                    <p className="text-xs text-slate-400 mb-3">Format carré recommandé (PNG, JPG). Affiché sur le login et la sidebar.</p>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold border border-slate-700 transition-colors"
                                    >
                                        Uploader une image
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*"/>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Nom de l'Agence</label>
                                    <input 
                                        type="text" 
                                        value={settings.branding.name}
                                        onChange={(e) => updateSetting('branding.name', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all placeholder:text-slate-600"
                                        placeholder="Ex: Studio Alpha"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Initiales (Badge)</label>
                                    <input 
                                        type="text" 
                                        maxLength={2}
                                        value={settings.branding.initials}
                                        onChange={(e) => updateSetting('branding.initials', e.target.value.toUpperCase())}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all font-mono placeholder:text-slate-600"
                                        placeholder="SA"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. COULEURS & THÈME */}
                    <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-xl h-full flex flex-col">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <Layout className="text-purple-400" size={20}/> Couleurs & Thème
                        </h3>
                        
                        <div className="space-y-6 flex-1">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Couleur Primaire (Marque)</label>
                                <div className="flex gap-3 items-center bg-slate-900 p-2 rounded-xl border border-slate-700">
                                    <input 
                                        type="color" 
                                        value={settings.branding.primaryColor || '#3b82f6'}
                                        onChange={(e) => updateSetting('branding.primaryColor', e.target.value)}
                                        className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent"
                                    />
                                    <input 
                                        type="text" 
                                        value={settings.branding.primaryColor || '#3b82f6'}
                                        onChange={(e) => updateSetting('branding.primaryColor', e.target.value)}
                                        className="bg-transparent text-white font-mono text-sm outline-none flex-1 uppercase"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">Utilisée pour les boutons, liens et accents actifs.</p>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Couleur Secondaire</label>
                                <div className="flex gap-3 items-center bg-slate-900 p-2 rounded-xl border border-slate-700">
                                    <input 
                                        type="color" 
                                        value={settings.branding.secondaryColor || '#64748b'}
                                        onChange={(e) => updateSetting('branding.secondaryColor', e.target.value)}
                                        className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent"
                                    />
                                    <input 
                                        type="text" 
                                        value={settings.branding.secondaryColor || '#64748b'}
                                        onChange={(e) => updateSetting('branding.secondaryColor', e.target.value)}
                                        className="bg-transparent text-white font-mono text-sm outline-none flex-1 uppercase"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. PERSONNALISATION PAGE LOGIN */}
                <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                        <User className="text-green-400" size={20}/> Page de Connexion
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-2">
                                    <Type size={14}/> Titre de Bienvenue
                                </label>
                                <input 
                                    type="text" 
                                    value={settings.branding.welcomeMessage || 'Bon retour'}
                                    onChange={(e) => updateSetting('branding.welcomeMessage', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                                    placeholder="Ex: Bienvenue chez Studio Alpha"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Sous-titre</label>
                                <textarea 
                                    value={settings.branding.welcomeSubtitle || 'Connectez-vous à votre espace.'}
                                    onChange={(e) => updateSetting('branding.welcomeSubtitle', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all h-24 resize-none"
                                    placeholder="Message d'instruction..."
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-2">
                                    <ImageIcon size={14}/> Image de Fond (URL)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input 
                                            type="text" 
                                            value={settings.branding.loginBackgroundUrl || ''}
                                            onChange={(e) => updateSetting('branding.loginBackgroundUrl', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-primary transition-all text-sm"
                                            placeholder="https://... (Laissez vide pour le fond Stargate par défaut)"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">
                                    Si aucune image n'est fournie, l'animation 3D "Stargate" sera utilisée.
                                </p>
                            </div>

                            {/* Options Interface */}
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Social Login</label>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-300">Afficher "Microsoft Login"</span>
                                    <div className="w-10 h-5 bg-slate-700 rounded-full relative cursor-not-allowed opacity-50" title="Bientôt disponible">
                                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-300">Afficher "Google Login"</span>
                                    <div className="w-10 h-5 bg-green-600 rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
