import { useState, useEffect } from 'react';
import { Calendar, Clock, Store } from 'lucide-react';

// Utilitaires pour les semaines
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getDateOfISOWeek = (week, year) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
};

const formatDate = (date) => {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long'
  });
};

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// États possibles pour chaque créneau (demi-journée)
// 'ouvert' : normal, quantités calculées
// 'ferme_habituel' : fermé régulièrement (ex: dimanche), quantités perdues
// 'ferme_exceptionnel' : fermé exceptionnellement (ex: jour férié), quantités redistribuées
const ETATS_CRENEAU = {
  OUVERT: 'ouvert',
  FERME_HABITUEL: 'ferme_habituel',
  FERME_EXCEPTIONNEL: 'ferme_exceptionnel'
};

export default function StepSemaine({
  semaine,
  annee,
  horaires,
  magasin,
  onSemaineChange,
  onAnneeChange,
  onHorairesChange,
  onMagasinChange
}) {
  const currentYear = new Date().getFullYear();
  const currentWeek = getWeekNumber(new Date());

  // Initialiser avec la semaine courante si pas défini
  useEffect(() => {
    if (!semaine) onSemaineChange(currentWeek);
    if (!annee) onAnneeChange(currentYear);
  }, []);

  // Calculer les dates de la semaine sélectionnée
  const getWeekDates = () => {
    if (!semaine || !annee) return { start: null, end: null };
    const start = getDateOfISOWeek(semaine, annee);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  };

  const { start, end } = getWeekDates();

  // Helper pour obtenir l'état d'un créneau (nouvelle structure V2)
  const getEtatCreneau = (jour, periode) => {
    const jourData = horaires[jour];
    if (!jourData) return ETATS_CRENEAU.OUVERT;

    // Nouvelle structure V2 avec états par créneau
    if (jourData[periode]?.statut) {
      return jourData[periode].statut;
    }

    // Rétro-compatibilité avec l'ancienne structure
    if (jourData.ferme) {
      return jourData.exceptionnel ? ETATS_CRENEAU.FERME_EXCEPTIONNEL : ETATS_CRENEAU.FERME_HABITUEL;
    }

    // Ancienne structure: matin/apresmidi sont des booléens
    const isOpen = jourData[periode];
    return isOpen ? ETATS_CRENEAU.OUVERT : ETATS_CRENEAU.FERME_HABITUEL;
  };

  // Cycle entre les 3 états pour un jour complet: ouvert → fermeHabituelle → fermeExceptionnelle → ouvert
  const cycleEtatJour = (jour) => {
    const newHoraires = { ...horaires };
    const etatMatin = getEtatCreneau(jour, 'matin');
    const etatAprem = getEtatCreneau(jour, 'apresmidi');

    // Déterminer l'état global du jour
    const toutOuvert = etatMatin === ETATS_CRENEAU.OUVERT && etatAprem === ETATS_CRENEAU.OUVERT;
    const toutFermeHabituel = etatMatin === ETATS_CRENEAU.FERME_HABITUEL && etatAprem === ETATS_CRENEAU.FERME_HABITUEL;
    const toutFermeExceptionnel = etatMatin === ETATS_CRENEAU.FERME_EXCEPTIONNEL && etatAprem === ETATS_CRENEAU.FERME_EXCEPTIONNEL;

    if (toutOuvert) {
      // Ouvert → Fermé habituel
      newHoraires[jour] = {
        matin: { statut: ETATS_CRENEAU.FERME_HABITUEL },
        apresmidi: { statut: ETATS_CRENEAU.FERME_HABITUEL },
        ferme: true,
        exceptionnel: false
      };
    } else if (toutFermeHabituel) {
      // Fermé habituel → Fermé exceptionnel (avec redistribution par défaut)
      newHoraires[jour] = {
        matin: { statut: ETATS_CRENEAU.FERME_EXCEPTIONNEL, redistribution: { memeJourAutreCreneau: 85, jourSuivant: 15 } },
        apresmidi: { statut: ETATS_CRENEAU.FERME_EXCEPTIONNEL, redistribution: { memeJourAutreCreneau: 85, jourSuivant: 15 } },
        ferme: true,
        exceptionnel: true
      };
    } else {
      // Fermé exceptionnel ou état mixte → Ouvert
      newHoraires[jour] = {
        matin: { statut: ETATS_CRENEAU.OUVERT },
        apresmidi: { statut: ETATS_CRENEAU.OUVERT },
        ferme: false,
        exceptionnel: false
      };
    }
    onHorairesChange(newHoraires);
  };

  // Cycle entre les 3 états pour une demi-journée: ouvert → ferme_habituel → ferme_exceptionnel → ouvert
  const cycleDemiJournee = (jour, periode) => {
    const newHoraires = { ...horaires };
    const etatActuel = getEtatCreneau(jour, periode);
    const autrePeriode = periode === 'matin' ? 'apresmidi' : 'matin';
    const etatAutre = getEtatCreneau(jour, autrePeriode);

    let nouvelEtat;
    let redistribution = null;

    if (etatActuel === ETATS_CRENEAU.OUVERT) {
      nouvelEtat = ETATS_CRENEAU.FERME_HABITUEL;
    } else if (etatActuel === ETATS_CRENEAU.FERME_HABITUEL) {
      nouvelEtat = ETATS_CRENEAU.FERME_EXCEPTIONNEL;
      redistribution = { memeJourAutreCreneau: 85, jourSuivant: 15 };
    } else {
      nouvelEtat = ETATS_CRENEAU.OUVERT;
    }

    // Mettre à jour la structure
    if (!newHoraires[jour]) {
      newHoraires[jour] = {};
    }

    // S'assurer que l'autre période a aussi la nouvelle structure
    if (!newHoraires[jour][autrePeriode]?.statut) {
      newHoraires[jour][autrePeriode] = { statut: etatAutre };
    }

    newHoraires[jour][periode] = {
      statut: nouvelEtat,
      ...(redistribution && { redistribution })
    };

    // Mettre à jour les flags de compatibilité
    const nouveauEtatMatin = periode === 'matin' ? nouvelEtat : etatAutre;
    const nouveauEtatAprem = periode === 'apresmidi' ? nouvelEtat : etatAutre;

    const toutFerme = nouveauEtatMatin !== ETATS_CRENEAU.OUVERT && nouveauEtatAprem !== ETATS_CRENEAU.OUVERT;
    const auMoinsUnExceptionnel = nouveauEtatMatin === ETATS_CRENEAU.FERME_EXCEPTIONNEL || nouveauEtatAprem === ETATS_CRENEAU.FERME_EXCEPTIONNEL;

    newHoraires[jour].ferme = toutFerme;
    newHoraires[jour].exceptionnel = auMoinsUnExceptionnel;
    // Compatibilité ancienne structure
    newHoraires[jour].matin = nouveauEtatMatin === ETATS_CRENEAU.OUVERT;
    newHoraires[jour].apresmidi = nouveauEtatAprem === ETATS_CRENEAU.OUVERT;

    onHorairesChange(newHoraires);
  };

  // Obtenir la classe CSS pour un créneau selon son état
  const getCreneauClass = (jour, periode) => {
    const etat = getEtatCreneau(jour, periode);
    switch (etat) {
      case ETATS_CRENEAU.OUVERT:
        return 'bg-green-200 text-green-800 hover:bg-green-300';
      case ETATS_CRENEAU.FERME_HABITUEL:
        return 'bg-red-200 text-red-700 hover:bg-red-300';
      case ETATS_CRENEAU.FERME_EXCEPTIONNEL:
        return 'bg-orange-200 text-orange-700 hover:bg-orange-300';
      default:
        return 'bg-gray-200 text-gray-500';
    }
  };

  // Obtenir le libellé court pour un créneau
  const getCreneauLabel = (jour, periode) => {
    const etat = getEtatCreneau(jour, periode);
    const heures = periode === 'matin' ? '<13h' : '>13h';
    switch (etat) {
      case ETATS_CRENEAU.OUVERT:
        return heures;
      case ETATS_CRENEAU.FERME_HABITUEL:
        return '✕';
      case ETATS_CRENEAU.FERME_EXCEPTIONNEL:
        return '⚡';
      default:
        return heures;
    }
  };

  // Vérifier si le jour est complètement fermé
  const isJourFerme = (jour) => {
    const etatMatin = getEtatCreneau(jour, 'matin');
    const etatAprem = getEtatCreneau(jour, 'apresmidi');
    return etatMatin !== ETATS_CRENEAU.OUVERT && etatAprem !== ETATS_CRENEAU.OUVERT;
  };

  // Vérifier si le jour a au moins une fermeture exceptionnelle
  const hasExceptionnel = (jour) => {
    const etatMatin = getEtatCreneau(jour, 'matin');
    const etatAprem = getEtatCreneau(jour, 'apresmidi');
    return etatMatin === ETATS_CRENEAU.FERME_EXCEPTIONNEL || etatAprem === ETATS_CRENEAU.FERME_EXCEPTIONNEL;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Section Magasin */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#58595B] mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-[#ED1C24]" />
          Identification du magasin
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du magasin
            </label>
            <input
              type="text"
              value={magasin?.nom || ''}
              onChange={(e) => onMagasinChange({ ...magasin, nom: e.target.value })}
              placeholder="Ex: Intermarché Lorient"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code PDV (optionnel)
            </label>
            <input
              type="text"
              value={magasin?.code || ''}
              onChange={(e) => onMagasinChange({ ...magasin, code: e.target.value })}
              placeholder="Ex: PDV-12345"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Section Semaine */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#58595B] mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#ED1C24]" />
          Semaine de production
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sélecteurs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de semaine
              </label>
              <select
                value={semaine || currentWeek}
                onChange={(e) => onSemaineChange(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24] focus:border-transparent"
              >
                {Array.from({ length: 53 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Semaine {w} {w === currentWeek ? '(actuelle)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Année
              </label>
              <select
                value={annee || currentYear}
                onChange={(e) => onAnneeChange(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24] focus:border-transparent"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Affichage des dates */}
          <div className="flex items-center justify-center">
            {start && end && (
              <div className="text-center p-4 bg-[#E8E1D5]/30 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Période couverte</p>
                <p className="text-xl font-semibold text-[#8B1538]">
                  {formatDate(start)} → {formatDate(end)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{annee}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Horaires */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#58595B] mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#ED1C24]" />
          Horaires du rayon BVP
        </h3>

        <p className="text-sm text-gray-500 mb-4">
          Cliquez sur le nom du jour pour basculer toute la journée. Cliquez sur un créneau pour cycler ses états.
        </p>

        <div className="grid grid-cols-7 gap-2">
          {JOURS.map((jour) => {
            const isFerme = isJourFerme(jour);
            const isExcept = hasExceptionnel(jour);

            // Couleurs selon l'état global du jour
            const getBorderClass = () => {
              if (!isFerme && !isExcept) return 'border-green-300 bg-green-50';
              if (isExcept) return 'border-orange-300 bg-orange-50';
              return 'border-red-300 bg-red-50';
            };

            const getHeaderClass = () => {
              if (!isFerme && !isExcept) return 'bg-green-100 text-green-700 hover:bg-green-200';
              if (isExcept) return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
              return 'bg-red-100 text-red-700 hover:bg-red-200';
            };

            return (
              <div
                key={jour}
                className={`rounded-lg border-2 transition-all ${getBorderClass()}`}
              >
                {/* En-tête du jour - clic pour basculer toute la journée */}
                <button
                  onClick={() => cycleEtatJour(jour)}
                  className={`w-full py-2 px-1 text-center font-medium text-sm rounded-t-lg transition-colors ${getHeaderClass()}`}
                  title="Cliquer pour basculer toute la journée"
                >
                  {jour.charAt(0).toUpperCase() + jour.slice(1, 3)}
                </button>

                {/* Demi-journées - toujours affichées avec leur état */}
                <div className="p-1 space-y-1">
                  <button
                    onClick={() => cycleDemiJournee(jour, 'matin')}
                    className={`w-full py-1 text-xs rounded transition-colors font-medium ${getCreneauClass(jour, 'matin')}`}
                    title={`<13h : ${getEtatCreneau(jour, 'matin').replace('_', ' ')} - Cliquer pour changer`}
                  >
                    {getCreneauLabel(jour, 'matin')}
                  </button>
                  <button
                    onClick={() => cycleDemiJournee(jour, 'apresmidi')}
                    className={`w-full py-1 text-xs rounded transition-colors font-medium ${getCreneauClass(jour, 'apresmidi')}`}
                    title={`>13h : ${getEtatCreneau(jour, 'apresmidi').replace('_', ' ')} - Cliquer pour changer`}
                  >
                    {getCreneauLabel(jour, 'apresmidi')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Légende améliorée */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-600 mb-2">Légende des créneaux :</p>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 bg-green-200 rounded flex items-center justify-center text-green-800 text-[10px]">&lt;13h</span>
              Ouvert
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 bg-red-200 rounded flex items-center justify-center text-red-700 text-[10px]">✕</span>
              Fermé habituel (qté perdues)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 bg-orange-200 rounded flex items-center justify-center text-orange-700 text-[10px]">⚡</span>
              Fermé exceptionnel (qté redistribuées)
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            💡 Fermeture exceptionnelle : 85% reporté sur l'autre créneau, 15% sur le lendemain
          </p>
        </div>
      </div>
    </div>
  );
}
