
import { VideoAspectRatio, VideoDuration } from '../../types';

export interface VideoTemplate {
    id: string;
    title: string;
    description: string;
    icon: string;
    defaultPrompt: string;
    aspectRatio: VideoAspectRatio;
    duration: VideoDuration;
    gradient: string;
}

export const VIDEO_TEMPLATES: VideoTemplate[] = [
    {
        id: 'cinematic-drone',
        title: 'Cinematic Drone',
        description: 'Survol épique de paysages naturels.',
        icon: '🛸',
        defaultPrompt: 'Cinematic drone shot of a misty norwegian fjord at sunrise, 4k, hyperrealistic, smooth motion.',
        aspectRatio: '16:9',
        duration: '10s',
        gradient: 'from-blue-600 to-cyan-500'
    },
    {
        id: 'cyberpunk-city',
        title: 'Cyberpunk City',
        description: 'Rue futuriste sous la pluie néon.',
        icon: '🌃',
        defaultPrompt: 'Cyberpunk city street level, neon lights reflecting in puddles, rain falling, futuristic cars passing by, blade runner style.',
        aspectRatio: '16:9',
        duration: '5s',
        gradient: 'from-purple-600 to-pink-500'
    },
    {
        id: 'product-commercial',
        title: 'Product Reveal',
        description: 'Mise en valeur objet studio.',
        icon: '✨',
        defaultPrompt: 'Studio lighting product reveal of a luxury perfume bottle, rotating slowly, golden particles floating, elegant atmosphere.',
        aspectRatio: '9:16', // Vertical for social
        duration: '10s',
        gradient: 'from-amber-500 to-orange-500'
    },
    {
        id: 'nature-timelapse',
        title: 'Nature Timelapse',
        description: 'Éclosion de fleur ou nuages.',
        icon: '🌺',
        defaultPrompt: 'Timelapse of a blooming rose flower, detailed macro shot, soft natural lighting, bokeh background.',
        aspectRatio: '16:9',
        duration: '5s',
        gradient: 'from-green-500 to-emerald-500'
    }
];
