/**
 * Écran d'accueil du module Benchmark
 *
 * Permet à l'utilisateur de :
 * - Sélectionner un dossier de données (DATA_perso)
 * - Choisir entre vue Mensuelle (défaut) ou Hebdomadaire
 * - Choisir son magasin
 * - Choisir la période à analyser (mois ou semaine)
 * - Charger les données automatiquement
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Store, Calendar, FolderOpen, Loader2, AlertCircle, CheckCircle2, ArrowRight, Home, CalendarDays } from 'lucide-react';
import { useFileAccess } from '../../hooks/useFileAccess';

const AccueilBenchmark = ({ onDonneesChargees, onNaviguerPlanning, onRetourAccueil }) => {
  const { selectDirectory } = useFileAccess();

  // États
  const [dossierHandle, setDossierHandle] = useState(null);
  const [typePeriode, setTypePeriode] = useState('mois'); // 'mois' (défaut) ou 'semaine'
  const [semainesDisponibles, setSemainesDisponibles] = useState([]);
  const [moisDisponibles, setMoisDisponibles] = useState([]);
  const [magasinsDisponibles, setMagasinsDisponibles] = useState([]);

  const [codeMagasin, setCodeMagasin] = useState('');
  const [periodeSelectionnee, setPeriodeSelectionnee] = useState('');
  const [rechercheMagasin, setRechercheMagasin] = useState('');

  const [chargement, setChargement] = useState(false);
  const [chargementDossier, setChargementDossier] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [etapeChargement, setEtapeChargement] = useState('');

  // Périodes disponibles selon le type sélectionné
  const periodesDisponibles = typePeriode === 'mois' ? moisDisponibles : semainesDisponibles;

  // Sélectionner le dossier DATA_perso
  const selectionnerDossier = async () => {
    try {
      const dirHandle = await selectDirectory({
        mode: 'read',
        startIn: 'documents',
      });

      setDossierHandle(dirHandle);
      setErreur(null);
      setChargementDossier(true);

      // Lister les fichiers disponibles (hebdo ET mensuel)
      await listerFichiersDisponibles(dirHandle);

    } catch (error) {
      if (error.name !== 'AbortError') {
        setErreur('Erreur lors de la sélection du dossier');
      }
    } finally {
      setChargementDossier(false);
    }
  };

  // Noms des mois en français
  const NOMS_MOIS = [
    '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  // Lister les fichiers disponibles dans le dossier (hebdo + mensuel)
  const listerFichiersDisponibles = async (dirHandle) => {
    const semaines = [];
    const mois = [];

    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind !== 'file') continue;

        // Fichiers hebdomadaires
        if (entry.name.startsWith('Vente_Hebdo_BVP_S')) {
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

        // Fichiers mensuels
        if (entry.name.startsWith('Vente_Mensuelle_BVP_M')) {
          const match = entry.name.match(/Vente_Mensuelle_BVP_M(\d{2})-(\d{4})\.xlsx/);
          if (match) {
            const moisNum = match[1];
            const annee = match[2];
            mois.push({
              annee: annee,
              mois: moisNum,
              code: `${annee}-M${moisNum}`,
              fichier: entry.name,
              label: `${NOMS_MOIS[parseInt(moisNum, 10)]} ${annee}`,
            });
          }
        }
      }

      // Trier par date décroissante
      semaines.sort((a, b) => {
        if (a.annee !== b.annee) return parseInt(b.annee) - parseInt(a.annee);
        return parseInt(b.semaine) - parseInt(a.semaine);
      });

      mois.sort((a, b) => {
        if (a.annee !== b.annee) return parseInt(b.annee) - parseInt(a.annee);
        return parseInt(b.mois) - parseInt(a.mois);
      });

      setSemainesDisponibles(semaines);
      setMoisDisponibles(mois);

      // Sélectionner la période par défaut : dernier mois si dispo, sinon dernière semaine
      if (mois.length > 0) {
        setTypePeriode('mois');
        setPeriodeSelectionnee(mois[0].code);
      } else if (semaines.length > 0) {
        setTypePeriode('semaine');
        setPeriodeSelectionnee(semaines[0].code);
      }

    } catch (error) {
      setErreur('Impossible de lire le contenu du dossier');
    }
  };

  // Charger la liste des magasins depuis un fichier
  const chargerListeMagasins = async (fichier) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await fichier.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Chercher la feuille "Vente jour heure" ou "Total Pdv" (contient CODE_PDV)
      const sheetName = workbook.SheetNames.find(name =>
        name === 'Vente jour heure' || name === 'Total Pdv' || name === 'IM'
      );

      if (!sheetName) {
        return [];
      }
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
          break;
        }
      }

      const headers = data[headerRowIndex];
      if (!headers) {
        return [];
      }

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

      if (pdvIndex === -1) {
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

      return magasins.sort((a, b) => a.nom.localeCompare(b.nom));

    } catch (error) {
      return [];
    }
  };

  // Charger les magasins quand une période est sélectionnée
  useEffect(() => {
    if (dossierHandle && periodeSelectionnee && magasinsDisponibles.length === 0) {
      (async () => {
        const periode = periodesDisponibles.find(p => p.code === periodeSelectionnee);
        if (periode) {
          try {
            const fileHandle = await dossierHandle.getFileHandle(periode.fichier);
            const file = await fileHandle.getFile();
            const magasins = await chargerListeMagasins(file);
            setMagasinsDisponibles(magasins);
          } catch (error) {
            // Silently handle
          }
        }
      })();
    }
  }, [dossierHandle, periodeSelectionnee, periodesDisponibles]);

  // Quand on change le type de période, réinitialiser la sélection
  const changerTypePeriode = (nouveauType) => {
    setTypePeriode(nouveauType);
    setPeriodeSelectionnee('');
    setCodeMagasin('');
    setRechercheMagasin('');
    setMagasinsDisponibles([]);
    setErreur(null);

    // Sélectionner la première période disponible du nouveau type
    const periodes = nouveauType === 'mois' ? moisDisponibles : semainesDisponibles;
    if (periodes.length > 0) {
      setPeriodeSelectionnee(periodes[0].code);
    }
  };

  // Filtrer les magasins selon la recherche
  const magasinsFiltres = magasinsDisponibles.filter(m =>
    m.code.includes(rechercheMagasin) ||
    m.nom.toLowerCase().includes(rechercheMagasin.toLowerCase())
  ).slice(0, 20);

  // Charger les données du magasin sélectionné
  const chargerDonnees = async () => {
    if (!codeMagasin || !periodeSelectionnee || !dossierHandle) return;

    setChargement(true);
    setErreur(null);

    try {
      // 1. Trouver le fichier
      setEtapeChargement('Ouverture du fichier...');
      const periode = periodesDisponibles.find(p => p.code === periodeSelectionnee);
      const fileHandle = await dossierHandle.getFileHandle(periode.fichier);
      const file = await fileHandle.getFile();

      // 2. Extraire les données selon le type de période
      setEtapeChargement('Extraction des données...');

      let donnees;
      if (typePeriode === 'mois') {
        const { extraireDonneesMagasinMensuel } = await import('../../services/dataExtractionMensuel.js');
        donnees = await extraireDonneesMagasinMensuel(file, codeMagasin, dossierHandle);
      } else {
        const { extraireDonneesMagasin } = await import('../../services/dataExtractionService.js');
        donnees = await extraireDonneesMagasin(file, codeMagasin, dossierHandle);
      }

      // 3. Vérifier que le magasin existe
      if (!donnees.magasin.nom || donnees.magasin.nom === 'Inconnu') {
        throw new Error(`Magasin ${codeMagasin} non trouvé dans les données`);
      }

      setEtapeChargement('Terminé !');

      // 4. Transmettre les données au parent
      if (onDonneesChargees) {
        onDonneesChargees({
          ...donnees,
          semaine: typePeriode === 'semaine' ? periodeSelectionnee : null,
          moisSelectionnee: typePeriode === 'mois' ? periodeSelectionnee : null,
          periodeLabel: periode.label,
          dossierHandle,
        });
      }

    } catch (error) {
      setErreur(error.message || 'Erreur lors du chargement des données');
    } finally {
      setChargement(false);
      setEtapeChargement('');
    }
  };

  // Vérifier si on peut charger
  const peutCharger = codeMagasin && periodeSelectionnee && dossierHandle && !chargement;

  // Titre dynamique
  const titre = typePeriode === 'mois' ? 'Benchmark Mensuel BVP' : 'Benchmark Hebdo BVP';

  // Compteur de fichiers disponibles
  const nbFichiers = typePeriode === 'mois'
    ? `${moisDisponibles.length} mois`
    : `${semainesDisponibles.length} semaines`;

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
              {titre}
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
                <span className="text-green-600 text-sm">{moisDisponibles.length} mois, {semainesDisponibles.length} semaines</span>
                <button
                  onClick={selectionnerDossier}
                  className="text-green-600 hover:text-green-800 text-sm underline"
                >
                  Changer
                </button>
              </div>
            )}
          </div>

          {/* Étape 2 : Toggle Mensuel / Hebdomadaire + sélection période */}
          {dossierHandle && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E8E1D5] text-[#8B1538] text-xs font-bold">2</span>
                Période à analyser
              </label>

              {/* Toggle Mois / Semaine */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => changerTypePeriode('mois')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    typePeriode === 'mois'
                      ? 'bg-[#8B1538] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  Mensuel ({moisDisponibles.length})
                </button>
                <button
                  onClick={() => changerTypePeriode('semaine')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    typePeriode === 'semaine'
                      ? 'bg-[#8B1538] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Hebdomadaire ({semainesDisponibles.length})
                </button>
              </div>

              {/* Sélecteur de période */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#58595B]" />
                <select
                  value={periodeSelectionnee}
                  onChange={(e) => setPeriodeSelectionnee(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ED1C24]"
                >
                  <option value="">
                    {typePeriode === 'mois' ? 'Sélectionner un mois' : 'Sélectionner une semaine'}
                  </option>
                  {periodesDisponibles.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Étape 3 : Sélection du magasin */}
          {dossierHandle && periodeSelectionnee && (
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
          Les données restent sur votre ordinateur, rien n'est envoyé sur internet.
        </p>

      </div>
    </div>
  );
};

export default AccueilBenchmark;
