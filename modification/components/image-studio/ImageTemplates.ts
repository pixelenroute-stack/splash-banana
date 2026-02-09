import { ImageAspectRatio, ImageResolution } from '../../types';

export interface ImageTemplate {
    id: string;
    title: string;
    description: string;
    icon: string; // Emoji or Lucide icon name ref
    defaultPrompt: string;
    aspectRatio: ImageAspectRatio;
    resolution: ImageResolution;
    gradient: string;
}

export const IMAGE_TEMPLATES: ImageTemplate[] = [
    {
        id: 'youtube-thumb',
        title: 'YouTube Thumbnail',
        description: 'Vignette accrocheuse avec texte et contraste élevé.',
        icon: '▶️',
        defaultPrompt: 'YouTube thumbnail for a video about [SUJET], explosive colors, high contrast, 4k render, expressive face in foreground, blurred background.',
        aspectRatio: '16:9',
        resolution: '2K',
        gradient: 'from-red-500 to-orange-500'
    },
    {
        id: 'product-collage',
        title: 'Product Collage',
        description: 'Mise en valeur produit style éditorial.',
        icon: '🛍️',
        defaultPrompt: 'Editorial product photography of [PRODUIT], surrounded by floating ingredients/elements, pastel background, soft studio lighting, 8k resolution.',
        aspectRatio: '4:5', // Good for social vertical
        resolution: '2K',
        gradient: 'from-pink-500 to-rose-500'
    },
    {
        id: 'storyboard-frame',
        title: 'Storyboard Frame',
        description: 'Croquis cinématographique pour pré-production.',
        icon: '🎬',
        defaultPrompt: 'Cinematic storyboard sketch, noir style, charcoal drawing, [DESCRIPTION SCÈNE], camera angle low, dramatic lighting.',
        aspectRatio: '16:9',
        resolution: '1K',
        gradient: 'from-slate-500 to-gray-500'
    },
    {
        id: 'blueprint',
        title: 'Blueprint / Plan',
        description: 'Schéma technique précis blanc sur bleu.',
        icon: '📐',
        defaultPrompt: 'Technical blueprint schema of [OBJET], white lines on blue grid paper, top down view, detailed annotations.',
        aspectRatio: '16:9',
        resolution: '2K',
        gradient: 'from-blue-600 to-cyan-500'
    },
    {
        id: 'explainer',
        title: 'Illustrated Explainer',
        description: 'Style vectoriel plat pour vidéo explicative.',
        icon: '💡',
        defaultPrompt: 'Flat vector illustration, corporate memphis style, showing [CONCEPT], vibrant colors, clean lines, white background.',
        aspectRatio: '16:9',
        resolution: '2K',
        gradient: 'from-emerald-500 to-teal-500'
    },
    {
        id: 'insta-cover',
        title: 'Instagram Cover',
        description: 'Esthétique minimaliste pour feed ou story.',
        icon: '📱',
        defaultPrompt: 'Aesthetic minimal background for Instagram story, [THEME/COULEUR], soft gradient, grain texture, abstract shapes.',
        aspectRatio: '9:16',
        resolution: '2K',
        gradient: 'from-purple-500 to-indigo-500'
    }
];