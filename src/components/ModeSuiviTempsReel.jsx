import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import TouchButton from './TouchButton';

/**
 * Mode "Suivi temps réel"
 * Affiche l'état d'avancement par rayon selon l'heure actuelle
 *
 * Props:
 * - rayonsData: Array<{rayon, progression, retard}>
 * - trancheActuelle: 'matin' | 'midi' | 'soir'
 * - onVoirDetails: fonction callback
 * - onAjusterPlanning: fonction callback
 */
export default function ModeSuiviTempsReel({
  rayonsData = [],
  trancheActuelle = 'matin',
  onVoirDetails,
  onAjusterPlanning
}) {
  const heureActuelle = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const trancheLabels = {
    matin: 'MATIN',
    midi: 'MIDI',
    soir: 'SOIR'
  };

  /**
   * Détermine le statut d'un rayon
   * progression: pourcentage d'avancement (0-100)
   * retard: écart en unités/plaques par rapport au planning
   */
  const getStatut = (progression, retard) => {
    if (retard < 0) {
      // En avance
      return {
        type: 'avance',
        color: 'green',
        icon: CheckCircle,
        label: 'En avance'
      };
    } else if (retard === 0 || Math.abs(retard) <= 2) {
      // Dans les temps
      return {
        type: 'ok',
        color: 'blue',
        icon: Clock,
        label: 'Dans les temps'
      };
    } else {
      // En retard
      return {
        type: 'retard',
        color: 'red',
        icon: AlertCircle,
        label: 'En retard'
      };
    }
  };

  // Grouper par statut
  const rayonsParStatut = {
    avance: [],
    ok: [],
    retard: []
  };

  rayonsData.forEach(rayon => {
    const statut = getStatut(rayon.progression, rayon.retard);
    rayonsParStatut[statut.type].push({ ...rayon, statut });
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* Header avec heure */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-90">Il est {heureActuelle}</div>
            <div className="text-2xl font-bold">Tranche {trancheLabels[trancheActuelle]}</div>
          </div>
          <Clock className="w-12 h-12 opacity-80" />
        </div>
      </div>

      {/* États par rayon */}
      <div className="space-y-3">
        {/* En avance */}
        {rayonsParStatut.avance.map((rayon) => {
          const Icon = rayon.statut.icon;
          return (
            <div
              key={rayon.rayon}
              className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-500 rounded-lg"
            >
              <Icon className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-green-800">{rayon.statut.label}: {rayon.rayon}</div>
                <div className="text-sm text-green-600">
                  Progression: {rayon.progression}% • Avance: {Math.abs(rayon.retard)} unités
                </div>
              </div>
            </div>
          );
        })}

        {/* Dans les temps */}
        {rayonsParStatut.ok.map((rayon) => {
          const Icon = rayon.statut.icon;
          return (
            <div
              key={rayon.rayon}
              className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-500 rounded-lg"
            >
              <Icon className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-blue-800">{rayon.statut.label}: {rayon.rayon}</div>
                <div className="text-sm text-blue-600">
                  Progression: {rayon.progression}%
                </div>
              </div>
            </div>
          );
        })}

        {/* En retard */}
        {rayonsParStatut.retard.map((rayon) => {
          const Icon = rayon.statut.icon;
          return (
            <div
              key={rayon.rayon}
              className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-500 rounded-lg"
            >
              <Icon className="w-8 h-8 text-red-600 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <div className="font-bold text-red-800">{rayon.statut.label}: {rayon.rayon}</div>
                <div className="text-sm text-red-600">
                  Progression: {rayon.progression}% • Retard: -{rayon.retard} unités
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <TouchButton
          variant="secondary"
          size="lg"
          onClick={onVoirDetails}
          fullWidth
        >
          Voir détails
        </TouchButton>
        <TouchButton
          variant="primary"
          size="lg"
          onClick={onAjusterPlanning}
          fullWidth
        >
          Ajuster planning
        </TouchButton>
      </div>

      {/* Résumé */}
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{rayonsParStatut.avance.length}</div>
            <div className="text-xs text-gray-600">En avance</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{rayonsParStatut.ok.length}</div>
            <div className="text-xs text-gray-600">Dans les temps</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{rayonsParStatut.retard.length}</div>
            <div className="text-xs text-gray-600">En retard</div>
          </div>
        </div>
      </div>
    </div>
  );
}
