
import React, { useState, useEffect } from 'react';
import { newsService } from '../services/newsService';
import { NewsArticle, NewsCategory, WeatherData } from '../types';
import { 
    CloudRain, Sun, Cloud, Wind, RefreshCw, Loader2, 
    Newspaper, Film, Zap, Scale, Video, MapPin, 
    Search, ExternalLink, Calendar, Zap as ZapIcon 
} from 'lucide-react';
import { db } from '../services/mockDatabase';

const CATEGORIES: { id: NewsCategory | 'all', label: string, icon: any }[] = [
    { id: 'all', label: 'À la une', icon: Newspaper },
    { id: 'politics', label: 'Politique & Législation', icon: Scale },
    { id: 'tech', label: 'Technologie & IA', icon: Zap },
    { id: 'editing', label: 'Montage Vidéo', icon: Video },
    { id: 'motion', label: 'Motion Design', icon: Film },
];

export const NewsDashboard: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all');
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [city, setCity] = useState('Paris');
    const [loadingNews, setLoadingNews] = useState(false);
    const [loadingWeather, setLoadingWeather] = useState(false);
    const [simulating, setSimulating] = useState(false);

    const settings = db.getSystemSettings();
    const isDev = settings.appMode === 'developer';

    useEffect(() => {
        loadData();
    }, [activeCategory]);

    useEffect(() => {
        handleWeatherUpdate();
    }, []);

    const loadData = async () => {
        setLoadingNews(true);
        try {
            const data = await newsService.getNews(activeCategory);
            setNews(data);
        } finally {
            setLoadingNews(false);
        }
    };

    const handleWeatherUpdate = async () => {
        if (!city) return;
        setLoadingWeather(true);
        try {
            const data = await newsService.fetchWeather(city);
            setWeather(data);
        } finally {
            setLoadingWeather(false);
        }
    };

    const handleSimulate = async () => {
        if (simulating) return;
        setSimulating(true);
        setLoadingNews(true);
        
        try {
            // Si "All", on simule une catégorie au hasard pour la démo
            const targetCat = activeCategory === 'all' ? 'tech' : activeCategory;
            const newArticles = await newsService.simulateLiveNews(targetCat);
            setNews(newArticles);
        } catch (e) {
            console.error(e);
        } finally {
            setSimulating(false);
            setLoadingNews(false);
        }
    };

    const getWeatherIcon = (condition: string) => {
        switch (condition) {
            case 'Sunny': return <Sun className="text-yellow-400" size={32} />;
            case 'Rain': return <CloudRain className="text-blue-400" size={32} />;
            case 'Cloudy': return <Cloud className="text-slate-400" size={32} />;
            case 'Storm': return <Wind className="text-purple-400" size={32} />;
            default: return <Sun className="text-yellow-400" size={32} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#020617] overflow-hidden">
            
            {/* HEADER */}
            <header className="p-6 border-b border-slate-800 bg-surface/50 backdrop-blur shrink-0 z-20 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Newspaper className="text-primary" /> Actualités & Veille
                        {isDev && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono flex items-center gap-1">
                                <ZapIcon size={10}/> DEV MODE
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-400 text-sm">Tendances, météo et veille stratégique.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* WEATHER WIDGET (Compact Header Version) */}
                    {weather && (
                        <div className="hidden md:flex items-center gap-4 bg-slate-900/50 p-2 pr-4 rounded-xl border border-slate-700/50">
                            <div className="bg-slate-800 p-2 rounded-lg">
                                {getWeatherIcon(weather.condition)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-white">{weather.currentTemp}°C</span>
                                    <span className="text-xs text-slate-400">{weather.city}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{weather.condition}</div>
                            </div>
                        </div>
                    )}

                    {isDev && (
                        <button 
                            onClick={handleSimulate}
                            disabled={simulating}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-amber-900/20"
                        >
                            {simulating ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                            {simulating ? 'Génération IA...' : 'Simuler Flux Live'}
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT: MAIN NEWS FEED */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                    
                    {/* Categories Tabs */}
                    <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border
                                    ${activeCategory === cat.id 
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'}`}
                            >
                                <cat.icon size={16}/>
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* News Grid */}
                    {loadingNews ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
                            <Loader2 size={40} className="animate-spin text-primary"/>
                            <p className="animate-pulse">Récupération des dernières tendances...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {news.map(article => (
                                <div key={article.id} className="group bg-surface border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-600 transition-all shadow-lg hover:shadow-2xl flex flex-col h-full">
                                    <div className="h-48 overflow-hidden relative">
                                        <img 
                                            src={article.imageUrl} 
                                            alt={article.title} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute top-3 left-3">
                                            <span className="bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase border border-white/10">
                                                {article.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1 font-bold text-primary"><Newspaper size={12}/> {article.source}</span>
                                            <span>{new Date(article.date).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors">{article.title}</h3>
                                        <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-1">{article.summary}</p>
                                        
                                        <div className="pt-4 border-t border-slate-800 flex justify-end">
                                            <button className="text-xs font-bold text-white flex items-center gap-1 hover:underline">
                                                Lire la suite <ExternalLink size={12}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT: SIDEBAR (WEATHER + WIDGETS) */}
                <div className="w-80 border-l border-slate-800 bg-surface/30 p-6 overflow-y-auto hidden lg:block">
                    
                    {/* WEATHER FULL WIDGET */}
                    <div className="bg-gradient-to-b from-blue-900/40 to-slate-900 border border-blue-500/20 rounded-2xl p-5 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Cloud className="text-blue-400" size={16}/> Météo Locale
                            </h3>
                            <div className="relative group">
                                <MapPin size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input 
                                    type="text" 
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    onBlur={handleWeatherUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && handleWeatherUpdate()}
                                    className="w-28 bg-black/40 border border-white/10 rounded-lg py-1 pl-6 pr-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {loadingWeather ? (
                            <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-blue-400"/></div>
                        ) : weather ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="text-4xl font-bold text-white">{weather.currentTemp}°</div>
                                    <div className="text-right">
                                        <div className="text-blue-200 font-medium">{weather.condition}</div>
                                        <div className="text-[10px] text-blue-300/60">H: {weather.humidity}% • W: {weather.windSpeed}km/h</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {weather.forecast.map((day, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-black/20 rounded-lg hover:bg-black/40 transition-colors">
                                            <span className="text-slate-300 w-16 font-medium">{day.day}</span>
                                            {day.icon === 'Sunny' ? <Sun size={14} className="text-yellow-400"/> : <Cloud size={14} className="text-slate-400"/>}
                                            <span className="text-white font-bold">{day.temp}°</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : null}
                    </div>

                    {/* MARKET/TRENDS WIDGET (Mock) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Zap className="text-amber-400" size={16}/> Trending Topics
                        </h3>
                        <div className="space-y-3">
                            {['#AIArt', '#DavinciResolve19', '#FreelanceLife', '#MotionTrends'].map((tag, i) => (
                                <div key={i} className="flex items-center justify-between group cursor-pointer">
                                    <span className="text-xs text-slate-400 group-hover:text-primary transition-colors">{tag}</span>
                                    <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">+{(Math.random()*20).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
