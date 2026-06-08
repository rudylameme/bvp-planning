/**
 * Étape 5 : Communication — Export Archive Planning
 *
 * Exporte automatiquement un fichier .bvp.json contenant
 * toutes les données du planning pour l'équipe.
 * Si dossierBVP configuré → écriture directe.
 * Sinon → téléchargement navigateur en fallback.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Check,
  AlertTriangle,
  Package,
  Target,
  Calendar,
  Users,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import { useFileAccess, checkHandlePermission } from '../../hooks/useFileAccess';
import { normaliserLibelle } from '../../services/nettoyageGamme';

// ============================================================================
// Poids de fréquentation par défaut (même valeurs que PilotageCA)
// ============================================================================

const POIDS_FREQUENTATION_DEFAUT = {
  lundi: 0.12,
  mardi: 0.12,
  mercredi: 0.16,
  jeudi: 0.12,
  vendredi: 0.16,
  samedi: 0.20,
  dimanche: 0.12,
};

// ============================================================================
// Helpers
// ============================================================================

/** Retourne la date ISO du lundi de la semaine ISO donnée */
/** Formate une date locale en YYYY-MM-DD (sans passer par UTC/toISOString) */
const formatDateLocale = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDateDebutSemaine = (semaine, annee) => {
  const jan4 = new Date(annee, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const lundi1 = new Date(jan4);
  lundi1.setDate(jan4.getDate() - dayOfWeek + 1);
  const result = new Date(lundi1);
  result.setDate(lundi1.getDate() + (semaine - 1) * 7);
  return formatDateLocale(result);
};

const getDateFinSemaine = (semaine, annee) => {
  const parts = getDateDebutSemaine(semaine, annee).split('-');
  const debut = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  debut.setDate(debut.getDate() + 6);
  return formatDateLocale(debut);
};

const padSemaine = (s) => String(s).padStart(2, '0');

// ============================================================================
// Construction de la table de correspondance idMapping
// ============================================================================

/**
 * Compare les produits du MANAGER S-1 (précédent) et S+1 (nouveau) et construit
 * une table {ancien_id → nouveau_id} pour les produits dont l'ID canonique a changé
 * mais dont (libellé normalisé, famille, rayon) restent identiques.
 *
 * @param {Array} produitsPrecedents - produits du MANAGER S précédent
 * @param {Array} produitsNouveaux - produits du MANAGER S+1 en cours d'export
 * @returns {Object} { "ancien_id": "nouveau_id", ... }
 */
const construireIdMapping = (produitsPrecedents, produitsNouveaux) => {
  if (!Array.isArray(produitsPrecedents) || !Array.isArray(produitsNouveaux)) return {};
  // Index des nouveaux par (libelleNorm + famille + rayon)
  const parCle = new Map();
  produitsNouveaux.forEach(p => {
    if (!p.libelle || !p.id) return;
    const key = `${normaliserLibelle(p.libelle)}|${p.famille || ''}|${p.rayon || ''}`;
    if (!parCle.has(key)) parCle.set(key, []);
    parCle.get(key).push(p);
  });

  const mapping = {};
  produitsPrecedents.forEach(ancien => {
    if (!ancien.libelle || !ancien.id) return;
    const key = `${normaliserLibelle(ancien.libelle)}|${ancien.famille || ''}|${ancien.rayon || ''}`;
    const candidats = parCle.get(key) || [];
    if (candidats.length === 0) return;
    // Disambiguation quand plusieurs candidats partagent le même libellé normalisé.
    // Règle : EAN strictement prioritaire (le plus discriminant). ITM8 en fallback
    // SEULEMENT si un seul candidat a cet ITM (sinon ambiguïté → ne pas mapper).
    // Contexte : ~16% des ITM8 en production ont plusieurs EAN (variantes PAC/PRE,
    // promos, conditionnements). Matcher par ITM seul donne un faux positif :
    // la personnalisation de l'ancien « X4 PAC » atterrit sur le nouveau « X4 1KG ».
    let cible = null;
    if (candidats.length === 1) {
      cible = candidats[0];
    } else {
      const byEan = ancien.ean13 ? candidats.find(c => c.ean13 === ancien.ean13) : null;
      if (byEan) {
        cible = byEan;
      } else if (ancien.itm8) {
        const matchsItm = candidats.filter(c => c.itm8 === ancien.itm8);
        cible = matchsItm.length === 1 ? matchsItm[0] : null;
      }
    }
    if (cible && cible.id !== ancien.id) {
      mapping[ancien.id] = cible.id;
    }
  });
  return mapping;
};

/**
 * Charge le dernier fichier MANAGER précédent (semaine S-1 ou la plus proche antérieure)
 * pour construire l'idMapping.
 * @param {FileSystemDirectoryHandle} dossierBVP
 * @param {string} codePDV
 * @param {{semaine, annee}} semaineActuelle
 * @returns {Promise<Array|null>} liste des produits du dernier MANAGER trouvé, ou null
 */
const chargerProduitsMgrPrecedent = async (dossierBVP, codePDV, semaineActuelle) => {
  if (!dossierBVP || !codePDV || !semaineActuelle) return null;
  const ajuster = (sem, an) => {
    if (sem <= 0) return { semaine: sem + 52, annee: an - 1 };
    if (sem > 52) return { semaine: sem - 52, annee: an + 1 };
    return { semaine: sem, annee: an };
  };
  for (let offset = 1; offset <= 52; offset++) {
    const sem = ajuster(semaineActuelle.semaine - offset, semaineActuelle.annee);
    const nom = `MANAGER-${codePDV}-S${String(sem.semaine).padStart(2, '0')}-${sem.annee}.bvp.json`;
    try {
      const fh = await dossierBVP.getFileHandle(nom);
      const file = await fh.getFile();
      const data = JSON.parse(await file.text());
      if (Array.isArray(data.produits) && data.produits.length > 0) {
        return data.produits;
      }
    } catch { /* fichier absent, essayer semaine précédente */ }
  }
  return null;
};

// ============================================================================
// Construction de l'archive
// ============================================================================

const construireArchive = ({
  donneesMagasin,
  infoPDV,
  semainePlanning,
  objectifCA,
  objectifPourcent,
  produitsGamme,
  planifieManager,
  joursOuverture,
  promosActives,
  commandeConfig,
  frequentationData,
  plaquageProgrammes,
  couverturePatisserie,
  idMapping = {},
}) => {
  const sem = semainePlanning || { semaine: 1, annee: 2026 };
  const code = infoPDV?.code || donneesMagasin?.magasin?.code || 'XXXXX';
  const nom = infoPDV?.nom || donneesMagasin?.magasin?.nom || 'MAGASIN';

  // Jours actifs (créneaux au moins partiellement ouverts)
  const joursActifs = [];
  if (joursOuverture?.creneaux) {
    Object.entries(joursOuverture.creneaux).forEach(([jour, creneaux]) => {
      const auMoinsUnOuvert = Object.values(creneaux).some(e => e === 'ouvert');
      if (auMoinsUnOuvert) joursActifs.push(jour);
    });
  } else {
    joursActifs.push('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi');
  }

  // Construire la fréquentation pour l'export
  let poidsJoursSource = POIDS_FREQUENTATION_DEFAUT;
  let frequentationParDefaut = true;

  if (frequentationData?.poidsJours) {
    const vals = Object.values(frequentationData.poidsJours);
    const allZero = vals.every(v => !v || v === 0);
    const allEqual = vals.length > 1 && vals.every(v => v === vals[0]);
    if (!allZero && !allEqual) {
      poidsJoursSource = frequentationData.poidsJours;
      frequentationParDefaut = false;
    }
  }

  // Normaliser les poids sur les jours actifs uniquement (somme = 1)
  const totalPoidsActifs = joursActifs.reduce((sum, jour) => sum + (poidsJoursSource[jour] || 0), 0);
  const poidsNormalises = {};
  joursActifs.forEach(jour => {
    poidsNormalises[jour] = totalPoidsActifs > 0
      ? (poidsJoursSource[jour] || 0) / totalPoidsActifs
      : 1 / joursActifs.length;
  });

  // Construire l'objet frequentation compatible avec calculerQuantites.js
  const frequentationExport = {
    source: frequentationParDefaut ? 'defaut' : 'import',
    typePonderation: frequentationData?.typePonderation || 'standard',
    sourceFrequentation: frequentationData?.sourceFrequentation || '',
    parJour: {},
  };
  joursActifs.forEach(jour => {
    frequentationExport.parJour[jour] = {
      poids: poidsNormalises[jour],
      tranches: frequentationData?.poidsTranchesParJour?.[jour] || {},
    };
  });

  // CA historique (somme des CA des produits actifs)
  const caHistorique = (produitsGamme || [])
    .filter(p => p.actif !== false)
    .reduce((sum, p) => sum + (p.caSemaine || 0), 0);

  // Produits
  const produits = (produitsGamme || []).map((p, index) => {
    const planifie = planifieManager?.[p.id] ?? p.potentiel ?? p.moyHebdo ?? 0;
    // Convertir en UNITÉS réelles pour l'export
    // planifie est en "ventes" (lots), on multiplie par unitesParVente pour obtenir des unités
    const upv = p.unitesParLot || p.unitesParVente || 1;
    const planifieUnites = planifie * upv;

    const repartitionJours = {};
    joursActifs.forEach(jour => {
      repartitionJours[jour] = Math.round(planifieUnites * poidsNormalises[jour]);
    });

    return {
      id: p.id || p.itm8 || `prod_${index + 1}`,
      plu: p.plu || p.codePLU || '',
      itm8: p.itm8 || '',
      ean13: p.ean13 || p.codeEAN || '',
      libelle: p.libelle || '',
      famille: p.famille || p.rayon || 'AUTRE',
      rayon: p.rayon || 'BVP',
      actif: p.actif !== false,
      programme: p.programme || '',
      unitesParPlaque: p.unitesParPlaque || 0,
      unitesParLot: p.unitesParLot || p.unitesParVente || 1,
      moyenneHebdo: (p.moyHebdo || 0) * upv,
      potentielAlgo: (p.potentiel || 0) * upv,
      planifieManager: planifieUnites,
      cdt: p.cdt || p.cdtAchat || 0,
      repartitionJours,
      // Associations et nettoyage (conservés entre sessions)
      raisonDesactivation: p.raisonDesactivation || null,
      libelleRefV2: p.libelleRefV2 || null,
      marqueRefV2: p.marqueRefV2 || null,
      _eansFusionnes: p._eansFusionnes || null,
      unitesParVente: p.unitesParVente || 1,
    };
  });

  // Promotions
  const promotions = (promosActives || []).map(promo => ({
    plu: promo.plu || promo.itm8 || '',
    itm8: promo.itm8 || '',
    libelle: promo.libelle || '',
    type: promo.type || 'promo',
    dateDebut: promo.dateDebut || '',
    dateFin: promo.dateFin || '',
    prixNormalTTC: promo.prixNormalTTC ?? 0,
    prixPromoTTC: promo.prixPromoTTC ?? 0,
    prixAchatHT: promo.prixAchatHT ?? 0,
    margePct: promo.margePct ?? 0,
    avantageClient: promo.avantageClient ?? 0,
    margeNormaleEuros: promo.margeNormaleEuros ?? 0,
    margePromoEuros: promo.margePromoEuros ?? 0,
    tauxMargePromo: promo.tauxMargePromo ?? 0,
    elasticite: promo.elasticite ?? 0,
    qteNormaleHebdo: promo.qteNormaleHebdo ?? 0,
    qteNormalePeriode: promo.qteNormalePeriode ?? 0,
    nbJoursPromo: promo.nbJoursPromo ?? 7,
    qteObjectif: promo.qteObjectif ?? 0,
    qteValidee: promo.qteValidee ?? promo.qteObjectif ?? 0,
    qteSupplementaire: promo.qteSupplementaire ?? 0,
  }));

  // Référentiel
  const familles = [...new Set(produits.map(p => p.famille).filter(Boolean))];
  if (familles.length === 0) familles.push('PAIN', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING');

  const archive = {
    schemaVersion: '3.0',
    type: 'planning-archive',
    exportDate: new Date().toISOString(),

    magasin: {
      code: String(code),
      nom: String(nom),
    },

    semaine: {
      numero: sem.semaine,
      annee: sem.annee,
      dateDebut: getDateDebutSemaine(sem.semaine, sem.annee),
      dateFin: getDateFinSemaine(sem.semaine, sem.annee),
    },

    configuration: {
      joursActifs,
      creneaux: joursOuverture?.creneaux || null,
      regroupements: joursOuverture?.regroupements || null,
      nbTranches: joursOuverture?.nbTranches || 4,
      tranchesParFamille: joursOuverture?.tranchesParFamille || null,
      livraisons: (commandeConfig?.livraisons || []).map(l => ({
        id: l.id,
        dateCommande: l.dateCommande,
        dateReception: l.dateReception,
        label: l.label || `Livraison ${l.id}`,
      })),
      operationsSpeciales: [],
      // repartitionParFamille déduite des tranchesParFamille du manager :
      // si une famille a plus d'1 tranche → mode "tranches", sinon → "journalier"
      repartitionParFamille: (() => {
        const tpf = joursOuverture?.tranchesParFamille;
        if (!tpf) return {
          BOULANGERIE: 'tranches',
          VIENNOISERIE: 'tranches',
          PATISSERIE: 'journalier',
          SNACKING: 'journalier',
          AUTRE: 'journalier',
        };
        const result = {};
        Object.entries(tpf).forEach(([famille, tranches]) => {
          result[famille] = (Array.isArray(tranches) && tranches.length > 1) ? 'tranches' : 'journalier';
        });
        return result;
      })(),
    },

    promotions,

    objectifs: {
      caHistorique: Math.round(caHistorique),
      objectifPourcent: objectifPourcent || 0,
      caPrevision: objectifCA || Math.round(caHistorique),
    },

    produits,

    frequentation: frequentationExport,

    commandes: commandeConfig?.qtesFinales || {},

    personnalisationProduits: commandeConfig?.personnalisationProduits || {},

    referentiel: {
      version: 'ITM8-2026',
      inclus: true,
      familles,
      source: 'referentiel V2.xlsx',
    },

    // Plaquage par programme de cuisson (pourcentages définis par le manager)
    plaquage: Object.keys(plaquageProgrammes || {}).length > 0 ? plaquageProgrammes : null,

    // Pâtisserie couverture multi-jours
    couverturePatisserie: couverturePatisserie?.jours ? {
      jours: couverturePatisserie.jours,
      jourDepart: couverturePatisserie.jourDepart || 'lundi',
    } : null,

    // Table de correspondance ancien_id → nouvel_id (calculée au moment de l'export
    // en comparant avec le MANAGER précédent). Utilisée par la migration EQUIPE en
    // priorité pour éviter les faux matchs par libellé.
    idMapping: idMapping && Object.keys(idMapping).length > 0 ? idMapping : {},

    // Corrections manuelles (séparations, fusions, dissociations, associations)
    correctionsManuelles: (() => {
      try {
        const data = JSON.parse(localStorage.getItem('bvp_corrections_doublons') || '{}');
        if (data.separations?.length || data.fusions?.length || data.dissociations?.length || data.associations?.length) {
          return data;
        }
      } catch { /* ignore */ }
      return null;
    })(),
  };

  return archive;
};

// ============================================================================
// Composant : popup informatif sur les codes produits actualisés (§3 bis)
// ============================================================================

const SEUIL_AFFICHAGE_LISTE = 20;

const PopupCodesActualises = ({ mapping, produits }) => {
  const [ouvert, setOuvert] = useState(false);
  const nb = Object.keys(mapping).length;
  if (nb === 0) return null;

  // Index produits par id pour retrouver le libellé
  const parId = new Map((produits || []).map(p => [p.id, p]));

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Check className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-blue-900">
            <strong>{nb}</strong> code{nb > 1 ? 's' : ''} produit{nb > 1 ? 's' : ''} {nb > 1 ? 'ont' : 'a'} changé cette semaine et {nb > 1 ? 'seront' : 'sera'} automatiquement actualisé{nb > 1 ? 's' : ''} pour les équipes.
          </p>
          {nb <= SEUIL_AFFICHAGE_LISTE && (
            <button
              onClick={() => setOuvert(o => !o)}
              className="text-xs text-blue-700 underline mt-1 hover:text-blue-900"
            >
              {ouvert ? 'Masquer la liste' : 'Voir la liste'}
            </button>
          )}
          {ouvert && nb <= SEUIL_AFFICHAGE_LISTE && (
            <ul className="mt-2 space-y-1 text-xs text-blue-800 max-h-48 overflow-y-auto">
              {Object.entries(mapping).map(([ancien, nouveau]) => {
                const lib = parId.get(nouveau)?.libelle || '';
                return (
                  <li key={ancien} className="font-mono">
                    {ancien} → {nouveau} <span className="font-sans text-blue-600">{lib}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Composant principal
// ============================================================================

const Etape5Communication = () => {
  const {
    donneesMagasin,
    infoPDV,
    semainePlanning,
    objectifCA,
    objectifPourcent,
    produitsGamme,
    planifieManager,
    joursOuverture,
    promosActives,
    commandeConfig,
    dossierBVP,
    frequentationData,
    plaquageProgrammes,
    couverturePatisserie,
  } = useMagasin();

  const { writeFile } = useFileAccess();

  const [exporting, setExporting] = useState(false);
  const [exportOk, setExportOk] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [nomFichierExporte, setNomFichierExporte] = useState(null);
  // Table de correspondance construite au moment de l'export (pour popup informatif)
  const [idMappingExporte, setIdMappingExporte] = useState({});

  // Construire l'archive en preview
  const archive = useMemo(() => construireArchive({
    donneesMagasin,
    infoPDV,
    semainePlanning,
    objectifCA,
    objectifPourcent,
    produitsGamme,
    planifieManager,
    joursOuverture,
    commandeConfig,
    promosActives,
    frequentationData,
    plaquageProgrammes,
    couverturePatisserie,
  }), [donneesMagasin, infoPDV, semainePlanning, objectifCA, objectifPourcent, produitsGamme, planifieManager, joursOuverture, promosActives, commandeConfig, frequentationData, plaquageProgrammes, couverturePatisserie]);

  const nomFichier = useMemo(() => {
    const code = archive.magasin.code;
    const sem = padSemaine(archive.semaine.numero);
    const annee = archive.semaine.annee;
    return `MANAGER-${code}-S${sem}-${annee}.bvp.json`;
  }, [archive]);

  // Stats pour le résumé
  const nbProduits = archive.produits.length;
  const nbProduitsActifs = archive.produits.filter(p => p.actif).length;
  const nbPromos = archive.promotions.length;
  const nbJours = archive.configuration.joursActifs.length;

  // Export dans le dossier d'archives (ou téléchargement fallback)
  const handleExport = async () => {
    setExporting(true);
    setErreur(null);
    setExportOk(false);

    try {
      const dirToUse = dossierBVP;

      // 1. Construire l'idMapping en comparant avec le MANAGER précédent (si accessible)
      let idMapping = {};
      if (dirToUse) {
        try {
          const codePDV = archive.magasin.code;
          const produitsPrecedents = await chargerProduitsMgrPrecedent(dirToUse, codePDV, semainePlanning);
          if (produitsPrecedents) {
            idMapping = construireIdMapping(produitsPrecedents, archive.produits);
          }
        } catch { /* non bloquant : export continue sans idMapping */ }
      }
      setIdMappingExporte(idMapping);

      // 2. Reconstruire l'archive finale avec l'idMapping
      const archiveFinale = { ...archive, idMapping };

      // Si pas de dossier configuré → téléchargement navigateur
      if (!dirToUse) {
        const blob = new Blob([JSON.stringify(archiveFinale, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomFichier;
        a.click();
        URL.revokeObjectURL(url);
        setExportOk(true);
        setNomFichierExporte(nomFichier);
        return;
      }

      // Vérifier la permission
      const ok = await checkHandlePermission(dirToUse, 'readwrite');
      if (!ok) {
        setErreur('Permission refusée sur le dossier d\'archives.');
        return;
      }

      // Écrire le fichier dans le dossier
      await writeFile(dirToUse, nomFichier, JSON.stringify(archiveFinale, null, 2));

      setExportOk(true);
      setNomFichierExporte(nomFichier);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setErreur(`Erreur lors de l'export : ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Vérifications pré-export
  const avertissements = [];
  if (!semainePlanning) avertissements.push('Aucune semaine planning définie');
  if (nbProduitsActifs === 0) avertissements.push('Aucun produit actif dans la gamme');
  if (!objectifCA && !objectifPourcent) avertissements.push('Objectif CA non défini');
  if (!frequentationData?.poidsJours) avertissements.push('Fréquentation par défaut — la répartition jour par jour utilise des poids standards (samedi 20%, mercredi/vendredi 16%, autres 12%). Importez le fichier de fréquentation à l\'étape 2 pour plus de précision.');

  const peutExporter = semainePlanning && nbProduitsActifs > 0;

  // Auto-export au montage
  useEffect(() => {
    if (peutExporter && !exportOk && !exporting && !erreur) {
      handleExport();
    }
  }, [peutExporter]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-[#8B1538]" />
          Communication Équipe
        </h2>
        <p className="text-gray-600 mt-1">
          Export automatique du planning pour votre équipe
        </p>
      </div>

      {/* Résumé du planning */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Résumé du planning</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Magasin */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              Magasin
            </div>
            <p className="font-bold text-gray-800 text-lg">
              {archive.magasin.nom}
            </p>
            <p className="text-xs text-gray-500">Code : {archive.magasin.code}</p>
          </div>

          {/* Semaine */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              Semaine
            </div>
            <p className="font-bold text-gray-800 text-lg">
              S{padSemaine(archive.semaine.numero)} / {archive.semaine.annee}
            </p>
            <p className="text-xs text-gray-500">{nbJours} jours d'ouverture</p>
          </div>

          {/* Produits */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Package className="w-4 h-4" />
              Produits
            </div>
            <p className="font-bold text-gray-800 text-lg">
              {nbProduitsActifs}
            </p>
            <p className="text-xs text-gray-500">sur {nbProduits} au total</p>
          </div>

          {/* Objectif */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Target className="w-4 h-4" />
              Objectif
            </div>
            <p className="font-bold text-gray-800 text-lg">
              {archive.objectifs.caPrevision.toLocaleString('fr-FR')} €
            </p>
            <p className="text-xs text-gray-500">
              {objectifPourcent ? `+${objectifPourcent}% vs historique` : 'Non défini'}
            </p>
          </div>
        </div>

        {/* Promos */}
        {nbPromos > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            {nbPromos} promotion{nbPromos > 1 ? 's' : ''} active{nbPromos > 1 ? 's' : ''} incluse{nbPromos > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Avertissements */}
      {avertissements.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">Attention</span>
          </div>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
            {avertissements.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Statut de l'export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {exporting ? (
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="w-5 h-5 border-2 border-[#8B1538] border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600 font-medium">Création du fichier planning...</span>
          </div>
        ) : exportOk ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Planning exporté avec succès</p>
                <p className="text-sm text-green-600 font-mono">{nomFichierExporte}</p>
                {dossierBVP && (
                  <p className="text-xs text-green-500 mt-1">Sauvegardé dans : {dossierBVP.name}</p>
                )}
              </div>
            </div>

            {/* §3 bis : Popup informatif sur les codes produits actualisés */}
            {Object.keys(idMappingExporte).length > 0 && (
              <PopupCodesActualises mapping={idMappingExporte} produits={archive.produits} />
            )}
          </div>
        ) : erreur ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Erreur lors de l'export</p>
              <p className="text-sm text-red-600">{erreur}</p>
              <button
                onClick={handleExport}
                className="mt-2 px-4 py-2 bg-[#8B1538] text-white text-sm rounded-lg hover:bg-[#6d1029]"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : !peutExporter ? (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <p className="text-amber-800">Données insuffisantes pour créer le fichier planning.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Etape5Communication;
