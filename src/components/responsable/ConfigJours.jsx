import { useState } from 'react';
import { Calendar, Check, X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const JOURS = [
  { id: 'lundi', label: 'Lundi' },
  { id: 'mardi', label: 'Mardi' },
  { id: 'mercredi', label: 'Mercredi' },
  { id: 'jeudi', label: 'Jeudi' },
  { id: 'vendredi', label: 'Vendredi' },
  { id: 'samedi', label: 'Samedi' },
  { id: 'dimanche', label: 'Dimanche' },
];

const CRENEAUX = [
  { id: 'matin', label: 'Matin', horaires: '6h - 14h' },
  { id: 'apresMidi', label: 'Après-midi', horaires: '14h - 20h' },
];

// Charte Mousquetaires : emerald pour succès/ouvert, gray pour fermé habituel, amber pour exceptionnel
const STATUTS = {
  ouvert: { label: 'Ouvert', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-100', icon: Check },
  ferme_habituel: { label: 'Fermé habituel', color: 'bg-gray-400', textColor: 'text-gray-700', bgLight: 'bg-gray-100', icon: X },
  ferme_exceptionnel: { label: 'Fermé exceptionnel', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-100', icon: AlertTriangle },
};

// Valeur par défaut pour un créneau
const defaultCreneau = {
  statut: 'ouvert',
  redistribution: {
    memeJourAutreCreneau: 85,
    jourSuivant: 15
  }
};

// Initialiser la structure complète des jours
const initialiserJoursOuverture = () => {
  const jours = {};
  JOURS.forEach(jour => {
    jours[jour.id] = {
      matin: { ...defaultCreneau },
      apresMidi: { ...defaultCreneau }
    };
  });
  // Lundi fermé par défaut (habitude boulangerie)
  jours.lundi.matin.statut = 'ferme_habituel';
  jours.lundi.apresMidi.statut = 'ferme_habituel';
  return jours;
};

export default function ConfigJours({ joursOuverture, onChange }) {
  const [panelOuvert, setPanelOuvert] = useState(null); // {jour, creneau} ou null

  // S'assurer que la structure est correcte
  const jours = joursOuverture && typeof joursOuverture.lundi === 'object' && joursOuverture.lundi.matin
    ? joursOuverture
    : initialiserJoursOuverture();

  // Cycle des statuts : ouvert → ferme_habituel → ferme_exceptionnel → ouvert
  const cycleStatut = (statut) => {
    const ordre = ['ouvert', 'ferme_habituel', 'ferme_exceptionnel'];
    const index = ordre.indexOf(statut);
    return ordre[(index + 1) % ordre.length];
  };

  // Gérer le clic sur un créneau
  const handleCreneauClick = (jourId, creneauId) => {
    const nouveauStatut = cycleStatut(jours[jourId][creneauId].statut);
    const nouveauxJours = {
      ...jours,
      [jourId]: {
        ...jours[jourId],
        [creneauId]: {
          ...jours[jourId][creneauId],
          statut: nouveauStatut
        }
      }
    };
    onChange(nouveauxJours);

    // Ouvrir/fermer le panel de redistribution si ferme_exceptionnel
    if (nouveauStatut === 'ferme_exceptionnel') {
      setPanelOuvert({ jour: jourId, creneau: creneauId });
    } else if (panelOuvert?.jour === jourId && panelOuvert?.creneau === creneauId) {
      setPanelOuvert(null);
    }
  };

  // Mettre à jour la redistribution
  const handleRedistributionChange = (jourId, creneauId, champ, valeur) => {
    const valeurNum = Math.max(0, Math.min(100, parseInt(valeur) || 0));
    const autreChamp = champ === 'memeJourAutreCreneau' ? 'jourSuivant' : 'memeJourAutreCreneau';
    const autreValeur = 100 - valeurNum;

    const nouveauxJours = {
      ...jours,
      [jourId]: {
        ...jours[jourId],
        [creneauId]: {
          ...jours[jourId][creneauId],
          redistribution: {
            [champ]: valeurNum,
            [autreChamp]: autreValeur
          }
        }
      }
    };
    onChange(nouveauxJours);
  };

  // Tout mettre ouvert pour un jour
  const toutOuvrirJour = (jourId) => {
    const nouveauxJours = {
      ...jours,
      [jourId]: {
        matin: { ...jours[jourId].matin, statut: 'ouvert' },
        apresMidi: { ...jours[jourId].apresMidi, statut: 'ouvert' }
      }
    };
    onChange(nouveauxJours);
    if (panelOuvert?.jour === jourId) setPanelOuvert(null);
  };

  // Tout mettre fermé habituel pour un jour
  const toutFermerJour = (jourId) => {
    const nouveauxJours = {
      ...jours,
      [jourId]: {
        matin: { ...jours[jourId].matin, statut: 'ferme_habituel' },
        apresMidi: { ...jours[jourId].apresMidi, statut: 'ferme_habituel' }
      }
    };
    onChange(nouveauxJours);
    if (panelOuvert?.jour === jourId) setPanelOuvert(null);
  };

  // Toggle panel redistribution
  const togglePanel = (jourId, creneauId) => {
    if (panelOuvert?.jour === jourId && panelOuvert?.creneau === creneauId) {
      setPanelOuvert(null);
    } else {
      setPanelOuvert({ jour: jourId, creneau: creneauId });
    }
  };

  // Compter les créneaux ouverts
  const nbCreneauxOuverts = Object.values(jours).reduce((acc, jour) => {
    return acc + (jour.matin.statut === 'ouvert' ? 1 : 0) + (jour.apresMidi.statut === 'ouvert' ? 1 : 0);
  }, 0);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-amber-100 rounded-lg">
          <Calendar className="text-amber-700" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#58595B]">Jours et Horaires d'Ouverture</h2>
          <p className="text-[#58595B]/70">{nbCreneauxOuverts} créneaux ouverts sur 14</p>
        </div>
      </div>

      {/* Légende */}
      <div className="flex gap-4 mb-4 text-sm">
        {Object.entries(STATUTS).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-6 h-6 ${config.color} rounded flex items-center justify-center`}>
                <Icon size={14} className="text-white" />
              </div>
              <span className="text-[#58595B]">{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Grille des jours */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D1D3D4] overflow-hidden">
        {/* En-tête */}
        <div className="grid grid-cols-[150px_1fr_1fr_auto] gap-2 p-3 bg-[#E8E1D5] border-b border-[#D1D3D4]">
          <div className="font-semibold text-[#58595B]">Jour</div>
          {CRENEAUX.map(creneau => (
            <div key={creneau.id} className="text-center">
              <div className="font-semibold text-[#58595B]">{creneau.label}</div>
              <div className="text-xs text-[#58595B]/70">{creneau.horaires}</div>
            </div>
          ))}
          <div className="w-24"></div>
        </div>

        {/* Lignes des jours */}
        {JOURS.map(jour => (
          <div key={jour.id} className="border-b border-[#D1D3D4] last:border-b-0">
            <div className="grid grid-cols-[150px_1fr_1fr_auto] gap-2 p-3 items-center">
              {/* Nom du jour */}
              <div className="font-medium text-[#58595B]">{jour.label}</div>

              {/* Créneaux */}
              {CRENEAUX.map(creneau => {
                const creneauData = jours[jour.id][creneau.id];
                const statut = STATUTS[creneauData.statut];
                const Icon = statut.icon;
                const isExceptionnel = creneauData.statut === 'ferme_exceptionnel';
                const isPanelOpen = panelOuvert?.jour === jour.id && panelOuvert?.creneau === creneau.id;

                return (
                  <div key={creneau.id} className="flex flex-col items-center">
                    <button
                      onClick={() => handleCreneauClick(jour.id, creneau.id)}
                      className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${statut.bgLight} ${statut.textColor} hover:opacity-80`}
                    >
                      <div className={`w-6 h-6 ${statut.color} rounded flex items-center justify-center`}>
                        <Icon size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-medium">{statut.label}</span>
                    </button>

                    {/* Bouton pour ouvrir panel redistribution */}
                    {isExceptionnel && (
                      <button
                        onClick={() => togglePanel(jour.id, creneau.id)}
                        className="mt-1 text-xs text-amber-700 flex items-center gap-1 hover:underline"
                      >
                        Redistribution
                        {isPanelOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Actions rapides */}
              <div className="flex gap-1">
                <button
                  onClick={() => toutOuvrirJour(jour.id)}
                  className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                  title="Tout ouvrir"
                >
                  Tout ✓
                </button>
                <button
                  onClick={() => toutFermerJour(jour.id)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  title="Tout fermer"
                >
                  Fermé
                </button>
              </div>
            </div>

            {/* Panel de redistribution */}
            {CRENEAUX.map(creneau => {
              const creneauData = jours[jour.id][creneau.id];
              const isPanelOpen = panelOuvert?.jour === jour.id && panelOuvert?.creneau === creneau.id;

              if (!isPanelOpen || creneauData.statut !== 'ferme_exceptionnel') return null;

              return (
                <div key={`panel-${creneau.id}`} className="px-3 pb-3">
                  <div className="bg-amber-50 rounded-lg p-4 ml-[150px]">
                    <h4 className="font-medium text-amber-800 mb-3">
                      Redistribution du potentiel - {jour.label} {creneau.label}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-amber-700 mb-1">
                          Même jour, autre créneau
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={creneauData.redistribution.memeJourAutreCreneau}
                            onChange={(e) => handleRedistributionChange(jour.id, creneau.id, 'memeJourAutreCreneau', e.target.value)}
                            className="w-20 px-3 py-2 border border-[#D1D3D4] rounded-lg text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                          <span className="text-amber-700">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-amber-700 mb-1">
                          Jour suivant
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={creneauData.redistribution.jourSuivant}
                            onChange={(e) => handleRedistributionChange(jour.id, creneau.id, 'jourSuivant', e.target.value)}
                            className="w-20 px-3 py-2 border border-[#D1D3D4] rounded-lg text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                          <span className="text-amber-700">%</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                      Total: {creneauData.redistribution.memeJourAutreCreneau + creneauData.redistribution.jourSuivant}% (doit être 100%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-[#58595B]/70">
        Cliquez sur un créneau pour changer son statut. Les fermetures exceptionnelles permettent de redistribuer le potentiel.
      </p>
    </div>
  );
}

// Export de la fonction d'initialisation pour utilisation dans AppV2
export { initialiserJoursOuverture };
