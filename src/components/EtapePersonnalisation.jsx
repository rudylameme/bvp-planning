import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Upload, ArrowUpAZ, ArrowDownWideNarrow, LayoutGrid, List, Layers } from 'lucide-react';
import TableauProduits from './TableauProduits';
import TableauProduitsGroupes from './TableauProduitsGroupes';
import AttributionManuelle from './AttributionManuelle';
import { parseCSV } from '../utils/parsers';
import { getListeRayons, getListeProgrammes } from '../services/referentielITM8';
import { calculerPotentielsPourTous } from '../services/potentielCalculator';

export default function EtapePersonnalisation({
  produits,
  sortType,
  onChangerFamille,
  onChangerRayon,
  onChangerProgramme,
  onChangerUnitesParPlaque,
  onChangerCodePLU,
  onChangerUnitesParVente,
  onChangerLibelle,
  onChangerPotentiel,
  onToggleActif,
  onSupprimerProduit,
  onAjouterProduitCustom,
  onTrier,
  onRetour,
  onCalculerPlanning,
  setProduits,
  frequentationData
}) {
  const refReglages = useRef(null);
  const [modeAffichage, setModeAffichage] = useState('liste'); // Passer directement en mode liste
  const [showAttributionManuelle, setShowAttributionManuelle] = useState(false);
  const [modeCalculPotentiel, setModeCalculPotentiel] = useState('mathematique'); // 'mathematique' | 'forte-progression' | 'prudent'

  // Identifier les produits non reconnus
  const produitsNonReconnus = produits.filter(p => !p.reconnu && !p.custom);
  const nbProduitsNonReconnus = produitsNonReconnus.length;

  // Calculer automatiquement les potentiels à partir des ventes
  const calculerPotentielsAuto = (mode = modeCalculPotentiel) => {
    const messages = {
      'mathematique': 'Mode Mathématique : Calcul brut sans limite\nFormule : Vente MAX ÷ Poids du jour',
      'forte-progression': 'Mode Forte Progression : Limite à +20% de progression\n• Si progression > 20% → limité à +20%\n• Si baisse → garde le volume actuel',
      'prudent': 'Mode Prudent : Limite à +10% de progression\n• Si progression > 10% → limité à +10%\n• Si baisse → garde le volume actuel'
    };

    if (!confirm(`Voulez-vous calculer automatiquement les potentiels hebdomadaires ?\n\n${messages[mode]}\n\nCela écrasera les potentiels actuels.`)) {
      return;
    }

    const produitsAvecPotentielCalcule = calculerPotentielsPourTous(produits, frequentationData, mode);
    setProduits(produitsAvecPotentielCalcule);
    alert('✅ Potentiels calculés !');
  };

  // Exporter les réglages en CSV
  const exporterReglages = () => {
    const headers = 'Libelle,LibellePersonnalise,Rayon,Programme,CodePLU,UnitesParPlaque,Famille,PotentielHebdo,Actif,Custom\n';
    const rows = produits.map(p =>
      `${p.libelle},${p.libellePersonnalise},${p.rayon || ''},${p.programme || ''},${p.codePLU || ''},${p.unitesParPlaque ?? 0},${p.famille},${p.potentielHebdo},${p.actif},${p.custom}`
    ).join('\n');

    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reglages_bvp.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Créer un map des réglages depuis les données CSV
  const creerReglagesMap = (csvData) => {
    const reglagesMap = new Map();
    for (const row of csvData) {
      const libelle = row?.Libelle;
      if (libelle) {
        reglagesMap.set(libelle, {
          libellePersonnalise: row?.LibellePersonnalise ?? '',
          rayon: row?.Rayon || null,
          programme: row?.Programme || null,
          codePLU: row?.CodePLU || '',
          unitesParPlaque: Number.parseInt(row?.UnitesParPlaque ?? '0') || 0,
          famille: row?.Famille ?? 'AUTRE',
          potentielHebdo: Number.parseFloat(row?.PotentielHebdo ?? '0') || 0,
          actif: row?.Actif === 'true',
          custom: row?.Custom === 'true'
        });
      }
    }
    return reglagesMap;
  };

  // Appliquer les réglages importés aux produits existants
  const appliquerReglages = (produits, reglagesMap) => {
    return produits.map(p => {
      const libelle = p?.libelle;
      if (libelle && reglagesMap.has(libelle)) {
        const reglage = reglagesMap.get(libelle);
        return { ...p, ...reglage };
      }
      return p;
    });
  };

  // Identifier les produits custom manquants
  const trouverProduitsCustomManquants = (produits, reglagesMap) => {
    const libellesExistants = new Set(produits.map(p => p?.libelle).filter(Boolean));
    const produitsCustomManquants = [];
    for (const [libelle, reglage] of reglagesMap.entries()) {
      if (reglage?.custom && !libellesExistants.has(libelle)) {
        produitsCustomManquants.push(libelle);
      }
    }
    return produitsCustomManquants;
  };

  // Ajouter les produits custom manquants
  const ajouterProduitsCustom = (produitsAvecReglages, produitsCustomManquants, reglagesMap) => {
    const nouveauxId = Math.max(...produitsAvecReglages.map(p => p?.id ?? 0), -1);
    for (const [index, libelle] of produitsCustomManquants.entries()) {
      const reglage = reglagesMap.get(libelle);
      if (reglage) {
        produitsAvecReglages.push({
          id: nouveauxId + index + 1,
          libelle,
          libellePersonnalise: reglage.libellePersonnalise ?? libelle,
          rayon: reglage.rayon ?? null,
          programme: reglage.programme ?? null,
          codePLU: reglage.codePLU ?? '',
          unitesParPlaque: reglage.unitesParPlaque ?? 0,
          famille: reglage.famille ?? 'AUTRE',
          ventesParJour: {},
          totalVentes: 0,
          potentielHebdo: reglage.potentielHebdo ?? 0,
          actif: reglage.actif ?? true,
          custom: true
        });
      }
    }
  };

  // Importer les réglages depuis CSV
  const importerReglages = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      const reglagesMap = creerReglagesMap(parsed.data);
      const produitsAvecReglages = appliquerReglages(produits, reglagesMap);
      const produitsCustomManquants = trouverProduitsCustomManquants(produits, reglagesMap);

      if (produitsCustomManquants.length > 0) {
        const message = `Les produits suivants sont dans vos réglages mais pas dans vos ventes actuelles:\n${produitsCustomManquants.join(', ')}\n\nVoulez-vous les conserver comme produits custom ?`;
        if (confirm(message)) {
          ajouterProduitsCustom(produitsAvecReglages, produitsCustomManquants, reglagesMap);
        }
      }

      setProduits(produitsAvecReglages);
    } catch (error) {
      console.error('Erreur lors de l\'import des réglages:', error);
      alert('Erreur lors de la lecture du fichier de réglages.');
    }
  };

  // Handler pour l'attribution manuelle
  const handleAttribuer = (produitId, attributs) => {
    setProduits(prev => prev.map(p => {
      if (p.id === produitId) {
        const updated = { ...p, ...attributs };
        // Si rayon et programme sont définis, marquer comme reconnu
        if (updated.rayon && updated.programme) {
          updated.reconnu = true;
        }
        return updated;
      }
      return p;
    }));
  };

  // Vérifier combien de produits ont des potentiels > 0
  const nbProduitsAvecPotentiel = produits.filter(p => p.potentielHebdo > 0).length;
  const nbProduitsTotal = produits.length;

  return (
    <>
      {/* Modal d'attribution manuelle */}
      {showAttributionManuelle && (
        <AttributionManuelle
          produitsNonReconnus={produitsNonReconnus}
          onAttribuer={handleAttribuer}
          onFermer={() => setShowAttributionManuelle(false)}
        />
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Message pour les produits non reconnus */}
      {nbProduitsNonReconnus > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>{nbProduitsNonReconnus} produit(s) non reconnu(s)</strong> par le référentiel ITM8. Vous pouvez continuer ou les attribuer manuellement pour plus de précision.
            </p>
            <button
              onClick={() => setShowAttributionManuelle(true)}
              className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition whitespace-nowrap"
            >
              Attribuer (optionnel)
            </button>
          </div>
        </div>
      )}

      {/* Message d'information sur les potentiels - Retiré car calcul automatique dans le planning */}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Personnalisation des produits</h2>
        <div className="flex gap-2">
          {/* Toggle mode d'affichage */}
          <button
            onClick={() => setModeAffichage(modeAffichage === 'groupes' ? 'liste' : 'groupes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              modeAffichage === 'groupes' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={modeAffichage === 'groupes' ? 'Passer en mode liste' : 'Passer en mode groupé'}
          >
            {modeAffichage === 'groupes' ? <LayoutGrid size={20} /> : <List size={20} />}
            {modeAffichage === 'groupes' ? 'Groupé' : 'Liste'}
          </button>

          {/* Tri (uniquement en mode liste) */}
          {modeAffichage === 'liste' && (
            <>
              <button
                onClick={() => onTrier('rayon-volume')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  sortType === 'rayon-volume' ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Tri par défaut : rayon puis volume décroissant"
              >
                <LayoutGrid size={20} />
                Tri Rayon
              </button>
              <button
                onClick={() => onTrier('nom')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  sortType === 'nom' ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ArrowUpAZ size={20} />
                Tri A-Z
              </button>
              <button
                onClick={() => onTrier('volume')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  sortType === 'volume' ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ArrowDownWideNarrow size={20} />
                Tri Volume
              </button>
              <button
                onClick={() => onTrier('rayon-programme')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  sortType === 'rayon-programme' ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Trier par rayon, puis programme, puis volume"
              >
                <Layers size={20} />
                Tri Rayon/Prog
              </button>
            </>
          )}
          <button
            onClick={onAjouterProduitCustom}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            + Ajouter
          </button>
          <button
            onClick={exporterReglages}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Upload size={20} />
            Exporter
          </button>
          <input
            ref={refReglages}
            type="file"
            accept=".csv"
            onChange={importerReglages}
            className="hidden"
          />
          <button
            onClick={() => refReglages.current.click()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Download size={20} />
            Importer
          </button>
        </div>
      </div>

      {/* Tableau des produits */}
      {modeAffichage === 'liste' ? (
        <TableauProduits
          produits={produits}
          onChangerFamille={onChangerFamille}
          onChangerRayon={onChangerRayon}
          onChangerProgramme={onChangerProgramme}
          onChangerUnitesParPlaque={onChangerUnitesParPlaque}
          onChangerCodePLU={onChangerCodePLU}
          onChangerUnitesParVente={onChangerUnitesParVente}
          onChangerLibelle={onChangerLibelle}
          onChangerPotentiel={onChangerPotentiel}
          onToggleActif={onToggleActif}
          onSupprimerProduit={onSupprimerProduit}
          rayonsDisponibles={getListeRayons()}
          programmesDisponibles={getListeProgrammes()}
        />
      ) : (
        <TableauProduitsGroupes
          produits={produits}
          onChangerFamille={onChangerFamille}
          onChangerRayon={onChangerRayon}
          onChangerProgramme={onChangerProgramme}
          onChangerUnitesParPlaque={onChangerUnitesParPlaque}
          onChangerCodePLU={onChangerCodePLU}
          onChangerUnitesParVente={onChangerUnitesParVente}
          onChangerLibelle={onChangerLibelle}
          onChangerPotentiel={onChangerPotentiel}
          onToggleActif={onToggleActif}
          onSupprimerProduit={onSupprimerProduit}
          rayonsDisponibles={getListeRayons()}
          programmesDisponibles={getListeProgrammes()}
        />
      )}

        {/* Boutons navigation */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={onRetour}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            <ChevronLeft size={20} />
            Retour
          </button>
          <button
            onClick={onCalculerPlanning}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Calculer le planning
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </>
  );
}
