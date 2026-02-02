
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRouter } from '../apiRouter';
import { geminiService } from '../geminiService';
import { openAIService } from '../openaiService';
import { perplexityService } from '../perplexityService';

// Mock des services externes
vi.mock('../geminiService', () => ({
  geminiService: {
    simpleChat: vi.fn(),
    sendMessage: vi.fn(),
  }
}));
vi.mock('../openaiService', () => ({
  openAIService: {
    sendMessage: vi.fn(),
  }
}));
vi.mock('../perplexityService', () => ({
  perplexityService: {
    sendMessage: vi.fn(),
  }
}));

describe('IntelligentAPIRouter', () => {
  
  beforeEach(() => {
    // Reset mocks avant chaque test
    vi.clearAllMocks();
    // Clear cache (accès privé via any pour le test)
    (apiRouter as any).cache.clear();
  });
  
  describe('Routage des requêtes', () => {
    
    it('devrait router chat_simple vers Gemini Flash', async () => {
      vi.spyOn(geminiService, 'simpleChat').mockResolvedValue('Réponse test');
      
      const response = await apiRouter.routeRequest({
        type: 'chat_simple',
        prompt: 'Bonjour'
      });
      
      expect(response.provider).toBe('gemini-flash');
      expect(geminiService.simpleChat).toHaveBeenCalledWith('Bonjour');
    });
    
    it('devrait router vision_analysis vers Gemini Pro', async () => {
      // Note: apiRouter appelle sendMessage pour gemini-pro
      vi.spyOn(geminiService, 'sendMessage').mockResolvedValue({ text: 'Analyse OK' } as any);
      
      const response = await apiRouter.routeRequest({
        type: 'vision_analysis',
        prompt: 'Analyse cette vidéo'
      });
      
      expect(response.provider).toBe('gemini-pro');
      expect(geminiService.sendMessage).toHaveBeenCalled();
    });
    
    it('devrait router tutorial_generation vers GPT-4 si qualité high', async () => {
      vi.spyOn(openAIService, 'sendMessage').mockResolvedValue('Tutorial content');
      
      const response = await apiRouter.routeRequest({
        type: 'tutorial_generation',
        prompt: 'Génère un tuto',
        qualityRequired: 'high'
      });
      
      expect(response.provider).toBe('gpt-4');
      expect(openAIService.sendMessage).toHaveBeenCalled();
    });
    
    it('devrait router viral_trends_research vers Perplexity', async () => {
      vi.spyOn(perplexityService, 'sendMessage').mockResolvedValue('Trends data');
      
      const response = await apiRouter.routeRequest({
        type: 'viral_trends_research',
        prompt: 'Trends TikTok'
      });
      
      expect(response.provider).toBe('perplexity');
    });
    
  });
  
  describe('Système de cache', () => {
    
    it('devrait utiliser le cache pour une requête identique', async () => {
      vi.spyOn(geminiService, 'simpleChat').mockResolvedValue('Réponse');
      
      // Première requête
      await apiRouter.routeRequest({
        type: 'chat_simple',
        prompt: 'Test cache'
      });
      
      // Deuxième requête identique
      const response2 = await apiRouter.routeRequest({
        type: 'chat_simple',
        prompt: 'Test cache'
      });
      
      expect(response2.cached).toBe(true);
      expect(geminiService.simpleChat).toHaveBeenCalledTimes(1); // Une seule fois
    });
    
    it('ne devrait pas utiliser le cache après expiration', async () => {
      vi.spyOn(geminiService, 'simpleChat').mockResolvedValue('Réponse');
      
      // Mock Date.now pour simuler le temps qui passe
      const originalNow = Date.now;
      let fakeTime = 1000000; // Fixed start time
      Date.now = vi.fn(() => fakeTime);
      
      // Première requête
      await apiRouter.routeRequest({
        type: 'chat_simple',
        prompt: 'Test expiration'
      });
      
      // Avancer de 6 minutes (cache expire après 5 min)
      fakeTime += 6 * 60 * 1000;
      
      // Deuxième requête
      const response2 = await apiRouter.routeRequest({
        type: 'chat_simple',
        prompt: 'Test expiration'
      });
      
      expect(response2.cached).toBe(false);
      expect(geminiService.simpleChat).toHaveBeenCalledTimes(2);
      
      // Restore
      Date.now = originalNow;
    });
    
  });
  
  describe('Retry logic', () => {
    
    it('devrait retry en cas d\'échec puis réussir', async () => {
      let attemptCount = 0;
      vi.spyOn(geminiService, 'simpleChat').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Service temporairement indisponible');
        }
        return 'Succès';
      });
      
      const response = await apiRouter.routeRequest({
        type: 'chat_simple',
        prompt: 'Test retry'
      });
      
      expect(response.content).toBe('Succès');
      expect(attemptCount).toBeGreaterThanOrEqual(2);
    });
    
    it('devrait fallback vers un autre provider après échecs', async () => {
      // Gemini Flash échoue systématiquement
      vi.spyOn(geminiService, 'simpleChat').mockRejectedValue(
        new Error('Quota dépassé')
      );
      
      // Fallback attendu : Gemini Pro (selon getFallbackProvider)
      vi.spyOn(geminiService, 'sendMessage').mockResolvedValue({ text: 'Réponse fallback' });
      
      const response = await apiRouter.routeRequest({
        type: 'chat_simple',
        prompt: 'Test fallback'
      });
      
      expect(response.content).toBe('Réponse fallback');
      expect(response.provider).toBe('gemini-pro');
    });
    
  });
  
  describe('Tracking des coûts', () => {
    
    it('devrait tracker les coûts par provider', async () => {
      vi.spyOn(geminiService, 'simpleChat').mockResolvedValue('Réponse courte');
      
      await apiRouter.routeRequest({
        type: 'chat_simple',
        prompt: 'Test coût 1'
      });
      
      const metrics = await apiRouter.getCostMetrics();
      
      expect(metrics.byProvider.gemini).toBeGreaterThan(0);
      expect(metrics.today).toBeGreaterThan(0);
    });
    
    it('devrait calculer correctement la projection mensuelle', async () => {
      vi.spyOn(geminiService, 'simpleChat').mockResolvedValue('Réponse');
      
      // Simuler quelques requêtes
      for (let i = 0; i < 5; i++) {
        await apiRouter.routeRequest({
          type: 'chat_simple',
          prompt: `Test ${i}`
        });
      }
      
      const metrics = await apiRouter.getCostMetrics();
      
      // Simple check d'intégrité
      expect(metrics.month).toBeGreaterThan(0);
      expect(metrics.byRequestType['chat']).toBeDefined();
    });
    
  });
  
});
