
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { googleService } from '../../services/googleService';
import { googleSyncService } from '../../services/googleSyncService';
import { db } from '../../services/mockDatabase';

interface LoginOverlayProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError('');

    try {
        googleSyncService.updateConfig({
            enabled: true,
            credentials: { email, password: pass }
        });
        await new Promise(resolve => setTimeout(resolve, 800));
        onSuccess();
    } catch (e) {
        setError("Erreur de connexion. Vérifiez vos identifiants.");
        setIsConnecting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsConnecting(true);
    try {
        const url = googleService.getAuthUrl("user_1");
        window.location.href = url;
    } catch (error) {
        onSuccess();
    }
  };

  return (
    <div className="atlantis-login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@300;500;700&display=swap');

        .atlantis-login-root {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #050b14;
          background-image: radial-gradient(circle at 50% 50%, #1a2a40 0%, #000000 100%);
          font-family: 'Rajdhani', sans-serif;
          overflow: hidden;
          perspective: 1000px;
          color: white;
        }

        .atlantis-stars {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: url('https://www.transparenttextures.com/patterns/stardust.png');
          opacity: 0.5;
          animation: atlantis-drift 200s linear infinite;
          z-index: 0;
        }

        .atlantis-hex-overlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-opacity='0.05' fill='%2300e5ff' fill-rule='evenodd'/%3E%3C/svg%3E");
          z-index: 1;
          pointer-events: none;
          opacity: 0.3;
        }

        .atlantis-planet {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #4a90e2, #001f3f);
          box-shadow: 0 0 50px rgba(74, 144, 226, 0.2);
          top: 10%;
          left: 10%;
          z-index: 1;
          transform: translateZ(-100px);
          animation: atlantis-float 20s infinite ease-in-out;
        }

        .atlantis-moon {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #d3d3d3, #696969);
          top: 15%;
          left: 28%;
          z-index: 2;
          animation: atlantis-float 25s infinite ease-in-out reverse;
        }

        .atlantis-ship {
          position: absolute;
          bottom: 15%;
          right: 10%;
          width: 250px;
          height: 150px;
          background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent);
          border: 1px solid #d4af37;
          clip-path: polygon(10% 0, 100% 20%, 90% 100%, 0% 80%);
          z-index: 2;
          animation: atlantis-shipHover 8s infinite ease-in-out;
          backdrop-filter: blur(2px);
        }

        .atlantis-ship::after {
          content: "CLASS AURORA DETECTED";
          position: absolute;
          bottom: -20px;
          right: 0;
          font-size: 10px;
          color: #d4af37;
          letter-spacing: 2px;
        }

        .atlantis-gate-container {
          position: absolute;
          z-index: 1;
          width: 600px;
          height: 600px;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0.8;
        }

        .atlantis-gate-ring {
          width: 100%;
          height: 100%;
          border: 15px solid #3a4a5a;
          border-radius: 50%;
          box-shadow: 0 0 30px #00e5ff, inset 0 0 20px black;
          position: relative;
          animation: atlantis-spin 60s linear infinite;
        }

        .atlantis-symbol {
          position: absolute;
          width: 20px;
          height: 20px;
          background: #d4af37;
          border-radius: 50%;
          box-shadow: 0 0 10px #d4af37;
        }

        .atlantis-s1 { top: 10px; left: 50%; }
        .atlantis-s2 { bottom: 10px; left: 50%; }
        .atlantis-s3 { left: 10px; top: 50%; }
        .atlantis-s4 { right: 10px; top: 50%; }

        .atlantis-horizon {
          position: absolute;
          width: 85%;
          height: 85%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,229,255,0.8) 0%, rgba(0,100,255,0.4) 70%, transparent 100%);
          box-shadow: 0 0 60px #00e5ff;
          animation: atlantis-pulse 4s infinite ease-in-out;
        }

        .atlantis-panel {
          position: relative;
          z-index: 10;
          background: rgba(10, 20, 35, 0.65);
          backdrop-filter: blur(15px);
          padding: 40px;
          width: 420px;
          max-width: 90vw;
          border: 1px solid #00e5ff;
          border-radius: 10px;
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.2);
          text-align: center;
          clip-path: polygon(5% 0, 100% 0, 100% 95%, 95% 100%, 0 100%, 0 5%);
        }

        .atlantis-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 2px;
          background: linear-gradient(90deg, transparent, #00e5ff, transparent);
        }

        .atlantis-panel h1 {
          font-family: 'Orbitron', sans-serif;
          color: #00e5ff;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 3px;
          text-shadow: 0 0 10px #00e5ff;
          font-size: 1.6em;
        }

        .atlantis-subtitle {
          font-size: 0.9em;
          color: #d4af37;
          margin-bottom: 30px;
          letter-spacing: 1px;
        }

        .atlantis-input-group {
          margin-bottom: 20px;
          position: relative;
        }

        .atlantis-input {
          width: 100%;
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid #334;
          border-left: 3px solid #00e5ff;
          color: white;
          font-family: 'Rajdhani', sans-serif;
          font-size: 1.1em;
          outline: none;
          transition: 0.3s;
        }

        .atlantis-input:focus {
          background: rgba(0, 229, 255, 0.1);
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
          border-left: 3px solid #d4af37;
        }

        .atlantis-input::placeholder {
          color: #667;
        }

        .atlantis-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(45deg, #005f73, #0a9396);
          border: none;
          color: white;
          font-family: 'Orbitron', sans-serif;
          font-weight: bold;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 2px;
          transition: 0.3s;
          position: relative;
          overflow: hidden;
          font-size: 0.9em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .atlantis-btn:hover:not(:disabled) {
          background: linear-gradient(45deg, #0a9396, #00e5ff);
          box-shadow: 0 0 20px #00e5ff;
        }

        .atlantis-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .atlantis-btn-google {
          width: 100%;
          padding: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.15);
          color: white;
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.95em;
          cursor: pointer;
          transition: 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 15px;
          letter-spacing: 1px;
        }

        .atlantis-btn-google:hover {
          background: rgba(255,255,255,0.1);
          border-color: #d4af37;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
        }

        .atlantis-links {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          font-size: 0.9em;
        }

        .atlantis-links a {
          color: #aaa;
          text-decoration: none;
          transition: 0.3s;
          cursor: pointer;
        }

        .atlantis-links a:hover {
          color: #00e5ff;
          text-shadow: 0 0 5px #00e5ff;
        }

        .atlantis-error {
          background: rgba(255, 50, 50, 0.15);
          border: 1px solid rgba(255, 50, 50, 0.3);
          color: #ff6b6b;
          padding: 8px 12px;
          margin-bottom: 15px;
          font-size: 0.85em;
          letter-spacing: 0.5px;
        }

        .atlantis-divider {
          display: flex;
          align-items: center;
          margin: 20px 0 10px;
          gap: 10px;
        }

        .atlantis-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.1);
        }

        .atlantis-divider-text {
          font-size: 0.75em;
          color: #667;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        @keyframes atlantis-drift {
          from { background-position: 0 0; }
          to { background-position: 1000px 500px; }
        }

        @keyframes atlantis-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes atlantis-shipHover {
          0%, 100% { transform: translateX(0) rotate(1deg); }
          50% { transform: translateX(10px) rotate(-1deg); }
        }

        @keyframes atlantis-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes atlantis-pulse {
          0% { opacity: 0.7; transform: scale(0.98); }
          50% { opacity: 0.9; transform: scale(1.02); }
          100% { opacity: 0.7; transform: scale(0.98); }
        }

        @media (max-width: 768px) {
          .atlantis-gate-container { width: 300px; height: 300px; }
          .atlantis-planet { width: 150px; height: 150px; }
          .atlantis-ship { display: none; }
          .atlantis-panel { width: 95vw; padding: 25px; }
        }
      `}</style>

      <div className="atlantis-stars" />
      <div className="atlantis-hex-overlay" />
      <div className="atlantis-planet" />
      <div className="atlantis-moon" />
      <div className="atlantis-ship" />

      <div className="atlantis-gate-container">
        <div className="atlantis-gate-ring">
          <div className="atlantis-symbol atlantis-s1" />
          <div className="atlantis-symbol atlantis-s2" />
          <div className="atlantis-symbol atlantis-s3" />
          <div className="atlantis-symbol atlantis-s4" />
        </div>
        <div className="atlantis-horizon" />
      </div>

      <div className="atlantis-panel">
        <h1>Splash Banana</h1>
        <p className="atlantis-subtitle">AUTHORIZATION CODE: ATLANTIS</p>

        {error && <div className="atlantis-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="atlantis-input-group">
            <input
              type="email"
              className="atlantis-input"
              placeholder="IDENTIFIANT (Email)"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="atlantis-input-group">
            <input
              type="password"
              className="atlantis-input"
              placeholder="CODE D'ACCES"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <button type="submit" disabled={isConnecting} className="atlantis-btn">
            {isConnecting && <Loader2 size={16} className="animate-spin" />}
            {isConnecting ? 'Connexion...' : 'Enclencher'}
          </button>

          <div className="atlantis-links">
            <a onClick={() => {}}>Mot de passe oublié ?</a>
            <a onClick={() => {}}>Créer un compte</a>
          </div>
        </form>

        <div className="atlantis-divider">
          <div className="atlantis-divider-line" />
          <span className="atlantis-divider-text">ou</span>
          <div className="atlantis-divider-line" />
        </div>

        <button onClick={handleGoogleLogin} disabled={isConnecting} className="atlantis-btn-google">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" style={{ width: 18, height: 18 }} />
          Se connecter avec Google
        </button>
      </div>
    </div>
  );
};
