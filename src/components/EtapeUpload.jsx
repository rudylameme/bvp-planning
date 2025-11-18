import { useRef, useState } from 'react';
import { Upload, ChevronRight, Loader2 } from 'lucide-react';
import { mousquetairesColors } from '../styles/mousquetaires-theme';

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
  const [loadingFreq, setLoadingFreq] = useState(false);
  const [loadingVentes, setLoadingVentes] = useState(false);

  const handleFrequentationUpload = (e) => {
    setLoadingFreq(true);
    // Forcer React à mettre à jour l'interface avant de commencer le traitement
    setTimeout(() => {
      const result = onFrequentationUpload(e);
      // handleFrequentationUpload retourne une promesse
      if (result && result.then) {
        result.finally(() => setLoadingFreq(false));
      } else {
        setLoadingFreq(false);
      }
    }, 50);
  };

  const handleVentesUpload = (e) => {
    setLoadingVentes(true);
    // Forcer React à mettre à jour l'interface avant de commencer le traitement
    setTimeout(() => {
      onVentesUpload(e);
      // Attendre un peu avant de masquer le spinner
      setTimeout(() => {
        setLoadingVentes(false);
      }, 1000);
    }, 50);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8" style={{ borderTop: `4px solid ${mousquetairesColors.primary.red}` }}>
      <h2 className="text-3xl font-bold mb-8" style={{ color: mousquetairesColors.primary.redDark }}>
        Chargement des données
      </h2>

      {/* Séparateur */}
      <div style={{ width: '100%', height: '1px', backgroundColor: mousquetairesColors.secondary.gray, marginBottom: '2rem' }}></div>

      {/* Sélection du type de pondération */}
      <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: mousquetairesColors.secondary.beigeLight, border: `1px solid ${mousquetairesColors.secondary.gray}` }}>
        <h3 className="text-base font-bold mb-4" style={{ color: mousquetairesColors.primary.redDark }}>
          Type de pondération des données
        </h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => onChangerPonderation('standard')}
            className="px-5 py-3 rounded-lg transition font-semibold"
            style={{
              backgroundColor: ponderationType === 'standard' ? mousquetairesColors.primary.red : 'white',
              color: ponderationType === 'standard' ? mousquetairesColors.text.white : mousquetairesColors.text.secondary,
              border: `2px solid ${ponderationType === 'standard' ? mousquetairesColors.primary.red : mousquetairesColors.secondary.gray}`
            }}
          >
            Standard
            <span className="text-xs block mt-1 font-normal">S-1: 40% | AS-1: 30% | S-2: 30%</span>
          </button>
          <button
            onClick={() => onChangerPonderation('saisonnier')}
            className="px-5 py-3 rounded-lg transition font-semibold"
            style={{
              backgroundColor: ponderationType === 'saisonnier' ? mousquetairesColors.primary.red : 'white',
              color: ponderationType === 'saisonnier' ? mousquetairesColors.text.white : mousquetairesColors.text.secondary,
              border: `2px solid ${ponderationType === 'saisonnier' ? mousquetairesColors.primary.red : mousquetairesColors.secondary.gray}`
            }}
          >
            Saisonnier
            <span className="text-xs block mt-1 font-normal">S-1: 30% | AS-1: 50% | S-2: 20%</span>
          </button>
          <button
            onClick={() => onChangerPonderation('fortePromo')}
            className="px-5 py-3 rounded-lg transition font-semibold"
            style={{
              backgroundColor: ponderationType === 'fortePromo' ? mousquetairesColors.primary.red : 'white',
              color: ponderationType === 'fortePromo' ? mousquetairesColors.text.white : mousquetairesColors.text.secondary,
              border: `2px solid ${ponderationType === 'fortePromo' ? mousquetairesColors.primary.red : mousquetairesColors.secondary.gray}`
            }}
          >
            Forte Promo
            <span className="text-xs block mt-1 font-normal">S-1: 60% | AS-1: 20% | S-2: 20%</span>
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: mousquetairesColors.text.secondary }}>
          S-1 = Semaine précédente | AS-1 = Même semaine année précédente | S-2 = Il y a 2 semaines
        </p>
      </div>

      {/* Message d'ordre d'upload */}
      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#FFF3CD', border: `1px solid #FFC107` }}>
        <p className="text-sm" style={{ color: '#856404' }}>
          <strong>⚠️ Ordre d'import :</strong> Importez d'abord la <strong>FRÉQUENTATION</strong>, puis les <strong>VENTES</strong>. Cela permet de calculer immédiatement les potentiels avec la bonne formule.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Fréquentation */}
        <div
          className="border-2 border-dashed rounded-lg p-6 transition cursor-pointer"
          style={{
            borderColor: mousquetairesColors.primary.red,
            backgroundColor: mousquetairesColors.secondary.beigeLight
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg"
              style={{
                backgroundColor: mousquetairesColors.primary.red,
                color: mousquetairesColors.text.white
              }}
            >
              1
            </span>
            <h3 className="text-xl font-bold" style={{ color: mousquetairesColors.primary.redDark }}>
              Fréquentation
            </h3>
          </div>
          <div className="text-sm mb-6 space-y-2" style={{ color: mousquetairesColors.text.secondary }}>
            <p className="font-semibold" style={{ color: mousquetairesColors.primary.redDark }}>Format attendu :</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Ligne avec "JOUR" dans les en-têtes</li>
              <li>Colonne G : Jours (1-lundi, 2-mardi...)</li>
              <li>Colonne H : Tranches horaires</li>
              <li>Colonnes J, P, V : Qte Tot BVP (S-1, AS-1, S-2)</li>
            </ul>
          </div>
          <input
            ref={refFrequentation}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFrequentationUpload}
            className="hidden"
          />
          <button
            onClick={() => refFrequentation.current.click()}
            disabled={loadingFreq}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: mousquetairesColors.primary.red,
              color: mousquetairesColors.text.white
            }}
          >
            {loadingFreq ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Upload size={20} />
                Choisir un fichier
              </>
            )}
          </button>
          {frequentationData && !loadingFreq && (
            <p className="mt-4 text-sm font-semibold" style={{ color: mousquetairesColors.functional.success }}>
              ✅ Fichier chargé - {frequentationData.totalQteTot.toFixed(0)} quantités totales détectées
            </p>
          )}
        </div>

        {/* Upload Ventes */}
        <div
          className="border-2 border-dashed rounded-lg p-6 transition"
          style={{
            borderColor: frequentationData ? mousquetairesColors.functional.success : mousquetairesColors.secondary.gray,
            backgroundColor: frequentationData ? mousquetairesColors.secondary.beigeLight : mousquetairesColors.secondary.beige,
            opacity: frequentationData ? 1 : 0.6
          }}
        >
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span
              className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg"
              style={{
                backgroundColor: frequentationData ? mousquetairesColors.functional.success : mousquetairesColors.secondary.gray,
                color: mousquetairesColors.text.white
              }}
            >
              2
            </span>
            <h3 className="text-xl font-bold" style={{ color: mousquetairesColors.primary.redDark }}>
              Ventes
            </h3>
            {!frequentationData && (
              <span className="text-xs font-semibold" style={{ color: mousquetairesColors.functional.warning }}>
                ⚠️ Fréquentation requise
              </span>
            )}
          </div>
          <div className="text-sm mb-6 space-y-2" style={{ color: mousquetairesColors.text.secondary }}>
            <p className="font-semibold" style={{ color: mousquetairesColors.primary.redDark }}>Format attendu :</p>
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
            onChange={handleVentesUpload}
            className="hidden"
          />
          <button
            onClick={() => refVentes.current.click()}
            disabled={!frequentationData || loadingVentes}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: frequentationData && !loadingVentes ? mousquetairesColors.functional.success : mousquetairesColors.secondary.gray,
              color: mousquetairesColors.text.white
            }}
            title={frequentationData ? 'Choisir un fichier' : 'Importez d\'abord la fréquentation'}
          >
            {loadingVentes ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Upload size={20} />
                Choisir un fichier
              </>
            )}
          </button>
          {ventesData && !loadingVentes && (
            <p className="mt-4 text-sm font-semibold" style={{ color: mousquetairesColors.functional.success }}>
              ✅ Fichier chargé - {ventesData.produits.size} produits détectés
            </p>
          )}
        </div>
      </div>

      {/* Séparateur */}
      {/* Bouton suivant */}
      {frequentationData && ventesData && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={onSuivant}
            className="flex items-center gap-3 px-8 py-4 rounded-lg transition font-bold text-lg"
            style={{
              backgroundColor: mousquetairesColors.primary.red,
              color: mousquetairesColors.text.white
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = mousquetairesColors.primary.redDark;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = mousquetairesColors.primary.red;
            }}
          >
            Suivant : Personnalisation
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
