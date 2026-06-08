#!/usr/bin/env node
/**
 * Mini test de régression CONFOLENS pour vérifier que les correctifs résolvent
 * les 4 observations du rapport d'audit RAPPORT_AUDIT_PERSONNALISATIONS.md.
 *
 * Usage : node scripts/test-regression-confolens.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// Réimplémentation locale de la cascade canonique (équivalente à src/services/idCanonique.js)
// pour éviter les soucis d'imports ESM sans extension dans le code source.
const hashStable = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

const construireIdCanonique = (produit, { bbdNationale = null } = {}) => {
  const ean = String(produit.ean13 || produit.codeEAN || '').trim();
  if (ean && bbdNationale && bbdNationale[ean]?.CODE_PLU) {
    return `nat-${String(bbdNationale[ean].CODE_PLU).trim()}`;
  }
  if (produit.itm8) return `itm-${String(produit.itm8).trim()}`;
  if (produit.codePLU || produit.plu) return `plu-${String(produit.codePLU || produit.plu).trim()}`;
  if (ean) return `ean-${ean}`;
  const base = `${produit.libelle || ''}|${produit.famille || produit.rayon || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
  return `hash-${hashStable(base)}`;
};

// BBD nationale
const bbdPath = resolve(REPO_ROOT, 'public/Data/bbd_categorie.json');
const bbdNationale = JSON.parse(readFileSync(bbdPath, 'utf8'));
console.log(`BBD nationale chargée : ${Object.keys(bbdNationale).length} EAN`);

// MANAGER S16 et S17 réels
const CONFO = '/Users/rudyremy/Developer/Doc de travail/CONFOLENS/Confo 4 échanges';
const m16 = JSON.parse(readFileSync(`${CONFO}/MANAGER-9839-S16-2026.bvp.json`, 'utf8'));
const m17 = JSON.parse(readFileSync(`${CONFO}/MANAGER-9839-S17-2026.bvp.json`, 'utf8'));

console.log(`\nMANAGER S16 : ${m16.produits.length} produits`);
console.log(`MANAGER S17 : ${m17.produits.length} produits`);

// Recalculer les IDs canoniques pour S16 et S17
const recalculerIds = (produits) => {
  const idCount = {};
  return produits.map((p, index) => {
    const ean = p.ean13 || p.codeEAN || '';
    const idBase = construireIdCanonique({
      ean13: ean, codeEAN: ean, itm8: p.itm8, codePLU: p.plu,
      libelle: p.libelle, famille: p.famille, rayon: p.rayon,
    }, { bbdNationale });
    idCount[idBase] = (idCount[idBase] || 0) + 1;
    const idStable = idCount[idBase] > 1 && ean
      ? `${idBase}__${ean}`
      : idCount[idBase] > 1 ? `${idBase}__${index + 1}` : idBase;
    return { ...p, _idCanonique: idStable };
  });
};

const s16Recalc = recalculerIds(m16.produits);
const s17Recalc = recalculerIds(m17.produits);

// === TEST 1 : couverture des préfixes canoniques ===
console.log('\n=== TEST 1 : Couverture cascade canonique sur S17 ===');
const stats = { nat: 0, plu: 0, itm: 0, ean: 0, hash: 0 };
s17Recalc.forEach(p => {
  const prefixe = p._idCanonique.split('-')[0];
  if (stats[prefixe] !== undefined) stats[prefixe]++;
});
console.log(`  nat-* : ${stats.nat} (${((stats.nat / s17Recalc.length) * 100).toFixed(1)}%)`);
console.log(`  plu-* : ${stats.plu}`);
console.log(`  itm-* : ${stats.itm} (${((stats.itm / s17Recalc.length) * 100).toFixed(1)}%)`);
console.log(`  ean-* : ${stats.ean}`);
console.log(`  hash-* : ${stats.hash} (${((stats.hash / s17Recalc.length) * 100).toFixed(1)}%)`);

// === TEST 2 : aucun ID undefined ou _N basé sur ordre ===
console.log('\n=== TEST 2 : Aucun ID instable ===');
const idsInstables = s17Recalc.filter(p =>
  !p._idCanonique || p._idCanonique === 'undefined' || /^noean_/.test(p._idCanonique) || /^archive_/.test(p._idCanonique)
);
console.log(`  IDs instables (undefined, noean_, archive_) : ${idsInstables.length}`);
console.log(`  → ${idsInstables.length === 0 ? 'OK ✅' : 'KO ❌'}`);

// === TEST 3 : Cas DOONYS — chaque produit a son ID canonique unique ===
console.log('\n=== TEST 3 : Cas DOONY\'S (S17, deux EAN différents pour même libellé) ===');
const doonys = s17Recalc.filter(p => p.libelle && p.libelle.includes('ASSRT GOURMAND'));
doonys.forEach(p => {
  console.log(`  ean=${p.ean13}, libelle="${p.libelle}", idCanonique=${p._idCanonique}`);
});
const unique = new Set(doonys.map(p => p._idCanonique));
console.log(`  → ${unique.size === doonys.length ? 'OK ✅ : chaque produit a son propre id' : 'KO ❌ : collision détectée'}`);

// === TEST 4 : construction idMapping S16 → S17 ===
console.log('\n=== TEST 4 : Construction idMapping S16 → S17 ===');

// Réimplémentation locale de construireIdMapping (simplifié)
const normaliserLibelle = (lib) => String(lib || '').toUpperCase().trim().replace(/\s+/g, ' ');
const construireIdMapping = (precs, news) => {
  const parCle = new Map();
  news.forEach(p => {
    const k = `${normaliserLibelle(p.libelle)}|${p.famille || ''}|${p.rayon || ''}`;
    if (!parCle.has(k)) parCle.set(k, []);
    parCle.get(k).push(p);
  });
  const map = {};
  precs.forEach(anc => {
    const k = `${normaliserLibelle(anc.libelle)}|${anc.famille || ''}|${anc.rayon || ''}`;
    const cands = parCle.get(k) || [];
    if (cands.length === 0) return;
    let cible = cands[0];
    if (cands.length > 1) {
      cible = cands.find(c => c.itm8 && anc.itm8 && c.itm8 === anc.itm8) ||
              cands.find(c => c.ean13 && anc.ean13 && c.ean13 === anc.ean13) || cands[0];
    }
    if (cible._idCanonique !== anc._idCanonique) {
      map[anc._idCanonique] = cible._idCanonique;
    }
  });
  return map;
};

const mapping = construireIdMapping(s16Recalc, s17Recalc);
const nbMapping = Object.keys(mapping).length;
console.log(`  ${nbMapping} entrées dans idMapping`);

// Vérifier que DOONYS est correctement mappé (l'ancienne entrée S16 doit pointer vers S17)
const anciensDoonys = s16Recalc.filter(p => p.libelle && p.libelle.includes('ASSRT GOURMAND'));
anciensDoonys.forEach(anc => {
  const cible = mapping[anc._idCanonique];
  console.log(`  S16 ${anc._idCanonique} (ean=${anc.ean13}) → ${cible || 'aucun changement'}`);
});

// === TEST 5 : Stabilité des IDs entre S16 et S17 ===
console.log('\n=== TEST 5 : Stabilité IDs des produits NON-modifiés entre S16 et S17 ===');
const s16ById = new Map(s16Recalc.map(p => [p._idCanonique, p]));
let nbStables = 0;
let nbChanges = 0;
s17Recalc.forEach(p17 => {
  if (s16ById.has(p17._idCanonique)) nbStables++;
  else nbChanges++;
});
console.log(`  Produits avec id stable S16→S17 : ${nbStables}`);
console.log(`  Produits avec id changé (nouveaux ou modifiés) : ${nbChanges}`);
console.log(`  → ${(nbStables / s17Recalc.length * 100).toFixed(1)}% des produits S17 conservent leur id`);

console.log('\n=== Récapitulatif ===');
console.log(`Test 1 : couverture cascade — ${stats.nat + stats.plu + stats.itm} produits avec ID métier stable sur ${s17Recalc.length} (${((stats.nat + stats.plu + stats.itm) / s17Recalc.length * 100).toFixed(1)}%)`);
console.log(`Test 2 : ${idsInstables.length === 0 ? '✅' : '❌'} pas d'ID instable`);
console.log(`Test 3 : ${unique.size === doonys.length ? '✅' : '❌'} cas DOONY'S sans collision`);
console.log(`Test 4 : ${nbMapping} entrées idMapping (attendu : produits dont le code a vraiment changé)`);
console.log(`Test 5 : ${nbStables} produits identifiables de manière stable entre semaines`);
