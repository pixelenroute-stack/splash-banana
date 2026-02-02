
import React from 'react';
import { VideoGenerationParams, VideoAspectRatio, VideoResolution, VideoDuration, VideoFps } from '../../types';
import { Sliders, Clock, Monitor, Film } from 'lucide-react';

interface SettingsPanelProps {
    params: VideoGenerationParams;
    onChange: (newParams: VideoGenerationParams) => void;
    disabled?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ params, onChange, disabled }) => {
    
    const handleChange = (key: keyof VideoGenerationParams, value: any) => {
        onChange({ ...params, [key]: value });
    };

    return (
        <div className="w-80 border-l border-slate-700 bg-surface/50 p-6 flex flex-col gap-6 overflow-y-auto h-full hidden lg:flex">
            <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sliders size={16} /> Paramètres Veo
                </h3>
                
                {/* Aspect Ratio */}
                <div className="mb-6">
                    <label className="text-xs font-medium text-slate-400 mb-2 block">Format (Ratio)</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['16:9', '9:16'] as VideoAspectRatio[]).map(r => (
                            <button
                                key={r}
                                onClick={() => handleChange('aspectRatio', r)}
                                disabled={disabled}
                                className={`px-3 py-2 text-xs rounded-lg border transition-all
                                    ${params.aspectRatio === r 
                                        ? 'bg-primary/20 border-primary text-white font-bold' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Resolution */}
                <div className="mb-6">
                    <label className="text-xs font-medium text-slate-400 mb-2 block flex items-center gap-2">
                        <Monitor size={12}/> Résolution
                    </label>
                    <select
                        value={params.resolution}
                        onChange={(e) => handleChange('resolution', e.target.value)}
                        disabled={disabled}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                    >
                        <option value="720p">720p (HD)</option>
                        <option value="1080p">1080p (FHD)</option>
                    </select>
                </div>

                {/* Duration */}
                <div className="mb-6">
                    <label className="text-xs font-medium text-slate-400 mb-2 block flex items-center gap-2">
                        <Clock size={12}/> Durée
                    </label>
                    <select
                        value={params.duration}
                        onChange={(e) => handleChange('duration', e.target.value)}
                        disabled={disabled}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                    >
                        <option value="5s">5 secondes</option>
                        <option value="10s">10 secondes</option>
                        <option value="20s">20 secondes (Long)</option>
                    </select>
                </div>

                {/* Frame Rate */}
                <div className="mb-6">
                    <label className="text-xs font-medium text-slate-400 mb-2 block flex items-center gap-2">
                        <Film size={12}/> Images/sec (FPS)
                    </label>
                    <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                        {(['24', '30', '60'] as VideoFps[]).map(fps => (
                            <button
                                key={fps}
                                onClick={() => handleChange('fps', fps)}
                                disabled={disabled}
                                className={`flex-1 py-1.5 text-xs rounded transition-all
                                    ${params.fps === fps 
                                        ? 'bg-slate-700 text-white font-bold shadow' 
                                        : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {fps}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Negative Prompt */}
                <div>
                    <label className="text-xs font-medium text-slate-400 mb-2 block">Negative Prompt</label>
                    <textarea
                        value={params.negativePrompt || ''}
                        onChange={(e) => handleChange('negativePrompt', e.target.value)}
                        disabled={disabled}
                        placeholder="Ex: blurry, low quality, distorted..."
                        className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 focus:border-primary outline-none resize-none"
                    />
                </div>
            </div>
            
            <div className="mt-auto pt-6 border-t border-slate-700">
                <p className="text-[10px] text-slate-500 text-center">
                    Génération via Google Veo 3.1<br/>
                    Coût estimé : ~250 tokens / sec
                </p>
            </div>
        </div>
    );
};
