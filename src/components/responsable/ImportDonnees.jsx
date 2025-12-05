import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { parseVentesExcel, parseFrequentationExcel } from '../../services/excelParser';

/**
 * Calcule le numéro de semaine ISO à partir d'une date au format DD/MM/YYYY
 */
const getNumeroSemaineFromDateFR = (dateFR) => {
  if (!dateFR) return null;
  const parts = dateFR.split('/');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts.map(Number);
  const date = new Date(year, month - 1, day);

  // Calcul ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export default function ImportDonnees({ onImportComplete }) {
  const [fichierFrequentation, setFichierFrequentation] = useState(null);
  const [fichierVentes, setFichierVentes] = useState(null);
  const [statusFrequentation, setStatusFrequentation] = useState(null);
  const [statusVentes, setStatusVentes] = useState(null);
  const [infoVentes, setInfoVentes] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Gestion du drop de fichier fréquentation
  const handleFrequentationUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatusFrequentation({ type: 'loading', message: 'Analyse en cours...' });

      const data = await parseFrequentationExcel(file);

      setFichierFrequentation(data);
      setStatusFrequentation({
        type: 'success',
        message: `${data.nombreSemaines} semaine(s) analysées (${data.semainesUtilisees?.join(', ') || 'données'})`
      });
    } catch (error) {
      setStatusFrequentation({ type: 'error', message: error.message });
    }
  }, []);

  // Gestion du drop de fichier ventes
  const handleVentesUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatusVentes({ type: 'loading', message: 'Analyse en cours...' });

      const data = await parseVentesExcel(file);

      setFichierVentes(data);
      setInfoVentes({
        nombreProduits: Object.keys(data.parProduit).length,
        nombreSemaines: data.nombreSemaines,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        caTotalRayon: data.caTotalRayon
      });
      setStatusVentes({
        type: 'success',
        message: `${Object.keys(data.parProduit).length} produits sur ${data.nombreSemaines} semaine(s)`
      });
    } catch (error) {
      setStatusVentes({ type: 'error', message: error.message });
    }
  }, []);

  // Validation et passage à l'étape suivante
  const handleValider = async () => {
    if (!fichierVentes) {
      setStatusVentes({ type: 'error', message: 'Veuillez importer le fichier des ventes' });
      return;
    }

    setIsProcessing(true);

    try {
      // Combiner les données
      const donneesImportees = {
        frequentation: fichierFrequentation,
        ventes: fichierVentes,
        nombreSemaines: fichierVentes.nombreSemaines,
        caTotalRayon: fichierVentes.caTotalRayon
      };

      onImportComplete(donneesImportees);
    } catch (error) {
      setStatusVentes({ type: 'error', message: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStatus = (status) => {
    if (!status) return null;

    // Charte Mousquetaires : emerald pour succès, red pour erreur, amber pour loading
    const styles = {
      loading: 'bg-amber-100 text-amber-800',
      success: 'bg-emerald-100 text-emerald-800',
      error: 'bg-red-100 text-red-800'
    };

    const icons = {
      loading: <div className="animate-spin h-5 w-5 border-2 border-amber-600 border-t-transparent rounded-full" />,
      success: <Check size={20} />,
      error: <AlertCircle size={20} />
    };

    return (
      <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${styles[status.type]}`}>
        {icons[status.type]}
        <span>{status.message}</span>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-[#58595B]">Import des Données</h2>
      <p className="text-[#58595B] mb-6">
        Importez vos fichiers Excel exportés depuis votre système de caisse.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fichier Fréquentation - Charte Mousquetaires: stone (BOULANGERIE) */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-stone-100 rounded-lg">
              <FileSpreadsheet className="text-stone-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-[#58595B]">Fréquentation</h3>
              <p className="text-sm text-[#58595B]/70">Passages clients (optionnel)</p>
            </div>
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer">
              <Upload className="mx-auto text-stone-400 mb-2" size={32} />
              <p className="text-sm text-[#58595B]">
                Cliquez ou glissez votre fichier Excel
              </p>
              <p className="text-xs text-[#58595B]/60 mt-1">
                .xlsx ou .csv
              </p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFrequentationUpload}
              className="hidden"
            />
          </label>

          {renderStatus(statusFrequentation)}

          {/* Info détaillée fréquentation */}
          {fichierFrequentation && fichierFrequentation.totalBvpHebdo > 0 && (
            <div className="mt-3 p-3 bg-stone-100 rounded-lg text-sm">
              <p className="font-medium text-stone-800">Répartition détectée :</p>
              <ul className="mt-1 text-stone-700 space-y-0.5">
                {fichierFrequentation.semaines?.s1 && (
                  <li>📅 S-1 = Semaine {fichierFrequentation.semaines.s1.semaine}, {fichierFrequentation.semaines.s1.annee}</li>
                )}
                <li>🥖 Total BVP hebdo : {fichierFrequentation.totalBvpHebdo?.toLocaleString('fr-FR')} qté</li>
                <li>📊 Taux de pénétration : {((fichierFrequentation.tauxPenetration?.s1 || 0) * 100).toFixed(1)}%</li>
              </ul>
            </div>
          )}
        </div>

        {/* Fichier Ventes - Charte Mousquetaires: emerald pour succès */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-emerald-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <FileSpreadsheet className="text-emerald-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-[#58595B]">Ventes</h3>
              <p className="text-sm text-[#58595B]/70">Historique des ventes (obligatoire)</p>
            </div>
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-emerald-300 rounded-lg p-6 text-center hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer">
              <Upload className="mx-auto text-emerald-400 mb-2" size={32} />
              <p className="text-sm text-[#58595B]">
                Cliquez ou glissez votre fichier Excel
              </p>
              <p className="text-xs text-[#58595B]/60 mt-1">
                .xlsx ou .csv
              </p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleVentesUpload}
              className="hidden"
            />
          </label>

          {renderStatus(statusVentes)}

          {/* Infos sur les données importées */}
          {infoVentes && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-sm">
              <p className="font-medium text-emerald-800">Données détectées :</p>
              <ul className="mt-1 text-emerald-700 space-y-0.5">
                <li>📦 Produits : <strong>{infoVentes.nombreProduits}</strong></li>
                <li>📅 Période : <strong>{infoVentes.nombreSemaines}</strong> semaine(s) {(() => {
                  const semDebut = getNumeroSemaineFromDateFR(infoVentes.dateDebut);
                  const semFin = getNumeroSemaineFromDateFR(infoVentes.dateFin);
                  if (semDebut && semFin) {
                    return semDebut === semFin
                      ? `(sem. ${semDebut})`
                      : `(sem. ${semDebut} - ${semFin})`;
                  }
                  return '';
                })()}</li>
                <li>🗓️ Du {infoVentes.dateDebut} au {infoVentes.dateFin}</li>
                <li>💰 CA Total Rayon : <strong>{infoVentes.caTotalRayon?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bouton Valider - Charte Mousquetaires: amber pour action principale */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleValider}
          disabled={!fichierVentes || isProcessing}
          className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
            fichierVentes && !isProcessing
              ? 'bg-amber-700 text-white hover:bg-amber-800'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Traitement...
            </>
          ) : (
            <>
              <Check size={20} />
              Valider et continuer
            </>
          )}
        </button>
      </div>
    </div>
  );
}
