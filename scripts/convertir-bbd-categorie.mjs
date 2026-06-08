#!/usr/bin/env node
/**
 * Convertisseur BBD catégorie nationale : xlsx → JSON statique.
 *
 * Lit le fichier "BBD categorie *.xlsx" et produit un dictionnaire JSON indexé
 * par EAN_ADM, contenant uniquement les champs utiles pour la cascade canonique.
 *
 * Usage :
 *   node scripts/convertir-bbd-categorie.mjs <fichier-source.xlsx> [fichier-cible.json]
 *
 * Par défaut, le JSON est écrit dans `public/Data/bbd_categorie.json` (pour le
 * dev local) ET la sortie console rappelle qu'il faut le copier dans le dossier
 * DATA_perso de chaque magasin pour la prod.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// Champs minimums à conserver (cf. PROMPT_FIX_REPORT_GAMME_SEMAINE.md §1)
const CHAMPS_UTILES = [
  'EAN_ADM',
  'CODE_PLU',
  'ID_CLE',
  'LIBELLE_COMMERCIALE_DE_VENTE',
  'CODE_RAYON_MERCALYS',
  'CODE_DE_SECTION_BALANCE',
  'CODE_FAM_MERCALYS',
];

const sourceArg = process.argv[2];
const cibleArg = process.argv[3];

if (!sourceArg) {
  console.error('Usage : node scripts/convertir-bbd-categorie.mjs <source.xlsx> [cible.json]');
  process.exit(1);
}

const source = resolve(sourceArg);
const cible = cibleArg
  ? resolve(cibleArg)
  : resolve(REPO_ROOT, 'public/Data/bbd_categorie.json');

console.log(`Lecture : ${source}`);
const buf = readFileSync(source);
const wb = XLSX.read(buf, { type: 'buffer' });
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

console.log(`  → ${rows.length} lignes lues sur la feuille "${sheetName}"`);

const dictionnaire = {};
let nbSansEan = 0;
let nbDoublons = 0;
let nbInscrit = 0;

for (const row of rows) {
  const ean = row.EAN_ADM ? String(row.EAN_ADM).trim() : '';
  if (!ean) {
    nbSansEan++;
    continue;
  }
  if (dictionnaire[ean]) {
    nbDoublons++;
    continue; // garder la première occurrence
  }
  const entry = {};
  for (const champ of CHAMPS_UTILES) {
    if (row[champ] !== undefined && row[champ] !== null) {
      entry[champ] = typeof row[champ] === 'string' ? row[champ].trim() : row[champ];
    }
  }
  dictionnaire[ean] = entry;
  nbInscrit++;
}

mkdirSync(dirname(cible), { recursive: true });
writeFileSync(cible, JSON.stringify(dictionnaire, null, 2), 'utf8');

console.log(`Écriture : ${cible}`);
console.log(`  → ${nbInscrit} EAN inscrits`);
console.log(`  → ${nbSansEan} lignes sans EAN_ADM (ignorées)`);
console.log(`  → ${nbDoublons} doublons EAN (première occurrence retenue)`);
console.log('');
console.log('Le fichier JSON doit être copié dans le dossier DATA_perso de chaque');
console.log('magasin (à côté de info_PDV.json) pour activer la cascade nationale.');
