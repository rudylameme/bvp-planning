/**
 * Règle — Normalisation d'un libellé produit pour la détection de doublons.
 *
 * Extraite de `services/nettoyageGamme.js` (V5, lignes 45-77) sans modification
 * de comportement. SB-3, migration TS — étape 1 du « single source of truth ».
 *
 * Retire / remplace :
 *   - `*` initial (promo) ;
 *   - fractions `1/2` → `DEMI`, `1/3` → `TIERS`, `1/4` → `QUART` ;
 *   - le caractère `/` (séparateur), ponctuation résiduelle (.,;:!?) ;
 *   - mots-techniques BVP : `P&C`, `PAC`, `CRU`, `PRE`/`PREC`/`PRECUI*`,
 *     `PREP`/`PREPOUS*`, `CUI`/`CUIT(S)`, `PC`, `DECONGELE(E)(S)`, `OFF`,
 *     `AOP`, `STICK*`, `STI`, `S.A`/`SA` ;
 *   - poids avec unité : `\d+ ?G/KG/GR` (ex. `250G`, `1KG`, `235GR`) ;
 *   - nombres seuls de 1-4 chiffres (poids résiduel, codes, numéros) ;
 *   - conditionnements `X\d+` (ex. `X1`, `X8`, `X20`) ;
 *   - diamètres `D\d+` (ex. `D22`, `D28`) ;
 *   - séquences d'espaces collapsées et trim final.
 *
 * Préserve par construction (protégé via marqueurs internes) :
 *   - les packs `N+M` (ex. `3+1`) — utiles pour distinguer un produit promo
 *     « lot multi-achat » d'un produit nu.
 *
 * Divergences connues entre le code V5 et son docstring d'en-tête, FIGÉES
 * à l'identique en SB-3 (aucune correction métier ici, cf. spec) :
 *   - l'en-tête de `nettoyageGamme.js` dit « les conditionnements X2+ (X8,
 *     X12, X20) sont GARDÉS car produits différents », mais le code retire
 *     TOUS les `X\d+` (cf. L72 V5). T5 valide le comportement réel : `X8`
 *     est retiré. Toute évolution éventuelle sera traitée explicitement en
 *     dehors de SB-3.
 *
 * Signature : `string | null | undefined → string`. La V5 acceptait des
 * entrées nulles via `(lib || '')` ; le type le reflète. Le retour est
 * toujours une `string` (jamais `null`).
 */

export function normaliserLibelle(lib: string | null | undefined): string {
  return (lib || '')
    .toUpperCase()
    .replace(/^\*/, '')                              // retirer * promo
    // Normaliser les fractions AVANT tout le reste
    .replace(/\b1\/2\b/g, 'DEMI')                    // 1/2 → DEMI
    .replace(/\b1\/3\b/g, 'TIERS')                   // 1/3 → TIERS
    .replace(/\b1\/4\b/g, 'QUART')                   // 1/4 → QUART
    .replace(/\//g, ' ')                             // "/" → espace (séparateur)
    .replace(/[.,;:!?]+/g, ' ')                      // ponctuation résiduelle → espace
    .replace(/\bP&C\b/g, '')
    .replace(/\bPAC\b/g, '')
    .replace(/\bCRU\b/g, '')
    .replace(/\bPRE\b|\bPREC\b|\bPRECUI\w*\b/g, '')  // PRE, PREC, PRECUIT(E)(S)
    .replace(/\bPREP\b|\bPREPOUS\w*\b/g, '')         // PREP, PREPOUSSE, PREPOUSSEE
    .replace(/\bCUI\b|\bCUITS?\b/g, '')              // CUI, CUIT, CUITS
    .replace(/\bPC\b/g, '')                          // PC — abréviation précuit
    .replace(/\bDECONGELEE?S?\b/g, '')               // DECONGELE(E)(S)
    .replace(/\bOFF\b/g, '')                         // "OFF" (offre)
    .replace(/\bAOP\b/g, '')                         // AOP — classification
    .replace(/\bSTICK\w*\b/g, '')                    // STICK, STICKER
    .replace(/\bSTI\b/g, '')                         // STI — tronqué STICK
    .replace(/\d+\s*[GK]G?\b/gi, '')                 // 300G, 250KG, 1K
    .replace(/\d+\s*GR\b/gi, '')                     // 235GR, 290GR
    .replace(/\b(\d+)\+(\d+)\b/g, 'PACK$1PLUS$2')    // Protéger "3+1" AVANT suppression nombres
    .replace(/\b\d{1,4}\b/g, '')                     // nombres seuls 1-4 chiffres
    .replace(/PACK(\d+)PLUS(\d+)/g, '$1+$2')         // Restaurer "3+1"
    .replace(/\bX\d+\b/gi, '')                       // X1, X5, X10, X20
    .replace(/\bD\d+\b/g, '')                        // D22, D28 — diamètres
    .replace(/\bS\.?A\.?\b/g, '')                    // S.A, SA
    .replace(/\s+/g, ' ')
    .trim();
}
