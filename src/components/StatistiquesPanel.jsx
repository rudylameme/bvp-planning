import { TrendingUp } from 'lucide-react';

export default function StatistiquesPanel({ planning, isVisible }) {
  if (!isVisible || !planning) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Répartition basée sur la fréquentation
      </h2>

      {/* Type de pondération */}
      {planning.stats.ponderationType && planning.stats.ponderations && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            Type de pondération : <span className="font-bold">{planning.stats.ponderationType}</span>
          </h3>
          <div className="text-sm text-blue-700">
            <p>S-1 (semaine précédente) : {(planning.stats.ponderations.S1 * 100)}%</p>
            <p>AS-1 (même semaine année précédente) : {(planning.stats.ponderations.AS1 * 100)}%</p>
            <p>S-2 (il y a 2 semaines) : {(planning.stats.ponderations.S2 * 100)}%</p>
          </div>
        </div>
      )}

      {/* Répartition par jour */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Répartition par jour de la semaine</h3>
        <div className="grid grid-cols-7 gap-2">
          {Object.entries(planning.stats.poidsJours).map(([jour, poids]) => (
            <div key={jour} className="text-center">
              <div className="text-xs font-medium text-gray-600">{jour}</div>
              <div className="text-lg font-bold text-blue-600">
                {(poids * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Répartition horaire par jour */}
      {planning.stats.poidsTranchesParJour && Object.keys(planning.stats.poidsTranchesParJour).length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Répartition horaire par jour</h3>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map(jour => {
              const poids = planning.stats.poidsTranchesParJour[jour];
              if (!poids) return null;

              return (
                <div key={jour} className="text-center">
                  <div className="text-xs font-medium text-gray-600 capitalize mb-1">{jour}</div>
                  <div className="text-xs space-y-1">
                    <div className="text-green-600 font-bold">
                      M: {(poids.matin * 100).toFixed(0)}%
                    </div>
                    <div className="text-yellow-600 font-bold">
                      Mi: {(poids.midi * 100).toFixed(0)}%
                    </div>
                    <div className="text-orange-600 font-bold">
                      S: {(poids.soir * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Moyennes hebdomadaires */}
          {planning.stats.poidsTranchesGlobal && (
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Moyennes hebdomadaires</h4>
              <div className="flex justify-around">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Matin (9h-12h)</div>
                  <div className="text-sm font-bold text-green-600">
                    {(planning.stats.poidsTranchesGlobal.matin * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Midi (12h-16h)</div>
                  <div className="text-sm font-bold text-yellow-600">
                    {(planning.stats.poidsTranchesGlobal.midi * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Soir (16h-23h)</div>
                  <div className="text-sm font-bold text-orange-600">
                    {(planning.stats.poidsTranchesGlobal.soir * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
