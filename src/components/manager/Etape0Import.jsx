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
} from '../../services/dataExtractionService';

// Lien vers le dossier partagé OneDrive
const ONEDRIVE_FREQUENTATION_URL =
  'https://mousquetaires-my.sharepoint.com/:f:/r/personal/rudy_remy_mousquetaires_com/Documents/Documents/Fr%C3%A9quentation/Total%20Frequentation?csf=1&web=1&e=yyfPbT';
import {
  listerFichiersVentesCasse,
  extraireProduitsVentesCasse,
  formaterPourPilotageCA,
} from '../../services/gammeExtractionService';
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
  } = useMagasin();

  const { selectDirectory } = useFileAccess();

  // État local pour la recherche magasin
  const [rechercheMagasin, setRechercheMagasin] = useState('');
  const [magasinsTrouves, setMagasinsTrouves] = useState([]);
  const [afficherResultats, setAfficherResultats] = useState(false);

  // Scanner le contenu d'un dossier (fichiers, semaines, infoPDV, ventes/casse)
  const scannerDossier = async (handle) => {
    // Lister les fichiers disponibles
    const fichiers = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const isExcel = entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls');
        const isJson = entry.name.endsWith('.json');
        const isVenteHebdo = entry.name.startsWith('Vente_Hebdo_BVP_S');
        const isInfoPDV = entry.name === 'info_PDV.json';
        // Détecter les fichiers ventes/casse (format "1 AU 25 JANVIER 2026.xlsx")
        const isVentesCasse = /^\d+\s+AU\s+\d+\s+\w+\s+\d{4}\.xlsx$/i.test(entry.name);

        fichiers.push({
          nom: entry.name,
          type: isExcel ? 'excel' : isJson ? 'json' : 'autre',
          statut: isVenteHebdo || isInfoPDV || isVentesCasse ? 'ok' : 'ignore',
          description: isVenteHebdo
            ? 'Fichier ventes hebdomadaires'
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
    if (semaineSelectionnee && dirHandle) {
      try {
        setChargement(true);
        setErreur(null);

        // Récupérer le fichier de la semaine
        const fileHandle = await dirHandle.getFileHandle(semaineSelectionnee.fichier);
        const file = await fileHandle.getFile();

        // Extraire les données
        const donnees = await extraireDonneesMagasin(file, magasin.code, dirHandle);
        setDonneesMagasin(donnees);

        // Charger les données gamme/ventes si un fichier ventes/casse est disponible
        if (fichierVentesSelectionne) {
          try {
            const vcFileHandle = await dirHandle.getFileHandle(fichierVentesSelectionne.nom);
            const vcFile = await vcFileHandle.getFile();
            const donneesVC = await extraireProduitsVentesCasse(vcFile);
            setDonneesGamme(donneesVC);
            const produitsFormates = formaterPourPilotageCA(donneesVC);
            setProduitsGamme(produitsFormates);
          } catch (vcError) {
            // Ce n'est pas bloquant, on continue sans données gamme
          }
        }
      } catch (error) {
        // TODO: logger professionnel
        setErreur('Impossible de charger les données du magasin.');
      } finally {
        setChargement(false);
      }
    }
  };

  // Changement de semaine
  const handleChangeSemaine = async (event) => {
    const code = event.target.value;
    const semaine = semainesDisponibles.find((s) => s.code === code);
    setSemaineSelectionnee(semaine);

    // Recharger les données si un magasin est déjà sélectionné
    if (magasinSelectionne && dirHandle && semaine) {
      try {
        setChargement(true);
        setErreur(null);

        const fileHandle = await dirHandle.getFileHandle(semaine.fichier);
        const file = await fileHandle.getFile();
        const donnees = await extraireDonneesMagasin(file, magasinSelectionne.code, dirHandle);
        setDonneesMagasin(donnees);
      } catch (error) {
        // TODO: logger professionnel
        setErreur('Impossible de charger les données pour cette semaine.');
      } finally {
        setChargement(false);
      }
    }
  };

  // Dernier fichier Vente_Hebdo détecté (le plus récent)
  const dernierFichier = useMemo(() => {
    const ventesHebdo = fichiersDetectes.filter(f => f.statut === 'ok' && f.nom.startsWith('Vente_Hebdo_BVP_S'));
    if (ventesHebdo.length === 0) return null;
    // Trier par nom décroissant (S2026-06 > S2026-05)
    ventesHebdo.sort((a, b) => b.nom.localeCompare(a.nom));
    return ventesHebdo[0];
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

          {/* Section 2 + 3 : Semaine & Magasin (compact, côte à côte sur large écran) */}
          {dirHandle && semainesDisponibles.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Semaine */}
              <div className="bg-white rounded-xl shadow-md p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-5 h-5 text-mousquetaires-bordeaux" />
                  <h3 className="font-bold text-gray-800">2. Semaine</h3>
                  <span className="text-xs text-gray-400">
                    {semainesDisponibles.length} dispo.
                  </span>
                </div>
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

          {/* Chargement en cours */}
          {chargement && magasinSelectionne && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
              <p className="font-medium text-amber-800 text-sm">Chargement des données…</p>
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
