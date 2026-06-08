/**
 * Contrat — Persistance Magasin.
 *
 * Abstrait le mécanisme de stockage. La V5 utilise un adapter local (fichier
 * `.bvp.json` via File System Access API + IndexedDB pour les handles). Un
 * adapter Supabase pourra être branché plus tard (SB-15) sans modifier le
 * domaine ni les composants qui consomment ce contrat.
 *
 * Toutes les signatures sont typées sur `DonneesMagasin` (domaine). Les types
 * persistés (`PersistedFileV31`, etc.) sont des détails d'implémentation des
 * adapters — pas exposés ici. SB-2 → SB-4 garantissent que toute donnée
 * traversant ce contrat est complète : `correctionsManuelles` et
 * `produitsExceptionnels` sont OBLIGATOIRES dans `DonneesMagasin` — TS interdit
 * par construction de transporter une `DonneesMagasin` qui les omettrait.
 *
 * SB-5 : ce contrat est introduit et câblé dans `MagasinContext`. Le
 * comportement V5 reste strictement préservé — la correction du bug 1
 * (race condition `useEffect` × `localStorage`) arrive en SB-6.
 */

import type { DonneesMagasin } from '../types/index.js';

/**
 * Méta-information attachée à un load/save (qui a écrit, quand, version source).
 * Utile pour le suivi de versions (`_v2`, `_v3` côté nom de fichier — cf. CLAUDE.md
 * V5 « ARCHITECTURE DE PERSISTANCE — ZÉRO LOCALSTORAGE »).
 */
export interface MetaPersistance {
  readonly cheminOuNom: string;
  readonly versionSourceDetectee?: '2.1' | '3.0' | '3.1';
  readonly horodatage: string;
}

/**
 * Interface du contrat. 5 méthodes obligatoires, toutes typées sur le domaine.
 *
 * Convention d'erreur : les implémentations lèvent une `Error` avec message
 * humain (« Fichier .bvp.json non reconnu », « Permission refusée sur le
 * dossier », etc.) pour permettre une remontée UI claire.
 */
export interface IPersistanceMagasin {
  /**
   * Importe un fichier `.bvp.json` depuis un `File` HTML (input upload).
   * Accepte v2.1, v3.0 et v3.1 — migration silencieuse vers v3.1 avant
   * conversion en `DonneesMagasin`. Lance une erreur si la version est
   * inconnue.
   */
  importer(fichier: File): Promise<DonneesMagasin>;

  /**
   * Exporte un `DonneesMagasin` vers un `Blob` téléchargeable. Le résultat
   * respecte le schéma `.bvp.json` v3.1 (canonique). Le contenu est sérialisé
   * en JSON indenté pour rester lisible à l'œil — cf. fixture golden.
   */
  exporter(donnees: DonneesMagasin): Promise<Blob>;

  /**
   * Charge un fichier déjà ouvert (handle File System Access). Migre depuis
   * v2.1 / v3.0 / v3.1 vers v3.1, puis convertit en `DonneesMagasin`.
   */
  charger(handle: FileSystemFileHandle): Promise<DonneesMagasin>;

  /**
   * Sauvegarde un `DonneesMagasin` dans un handle existant (écrasement).
   */
  sauvegarder(handle: FileSystemFileHandle, donnees: DonneesMagasin): Promise<void>;

  /**
   * Fusionne deux jeux de données magasin. Convention V5 historique
   * (cf. `fichierMagasin.js:241` `fusionnerAvecDonneesLocales`) : les
   * personnalisations locales priment sur les valeurs distantes pour les
   * champs spécifiques au magasin (jours d'ouverture configurés, sélection
   * de PDV…). Les autres champs sont pris du distant (gamme corrigée,
   * archive plus récente, etc.).
   *
   * Implémentation V5 pragmatique : la première version garde `magasin.code`
   * et `magasin.nom` du local, puis prend tout du distant. Affinements possibles
   * en SB-13+ selon les besoins remontés.
   */
  fusionner(distant: DonneesMagasin, local: DonneesMagasin): DonneesMagasin;
}
