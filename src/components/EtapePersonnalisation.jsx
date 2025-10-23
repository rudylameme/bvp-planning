import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Upload, ArrowUpAZ, ArrowDownWideNarrow, LayoutGrid, List } from 'lucide-react';
import TableauProduits from './TableauProduits';
import TableauProduitsGroupes from './TableauProduitsGroupes';
import { parseCSV } from '../utils/parsers';

export default function EtapePersonnalisation({
  produits,
  sortType,
  onChangerFamille,
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
  const [modeAffichage, setModeAffichage] = useState('groupes'); // 'groupes' ou 'liste'

  // Déterminer le jour de la semaine depuis une date
  const getJourSemaine = (dateStr) => {
    const numValue = Number(dateStr);
    let date;

    if (Number.isFinite(numValue)) {
      // C'est un nombre (format Excel)
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + numValue * 86400000);
    } else {
      // C'est une chaîne de caractères
      date = new Date(dateStr);
    }

    if (!Number.isFinite(date.getTime())) {
      return null;
    }

    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return jours[date.getDay()];
  };

  // Calculer automatiquement les potentiels à partir des ventes
  const calculerPotentielsAuto = () => {
    if (!confirm('Voulez-vous calculer automatiquement les potentiels hebdomadaires ?\n\nFormule : Vente MAX ÷ Poids du jour de cette vente\n\nCela écrasera les potentiels actuels.')) {
      return;
    }

    console.log('🤖 Calcul automatique des potentiels avec formule précise...');

    const produitsAvecPotentielCalcule = produits.map(p => {
      if (p.custom || !p.ventesParJour) {
        return p;
      }

      // Trouver la vente MAX et sa date
      let venteMax = 0;
      let dateVenteMax = null;

      for (const [date, quantite] of Object.entries(p.ventesParJour)) {
        if (quantite > venteMax) {
          venteMax = quantite;
          dateVenteMax = date;
        }
      }

      if (venteMax === 0) {
        return { ...p, potentielHebdo: 0 };
      }

      // Déterminer le jour et son poids
      const jourVenteMax = getJourSemaine(dateVenteMax);
      let poidsJour = 0.14;

      const poidsJours = frequentationData?.poidsJours;
      if (poidsJours) {
        const poidsJourSpecifique = jourVenteMax ? poidsJours[jourVenteMax] : null;
        poidsJour = poidsJourSpecifique ?? Math.max(...Object.values(poidsJours));
      }

      // Formule : Potentiel = Vente MAX ÷ Poids du jour
      const potentielCalcule = Math.ceil(venteMax / poidsJour);

      return {
        ...p,
        potentielHebdo: potentielCalcule
      };
    });

    setProduits(produitsAvecPotentielCalcule);
    alert('✅ Potentiels calculés avec la formule : Vente MAX ÷ Poids du jour !');
  };

  // Exporter les réglages en CSV
  const exporterReglages = () => {
    const headers = 'Libelle,LibellePersonnalise,Famille,PotentielHebdo,Actif,Custom\n';
    const rows = produits.map(p =>
      `${p.libelle},${p.libellePersonnalise},${p.famille},${p.potentielHebdo},${p.actif},${p.custom}`
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

  // Vérifier combien de produits ont des potentiels > 0
  const nbProduitsAvecPotentiel = produits.filter(p => p.potentielHebdo > 0).length;
  const nbProduitsTotal = produits.length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Message d'information sur les potentiels */}
      {nbProduitsAvecPotentiel === nbProduitsTotal && nbProduitsTotal > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ <strong>Potentiels calculés automatiquement</strong> pour {nbProduitsTotal} produits à partir des ventes historiques. Vous pouvez les ajuster manuellement si besoin.
          </p>
        </div>
      )}
      {nbProduitsAvecPotentiel > 0 && nbProduitsAvecPotentiel < nbProduitsTotal && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ {nbProduitsAvecPotentiel}/{nbProduitsTotal} produits ont des potentiels définis. Utilisez le bouton "🤖 Auto-Potentiels" pour calculer les potentiels manquants.
          </p>
        </div>
      )}
      {nbProduitsAvecPotentiel === 0 && nbProduitsTotal > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            ❌ Aucun potentiel défini. Cliquez sur "🤖 Auto-Potentiels" pour les calculer automatiquement à partir des ventes.
          </p>
        </div>
      )}

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
                onClick={() => onTrier('nom')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  sortType === 'nom' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ArrowUpAZ size={20} />
                Tri A-Z
              </button>
              <button
                onClick={() => onTrier('volume')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  sortType === 'volume' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ArrowDownWideNarrow size={20} />
                Tri Volume
              </button>
            </>
          )}
          <button
            onClick={calculerPotentielsAuto}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            title="Calculer automatiquement les potentiels à partir des ventes"
          >
            🤖 Auto-Potentiels
          </button>
          <button
            onClick={onAjouterProduitCustom}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            + Ajouter
          </button>
          <button
            onClick={exporterReglages}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download size={20} />
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
            <Upload size={20} />
            Importer
          </button>
        </div>
      </div>

      {/* Tableau des produits */}
      {modeAffichage === 'liste' ? (
        <TableauProduits
          produits={produits}
          onChangerFamille={onChangerFamille}
          onChangerLibelle={onChangerLibelle}
          onChangerPotentiel={onChangerPotentiel}
          onToggleActif={onToggleActif}
          onSupprimerProduit={onSupprimerProduit}
        />
      ) : (
        <TableauProduitsGroupes
          produits={produits}
          onChangerFamille={onChangerFamille}
          onChangerLibelle={onChangerLibelle}
          onChangerPotentiel={onChangerPotentiel}
          onToggleActif={onToggleActif}
          onSupprimerProduit={onSupprimerProduit}
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
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          Calculer le planning
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
