/**
 * Étape 0 : Import des données
 *
 * Permet au manager de :
 * - Sélectionner le dossier DATA_perso
 * - Choisir la semaine à analyser
 * - Rechercher et sélectionner son magasin
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import {
  listerSemainesDisponibles,
  extraireDonneesMagasin,
  chargerInfoPDV,
} from '../../services/dataExtractionService';
import {
  listerFichiersVentesCasse,
  extraireProduitsVentesCasse,
  formaterPourPilotageCA,
} from '../../services/gammeExtractionService';

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

  // État local pour la recherche magasin
  const [rechercheMagasin, setRechercheMagasin] = useState('');
  const [magasinsTrouves, setMagasinsTrouves] = useState([]);
  const [afficherResultats, setAfficherResultats] = useState(false);

  // Sélection du dossier DATA_perso
  const handleSelectDossier = async () => {
    try {
      setChargement(true);
      setErreur(null);

      // Demander l'accès au dossier
      const handle = await window.showDirectoryPicker({
        id: 'bvp-data',
        mode: 'read',
        startIn: 'documents',
      });

      setDirHandle(handle);

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

      // Charger info_PDV.json si disponible
      const info = await chargerInfoPDV(handle);
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
    } catch (error) {
      if (error.name === 'AbortError') {
        // L'utilisateur a annulé
        return;
      }
      console.error('Erreur sélection dossier:', error);
      setErreur('Impossible de lire le dossier. Vérifiez les permissions.');
    } finally {
      setChargement(false);
    }
  };

  // Recherche de magasin
  useEffect(() => {
    if (!infoPDV || rechercheMagasin.length < 2) {
      setMagasinsTrouves([]);
      setAfficherResultats(false);
      return;
    }

    const recherche = rechercheMagasin.toLowerCase();
    const resultats = Object.entries(infoPDV)
      .filter(([code, info]) => {
        const ville = (info.ville || '').toLowerCase();
        const codeStr = String(code);
        return ville.includes(recherche) || codeStr.includes(recherche);
      })
      .slice(0, 10)
      .map(([code, info]) => ({
        code,
        ville: info.ville || 'Inconnu',
        enseigne: info.enseigne || 'INTERMARCHE',
        secteur: info.secteurLibelle || '',
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
            console.log(`✅ Gamme chargée: ${produitsFormates.length} produits`);
          } catch (vcError) {
            console.warn('Fichier ventes/casse non chargé:', vcError);
            // Ce n'est pas bloquant, on continue sans données gamme
          }
        }
      } catch (error) {
        console.error('Erreur extraction données:', error);
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
        console.error('Erreur extraction données:', error);
        setErreur('Impossible de charger les données pour cette semaine.');
      } finally {
        setChargement(false);
      }
    }
  };

  // Vérifier si File System Access API est supportée
  const isAPISupported = 'showDirectoryPicker' in window;

  return (
    <div className="space-y-8">
      {/* Titre */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Import des données</h2>
        <p className="text-mousquetaires-gris">
          Sélectionnez votre dossier DATA_perso pour charger vos fichiers de ventes.
        </p>
      </div>

      {/* Message si API non supportée */}
      {!isAPISupported && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-800 mb-2">Navigateur non compatible</h3>
          <p className="text-red-700">
            Votre navigateur ne supporte pas l'accès aux dossiers locaux.
            <br />
            Utilisez <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> pour
            continuer.
          </p>
        </div>
      )}

      {isAPISupported && (
        <>
          {/* Section 1 : Sélection du dossier */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-mousquetaires-beige-dark rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-mousquetaires-bordeaux" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">1. Dossier DATA_perso</h3>
                <p className="text-sm text-mousquetaires-gris">
                  Contient vos fichiers Excel de ventes hebdomadaires
                </p>
              </div>
            </div>

            {!dirHandle ? (
              <button
                onClick={handleSelectDossier}
                disabled={chargement}
                className="w-full py-4 bg-mousquetaires-rouge text-white rounded-xl font-semibold hover:bg-mousquetaires-bordeaux transition-colors flex items-center justify-center gap-2"
              >
                {chargement ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-5 h-5" />
                    Sélectionner le dossier
                  </>
                )}
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Check className="w-6 h-6 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800">Dossier connecté</p>
                    <p className="text-sm text-green-600">{dirHandle.name}</p>
                  </div>
                  <button
                    onClick={handleSelectDossier}
                    className="text-green-600 hover:text-green-800 text-sm underline"
                  >
                    Changer
                  </button>
                </div>
              </div>
            )}

            {/* Liste des fichiers détectés */}
            {fichiersDetectes.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Fichiers détectés :</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {fichiersDetectes
                    .filter((f) => f.statut === 'ok')
                    .map((fichier) => (
                      <div
                        key={fichier.nom}
                        className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2"
                      >
                        {fichier.type === 'excel' ? (
                          <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        ) : (
                          <Database className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="flex-1 truncate">{fichier.nom}</span>
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2 : Sélection de la semaine */}
          {dirHandle && semainesDisponibles.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-mousquetaires-beige-dark rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-mousquetaires-bordeaux" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">2. Semaine à analyser</h3>
                  <p className="text-sm text-mousquetaires-gris">
                    {semainesDisponibles.length} semaine(s) disponible(s)
                  </p>
                </div>
              </div>

              <select
                value={semaineSelectionnee?.code || ''}
                onChange={handleChangeSemaine}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-mousquetaires-rouge focus:border-transparent"
              >
                {semainesDisponibles.map((semaine) => (
                  <option key={semaine.code} value={semaine.code}>
                    Semaine {semaine.semaine} / {semaine.annee}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section 3 : Recherche magasin */}
          {dirHandle && infoPDV && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-mousquetaires-beige-dark rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-mousquetaires-bordeaux" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">3. Votre magasin</h3>
                  <p className="text-sm text-mousquetaires-gris">
                    Recherchez par code ou nom de ville
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={rechercheMagasin}
                    onChange={(e) => setRechercheMagasin(e.target.value)}
                    onFocus={() => setAfficherResultats(magasinsTrouves.length > 0)}
                    placeholder="Ex: 07499 ou Bordeaux..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-mousquetaires-rouge focus:border-transparent"
                  />
                </div>

                {/* Résultats de recherche */}
                {afficherResultats && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {magasinsTrouves.map((magasin) => (
                      <button
                        key={magasin.code}
                        onClick={() => handleSelectMagasin(magasin)}
                        className="w-full px-4 py-3 text-left hover:bg-mousquetaires-beige transition-colors flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <Store className="w-5 h-5 text-mousquetaires-gris" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {magasin.ville}
                            <span className="text-mousquetaires-gris ml-2">({magasin.code})</span>
                          </p>
                          <p className="text-xs text-mousquetaires-gris">
                            {magasin.enseigne} • {magasin.secteur}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chargement en cours */}
              {chargement && magasinSelectionne && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                  <div>
                    <p className="font-medium text-amber-800">Chargement des données...</p>
                    <p className="text-sm text-amber-600">Analyse du fichier en cours</p>
                  </div>
                </div>
              )}

              {/* Magasin sélectionné */}
              {!chargement && magasinSelectionne && donneesMagasin && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Check className="w-6 h-6 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-800">
                        {donneesMagasin.magasin.nom}
                        <span className="text-green-600 ml-2">({donneesMagasin.magasin.code})</span>
                      </p>
                      <p className="text-sm text-green-600">
                        {donneesMagasin.magasin.enseigne} •{' '}
                        {donneesMagasin.comparaison.nombreMagasinsComparables} magasins comparables
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
      )}
    </div>
  );
};

export default Etape0Import;
