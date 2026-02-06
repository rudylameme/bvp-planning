/**
 * Écran d'accueil du module Benchmark
 *
 * Permet à l'utilisateur de :
 * - Sélectionner un dossier de données (DATA_perso)
 * - Choisir son magasin
 * - Choisir la semaine à analyser
 * - Charger les données automatiquement
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Store, Calendar, FolderOpen, Loader2, AlertCircle, CheckCircle2, ArrowRight, Home } from 'lucide-react';

const AccueilBenchmark = ({ onDonneesChargees, onNaviguerPlanning, onRetourAccueil }) => {
  // États
  const [dossierHandle, setDossierHandle] = useState(null);
  const [semainesDisponibles, setSemainesDisponibles] = useState([]);
  const [magasinsDisponibles, setMagasinsDisponibles] = useState([]);

  const [codeMagasin, setCodeMagasin] = useState('');
  const [semaineSelectionnee, setSemaineSelectionnee] = useState('');
  const [rechercheMagasin, setRechercheMagasin] = useState('');

  const [chargement, setChargement] = useState(false);
  const [chargementDossier, setChargementDossier] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [etapeChargement, setEtapeChargement] = useState('');

  // Sélectionner le dossier DATA_perso
  const selectionnerDossier = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'documents',
      });

      setDossierHandle(dirHandle);
      setErreur(null);
      setChargementDossier(true);

      // Lister les fichiers disponibles
      await listerFichiersDisponibles(dirHandle);

    } catch (error) {
      if (error.name !== 'AbortError') {
        setErreur('Erreur lors de la sélection du dossier');
        console.error(error);
      }
    } finally {
      setChargementDossier(false);
    }
  };

  // Lister les semaines disponibles dans le dossier
  const listerFichiersDisponibles = async (dirHandle) => {
    const semaines = [];

    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.startsWith('Vente_Hebdo_BVP_S')) {
          const match = entry.name.match(/Vente_Hebdo_BVP_S(\d{4})-(\d{2})\.xlsx/);
          if (match) {
            semaines.push({
              annee: match[1],
              semaine: match[2],
              code: `${match[1]}-S${match[2]}`,
              fichier: entry.name,
              label: `Semaine ${match[2]} / ${match[1]}`,
            });
          }
        }
      }

      // Trier par date décroissante
      semaines.sort((a, b) => {
        if (a.annee !== b.annee) return parseInt(b.annee) - parseInt(a.annee);
        return parseInt(b.semaine) - parseInt(a.semaine);
      });

      setSemainesDisponibles(semaines);

      // Sélectionner la dernière semaine par défaut
      if (semaines.length > 0) {
        setSemaineSelectionnee(semaines[0].code);
      }

    } catch (error) {
      console.error('Erreur lors de la lecture du dossier:', error);
      setErreur('Impossible de lire le contenu du dossier');
    }
  };

  // Charger la liste des magasins depuis un fichier
  const chargerListeMagasins = async (fichier) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await fichier.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      console.log('📂 Feuilles disponibles:', workbook.SheetNames);

      // Chercher la feuille "Vente jour heure" ou "Total Pdv" (contient CODE_PDV)
      const sheetName = workbook.SheetNames.find(name =>
        name === 'Vente jour heure' || name === 'Total Pdv' || name === 'IM'
      );

      if (!sheetName) {
        console.warn('⚠️ Aucune feuille avec liste de magasins trouvée');
        return [];
      }

      console.log(`📋 Lecture de la feuille: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Colonnes possibles pour le code PDV
      const colonnesPDV = ['CODE_PDV', 'Pdv', 'Code PDV', 'Numero', 'code_pdv'];
      const colonnesVille = ['VILLE', 'Ville', 'ville', 'Nom Adhérent'];
      const colonnesSecteur = ['Secteur', 'SECTEUR', 'secteur'];
      const colonnesModele = ['Modèle', 'MODELE', 'modele'];

      // Trouver la ligne d'en-tête (chercher CODE_PDV ou Pdv)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, data.length); i++) {
        if (data[i]?.some(cell => colonnesPDV.includes(cell))) {
          headerRowIndex = i;
          console.log(`📋 En-tête trouvé à la ligne ${i + 1}`);
          break;
        }
      }

      const headers = data[headerRowIndex];
      if (!headers) {
        console.warn('⚠️ Pas d\'en-têtes trouvés');
        return [];
      }

      console.log('📋 Colonnes détectées:', headers.filter(h => h).slice(0, 15));

      // Trouver les index des colonnes
      const findIndex = (colonnesPossibles) => {
        for (const col of colonnesPossibles) {
          const idx = headers.findIndex(h => h === col);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const pdvIndex = findIndex(colonnesPDV);
      const villeIndex = findIndex(colonnesVille);
      const secteurIndex = findIndex(colonnesSecteur);
      const modeleIndex = findIndex(colonnesModele);

      console.log(`📋 Index - PDV: ${pdvIndex}, Ville: ${villeIndex}, Secteur: ${secteurIndex}, Modèle: ${modeleIndex}`);

      if (pdvIndex === -1) {
        console.warn('⚠️ Colonne CODE_PDV non trouvée');
        return [];
      }

      const magasins = [];
      const seen = new Set();

      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;

        const code = row[pdvIndex];
        if (!code || seen.has(String(code))) continue;

        seen.add(String(code));
        magasins.push({
          code: String(code),
          nom: villeIndex !== -1 ? (row[villeIndex] || 'Inconnu') : 'Inconnu',
          secteur: secteurIndex !== -1 ? (row[secteurIndex] || 'NC') : 'NC',
          modele: modeleIndex !== -1 ? (row[modeleIndex] || 'NC') : 'NC',
        });
      }

      console.log(`✅ ${magasins.length} magasins uniques trouvés`);
      return magasins.sort((a, b) => a.nom.localeCompare(b.nom));

    } catch (error) {
      console.error('Erreur lors du chargement des magasins:', error);
      return [];
    }
  };

  // Charger les données quand une semaine est sélectionnée
  useEffect(() => {
    if (dossierHandle && semaineSelectionnee && magasinsDisponibles.length === 0) {
      (async () => {
        const semaine = semainesDisponibles.find(s => s.code === semaineSelectionnee);
        if (semaine) {
          try {
            const fileHandle = await dossierHandle.getFileHandle(semaine.fichier);
            const file = await fileHandle.getFile();
            const magasins = await chargerListeMagasins(file);
            setMagasinsDisponibles(magasins);
          } catch (error) {
            console.error('Erreur:', error);
          }
        }
      })();
    }
  }, [dossierHandle, semaineSelectionnee, semainesDisponibles]);

  // Filtrer les magasins selon la recherche
  const magasinsFiltres = magasinsDisponibles.filter(m =>
    m.code.includes(rechercheMagasin) ||
    m.nom.toLowerCase().includes(rechercheMagasin.toLowerCase())
  ).slice(0, 20);

  // Charger les données du magasin sélectionné
  const chargerDonnees = async () => {
    if (!codeMagasin || !semaineSelectionnee || !dossierHandle) return;

    setChargement(true);
    setErreur(null);

    try {
      // 1. Trouver le fichier
      setEtapeChargement('Ouverture du fichier...');
      const semaine = semainesDisponibles.find(s => s.code === semaineSelectionnee);
      const fileHandle = await dossierHandle.getFileHandle(semaine.fichier);
      const file = await fileHandle.getFile();

      // 2. Extraire les données (passer dossierHandle pour charger info_PDV.json)
      setEtapeChargement('Extraction des données...');
      const { extraireDonneesMagasin } = await import('../../services/dataExtractionService.js');
      const donnees = await extraireDonneesMagasin(file, codeMagasin, dossierHandle);

      // 3. Vérifier que le magasin existe
      if (!donnees.magasin.nom || donnees.magasin.nom === 'Inconnu') {
        throw new Error(`Magasin ${codeMagasin} non trouvé dans les données`);
      }

      setEtapeChargement('Terminé !');

      // 4. Transmettre les données au parent
      if (onDonneesChargees) {
        onDonneesChargees({
          ...donnees,
          semaine: semaineSelectionnee,
          dossierHandle,
        });
      }

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setErreur(error.message || 'Erreur lors du chargement des données');
    } finally {
      setChargement(false);
      setEtapeChargement('');
    }
  };

  // Vérifier si on peut charger
  const peutCharger = codeMagasin && semaineSelectionnee && dossierHandle && !chargement;

  return (
    <div className="min-h-screen bg-[#F5F2ED] p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          {/* Bouton Accueil */}
          {onRetourAccueil && (
            <button
              onClick={onRetourAccueil}
              className="flex items-center gap-2 px-3 py-2 mb-4 bg-white hover:bg-[#E8E1D5] rounded-lg text-[#58595B] transition-colors shadow-sm"
              title="Retour à l'accueil"
            >
              <Home className="w-5 h-5" />
              <span>Accueil</span>
            </button>
          )}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[#8B1538] mb-2">
              Benchmark Hebdo BVP
            </h1>
            <p className="text-[#58595B]">
              Comparez la performance de votre magasin avec votre secteur
            </p>
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">

          {/* Étape 1 : Sélection du dossier */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E8E1D5] text-[#8B1538] text-xs font-bold">1</span>
              Dossier de données
            </label>

            {chargementDossier ? (
              <div className="flex items-center justify-center gap-3 px-4 py-4 bg-[#E8E1D5] border-2 border-[#D1D3D4] rounded-xl">
                <Loader2 className="w-6 h-6 text-[#8B1538] animate-spin" />
                <span className="text-[#8B1538] font-medium">Analyse du dossier en cours...</span>
              </div>
            ) : !dossierHandle ? (
              <button
                onClick={selectionnerDossier}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-[#F5F2ED] hover:bg-[#E8E1D5] border-2 border-dashed border-[#D1D3D4] rounded-xl transition-colors"
              >
                <FolderOpen className="w-6 h-6 text-[#8B1538]" />
                <span className="text-[#8B1538] font-medium">Sélectionner le dossier DATA_perso</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-medium flex-1">Dossier connecté</span>
                <span className="text-green-600 text-sm">{semainesDisponibles.length} semaines</span>
                <button
                  onClick={selectionnerDossier}
                  className="text-green-600 hover:text-green-800 text-sm underline"
                >
                  Changer
                </button>
              </div>
            )}
          </div>

          {/* Étape 2 : Sélection de la semaine */}
          {dossierHandle && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E8E1D5] text-[#8B1538] text-xs font-bold">2</span>
                Semaine à analyser
              </label>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#58595B]" />
                <select
                  value={semaineSelectionnee}
                  onChange={(e) => setSemaineSelectionnee(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                >
                  <option value="">Sélectionner une semaine</option>
                  {semainesDisponibles.map(sem => (
                    <option key={sem.code} value={sem.code}>
                      {sem.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Étape 3 : Sélection du magasin */}
          {dossierHandle && semaineSelectionnee && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E8E1D5] text-[#8B1538] text-xs font-bold">3</span>
                Votre magasin
              </label>

              <div className="relative">
                <Store className="absolute left-3 top-3 w-5 h-5 text-[#58595B]" />
                <input
                  type="text"
                  value={rechercheMagasin}
                  onChange={(e) => {
                    setRechercheMagasin(e.target.value);
                    setCodeMagasin('');
                  }}
                  placeholder="Rechercher par code ou ville..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                />
              </div>

              {/* Liste des magasins filtrés */}
              {rechercheMagasin && !codeMagasin && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y">
                  {magasinsFiltres.length === 0 ? (
                    <div className="p-4 text-center text-[#58595B]">
                      Aucun magasin trouvé
                    </div>
                  ) : (
                    magasinsFiltres.map(mag => (
                      <button
                        key={mag.code}
                        onClick={() => {
                          setCodeMagasin(mag.code);
                          setRechercheMagasin(`${mag.code} - ${mag.nom}`);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-[#F5F2ED] transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium text-gray-800">{mag.code}</span>
                          <span className="text-gray-600 ml-2">{mag.nom}</span>
                        </div>
                        <span className="text-xs text-gray-400">{mag.modele}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Magasin sélectionné */}
              {codeMagasin && (
                <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-700 font-medium">{rechercheMagasin}</span>
                  <button
                    onClick={() => {
                      setCodeMagasin('');
                      setRechercheMagasin('');
                    }}
                    className="ml-auto text-green-600 hover:text-green-800 text-sm underline"
                  >
                    Changer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Erreur */}
          {erreur && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{erreur}</span>
            </div>
          )}

          {/* Bouton Charger */}
          <button
            onClick={chargerDonnees}
            disabled={!peutCharger}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg transition-all ${
              peutCharger
                ? 'bg-[#ED1C24] hover:bg-[#8B1538] text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {chargement ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>{etapeChargement}</span>
              </>
            ) : (
              <>
                <span>Charger mes données</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

        </div>

        {/* Info */}
        <p className="text-center text-[#58595B] text-sm mt-6">
          💡 Les données restent sur votre ordinateur, rien n'est envoyé sur internet.
        </p>

      </div>
    </div>
  );
};

export default AccueilBenchmark;
