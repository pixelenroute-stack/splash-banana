
import React, { useEffect, useState } from 'react';
import { metricsCollector, AggregatedStats, ApiMetric, Alert } from '../../services/metricsCollector';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, 
  Coins, Database, RotateCcw, Server, Trash2, Zap 
} from 'lucide-react';

export const MetricsDashboard: React.FC = () => {
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [recent, setRecent] = useState<ApiMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const update = () => {
      setStats(metricsCollector.getStats());
      setRecent(metricsCollector.getMetrics(50));
      setAlerts(metricsCollector.getAlerts());
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleClear = () => {
    if (confirm("Supprimer tout l'historique des métriques ?")) {
      metricsCollector.clearMetrics();
      setRefresh(p => p + 1);
    }
  };

  if (!stats) return <div className="p-8 text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* ALERTS SECTION */}
      {alerts.length > 0 && (
        <div className="grid gap-4">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-4 rounded-xl border flex items-center gap-3 ${
              alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <AlertTriangle size={20} />
              <div className="flex-1">
                <p className="font-bold text-sm">{alert.type.toUpperCase()}</p>
                <p className="text-xs opacity-90">{alert.message}</p>
              </div>
              <span className="text-[10px] font-mono opacity-70">{new Date(alert.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">
            <Activity size={14} /> Total Requêtes
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalRequests}</p>
          <p className="text-xs text-slate-500 mt-1">{stats.rpm.toFixed(1)} RPM (avg 1h)</p>
        </div>

        <div className="bg-surface border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle size={14} /> Taux d'Erreur
          </div>
          <p className={`text-3xl font-bold ${stats.errorRate > 10 ? 'text-red-500' : 'text-green-400'}`}>
            {stats.errorRate.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">{stats.totalErrors} échecs</p>
        </div>

        <div className="bg-surface border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">
            <Clock size={14} /> Latence Moy.
          </div>
          <p className={`text-3xl font-bold ${stats.avgLatency > 5000 ? 'text-amber-500' : 'text-blue-400'}`}>
            {stats.avgLatency}ms
          </p>
          <p className="text-xs text-slate-500 mt-1">Temps réponse</p>
        </div>

        <div className="bg-surface border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">
            <Coins size={14} /> Coût Estimé
          </div>
          <p className="text-3xl font-bold text-purple-400">${stats.totalCost.toFixed(3)}</p>
          <p className="text-xs text-slate-500 mt-1">{stats.totalTokens.toLocaleString()} tokens</p>
        </div>
      </div>

      {/* RECENT REQUESTS TABLE */}
      <div className="bg-surface border border-slate-700 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex justify-between items-center">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Server size={18} className="text-primary"/> Logs Live
          </h3>
          <button onClick={handleClear} className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded hover:bg-slate-800">
            <Trash2 size={16} />
          </button>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-500 uppercase font-bold sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Opération</th>
                <th className="px-6 py-3">Modèle</th>
                <th className="px-6 py-3 text-right">Latence</th>
                <th className="px-6 py-3 text-right">Tokens</th>
                <th className="px-6 py-3 text-right">Coût</th>
                <th className="px-6 py-3 text-right">Temps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {recent.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500 italic">Aucune donnée récente.</td></tr>
              ) : (
                recent.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {m.success ? <CheckCircle size={14} className="text-green-500"/> : <AlertTriangle size={14} className="text-red-500"/>}
                        {m.retryCount > 0 && <span className="bg-slate-700 px-1.5 rounded text-[9px] text-white flex items-center gap-1"><RotateCcw size={8}/> {m.retryCount}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-300">{m.operation}</td>
                    <td className="px-6 py-3 text-slate-400">{m.model}</td>
                    <td className="px-6 py-3 text-right text-slate-300">{m.latency}ms</td>
                    <td className="px-6 py-3 text-right text-slate-400">{(m.inputTokens + m.outputTokens).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-300">${m.cost.toFixed(4)}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{new Date(m.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
