/**
 * Étape 2 : Objectif CA
 *
 * Permet au manager de définir son objectif CA :
 * - Saisie du numéro de semaine du planning
 * - Calcul automatique de S-4 (fréquentation)
 * - Affiche les axes de progression identifiés
 * - Montre le potentiel chiffré (hebdo + annuel)
 * - Formulaire pour accepter/modifier/ignorer l'objectif
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  Euro,
  Calendar,
  Check,
  X,
  Edit3,
  AlertTriangle,
  AlertCircle,
  Zap,
  Award,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import {
  calculerPotentielPerdu,
  calculerProjectionAnnuelle,
  formatMontant,
  formatNombre,
} from '../../services/calculService';
import { parseFrequentationExcel } from '../../services/excelParser';
import { useFileAccess, checkHandlePermission } from '../../hooks/useFileAccess';

/**
 * Nombre de semaines ISO d'une année donnée (52 ou 53).
 */
function nbSemainesISO(annee) {
  const dernierJour = new Date(annee, 11, 28);
  const dayNum = dernierJour.getDay() || 7;
  dernierJour.setDate(dernierJour.getDate() + (4 - dayNum));
  const premierJour = new Date(dernierJour.getFullYear(), 0, 1);
  return Math.ceil(((dernierJour - premierJour) / 86400000 + 1) / 7);
}

/**
 * Calcule la semaine S-N à partir d'une semaine/année donnée.
 * Gère le passage d'année (ex: S03 - 4 → S51 de l'année précédente).
 */
function calculerSemaineMoinsN(semaine, annee, n = 4) {
  if (!semaine || !annee) return null;
  let s = semaine - n;
  let a = annee;
  while (s <= 0) {
    a -= 1;
    s = nbSemainesISO(a) + s;
  }
  return { semaine: s, annee: a };
}

// Alias rétrocompatible
function calculerSemaineMoins4(semaine, annee) {
  return calculerSemaineMoinsN(semaine, annee, 4);
}

/**
 * Génère le nom de fichier fréquentation pour une semaine donnée.
 */
function nomFichierFrequentation(sem) {
  if (!sem) return null;
  return `Vente_Hebdo_BVP_S${String(sem.annee)}-${String(sem.semaine).padStart(2, '0')}.xlsx`;
}

const Etape2ObjectifCA = ({ onPrecedent }) => {
  const {
    donneesMagasin,
    infoPDV,
    semaineSelectionnee,
    objectifCA,
    setObjectifCA,
    setObjectifPourcent,
    semainePlanning,
    setSemainePlanning,
    setSemaineFrequentation,
    dirHandle,
    setFrequentationData,
    typePonderation,
    setTypePonderation,
    setJoursOuverture,
    setPlanifieManager,
    setPromosActives,
    setPromosPrecedentes,
    dossierArchives,
    setDossierArchives,
    setArchiveProduitsEnAttente,
  } = useMagasin();

  const { selectDirectory } = useFileAccess();

  // État local pour l'objectif
  const [modeObjectif, setModeObjectif] = useState('suggere');
  const [objectifPersonnalise, setObjectifPersonnalise] = useState('');

  // Vérification existence fichier fréquentation
  const [fichierFreqExiste, setFichierFreqExiste] = useState(null); // null=non vérifié, true/false

  // État local pour la semaine planning
  const [inputSemaine, setInputSemaine] = useState(
    semainePlanning ? String(semainePlanning.semaine).padStart(2, '0') : ''
  );
  const [inputAnnee, setInputAnnee] = useState(
    semainePlanning ? String(semainePlanning.annee) : String(new Date().getFullYear())
  );

  // Semaine appliquée (ne change qu'au clic sur "Appliquer")
  const [semaineAppliquee, setSemaineAppliquee] = useState(semainePlanning || null);

  // Détecte si les inputs diffèrent de la semaine appliquée
  const inputsModifies = useMemo(() => {
    const s = parseInt(inputSemaine, 10);
    const a = parseInt(inputAnnee, 10);
    if (!s || !a || s < 1 || s > 53) return false;
    if (!semaineAppliquee) return true;
    return s !== semaineAppliquee.semaine || a !== semaineAppliquee.annee;
  }, [inputSemaine, inputAnnee, semaineAppliquee]);

  // Calcul S-4 uniquement à partir de la semaine appliquée
  const semaineS4 = useMemo(() => {
    if (!semaineAppliquee) return null;
    return calculerSemaineMoins4(semaineAppliquee.semaine, semaineAppliquee.annee);
  }, [semaineAppliquee]);

  // Aperçu S-4 en temps réel (pour info, sans déclencher de chargement)
  const previewS4 = useMemo(() => {
    const s = parseInt(inputSemaine, 10);
    const a = parseInt(inputAnnee, 10);
    if (!s || !a || s < 1 || s > 53) return null;
    return calculerSemaineMoins4(s, a);
  }, [inputSemaine, inputAnnee]);

  // Semaine de référence effectivement trouvée (peut différer de S-4)
  const [semaineFreqTrouvee, setSemaineFreqTrouvee] = useState(null);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);

  // Nom du fichier trouvé (pour affichage)
  const fichierFrequentation = semaineFreqTrouvee ? nomFichierFrequentation(semaineFreqTrouvee) : nomFichierFrequentation(semaineS4);

  // Appliquer la semaine sélectionnée
  const handleAppliquerSemaine = () => {
    const s = parseInt(inputSemaine, 10);
    const a = parseInt(inputAnnee, 10);
    if (!s || !a || s < 1 || s > 53) return;
    setSemaineAppliquee({ semaine: s, annee: a });
  };

  // Recherche en cascade : S-4, S-8, S-12... jusqu'à S-52
  useEffect(() => {
    if (!dirHandle || !semaineAppliquee) {
      setFichierFreqExiste(null);
      setSemaineFreqTrouvee(null);
      return;
    }
    let cancelled = false;
    setRechercheEnCours(true);
    setSemaineFreqTrouvee(null);
    setFichierFreqExiste(null);

    (async () => {
      // Tenter S-4, S-8, S-12... S-52
      for (let offset = 4; offset <= 52; offset += 4) {
        if (cancelled) return;
        const sem = calculerSemaineMoinsN(semaineAppliquee.semaine, semaineAppliquee.annee, offset);
        const nom = nomFichierFrequentation(sem);
        try {
          const fileHandle = await dirHandle.getFileHandle(nom);
          if (cancelled) return;

          // Fichier trouvé — charger et parser
          setSemaineFreqTrouvee(sem);
          setFichierFreqExiste(true);

          const file = await fileHandle.getFile();
          const freqData = await parseFrequentationExcel(file, typePonderation);
          if (!cancelled) {
            setFrequentationData({
              poidsJours: freqData.poidsParJour,
              poidsTranchesParJour: freqData.poidsTranchesParJour,
              parJour: freqData.parJour,
              parJourDetail: freqData.parJourDetail,
              totalBvpHebdo: freqData.totalBvpHebdo,
              totalPdvHebdo: freqData.totalPdvHebdo,
              tauxPenetration: freqData.tauxPenetration,
              nombreSemaines: freqData.nombreSemaines,
              typePonderation: freqData.typePonderation,
              ponderations: freqData.ponderations,
              sourceFrequentation: freqData.sourceFrequentation,
            });
          }
          setRechercheEnCours(false);
          return; // Trouvé, on arrête
        } catch {
          // Fichier non trouvé, continuer
        }
      }
      // Aucun fichier trouvé sur 1 an
      if (!cancelled) {
        setFichierFreqExiste(false);
        setFrequentationData(null);
        setSemaineFreqTrouvee(null);
        setRechercheEnCours(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dirHandle, semaineAppliquee, typePonderation, setFrequentationData]);

  // ── Recherche d'archive Manager (S-1, S-2... S-52) ──
  const [archiveTrouvee, setArchiveTrouvee] = useState(null); // { semaine, annee, estExacte, data }
  const [rechercheArchiveEnCours, setRechercheArchiveEnCours] = useState(false);

  useEffect(() => {
    if (!dossierArchives || !semaineAppliquee) {
      setArchiveTrouvee(null);
      return;
    }
    const codePDV = infoPDV?.code || donneesMagasin?.magasin?.code || '';
    if (!codePDV) return;

    let cancelled = false;
    setRechercheArchiveEnCours(true);
    setArchiveTrouvee(null);

    (async () => {
      // Vérifier la permission sur le dossier
      try {
        const ok = await checkHandlePermission(dossierArchives, 'read');
        if (!ok) {
          setRechercheArchiveEnCours(false);
          return;
        }
      } catch {
        setRechercheArchiveEnCours(false);
        return;
      }

      for (let offset = 1; offset <= 52; offset++) {
        if (cancelled) return;
        const sem = calculerSemaineMoinsN(semaineAppliquee.semaine, semaineAppliquee.annee, offset);
        const nomArchive = `MANAGER-${codePDV}-S${String(sem.semaine).padStart(2, '0')}-${sem.annee}.bvp.json`;
        try {
          const fileHandle = await dossierArchives.getFileHandle(nomArchive);
          if (cancelled) return;
          const file = await fileHandle.getFile();
          const text = await file.text();
          const data = JSON.parse(text);

          const estExacte = offset === 1; // S-1 = semaine attendue

          // Charger dans le contexte
          if (!cancelled) {
            // Toujours charger : jours d'ouverture et articles sélectionnés
            if (data.configuration) {
              setJoursOuverture({
                creneaux: data.configuration.creneaux || null,
                redistribution: null,
                regroupements: data.configuration.regroupements || null,
              });
            }

            // Stocker les promos de l'archive comme "promos précédentes" (pour indicateur S-1)
            if (data.promotions && data.promotions.length > 0) {
              setPromosPrecedentes(data.promotions.map(p => ({
                plu: p.plu || '',
                itm8: p.itm8 || '',
                libelle: p.libelle || '',
                qteValidee: p.qteValidee || p.quantitePrevue || 0,
              })));
            } else {
              setPromosPrecedentes([]);
            }

            // Stocker les produits de l'archive dans le contexte (sera appliqué
            // automatiquement par le useEffect dans MagasinContext quand produitsGamme se remplit)
            if (data.produits && data.produits.length > 0) {
              setArchiveProduitsEnAttente(data.produits);
            }

            // Les promos de l'archive ne sont JAMAIS chargées comme promos actives
            // (les promos de la semaine en cours sont ajoutées manuellement par l'utilisateur)
            setPromosActives([]);

            if (estExacte) {
              // S-1 exacte : charger les quantités planifiées
              if (data.produits) {
                const planifie = {};
                data.produits.forEach(p => {
                  if (p.planifieManager && p.planifieManager > 0) {
                    const id = p.plu || p.itm8 || p.libelle;
                    planifie[id] = p.planifieManager;
                  }
                });
                if (Object.keys(planifie).length > 0) {
                  setPlanifieManager(planifie);
                }
              }
            } else {
              // Pas S-1 : réglages et articles seulement, pas de quantités
              setPlanifieManager({});
            }

            setArchiveTrouvee({
              semaine: sem,
              estExacte,
              nomFichier: nomArchive,
            });
          }
          setRechercheArchiveEnCours(false);
          return;
        } catch {
          // Fichier non trouvé, continuer
        }
      }
      // Aucune archive trouvée
      if (!cancelled) {
        setArchiveTrouvee(null);
        setRechercheArchiveEnCours(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dossierArchives, semaineAppliquee, infoPDV, donneesMagasin, setJoursOuverture, setPlanifieManager, setPromosActives, setPromosPrecedentes, setArchiveProduitsEnAttente]);

  // Persister la semaine appliquée dans le contexte
  useEffect(() => {
    if (semaineAppliquee) {
      setSemainePlanning(semaineAppliquee);
      setSemaineFrequentation(semaineFreqTrouvee || semaineS4);
    }
  }, [semaineAppliquee, semaineS4, semaineFreqTrouvee, setSemainePlanning, setSemaineFrequentation]);

  // CA actuel (semaine de fréquentation)
  const caActuel = donneesMagasin?.indicateurs?.global?.pdv?.caBVP || 0;

  // Persister l'objectif CA dans le contexte
  useEffect(() => {
    if (modeObjectif === 'suggere') {
      setObjectifCA(objectifSuggereVal);
      setObjectifPourcent(caActuel > 0 ? Math.round((objectifSuggereVal - caActuel) / caActuel * 100) : null);
    } else if (modeObjectif === 'personnalise' && objectifPersonnalise) {
      const val = parseFloat(objectifPersonnalise);
      setObjectifCA(val);
      setObjectifPourcent(caActuel > 0 ? Math.round((val - caActuel) / caActuel * 100) : null);
    } else {
      setObjectifCA(null);
      setObjectifPourcent(null);
    }
  }, [modeObjectif, objectifPersonnalise, caActuel]);

  // Calculs
  const potentiel = useMemo(
    () => calculerPotentielPerdu(donneesMagasin),
    [donneesMagasin]
  );

  const projections = useMemo(() => {
    if (!potentiel) return null;
    return calculerProjectionAnnuelle(potentiel.gainCaMax);
  }, [potentiel]);


  // Objectif suggéré = CA actuel + potentiel
  const objectifSuggereVal = caActuel + (potentiel?.gainCaMax || 0);

  if (!donneesMagasin || !potentiel) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Données non disponibles</h2>
        <p className="text-gray-600 mb-6">
          Veuillez d'abord compléter le diagnostic.
        </p>
        <button
          onClick={onPrecedent}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Retour au diagnostic
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Définir votre objectif CA</h2>
        <p className="text-mousquetaires-gris">
          Basé sur l'analyse de votre magasin et le potentiel identifié
        </p>
      </div>

      {/* Semaine planning + fréquentation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#8B1538]" />
          Semaine du planning
        </h3>

        <div className="flex items-end gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Semaine</label>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-medium">S</span>
              <input
                type="number"
                min="1"
                max="53"
                value={inputSemaine}
                onChange={(e) => setInputSemaine(e.target.value)}
                placeholder="05"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none text-center font-mono text-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Année</label>
            <input
              type="number"
              min="2024"
              max="2030"
              value={inputAnnee}
              onChange={(e) => setInputAnnee(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none text-center font-mono text-lg"
            />
          </div>

          <button
            onClick={handleAppliquerSemaine}
            disabled={!inputsModifies}
            className={`px-5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              inputsModifies
                ? 'bg-[#8B1538] text-white hover:bg-[#6d1029]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            Appliquer
          </button>

          {previewS4 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">
                Fréquentation S-4 :
              </span>
              <span className="font-bold text-blue-900">
                S{String(previewS4.semaine).padStart(2, '0')}/{previewS4.annee}
              </span>
            </div>
          )}
        </div>

        {semaineAppliquee && (
          <div className={`text-sm px-4 py-2 rounded-lg flex items-center gap-2 ${
            rechercheEnCours
              ? 'bg-gray-50 text-gray-600'
              : fichierFreqExiste === true
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {rechercheEnCours ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span>Recherche du fichier de fréquentation (S-4, S-8, S-12...)...</span>
              </>
            ) : fichierFreqExiste === true && semaineFreqTrouvee ? (
              <>
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span>
                  Fichier trouvé : <code className="font-mono bg-gray-200 px-2 py-0.5 rounded">{fichierFrequentation}</code>
                  {semaineFreqTrouvee.semaine !== semaineS4?.semaine || semaineFreqTrouvee.annee !== semaineS4?.annee ? (
                    <span className="ml-2 text-amber-600 font-medium">
                      (S-4 indisponible, référence S{String(semaineFreqTrouvee.semaine).padStart(2, '0')}/{semaineFreqTrouvee.annee} utilisée)
                    </span>
                  ) : (
                    <span className="ml-1">— S-4 trouvé</span>
                  )}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Aucun fichier de fréquentation trouvé (S-4 à S-52 testés)</span>
              </>
            )}
          </div>
        )}
        {fichierFreqExiste === false && !rechercheEnCours && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <strong>Attention :</strong> Aucun fichier de fréquentation trouvé dans votre dossier DATA_perso sur les 52 dernières semaines.
            Le calcul du potentiel ne pourra pas utiliser les données de fréquentation réelles.
            Vérifiez que les fichiers <code className="font-mono bg-red-100 px-1 rounded">Vente_Hebdo_BVP_SAAAA-SS.xlsx</code> sont bien présents.
          </div>
        )}

        {/* Pondération des semaines */}
        {fichierFreqExiste === true && !rechercheEnCours && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#8B1538]" />
              Type de pondération des données
            </h4>
            <div className="flex gap-3 flex-wrap">
              {[
                { id: 'standard', label: 'Standard', desc: 'S-1: 40% | AS-1: 30% | S-2: 30%', info: 'Semaine classique' },
                { id: 'saisonnier', label: 'Saisonnier', desc: 'S-1: 30% | AS-1: 50% | S-2: 20%', info: 'Période atypique (vacances, fêtes)' },
                { id: 'fortePromo', label: 'Forte Promo', desc: 'S-1: 60% | AS-1: 20% | S-2: 20%', info: 'Semaine promotionnelle forte' },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setTypePonderation(mode.id)}
                  className={`px-5 py-3 rounded-lg transition-all font-semibold text-left ${
                    typePonderation === mode.id
                      ? 'bg-[#8B1538] text-white border-2 border-[#8B1538] shadow-md'
                      : 'bg-white text-gray-600 border-2 border-gray-300 hover:border-[#8B1538] hover:text-[#8B1538]'
                  }`}
                  title={mode.info}
                >
                  {mode.label}
                  <span className={`text-xs block mt-1 font-normal ${
                    typePonderation === mode.id ? 'text-red-200' : 'text-gray-400'
                  }`}>
                    {mode.desc}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs mt-3 text-gray-500">
              S-1 = Semaine précédente | AS-1 = Même semaine année précédente | S-2 = Il y a 2 semaines
            </p>
          </div>
        )}

        {/* Archive Manager précédente */}
        {semaineAppliquee && !dossierArchives && (
          <div className="mt-3 text-sm px-4 py-2 rounded-lg flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-700">
            <span>Aucun dossier d'archives configuré. Configurez-le à l'étape Communication, ou :</span>
            <button
              onClick={async () => {
                try {
                  const handle = await selectDirectory({ mode: 'readwrite' });
                  setDossierArchives(handle);
                } catch { /* annulé */ }
              }}
              className="ml-3 px-3 py-1 text-xs font-semibold bg-[#8B1538] text-white rounded-lg hover:bg-[#6d1029] transition-colors whitespace-nowrap"
            >
              Choisir maintenant
            </button>
          </div>
        )}
        {semaineAppliquee && dossierArchives && (
          <div className={`mt-3 text-sm px-4 py-2 rounded-lg flex items-center justify-between ${
            rechercheArchiveEnCours
              ? 'bg-gray-50 text-gray-600'
              : archiveTrouvee
              ? archiveTrouvee.estExacte
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
              : 'bg-gray-50 border border-gray-200 text-gray-500'
          }`}>
            <div className="flex items-center gap-2">
              {rechercheArchiveEnCours ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Recherche d'une archive Manager précédente...</span>
                </>
              ) : archiveTrouvee ? (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    Archive chargée : <code className="font-mono bg-gray-200 px-2 py-0.5 rounded">{archiveTrouvee.nomFichier}</code>
                    {archiveTrouvee.estExacte ? (
                      <span className="ml-1">— S-1 (réglages + quantités + promos)</span>
                    ) : (
                      <span className="ml-2 font-medium">
                        — S{String(archiveTrouvee.semaine.semaine).padStart(2, '0')}/{archiveTrouvee.semaine.annee} utilisée comme modèle (réglages uniquement)
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <span>Aucune archive Manager trouvée dans le dossier — configuration par défaut</span>
              )}
            </div>
            <button
              onClick={async () => {
                try {
                  const handle = await selectDirectory({ mode: 'readwrite' });
                  setDossierArchives(handle);
                } catch { /* annulé */ }
              }}
              className="ml-3 px-3 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap flex-shrink-0"
              title="Changer le dossier d'archives"
            >
              📁 Changer
            </button>
          </div>
        )}
      </div>

      {/* Résumé du potentiel */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* CA Actuel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Euro className="w-5 h-5 text-gray-600" />
            </div>
            <span className="font-medium text-gray-600">CA actuel</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {formatMontant(caActuel)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Semaine {semaineSelectionnee?.semaine}
          </p>
        </div>

        {/* Potentiel */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-medium text-green-700">Potentiel</span>
          </div>
          <p className="text-3xl font-bold text-green-700">
            +{formatMontant(potentiel.gainCaMax)}
          </p>
          <p className="text-sm text-green-600 mt-1">
            {formatNombre(potentiel.gainTicketsMax)} clients supplémentaires
          </p>
        </div>

        {/* Objectif suggéré */}
        <div className="bg-mousquetaires-beige-dark border border-mousquetaires-rouge/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-mousquetaires-rouge rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-mousquetaires-bordeaux">Objectif suggéré</span>
          </div>
          <p className="text-3xl font-bold text-mousquetaires-bordeaux">
            {formatMontant(objectifSuggereVal)}
          </p>
          <p className="text-sm text-mousquetaires-gris mt-1">
            +{((potentiel.gainCaMax / (caActuel || 1)) * 100).toFixed(0)}% vs actuel
          </p>
        </div>
      </div>

      {/* Projection annuelle */}
      {projections && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Projection annuelle du potentiel
          </h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-blue-600 mb-1">Hebdomadaire</p>
              <p className="text-xl font-bold text-blue-800">
                +{projections.hebdomadaireFormate}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600 mb-1">Mensuel</p>
              <p className="text-xl font-bold text-blue-800">
                +{projections.mensuelFormate}
              </p>
            </div>
            <div className="bg-blue-100 rounded-lg py-2">
              <p className="text-sm text-blue-600 mb-1">Annuel</p>
              <p className="text-2xl font-bold text-blue-900">
                +{projections.annuelFormate}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Créneau prioritaire */}
      {potentiel.creneauPrioritaire && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Action prioritaire
          </h3>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-800">
              <strong>{potentiel.creneauPrioritaire.clientsPerdus} clients</strong> passent{' '}
              <strong>{potentiel.creneauPrioritaire.label.toLowerCase()}</strong> sans acheter BVP.
            </p>
            <p className="text-amber-700 mt-2">
              <strong>Cause probable :</strong> {potentiel.creneauPrioritaire.cause}
            </p>
            <p className="text-green-700 mt-2 font-medium">
              <strong>Solution :</strong> {potentiel.creneauPrioritaire.action}
            </p>
          </div>
        </div>
      )}

      {/* Choix de l'objectif */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-mousquetaires-rouge" />
          Votre choix
        </h3>

        <div className="space-y-3">
          {/* Option 1 : Accepter l'objectif suggéré */}
          <label
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              modeObjectif === 'suggere'
                ? 'border-mousquetaires-rouge bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="modeObjectif"
              value="suggere"
              checked={modeObjectif === 'suggere'}
              onChange={() => setModeObjectif('suggere')}
              className="w-5 h-5 text-mousquetaires-rouge"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-800">
                Accepter l'objectif suggéré
              </p>
              <p className="text-sm text-gray-600">
                Viser {formatMontant(objectifSuggereVal)} / semaine (+{formatMontant(potentiel.gainCaMax)})
              </p>
            </div>
            <Check className={`w-6 h-6 ${modeObjectif === 'suggere' ? 'text-mousquetaires-rouge' : 'text-gray-300'}`} />
          </label>

          {/* Option 2 : Définir un objectif personnalisé */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              modeObjectif === 'personnalise'
                ? 'border-mousquetaires-rouge bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="modeObjectif"
              value="personnalise"
              checked={modeObjectif === 'personnalise'}
              onChange={() => setModeObjectif('personnalise')}
              className="w-5 h-5 text-mousquetaires-rouge mt-1"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-800">
                Définir un objectif personnalisé
              </p>
              {modeObjectif === 'personnalise' && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={objectifPersonnalise}
                    onChange={(e) => setObjectifPersonnalise(e.target.value)}
                    placeholder={objectifSuggereVal.toFixed(0)}
                    className="w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mousquetaires-rouge focus:border-transparent"
                  />
                  <span className="text-gray-600">€ / semaine</span>
                </div>
              )}
            </div>
            <Edit3 className={`w-6 h-6 ${modeObjectif === 'personnalise' ? 'text-mousquetaires-rouge' : 'text-gray-300'}`} />
          </label>

          {/* Option 3 : Ignorer pour l'instant */}
          <label
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              modeObjectif === 'ignorer'
                ? 'border-gray-400 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="modeObjectif"
              value="ignorer"
              checked={modeObjectif === 'ignorer'}
              onChange={() => setModeObjectif('ignorer')}
              className="w-5 h-5 text-gray-500"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-600">
                Ignorer pour l'instant
              </p>
              <p className="text-sm text-gray-500">
                Continuer sans objectif défini
              </p>
            </div>
            <X className={`w-6 h-6 ${modeObjectif === 'ignorer' ? 'text-gray-500' : 'text-gray-300'}`} />
          </label>
        </div>
      </div>

    </div>
  );
};

export default Etape2ObjectifCA;
