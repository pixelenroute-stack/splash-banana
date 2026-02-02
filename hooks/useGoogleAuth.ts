
import { useState, useEffect, useCallback } from 'react';
import { googleService } from '../services/googleService';
import { useNotification } from '../context/NotificationContext';

export function useGoogleAuth(userId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const { notify } = useNotification();

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const status = await googleService.getAccountStatus(userId);
      setIsConnected(status.connected && status.status === 'live');
      setEmail(status.email);
    } catch (error) {
      console.error("Auth check failed", error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = () => {
    try {
        const url = googleService.getAuthUrl(userId);
        window.location.href = url;
    } catch (e) {
        notify("Erreur: Configuration OAuth manquante", "error");
    }
  };

  const disconnect = async () => {
    try {
        await googleService.disconnectAccount(userId);
        setIsConnected(false);
        setEmail(undefined);
        notify("Compte Google déconnecté", "success");
    } catch (e) {
        notify("Erreur lors de la déconnexion", "error");
    }
  };

  return { isConnected, loading, email, connect, disconnect, refreshStatus: checkConnection };
}
