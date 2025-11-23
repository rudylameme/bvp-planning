import { useState, useEffect } from 'react';
import { Calendar, Download, Upload, AlertCircle } from 'lucide-react';
import {
  calculateWeekDates,
  getCurrentWeek,
  determinerJoursReport,
  exporterConfiguration,
  importerConfiguration
} from '../utils/weekCalculator';
import { mousquetairesColors } from '../styles/mousquetaires-theme';

export default function EtapeConfigurationSemaine({
  onSuivant,
  onPrecedent,
  configSemaine,
  setConfigSemaine
}) {
  const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const [weekDates, setWeekDates] = useState({});
  const [erreurs, setErreurs] = useState({});

  // Initialiser avec la semaine courante si pas de config
  useEffect(() => {
    if (!configSemaine.numeroSemaine) {
      const { weekNumber, year } = getCurrentWeek();
      setConfigSemaine({
        ...configSemaine,
        numeroSemaine: weekNumber,
        annee: year
      });
    }
  }, []);

  // Calculer les dates quand la semaine ou l'année change
  useEffect(() => {
    if (configSemaine.numeroSemaine && configSemaine.annee) {
      const dates = calculateWeekDates(configSemaine.numeroSemaine, configSemaine.annee);
      setWeekDates(dates);
    }
  }, [configSemaine.numeroSemaine, configSemaine.annee]);

  const handleChangeSemaine = (field, value) => {
    const numValue = parseInt(value);

    if (field === 'numeroSemaine') {
      if (numValue < 1 || numValue > 53) return;
    }

    setConfigSemaine({
      ...configSemaine,
      [field]: numValue
    });
  };

  const handleChangeFermetureHebdo = (jour) => {
    setConfigSemaine({
      ...configSemaine,
      fermetureHebdo: jour
    });
  };

  const handleToggleFermetureExceptionnelle = (jour, index) => {
    const fermeturesExceptionnelles = { ...configSemaine.fermeturesExceptionnelles };

    if (fermeturesExceptionnelles[jour]?.active) {
      // Désactiver
      delete fermeturesExceptionnelles[jour];
    } else {
      // Activer avec reports par défaut
      const reportsConfig = determinerJoursReport(jour, index);
      fermeturesExceptionnelles[jour] = {
        active: true,
        date: weekDates[jour],
        reports: {
          [reportsConfig.jourReport1]: reportsConfig.pourcentageReport1,
          [reportsConfig.jourReport2]: reportsConfig.pourcentageReport2
        }
      };
    }

    setConfigSemaine({
      ...configSemaine,
      fermeturesExceptionnelles
    });

    // Valider
    validerReports(jour, fermeturesExceptionnelles);
  };

  const handleChangeReport = (jour, jourReport, value) => {
    const pourcentage = parseInt(value) || 0;

    const fermeturesExceptionnelles = { ...configSemaine.fermeturesExceptionnelles };
    fermeturesExceptionnelles[jour].reports[jourReport] = pourcentage;

    setConfigSemaine({
      ...configSemaine,
      fermeturesExceptionnelles
    });

    // Valider
    validerReports(jour, fermeturesExceptionnelles);
  };

  const validerReports = (jour, fermeturesExceptionnelles) => {
    const config = fermeturesExceptionnelles[jour];
    if (!config) return;

    const totalPourcentage = Object.values(config.reports).reduce((sum, val) => sum + val, 0);

    const newErreurs = { ...erreurs };
    if (totalPourcentage !== 100) {
      newErreurs[jour] = `La somme doit faire 100% (actuellement ${totalPourcentage}%)`;
    } else {
      delete newErreurs[jour];
    }

    setErreurs(newErreurs);
  };

  const handleExporter = () => {
    try {
      const jsonString = exporterConfiguration(configSemaine);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `configuration_semaine_${configSemaine.numeroSemaine}_${configSemaine.annee}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Configuration exportée avec succès !');
    } catch (error) {
      alert('Erreur lors de l\'export : ' + error.message);
    }
  };

  const handleImporter = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = importerConfiguration(e.target.result);
        setConfigSemaine({
          ...configSemaine,
          ...config
        });
        alert('Configuration importée avec succès !');
      } catch (error) {
        alert('Erreur lors de l\'import : ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const validerEtSuivant = () => {
    // Vérifier qu'il n'y a pas d'erreurs
    if (Object.keys(erreurs).length > 0) {
      alert('Veuillez corriger les erreurs avant de continuer.');
      return;
    }

    onSuivant();
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-2" style={{ color: mousquetairesColors.primary.redDark }}>
        Configuration de la Semaine de Production
      </h2>
      <p className="text-gray-600 mb-6">
        Définissez la période et les fermetures pour adapter le planning
      </p>

      {/* Section 1: Sélection de la semaine */}
      <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} style={{ color: mousquetairesColors.primary.red }} />
          <h3 className="text-xl font-semibold" style={{ color: mousquetairesColors.primary.redDark }}>
            Période de production
          </h3>
        </div>

        <div className="flex gap-6 items-end flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de semaine
            </label>
            <input
              type="number"
              min="1"
              max="53"
              value={configSemaine.numeroSemaine || ''}
              onChange={(e) => handleChangeSemaine('numeroSemaine', e.target.value)}
              className="w-24 border-2 border-gray-300 rounded-lg p-2 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Année
            </label>
            <input
              type="number"
              min="2020"
              max="2030"
              value={configSemaine.annee || ''}
              onChange={(e) => handleChangeSemaine('annee', e.target.value)}
              className="w-28 border-2 border-gray-300 rounded-lg p-2 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {weekDates.lundi && weekDates.dimanche && (
            <div className="text-lg font-medium px-4 py-2 rounded-lg" style={{
              backgroundColor: mousquetairesColors.secondary.beigeLight,
              color: mousquetairesColors.primary.redDark
            }}>
              → Du Lundi {weekDates.lundi} au Dimanche {weekDates.dimanche}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Fermeture hebdomadaire */}
      <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 mb-6">
        <h3 className="text-xl font-semibold mb-2" style={{ color: mousquetairesColors.primary.redDark }}>
          Fermeture hebdomadaire légale
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Jour de fermeture régulier (chaque semaine)
        </p>

        <select
          value={configSemaine.fermetureHebdo || ''}
          onChange={(e) => handleChangeFermetureHebdo(e.target.value)}
          className="w-full md:w-64 border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Aucune fermeture hebdomadaire</option>
          {jours.map(jour => (
            <option key={jour} value={jour} className="capitalize">
              Tous les {jour}s
            </option>
          ))}
        </select>

        <div className="mt-3 flex items-start gap-2 text-sm text-orange-700 bg-orange-50 p-3 rounded-lg">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p>
            Les quantités prévues pour ce jour seront mises à zéro. <strong>Pas de report automatique</strong> sur les autres jours.
          </p>
        </div>
      </div>

      {/* Section 3: Fermetures exceptionnelles */}
      <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 mb-6">
        <h3 className="text-xl font-semibold mb-2" style={{ color: mousquetairesColors.primary.redDark }}>
          Fermetures exceptionnelles (jours fériés)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Les quantités seront reportées automatiquement sur les jours adjacents
        </p>

        <div className="space-y-4">
          {jours.map((jour, index) => {
            const date = weekDates[jour];
            const fermetureConfig = configSemaine.fermeturesExceptionnelles?.[jour];
            const estActif = fermetureConfig?.active;

            return (
              <div key={jour} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    id={`ferie-${jour}`}
                    checked={estActif || false}
                    onChange={() => handleToggleFermetureExceptionnelle(jour, index)}
                    className="w-5 h-5 text-amber-600 focus:ring-amber-500 rounded cursor-pointer"
                  />
                  <label
                    htmlFor={`ferie-${jour}`}
                    className="font-medium capitalize cursor-pointer text-gray-800 flex-1"
                  >
                    {jour} {date} - Fermeture exceptionnelle
                  </label>
                </div>

                {estActif && (
                  <div className="ml-9 mt-3 p-4 rounded-lg" style={{ backgroundColor: mousquetairesColors.secondary.beigeLight }}>
                    <p className="text-sm font-medium mb-3" style={{ color: mousquetairesColors.primary.redDark }}>
                      Report des quantités prévues :
                    </p>
                    <div className="flex gap-6 flex-wrap">
                      {Object.entries(fermetureConfig.reports).map(([jourReport, pourcentage]) => (
                        <div key={jourReport} className="flex items-center gap-2">
                          <label className="text-sm capitalize font-medium min-w-[80px]">
                            {jourReport} :
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={pourcentage}
                            onChange={(e) => handleChangeReport(jour, jourReport, e.target.value)}
                            className="w-20 border-2 border-gray-300 rounded-lg px-3 py-1 text-center font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-sm font-medium">%</span>
                        </div>
                      ))}
                    </div>

                    {/* Validation */}
                    {erreurs[jour] && (
                      <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <p>{erreurs[jour]}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Export/Import */}
      <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 mb-6">
        <h3 className="text-xl font-semibold mb-2" style={{ color: mousquetairesColors.primary.redDark }}>
          Sauvegarde de la configuration
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Exportez cette configuration pour la réutiliser ultérieurement ou la partager
        </p>

        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handleExporter}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition hover:opacity-90"
            style={{ backgroundColor: mousquetairesColors.functional.success }}
          >
            <Download size={18} />
            Exporter configuration
          </button>

          <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: mousquetairesColors.primary.red }}
          >
            <Upload size={18} />
            Importer configuration
            <input
              type="file"
              accept=".json"
              onChange={handleImporter}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onPrecedent}
          className="px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
          style={{
            backgroundColor: mousquetairesColors.secondary.beige,
            color: mousquetairesColors.primary.redDark,
            border: `2px solid ${mousquetairesColors.secondary.gray}`
          }}
        >
          ← Retour
        </button>

        <button
          onClick={validerEtSuivant}
          className="px-6 py-3 rounded-lg text-white font-semibold transition hover:opacity-90"
          style={{ backgroundColor: mousquetairesColors.primary.red }}
        >
          Suivant : Planning →
        </button>
      </div>
    </div>
  );
}
