import { useRef } from 'react';
import { Upload, ChevronRight } from 'lucide-react';

export default function EtapeUpload({
  frequentationData,
  ventesData,
  ponderationType,
  onFrequentationUpload,
  onVentesUpload,
  onChangerPonderation,
  onSuivant
}) {
  const refFrequentation = useRef(null);
  const refVentes = useRef(null);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload des données</h2>

      {/* Sélection du type de pondération */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">Type de pondération des données</h3>
        <div className="flex gap-3">
          <button
            onClick={() => onChangerPonderation('standard')}
            className={`px-4 py-2 rounded-lg transition ${
              ponderationType === 'standard'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Standard{' '}
            <span className="text-xs block mt-1">S-1: 40% | AS-1: 30% | S-2: 30%</span>
          </button>
          <button
            onClick={() => onChangerPonderation('saisonnier')}
            className={`px-4 py-2 rounded-lg transition ${
              ponderationType === 'saisonnier'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Saisonnier{' '}
            <span className="text-xs block mt-1">S-1: 30% | AS-1: 50% | S-2: 20%</span>
          </button>
          <button
            onClick={() => onChangerPonderation('fortePromo')}
            className={`px-4 py-2 rounded-lg transition ${
              ponderationType === 'fortePromo'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Forte Promo{' '}
            <span className="text-xs block mt-1">S-1: 60% | AS-1: 20% | S-2: 20%</span>
          </button>
        </div>
        <p className="text-xs text-blue-700 mt-2">
          S-1 = Semaine précédente | AS-1 = Même semaine année précédente | S-2 = Il y a 2 semaines
        </p>
      </div>

      {/* Message d'ordre d'upload */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          📌 <strong>Ordre d'import :</strong> Importez d'abord la <strong>FRÉQUENTATION</strong>, puis les <strong>VENTES</strong>. Cela permet de calculer immédiatement les potentiels avec la bonne formule.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Fréquentation */}
        <div className="border-2 border-dashed border-amber-400 rounded-lg p-6 hover:border-amber-600 transition bg-amber-50">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center w-8 h-8 bg-amber-700 text-white rounded-full font-bold">1</span>
            <h3 className="text-lg font-semibold text-gray-700">Fréquentation</h3>
          </div>
          <div className="text-sm text-gray-600 mb-4 space-y-1">
            <p className="font-medium">Format attendu :</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Ligne avec "JOUR" dans les en-têtes</li>
              <li>Colonne G : Jours (1-lundi, 2-mardi...)</li>
              <li>Colonne H : Tranches horaires</li>
              <li>Colonnes N, T, Z : Tickets (S-1, AS-1, S-2)</li>
            </ul>
          </div>
          <input
            ref={refFrequentation}
            type="file"
            accept=".csv,.xlsx"
            onChange={onFrequentationUpload}
            className="hidden"
          />
          <button
            onClick={() => refFrequentation.current.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
          >
            <Upload size={20} />
            Choisir un fichier
          </button>
          {frequentationData && (
            <p className="text-green-600 mt-3 text-sm font-medium">
              Fichier chargé - {frequentationData.totalTicketsPDV.toFixed(0)} tickets détectés
            </p>
          )}
        </div>

        {/* Upload Ventes */}
        <div className={`border-2 border-dashed rounded-lg p-6 transition ${
          frequentationData
            ? 'border-green-400 bg-green-50 hover:border-green-600'
            : 'border-gray-300 bg-gray-50 opacity-60'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
              frequentationData ? 'bg-emerald-600 text-white' : 'bg-gray-400 text-white'
            }`}>2</span>
            <h3 className="text-lg font-semibold text-gray-700">Ventes</h3>
            {!frequentationData && (
              <span className="text-xs text-orange-600 font-semibold">⚠️ Fréquentation requise</span>
            )}
          </div>
          <div className="text-sm text-gray-600 mb-4 space-y-1">
            <p className="font-medium">Format attendu :</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>1ère ligne : PDV: [numéro] - [nom]</li>
              <li>Ligne avec "ITM8 Prio" en colonne A</li>
              <li>Colonnes : Libellé, Date, Quantité</li>
            </ul>
          </div>
          <input
            ref={refVentes}
            type="file"
            accept=".csv,.xlsx"
            onChange={onVentesUpload}
            className="hidden"
          />
          <button
            onClick={() => refVentes.current.click()}
            disabled={!frequentationData}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
              frequentationData
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
            title={frequentationData ? 'Choisir un fichier' : 'Importez d\'abord la fréquentation'}
          >
            <Upload size={20} />
            Choisir un fichier
          </button>
          {ventesData && (
            <p className="text-green-600 mt-3 text-sm font-medium">
              Fichier chargé - {ventesData.produits.size} produits détectés
            </p>
          )}
        </div>
      </div>

      {/* Message d'aide pour le diagnostic */}
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>En cas d'erreur :</strong> Appuyez sur <kbd className="px-2 py-1 bg-white border border-yellow-300 rounded">F12</kbd> pour ouvrir la console du navigateur et voir le diagnostic détaillé de vos fichiers.
        </p>
      </div>

      {/* Bouton suivant */}
      {frequentationData && ventesData && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onSuivant}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Suivant
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
