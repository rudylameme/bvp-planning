/**
 * Étape 0 : Import des données (V5.1 — simplifié)
 *
 * Layout compact, un seul écran :
 * - Sélection du dossier DATA_perso
 * - Affiche uniquement le dernier fichier détecté (pas de liste scrollable)
 * - Choix de la semaine (dropdown)
 * - Recherche et sélection du magasin
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  Calendar,
  CalendarDays,
  Search,
  Store,
  Check,
  X,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Database,
  Cloud,
  ExternalLink,
  HardDrive,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import {
  listerSemainesDisponibles,
  extraireDonneesMagasin,
  chargerInfoPDV,
  extraireListeMagasins,
  extraireDonneesMagasinMensuel,
  listerMoisDisponibles,
} from '../../services/dataExtractionService';

// Lien vers le dossier partagé OneDrive
const ONEDRIVE_FREQUENTATION_URL =
  'https://mousquetaires-my.sharepoint.com/:f:/r/personal/rudy_remy_mousquetaires_com/Documents/Documents/Fr%C3%A9quentation/Total%20Frequentation?csf=1&web=1&e=yyfPbT';
import {
  listerFichiersVentesCasse,
  extraireProduitsVentesCasse,
  formaterPourPilotageCA,
} from '../../services/gammeExtractionService';
import { chargerReferentielMagasin, genererRapportMatching } from '../../services/referentielMagasin';
import { useFileAccess } from '../../hooks/useFileAccess';

const Etape0Import = () => {
  const {
    dirHandle,
    setDirHandle,
    semainesDisponibles,
    setSemainesDisponibles,
    semaineSelectionnee,
    setSemaineSelectionnee,
    magasinSelectionne,
    setMagasinSelectionne,
    chargement,
    setChargement,
    erreur,
    setErreur,
    donneesMagasin,
    setDonneesMagasin,
    infoPDV,
    setInfoPDV,
    fichiersDetectes,
    setFichiersDetectes,
    importComplet,
    // Données gamme / ventes-casse
    fichiersVentesCasse,
    setFichiersVentesCasse,
    fichierVentesSelectionne,
    setFichierVentesSelectionne,
    setDonneesGamme,
    setProduitsGamme,
    semainePlanning,
    refMagasin,
    setRefMagasin,
    setRapportIdentification,
  } = useMagasin();

  const { selectDirectory } = useFileAccess();

  // État local pour le type de période (mois par défaut, semaine en option)
  const [typePeriode, setTypePeriode] = useState('mois');
  const [moisDisponibles, setMoisDisponibles] = useState([]);
  const [moisSelectionnee, setMoisSelectionnee] = useState(null);

  // État local pour le référentiel magasin (liaison EAN→ITM)
  const [refMagasinRapport, setRefMagasinRapport] = useState(null);
  const [refMagasinChargement, setRefMagasinChargement] = useState(false);
  const [refMagasinErreur, setRefMagasinErreur] = useState(null);

  // État local pour la recherche magasin
  const [rechercheMagasin, setRechercheMagasin] = useState('');
  const [magasinsTrouves, setMagasinsTrouves] = useState([]);
  const [afficherResultats, setAfficherResultats] = useState(false);
  const [etapeChargement, setEtapeChargement] = useState('');

  // Scanner le contenu d'un dossier (fichiers, semaines, infoPDV, ventes/casse)
  const scannerDossier = async (handle) => {
    // Lister les fichiers disponibles
    const fichiers = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const isExcel = entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls');
        const isJson = entry.name.endsWith('.json');
        const isVenteHebdo = entry.name.startsWith('Vente_Hebdo_BVP_S');
        const isVenteMensuelle = entry.name.startsWith('Vente_Mensuelle_BVP_M');
        const isInfoPDV = entry.name === 'info_PDV.json';
        // Détecter les fichiers ventes/casse (format "1 AU 25 JANVIER 2026.xlsx")
        const isVentesCasse = /^\d+\s+AU\s+\d+\s+\w+\s+\d{4}\.xlsx$/i.test(entry.name);

        fichiers.push({
          nom: entry.name,
          type: isExcel ? 'excel' : isJson ? 'json' : 'autre',
          statut: isVenteHebdo || isVenteMensuelle || isInfoPDV || isVentesCasse ? 'ok' : 'ignore',
          description: isVenteHebdo
            ? 'Fichier ventes hebdomadaires'
            : isVenteMensuelle
            ? 'Fichier ventes mensuelles'
            : isInfoPDV
            ? 'Fichier référence magasins'
            : isVentesCasse
            ? 'Fichier ventes/casse produits'
            : 'Fichier non reconnu',
          isVentesCasse,
        });
      }
    }

    setFichiersDetectes(fichiers);

    // Charger les semaines disponibles
    const semaines = await listerSemainesDisponibles(handle);
    setSemainesDisponibles(semaines);

    // Sélectionner la semaine la plus récente par défaut
    if (semaines.length > 0) {
      setSemaineSelectionnee(semaines[0]);
    }

    // Charger les mois disponibles
    const mois = await listerMoisDisponibles(handle);
    setMoisDisponibles(mois);

    // Sélectionner le mois le plus récent par défaut
    if (mois.length > 0) {
      setMoisSelectionnee(mois[0]);
    }

    // Charger info_PDV.json si disponible, sinon extraire depuis Vente_Hebdo
    let info = await chargerInfoPDV(handle);
    if (!info && semaines.length > 0) {
      try {
        const fh = await handle.getFileHandle(semaines[0].fichier);
        const fichierExcel = await fh.getFile();
        info = await extraireListeMagasins(fichierExcel);
      } catch { /* non bloquant */ }
    }
    if (info) {
      setInfoPDV(info);
    }

    // Détecter et lister les fichiers ventes/casse
    const fichiersVC = await listerFichiersVentesCasse(handle);
    setFichiersVentesCasse(fichiersVC);
    // Sélectionner le premier fichier ventes/casse par défaut
    if (fichiersVC.length > 0) {
      setFichierVentesSelectionne(fichiersVC[0]);
    }
  };

  // Sélection du dossier DATA_perso (clic utilisateur)
  const handleSelectDossier = async () => {
    try {
      setChargement(true);
      setErreur(null);

      // Demander l'accès au dossier
      const handle = await selectDirectory({
        id: 'bvp-data',
        mode: 'read',
        startIn: 'documents',
      });

      setDirHandle(handle);
      await scannerDossier(handle);
    } catch (error) {
      if (error.name === 'AbortError') {
        // L'utilisateur a annulé
        return;
      }
      setErreur('Impossible de lire le dossier. Vérifiez les permissions.');
    } finally {
      setChargement(false);
    }
  };

  // Auto-scan quand dirHandle est pré-chargé depuis IndexedDB (via PageParametres)
  useEffect(() => {
    if (dirHandle && semainesDisponibles.length === 0 && fichiersDetectes.length === 0 && !chargement) {
      setChargement(true);
      setErreur(null);
      scannerDossier(dirHandle)
        .catch(() => setErreur('Impossible de lire le dossier. Vérifiez les permissions.'))
        .finally(() => setChargement(false));
    }
  }, [dirHandle]);

  // Recherche de magasin (par code OU par nom de ville)
  useEffect(() => {
    if (!infoPDV || rechercheMagasin.length < 2) {
      setMagasinsTrouves([]);
      setAfficherResultats(false);
      return;
    }

    const recherche = rechercheMagasin.toLowerCase();
    const resultats = Object.entries(infoPDV)
      .filter(([code, info]) => {
        // Supporter plusieurs noms de champ pour la ville (JSON brut vs fallback Excel)
        const ville = (info.ville || info.VILLE || info.Ville || info.nom || info.NOM_ADHERENT || '').toLowerCase();
        const codeStr = String(code);
        return ville.includes(recherche) || codeStr.includes(recherche);
      })
      .slice(0, 10)
      .map(([code, info]) => ({
        code,
        ville: info.ville || info.VILLE || info.Ville || info.nom || info.NOM_ADHERENT || 'Inconnu',
        enseigne: info.enseigne || info.ENSEIGNE || info.Enseigne || 'INTERMARCHE',
        secteur: info.secteurLibelle || info.SECTEUR || info.Secteur || '',
      }));

    setMagasinsTrouves(resultats);
    setAfficherResultats(resultats.length > 0);
  }, [rechercheMagasin, infoPDV]);

  // Sélection d'un magasin
  const handleSelectMagasin = async (magasin) => {
    setMagasinSelectionne(magasin);
    setRechercheMagasin(`${magasin.ville} (${magasin.code})`);
    setAfficherResultats(false);

    // Charger les données du magasin
    const periodeActive = typePeriode === 'mois' ? moisSelectionnee : semaineSelectionnee;
    if (periodeActive && dirHandle) {
      try {
        setChargement(true);
        setErreur(null);
        setEtapeChargement('Ouverture du fichier…');

        // Récupérer le fichier selon le type de période
        const fileHandle = await dirHandle.getFileHandle(periodeActive.fichier);
        const file = await fileHandle.getFile();

        // Forcer React à peindre l'overlay avant le traitement CPU-intensif
        const attendrePeinture = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 150)));

        await attendrePeinture();
        setEtapeChargement('Extraction des données du magasin…');
        await attendrePeinture();

        // Extraire les données selon le type de période
        let donnees;
        if (typePeriode === 'mois') {
          donnees = await extraireDonneesMagasinMensuel(file, magasin.code, dirHandle);
        } else {
          donnees = await extraireDonneesMagasin(file, magasin.code, dirHandle);
        }
        setDonneesMagasin(donnees);

        // Charger les données gamme/ventes si un fichier ventes/casse est disponible
        if (fichierVentesSelectionne) {
          try {
            setEtapeChargement('Analyse de la gamme produits…');
            await attendrePeinture();

            const vcFileHandle = await dirHandle.getFileHandle(fichierVentesSelectionne.nom);
            const vcFile = await vcFileHandle.getFile();
            const donneesVC = await extraireProduitsVentesCasse(vcFile);
            setDonneesGamme(donneesVC);

            setEtapeChargement('Nettoyage intelligent de la gamme…');
            await attendrePeinture();

            const moisP = semainePlanning ? new Date(semainePlanning.annee, 0, 1 + (semainePlanning.semaine - 1) * 7).getMonth() + 1 : null;
            const produitsFormates = formaterPourPilotageCA(donneesVC, {
              semaineNumero: semainePlanning?.semaine,
              moisPlanning: moisP,
              refMagasin: refMagasin || null,
            });
            // Extraire et stocker le rapport d'identification
            if (produitsFormates._rapportIdentification) {
              setRapportIdentification(produitsFormates._rapportIdentification);
            }
            setProduitsGamme(produitsFormates);
          } catch (vcError) {
            // Ce n'est pas bloquant, on continue sans données gamme
          }
        }

        setEtapeChargement('Terminé !');
      } catch (error) {
        // TODO: logger professionnel
        setErreur('Impossible de charger les données du magasin.');
      } finally {
        setChargement(false);
        setEtapeChargement('');
      }
    }
  };

  // Changement de semaine
  const handleChangeSemaine = async (event) => {
    const code = event.target.value;
    const semaine = semainesDisponibles.find((s) => s.code === code);
    setSemaineSelectionnee(semaine);
    await rechargerDonnees(semaine, 'semaine');
  };

  // Changement de mois
  const handleChangeMois = async (event) => {
    const code = event.target.value;
    const mois = moisDisponibles.find((m) => m.code === code);
    setMoisSelectionnee(mois);
    await rechargerDonnees(mois, 'mois');
  };

  // Recharger les données quand la période change
  const rechargerDonnees = async (periode, type) => {
    if (magasinSelectionne && dirHandle && periode) {
      try {
        setChargement(true);
        setErreur(null);
        setEtapeChargement(type === 'mois' ? 'Changement de mois…' : 'Changement de semaine…');
        const attendrePeinture = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 150)));
        await attendrePeinture();

        const fileHandle = await dirHandle.getFileHandle(periode.fichier);
        const file = await fileHandle.getFile();

        setEtapeChargement('Extraction des données du magasin…');
        await attendrePeinture();

        let donnees;
        if (type === 'mois') {
          donnees = await extraireDonneesMagasinMensuel(file, magasinSelectionne.code, dirHandle);
        } else {
          donnees = await extraireDonneesMagasin(file, magasinSelectionne.code, dirHandle);
        }
        setDonneesMagasin(donnees);
        setEtapeChargement('Terminé !');
      } catch (error) {
        setErreur(`Impossible de charger les données pour ${type === 'mois' ? 'ce mois' : 'cette semaine'}.`);
      } finally {
        setChargement(false);
        setEtapeChargement('');
      }
    }
  };

  // Dernier fichier détecté (le plus récent, hebdo ou mensuel)
  const dernierFichier = useMemo(() => {
    const ventes = fichiersDetectes.filter(f => f.statut === 'ok' && (f.nom.startsWith('Vente_Hebdo_BVP_S') || f.nom.startsWith('Vente_Mensuelle_BVP_M')));
    if (ventes.length === 0) return null;
    ventes.sort((a, b) => b.nom.localeCompare(a.nom));
    return ventes[0];
  }, [fichiersDetectes]);

  // Nombre total de fichiers reconnus
  const nbFichiersOk = useMemo(() => {
    return fichiersDetectes.filter(f => f.statut === 'ok').length;
  }, [fichiersDetectes]);

  return (
    <div className="space-y-5">
      {/* Titre */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Import des données</h2>
        <p className="text-mousquetaires-gris text-sm">
          Connectez votre dossier DATA_perso pour démarrer.
        </p>
      </div>

      <>
          {/* Section 1 : Sélection du dossier */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center gap-3 mb-3">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-800">1. Dossier de données</h3>
            </div>

            {!dirHandle ? (
              <div className="space-y-4">
                <div className="border-2 border-blue-200/50 bg-blue-50/50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    Sélectionnez le dossier <strong>« Total Fréquentation »</strong> sur votre ordinateur.
                    Il se trouve dans votre espace OneDrive synchronisé :
                  </p>
                  <div className="bg-white rounded-lg p-2.5 mb-3 font-mono text-xs text-gray-600 border border-gray-200">
                    OneDrive - Mousquetaires › Documents › Fréquentation › <strong className="text-gray-900">Total Frequentation</strong>
                  </div>
                  <button
                    onClick={handleSelectDossier}
                    disabled={chargement}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {chargement ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</>
                    ) : (
                      <><FolderOpen className="w-5 h-5" /> Sélectionner le dossier</>
                    )}
                  </button>
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5">
                    <Cloud className="w-4 h-4" />
                    Le dossier n'est pas sur mon ordinateur ?
                  </summary>
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-2">
                    <p>
                      Le dossier « Total Fréquentation » est partagé sur OneDrive.
                      Pour y accéder, il doit être <strong>synchronisé localement</strong>.
                    </p>
                    <p>
                      1. Ouvrez le lien ci-dessous<br/>
                      2. Cliquez sur <strong>« Synchroniser »</strong> ou <strong>« Ajouter un raccourci vers Mes fichiers »</strong><br/>
                      3. Revenez ici et sélectionnez le dossier
                    </p>
                    <a
                      href={ONEDRIVE_FREQUENTATION_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ouvrir dans OneDrive
                    </a>
                    <p className="text-blue-600 mt-1 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      Vous pouvez aussi sélectionner un dossier local contenant les fichiers Vente_Hebdo.
                    </p>
                  </div>
                </details>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-800">Dossier connecté</span>
                      <span className="text-sm text-green-600 truncate">— {dirHandle.name}</span>
                    </div>
                    {/* Résumé compact : dernier fichier uniquement */}
                    {dernierFichier && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-green-700">
                        <FileSpreadsheet className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{dernierFichier.nom}</span>
                        {nbFichiersOk > 1 && (
                          <span className="text-xs text-green-500 flex-shrink-0">
                            (+{nbFichiersOk - 1} fichier{nbFichiersOk > 2 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSelectDossier}
                    className="text-green-600 hover:text-green-800 text-xs underline flex-shrink-0"
                  >
                    Changer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section référentiel magasin (optionnel) */}
          {dirHandle && (
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center gap-3 mb-3">
                <Database className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-800">Référentiel magasin <span className="text-sm font-normal text-gray-400">(optionnel)</span></h3>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                Importez le fichier « Liste PLU PDV » de votre magasin pour améliorer l'identification des produits (liaison EAN → code ITM).
              </p>

              {!refMagasin ? (
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors">
                    <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700">
                      {refMagasinChargement ? 'Chargement…' : 'Sélectionner le fichier PLU magasin'}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      disabled={refMagasinChargement}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setRefMagasinChargement(true);
                          setRefMagasinErreur(null);
                          const result = await chargerReferentielMagasin(file);
                          if (result) {
                            setRefMagasin(result);
                            const rapport = genererRapportMatching(result);
                            setRefMagasinRapport(rapport);
                          } else {
                            setRefMagasinErreur('Format non reconnu. Attendu : fichier « Liste PLU PDV » (Mercalys).');
                          }
                        } catch (err) {
                          setRefMagasinErreur('Erreur lors du chargement du fichier.');
                        } finally {
                          setRefMagasinChargement(false);
                          e.target.value = ''; // Reset l'input file
                        }
                      }}
                    />
                  </label>
                  {refMagasinErreur && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {refMagasinErreur}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-amber-800 text-sm">
                          {refMagasin.magasin.nom || 'Magasin'}
                          {refMagasin.magasin.code && (
                            <span className="text-amber-600 ml-1">({refMagasin.magasin.code})</span>
                          )}
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          {refMagasin.stats.eanUniques} EAN • {refMagasin.stats.itmUniques} produits ITM
                          {refMagasin.dateExtraction && ` • ${refMagasin.dateExtraction}`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setRefMagasin(null);
                          setRefMagasinRapport(null);
                        }}
                        className="text-amber-500 hover:text-amber-700 text-xs underline flex-shrink-0"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                  {refMagasinRapport && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
                      <p className="font-semibold text-gray-700 mb-1">Couverture référentiel :</p>
                      <div className="grid grid-cols-2 gap-1 text-gray-600">
                        <span>Trouvés dans ref V2 :</span>
                        <span className="font-medium text-green-700">{refMagasinRapport.matchesRefV2} / {refMagasinRapport.totalITMUniques} ({refMagasinRapport.tauxMatchRefV2}%)</span>
                        <span>Classifiables par libellé :</span>
                        <span className="font-medium text-amber-700">{refMagasinRapport.matchesClassification}</span>
                        {refMagasinRapport.nonTrouves > 0 && (
                          <>
                            <span>Sans information :</span>
                            <span className="font-medium text-red-600">{refMagasinRapport.nonTrouves}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 2 + 3 : Période & Magasin (compact, côte à côte sur large écran) */}
          {dirHandle && (semainesDisponibles.length > 0 || moisDisponibles.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Période */}
              <div className="bg-white rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3 mb-3">
                  <CalendarDays className="w-5 h-5 text-mousquetaires-bordeaux" />
                  <h3 className="font-bold text-gray-800">2. Période</h3>
                </div>

                {/* Toggle Mensuel / Hebdomadaire */}
                {moisDisponibles.length > 0 && semainesDisponibles.length > 0 && (
                  <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
                    <button
                      onClick={() => setTypePeriode('mois')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        typePeriode === 'mois'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      Mensuel ({moisDisponibles.length})
                    </button>
                    <button
                      onClick={() => setTypePeriode('semaine')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        typePeriode === 'semaine'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Hebdo ({semainesDisponibles.length})
                    </button>
                  </div>
                )}

                {/* Sélecteur de période */}
                {typePeriode === 'mois' && moisDisponibles.length > 0 ? (
                  <select
                    value={moisSelectionnee?.code || ''}
                    onChange={handleChangeMois}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-mousquetaires-rouge focus:border-transparent text-sm"
                  >
                    {moisDisponibles.map((mois) => (
                      <option key={mois.code} value={mois.code}>
                        {mois.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={semaineSelectionnee?.code || ''}
                    onChange={handleChangeSemaine}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-mousquetaires-rouge focus:border-transparent text-sm"
                  >
                    {semainesDisponibles.map((semaine) => (
                      <option key={semaine.code} value={semaine.code}>
                        Semaine {semaine.semaine} / {semaine.annee}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Magasin */}
              {infoPDV && (
                <div className="bg-white rounded-xl shadow-md p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Store className="w-5 h-5 text-mousquetaires-bordeaux" />
                    <h3 className="font-bold text-gray-800">3. Magasin</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">Recherchez par code ou nom de ville</p>

                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={rechercheMagasin}
                        onChange={(e) => setRechercheMagasin(e.target.value)}
                        onFocus={() => setAfficherResultats(magasinsTrouves.length > 0)}
                        placeholder="Ex: 07499 ou Bordeaux..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-mousquetaires-rouge focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Résultats de recherche */}
                    {afficherResultats && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {magasinsTrouves.map((magasin) => (
                          <button
                            key={magasin.code}
                            onClick={() => handleSelectMagasin(magasin)}
                            className="w-full px-3 py-2.5 text-left hover:bg-mousquetaires-beige transition-colors flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                          >
                            <Store className="w-4 h-4 text-mousquetaires-gris flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-sm">
                                {magasin.ville}
                                <span className="text-mousquetaires-gris ml-1">({magasin.code})</span>
                              </p>
                              <p className="text-xs text-mousquetaires-gris truncate">
                                {magasin.enseigne} • {magasin.secteur}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Overlay plein écran de chargement */}
          {chargement && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-mousquetaires-rouge animate-spin" />
                    <Database className="w-5 h-5 text-mousquetaires-rouge absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Chargement en cours</h3>
                <p className="text-sm text-gray-500 mb-3">
                  {etapeChargement || 'Préparation…'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-mousquetaires-rouge h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Merci de patienter, ne fermez pas la page
                </p>
              </div>
            </div>
          )}

          {/* Magasin sélectionné (résumé compact) */}
          {!chargement && magasinSelectionne && donneesMagasin && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-green-800 text-sm">
                    {donneesMagasin.magasin.nom}
                    <span className="text-green-600 ml-1">({donneesMagasin.magasin.code})</span>
                    <span className="text-green-500 ml-2 text-xs">
                      {donneesMagasin.comparaison.nombreMagasinsComparables} comparables
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {erreur && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{erreur}</p>
            </div>
          )}

        </>
    </div>
  );
};

export default Etape0Import;
