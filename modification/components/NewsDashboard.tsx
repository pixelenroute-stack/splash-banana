
import React, { useState, useEffect } from 'react';
import { newsService } from '../services/newsService';
import { NewsArticle, NewsCategory, WeatherData } from '../types';
import { 
    CloudRain, Sun, Cloud, Wind, 
    Newspaper, Film, Zap, Scale, Video, MapPin, 
    ExternalLink, LayoutGrid, Maximize2, Loader2, RefreshCw
} from 'lucide-react';

// Configuration des fenêtres de catégorie (Bento Grid)
const CATEGORY_CONFIG: { id: NewsCategory, label: string, icon: any, color: string, source: string, span?: string }[] = [
    { id: 'headline', label: 'À la une', icon: Newspaper, color: 'text-blue-400', source: 'Google Actualités', span: 'col-span-1 md:col-span-2' },
    { id: 'politics', label: 'Politique & Législation', icon: Scale, color: 'text-rose-400', source: 'Google Actualités' },
    { id: 'tech', label: 'Technologie & IA', icon: Zap, color: 'text-amber-400', source: 'NewsAPI' },
    { id: 'editing', label: 'Montage Vidéo', icon: Video, color: 'text-emerald-400', source: 'Perplexity' },
    { id: 'motion', label: 'Motion Design', icon: Film, color: 'text-purple-400', source: 'GNews' },
];

export const NewsDashboard: React.FC = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'focus'>('grid');
    const [focusedCategory, setFocusedCategory] = useState<NewsCategory | null>(null);
    
    // Data Stores
    const [newsMap, setNewsMap] = useState<Record<NewsCategory, NewsArticle[]>>({
        headline: [],
        politics: [],
        tech: [],
        editing: [],
        motion: [],
        general: []
    });
    
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [city, setCity] = useState('Paris');
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    // Initial Load
    useEffect(() => {
        handleWeatherUpdate();
        loadAllCategories();
    }, []);

    const loadAllCategories = () => {
        CATEGORY_CONFIG.forEach(cat => loadCategoryNews(cat.id));
    };

    const loadCategoryNews = async (category: NewsCategory) => {
        setLoadingMap(prev => ({ ...prev, [category]: true }));
        try {
            const articles = await newsService.getNews(category);
            setNewsMap(prev => ({ ...prev, [category]: articles }));
        } finally {
            setLoadingMap(prev => ({ ...prev, [category]: false }));
        }
    };

    const handleWeatherUpdate = async () => {
        if (!city) return;
        setLoadingMap(prev => ({ ...prev, weather: true }));
        try {
            const data = await newsService.fetchWeather(city);
            setWeather(data);
        } finally {
            setLoadingMap(prev => ({ ...prev, weather: false }));
        }
    };

    const getWeatherIcon = (condition: string) => {
        switch (condition) {
            case 'Sunny': return <Sun className="text-yellow-400" size={40} />;
            case 'Rain': return <CloudRain className="text-blue-400" size={40} />;
            case 'Cloudy': return <Cloud className="text-slate-400" size={40} />;
            case 'Storm': return <Wind className="text-purple-400" size={40} />;
            default: return <Sun className="text-yellow-400" size={40} />;
        }
    };

    // --- COMPONENT: NEWS WINDOW (CARD) ---
    const NewsWindow = ({ categoryId, label, icon: Icon, color, source, expanded = false, span = '' }: any) => {
        const articles = newsMap[categoryId as NewsCategory] || [];
        const isLoading = loadingMap[categoryId];

        return (
            <div className={`bg-surface border border-slate-700 rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all duration-300 hover:border-slate-600
                ${expanded ? 'col-span-full row-span-2 h-full min-h-[600px]' : `${span} h-[320px]`}`}>
                
                {/* Window Header */}
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 bg-slate-900 rounded-lg ${color}`}>
                            <Icon size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">{label}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
                                    {source}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => loadCategoryNews(categoryId)} 
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                            title="Actualiser"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''}/>
                        </button>
                        <button 
                            onClick={() => {
                                if (expanded) {
                                    setViewMode('grid');
                                    setFocusedCategory(null);
                                } else {
                                    setViewMode('focus');
                                    setFocusedCategory(categoryId);
                                }
                            }}
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                            title={expanded ? "Réduire" : "Agrandir"}
                        >
                            {expanded ? <LayoutGrid size={14}/> : <Maximize2 size={14}/>}
                        </button>
                    </div>
                </div>

                {/* Window Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                    {isLoading && articles.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                            <Loader2 className="animate-spin text-primary" size={24}/>
                            <p className="text-xs">Synchronisation API...</p>
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                            Aucune actualité récente trouvée.
                        </div>
                    ) : (
                        articles.map((article) => (
                            <div key={article.id} className="group flex gap-4 p-3 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50 cursor-pointer">
                                {article.imageUrl && (
                                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-700">
                                        <img src={article.imageUrl} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110"/>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-white leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                        {article.title}
                                    </h4>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                                        {article.summary}
                                    </p>
                                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                                        <span>{new Date(article.date).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1 group-hover:text-white transition-colors">
                                            Lire <ExternalLink size={10}/>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#020617] overflow-hidden">
            
            {/* HEADER */}
            <header className="p-6 border-b border-slate-800 bg-surface/50 backdrop-blur shrink-0 z-20 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Newspaper className="text-primary" /> Actualités & Veille
                    </h1>
                    <p className="text-slate-400 text-sm">Dashboard de surveillance multi-sources.</p>
                </div>

                {/* GLOBAL ACTIONS */}
                <div className="flex gap-3">
                    <button 
                        onClick={loadAllCategories}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700"
                    >
                        <RefreshCw size={16}/> Tout actualiser
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <div className="max-w-[1600px] mx-auto space-y-6">
                    
                    {/* TOP: WEATHER WIDGET (OpenWeather via Workflow) */}
                    <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-slate-700 rounded-2xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none"/>
                        
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-inner">
                                {weather ? getWeatherIcon(weather.condition) : <Sun className="text-slate-600" size={40}/>}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    {weather ? Math.round(weather.currentTemp) : '--'}°C
                                    <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                                        {weather?.condition || 'Météo'}
                                    </span>
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <MapPin size={14} className="text-primary"/>
                                    <input 
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        onBlur={handleWeatherUpdate}
                                        onKeyDown={(e) => e.key === 'Enter' && handleWeatherUpdate()}
                                        className="bg-transparent border-b border-dashed border-slate-600 text-slate-300 text-sm focus:outline-none focus:border-primary focus:text-white w-24"
                                    />
                                </div>
                            </div>
                        </div>

                        {weather && (
                            <div className="flex gap-8 text-right relative z-10">
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Humidité</div>
                                    <div className="text-lg font-mono text-blue-300">{weather.humidity}%</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Vent</div>
                                    <div className="text-lg font-mono text-slate-300">{weather.windSpeed} km/h</div>
                                </div>
                            </div>
                        )}
                        
                        {loadingMap.weather && (
                            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-20">
                                <Loader2 className="animate-spin text-white"/>
                            </div>
                        )}
                    </div>

                    {/* MAIN GRID: CATEGORY WINDOWS */}
                    <div className={`grid gap-6 transition-all duration-500 ${viewMode === 'focus' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2'}`}>
                        {CATEGORY_CONFIG.map((cat) => {
                            // If focus mode, only show the focused one
                            if (viewMode === 'focus' && focusedCategory !== cat.id) return null;
                            
                            return (
                                <NewsWindow
                                    key={cat.id}
                                    categoryId={cat.id}
                                    label={cat.label}
                                    icon={cat.icon}
                                    color={cat.color}
                                    source={cat.source}
                                    span={cat.span || ''}
                                    expanded={viewMode === 'focus'}
                                />
                            );
                        })}
                    </div>

                </div>
            </div>
        </div>
    );
};
