import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Upload, ArrowUpAZ, ArrowDownWideNarrow, LayoutGrid, List, Layers, Settings, Eye, EyeOff, Square, CheckSquare } from 'lucide-react';
import TableauProduits from './TableauProduits';
import TableauProduitsGroupes from './TableauProduitsGroupes';
import AttributionManuelle from './AttributionManuelle';
import GestionProgrammes from './GestionProgrammes';
import { parseCSV } from '../utils/parsers';
import { getListeRayons, getListeProgrammesComplets } from '../services/referentielITM8';
import { calculerPotentielsPourTous } from '../services/potentielCalculator';
import { mousquetairesColors } from '../styles/mousquetaires-theme';

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
  onSuivant,
  setProduits,
  frequentationData
}) {
  const refReglages = useRef(null);
  const [showAttributionManuelle, setShowAttributionManuelle] = useState(false);
  const [showGestionProgrammes, setShowGestionProgrammes] = useState(false);
  const [modeCalculPotentiel, setModeCalculPotentiel] = useState('mathematique'); // 'mathematique' | 'forte-progression' | 'prudent'
  const [modeExpert, setModeExpert] = useState(false); // Mode expert pour afficher colonnes techniques
  const [refreshKey, setRefreshKey] = useState(0); // Clé pour forcer le rafraîchissement après modification des programmes

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

      <div className="bg-white rounded-lg shadow-lg p-8" style={{ borderTop: `4px solid ${mousquetairesColors.primary.red}` }}>
      {/* Message pour les produits non reconnus */}
      {nbProduitsNonReconnus > 0 && (
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: mousquetairesColors.secondary.beigeLight, border: `1px solid ${mousquetairesColors.primary.red}` }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm" style={{ color: mousquetairesColors.text.secondary }}>
              ℹ️ <strong style={{ color: mousquetairesColors.primary.redDark }}>{nbProduitsNonReconnus} produit(s) non reconnu(s)</strong> par le référentiel ITM8. Vous pouvez continuer ou les attribuer manuellement pour plus de précision.
            </p>
            <button
              onClick={() => setShowAttributionManuelle(true)}
              className="px-4 py-2 text-sm rounded font-semibold transition whitespace-nowrap"
              style={{
                backgroundColor: mousquetairesColors.primary.red,
                color: mousquetairesColors.text.white
              }}
            >
              Attribuer (optionnel)
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2" style={{ color: mousquetairesColors.primary.redDark }}>
          Personnalisation des produits
        </h2>
        <p className="text-sm" style={{ color: mousquetairesColors.text.secondary }}>
          Ajustez les paramètres de vos produits avant de générer le planning
        </p>
      </div>

      {/* Séparateur */}
      <div style={{ width: '100%', height: '1px', backgroundColor: mousquetairesColors.secondary.gray, marginBottom: '2rem' }}></div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        {/* Boutons principaux */}
        <div className="flex gap-2 flex-wrap">
          {/* Tri cyclique (simplifié) */}
          <button
              onClick={() => {
                // Cycle entre les modes de tri : nom → volume → rayon-volume → nom
                if (sortType === 'nom') {
                  onTrier('volume');
                } else if (sortType === 'volume') {
                  onTrier('rayon-volume');
                } else {
                  onTrier('nom');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold"
              style={{
                backgroundColor: mousquetairesColors.primary.red,
                color: mousquetairesColors.text.white,
                border: `2px solid ${mousquetairesColors.primary.red}`
              }}
              title={
                sortType === 'nom' ? 'Tri: A→Z (cliquez pour Volume)' :
                sortType === 'volume' ? 'Tri: Volume (cliquez pour Rayon)' :
                'Tri: Rayon (cliquez pour A→Z)'
              }
            >
              {sortType === 'nom' && (
                <>
                  <ArrowUpAZ size={20} />
                  Tri: A→Z
                </>
              )}
              {sortType === 'volume' && (
                <>
                  <ArrowDownWideNarrow size={20} />
                  Tri: Volume
                </>
              )}
              {sortType === 'rayon-volume' && (
                <>
                  <LayoutGrid size={20} />
                  Tri: Rayon
                </>
              )}
            </button>

          {/* Sélection rapide - Toggle */}
          <button
            onClick={() => {
              // Vérifier si tous les produits sont actifs
              const tousActifs = produits.every(p => p.actif);

              // Si tous actifs → tout décocher, sinon → tout cocher
              const nouveauxProduits = produits.map(p => ({ ...p, actif: !tousActifs }));
              setProduits(nouveauxProduits);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold"
            style={{
              backgroundColor: mousquetairesColors.secondary.beige,
              color: mousquetairesColors.primary.redDark,
              border: `2px solid ${mousquetairesColors.secondary.gray}`
            }}
            title={produits.every(p => p.actif) ? "Désactiver tous les produits" : "Activer tous les produits"}
          >
            {produits.every(p => p.actif) ? (
              <>
                <Square size={20} />
                Tout décocher
              </>
            ) : (
              <>
                <CheckSquare size={20} />
                Tout cocher
              </>
            )}
          </button>

          {/* Mode Expert */}
          <button
            onClick={() => setModeExpert(!modeExpert)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold"
            style={{
              backgroundColor: modeExpert ? mousquetairesColors.primary.red : mousquetairesColors.secondary.beige,
              color: modeExpert ? mousquetairesColors.text.white : mousquetairesColors.primary.redDark,
              border: `2px solid ${modeExpert ? mousquetairesColors.primary.red : mousquetairesColors.secondary.gray}`
            }}
            title={modeExpert ? 'Masquer les colonnes techniques' : 'Afficher toutes les colonnes'}
          >
            {modeExpert ? <Eye size={20} /> : <EyeOff size={20} />}
            Mode Expert
          </button>

          {/* Ajouter produit */}
          <button
            onClick={onAjouterProduitCustom}
            className="px-4 py-2 rounded-lg transition font-semibold"
            style={{
              backgroundColor: mousquetairesColors.functional.success,
              color: mousquetairesColors.text.white
            }}
          >
            + Ajouter produit
          </button>
        </div>

        {/* Boutons secondaires (regroupés) */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowGestionProgrammes(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold"
            style={{
              backgroundColor: mousquetairesColors.secondary.beige,
              color: mousquetairesColors.primary.redDark,
              border: `2px solid ${mousquetairesColors.secondary.gray}`
            }}
            title="Gérer les programmes de cuisson"
          >
            <Settings size={18} />
            Programmes
          </button>
          <button
            onClick={exporterReglages}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold"
            style={{
              backgroundColor: mousquetairesColors.secondary.beige,
              color: mousquetairesColors.primary.redDark,
              border: `2px solid ${mousquetairesColors.secondary.gray}`
            }}
          >
            <Upload size={18} />
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold"
            style={{
              backgroundColor: mousquetairesColors.secondary.beige,
              color: mousquetairesColors.primary.redDark,
              border: `2px solid ${mousquetairesColors.secondary.gray}`
            }}
          >
            <Download size={18} />
            Importer
          </button>
        </div>
      </div>

      {/* Tableau des produits */}
      {sortType === 'rayon-volume' ? (
        <TableauProduitsGroupes
          key={refreshKey}
          produits={produits}
          modeExpert={modeExpert}
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
          programmesDisponibles={getListeProgrammesComplets()}
        />
      ) : (
        <TableauProduits
          key={refreshKey}
          produits={produits}
          modeExpert={modeExpert}
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
          programmesDisponibles={getListeProgrammesComplets()}
        />
      )}

        {/* Séparateur */}
        <div style={{ width: '100%', height: '1px', backgroundColor: mousquetairesColors.secondary.gray, margin: '2rem 0' }}></div>

        {/* Boutons navigation */}
        <div className="flex justify-between flex-wrap gap-4">
          <button
            onClick={onRetour}
            className="flex items-center gap-2 px-6 py-3 rounded-lg transition font-semibold"
            style={{
              backgroundColor: mousquetairesColors.secondary.beige,
              color: mousquetairesColors.primary.redDark,
              border: `2px solid ${mousquetairesColors.secondary.gray}`
            }}
          >
            <ChevronLeft size={20} />
            Retour
          </button>
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
            Suivant : Configuration de la semaine
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Modal de gestion des programmes */}
      {showGestionProgrammes && (
        <GestionProgrammes onClose={() => {
          setShowGestionProgrammes(false);
          // Forcer le rafraîchissement des listes de programmes
          setRefreshKey(prev => prev + 1);
        }} />
      )}
    </>
  );
}
