import React from "react";

/**
 * Jeu d'icônes catégories « duotone détaillé » — dessiné maison pour Pawsome Places.
 *
 * Source unique : chaque icône est un fragment SVG interne (viewBox 0 0 24 24) qui
 * utilise `currentColor` pour le glyphe et une forme douce à faible opacité (duotone).
 * La couleur est pilotée par le contexte :
 *   - tuile filtre inactive -> terracotta (text-primary)
 *   - tuile filtre active    -> blanc (sur fond primary)
 *   - pin de carte            -> blanc (dans la goutte colorée)
 *
 * Trois consommateurs :
 *   - <CategoryIcon />   UI React (filtres, listes, formulaires)
 *   - categoryIconSvg()  chaîne SVG simple (fallbacks divers)
 *   - categoryPinSvg()   goutte HD complète pour les marqueurs Mapbox (innerHTML)
 */

const P: Record<string, string> = {
  // ── Soins & santé ─────────────────────────────────────────
  veterinaire: `
    <path d="M4.5 9.5h15v8a1.6 1.6 0 0 1-1.6 1.6H6.1A1.6 1.6 0 0 1 4.5 17.5z" fill="currentColor" opacity="0.22"/>
    <path d="M4.7 9.7h14.6v7.8a1.5 1.5 0 0 1-1.5 1.5H6.2a1.5 1.5 0 0 1-1.5-1.5z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>
    <path d="M9 9.7V8.1a3 3 0 0 1 6 0v1.6" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <path d="M12 12v4.2M9.9 14.1h4.2" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>`,
  toiletteur: `
    <circle cx="6.6" cy="16.2" r="1.9" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <circle cx="6.6" cy="9.6" r="1.9" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M8.4 15.2L17.5 6M8.4 10.6l5.6 5.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M13 20.2h6.4v-2.4M14.4 17.9v2.3M15.9 17.9v2.3M17.4 17.9v2.3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  masseur: `
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.12"/>
    <path d="M8 13V8.4a1.15 1.15 0 0 1 2.3 0M10.3 12.4V6.8a1.15 1.15 0 0 1 2.3 0V12.2M12.6 12.2V7.3a1.15 1.15 0 0 1 2.3 0v6.4c0 3-2.1 5-5.1 5-1.8 0-3-.8-4-2.2l-1.7-2.5a1.25 1.25 0 0 1 1.95-1.55l1.2 1.15" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M17 6.6c1 .7 1 2 0 2.7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>`,
  comportementaliste: `
    <path d="M6.5 10.2a5.5 5.5 0 1 1 10.2 2.7c-.4.7-.7 1.2-.7 2v.6h-6v-.6c0-.8-.3-1.2-.7-1.9a5.5 5.5 0 0 1-3.6-2.8Z" fill="currentColor" opacity="0.18"/>
    <path d="M6.5 10.2a5.5 5.5 0 1 1 10.2 2.7c-.4.7-.7 1.2-.7 2v.6h-6v-.6c0-.8-.3-1.2-.7-1.9a5.5 5.5 0 0 1-3.6-2.8Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
    <path d="M10.4 12.6c0-1 .7-1.6 1.6-1.6s1.6.6 1.6 1.6M12 11v-2.1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M9.9 17.6h4.2M10.6 19.6h2.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  spa: `
    <circle cx="12" cy="12.5" r="8.6" fill="currentColor" opacity="0.12"/>
    <path d="M12 5.6c1.8 2.2 1.8 5 0 7.6-1.8-2.6-1.8-5.4 0-7.6Z" fill="currentColor"/>
    <path d="M12 13.4C9.2 10.7 6.3 10.9 4.4 12.9c1.2 3 4.5 3.9 7.6.5ZM12 13.4c2.8-2.7 5.7-2.5 7.6-.5-1.2 3-4.5 3.9-7.6.5Z" fill="currentColor" opacity="0.6"/>
    <path d="M4.5 16.4c2.2 1.4 4.4 1.9 7.5 1.9s5.3-.5 7.5-1.9" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.7"/>`,

  // ── Hébergement & garde ───────────────────────────────────
  hotel: `
    <rect x="4.5" y="12.8" width="15.5" height="4.6" rx="2" fill="currentColor" opacity="0.22"/>
    <path d="M3 8.4v10.2M3 13.2h13.2a4 4 0 0 1 4 4v1.4M3 17.4h17.2M20.2 18.6V17.4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="5.4" y="10.6" width="5.4" height="3" rx="1.5" fill="currentColor"/>`,
  pension: `
    <path d="M5 11.4l7-4.4 7 4.4V19H5z" fill="currentColor" opacity="0.2"/>
    <path d="M4 11.7L12 6.6l8 5.1M6 11.2V19h12v-7.6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.4 19v-3.4a2.6 2.6 0 0 1 5.2 0V19" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>`,
  pet_sitter: `
    <path d="M12 20s-7-4.3-7-9.3a3.7 3.7 0 0 1 7-1.6 3.7 3.7 0 0 1 7 1.6c0 5-7 9.3-7 9.3Z" fill="currentColor" opacity="0.18"/>
    <path d="M12 19.4s-6.4-4-6.4-8.7a3.4 3.4 0 0 1 6.4-1.5 3.4 3.4 0 0 1 6.4 1.5c0 4.7-6.4 8.7-6.4 8.7Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
    <ellipse cx="12" cy="12.6" rx="1.7" ry="1.4" fill="currentColor"/>
    <circle cx="9.7" cy="10.9" r="0.85" fill="currentColor"/>
    <circle cx="11.1" cy="9.7" r="0.85" fill="currentColor"/>
    <circle cx="12.9" cy="9.7" r="0.85" fill="currentColor"/>
    <circle cx="14.3" cy="10.9" r="0.85" fill="currentColor"/>`,
  refuge: `
    <path d="M5 11.2l7-5.6 7 5.6V19H5z" fill="currentColor" opacity="0.2"/>
    <path d="M4.3 11.4L12 5.4l7.7 6M6.4 11V19.4h11.2V11" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 17.7s-2.7-1.7-2.7-3.5a1.5 1.5 0 0 1 2.7-.9 1.5 1.5 0 0 1 2.7.9c0 1.8-2.7 3.5-2.7 3.5Z" fill="currentColor"/>`,
  camping: `
    <path d="M12 6.6l8 12H4z" fill="currentColor" opacity="0.2"/>
    <path d="M12 6.6L4 18.5h16L12 6.6Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
    <path d="M12 10.6l-2.6 7.9M12 10.6l2.6 7.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M12 6.6V3.9l2.2.9-2.2 1M3 20l1.4-1.5M21 20l-1.4-1.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  // ── Restauration ──────────────────────────────────────────
  restaurant: `
    <path d="M8 3.6v4.7a1.7 1.7 0 0 0 3.4 0V3.6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <path d="M8 3.6v3.2M11.4 3.6v3.2M9.7 8.3V20.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M16 3.6c1.6.5 2.3 3 2.3 5.4 0 2.1-.8 3.4-2.3 3.7V20.4" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  cafe_animalier: `
    <path d="M5.6 8.8h9.8v3.2a4.9 4.9 0 0 1-9.8 0z" fill="currentColor" opacity="0.2"/>
    <path d="M6 9.1h9v3a4.5 4.5 0 0 1-9 0V9.1Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>
    <path d="M15 10h1.5a1.9 1.9 0 0 1 0 3.8h-1.1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M4.5 18.4h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M8.4 4.6c-.6.9-.6 1.7 0 2.6M11.4 4.6c-.6.9-.6 1.7 0 2.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>`,

  // ── Nature & plein air ────────────────────────────────────
  outdoor: `
    <path d="M12 4a4 4 0 0 0-3.7 5.6A3.4 3.4 0 0 0 9 16.3h6a3.4 3.4 0 0 0 .7-6.7A4 4 0 0 0 12 4Z" fill="currentColor" opacity="0.2"/>
    <path d="M12 4.4a3.7 3.7 0 0 0-3.4 5.2A3.15 3.15 0 0 0 9.2 15.8h5.6a3.15 3.15 0 0 0 .6-6.2A3.7 3.7 0 0 0 12 4.4Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>
    <path d="M12 15.8V20.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`,
  parc_chiens: `
    <path d="M9 9.5h6v8.5a1.6 1.6 0 0 1-1.6 1.6h-2.8A1.6 1.6 0 0 1 9 18z" fill="currentColor" opacity="0.2"/>
    <path d="M9 19V9.7a3 3 0 0 1 6 0V19M7.7 19.4h8.6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 8.6c.4-1.4 1.6-2.2 3-2.2s2.6.8 3 2.2" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <path d="M15.2 11.5h2.3M6.5 11.5H4.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="12" cy="11.2" r="1.15" fill="currentColor"/>`,
  plage: `
    <path d="M5.4 12.4a6.6 6.6 0 0 1 13.2 0z" fill="currentColor" opacity="0.2"/>
    <path d="M5.4 12.4a6.6 6.6 0 0 1 13.2 0" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <path d="M5.4 12.4q2.2-1.6 4.4 0t4.4 0 4.4 0" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M12 6V12.4M12 20.4V12.4M12 20.4a2 2 0 0 0 2.2-.7" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <circle cx="17.6" cy="5.6" r="1.7" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M17.6 2.9v1M17.6 8.3v-1M15 5.6h1M20.2 5.6h-1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  loisir: `
    <ellipse cx="12" cy="13" rx="8.5" ry="3.5" fill="currentColor" opacity="0.2"/>
    <ellipse cx="12" cy="12" rx="8.5" ry="3.4" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <path d="M3.5 12c0 1.9 3.8 3.4 8.5 3.4s8.5-1.5 8.5-3.4" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <ellipse cx="12" cy="12" rx="2.6" ry="1" fill="currentColor"/>`,
  evenement: `
    <rect x="4" y="6" width="16" height="14" rx="3.2" fill="currentColor" opacity="0.18"/>
    <rect x="4.5" y="6.5" width="15" height="13" rx="2.6" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <path d="M4.5 10.2h15M8 4.5v3M16 4.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <rect x="10.1" y="12.4" width="3.8" height="3.4" rx="1" fill="currentColor"/>`,

  // ── Commerces & services ──────────────────────────────────
  animalerie: `
    <path d="M6.2 8.6h11.6l-1 10.4H7.2z" fill="currentColor" opacity="0.2"/>
    <path d="M6.4 8.7h11.2l-1 10.4H7.4z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>
    <path d="M9.3 8.7V7.3a2.7 2.7 0 0 1 5.4 0v1.4" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <path d="M10 15.4c-.55-.55-.55-1.35 0-1.9.5-.5 1.25-.45 1.75.05l.75.75.75-.75c.5-.5 1.25-.55 1.75-.05.55.55.55 1.35 0 1.9-.5.5-1.25.45-1.75-.05l-.75-.75-.75.75c-.5.5-1.25.55-1.75.05z" fill="currentColor"/>`,
  commerce: `
    <path d="M5 10.2h14V19H5z" fill="currentColor" opacity="0.18"/>
    <path d="M4 10.2l1.2-4.2h13.6L20 10.2" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>
    <path d="M4 10.2q2.2 1.7 4 0t4 0 4 0 4 0" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M5.4 11.4V19h13.2v-7.6M4 19h16" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 19v-3.8h4V19" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`,
  educateur: `
    <path d="M12 5.8l9 4-9 4-9-4z" fill="currentColor" opacity="0.2"/>
    <path d="M3 9.8l9-4 9 4-9 4-9-4Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>
    <path d="M7 11.6v3.8c0 1.1 2.2 2.1 5 2.1s5-1 5-2.1v-3.8" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21 9.8v4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="21" cy="14.6" r="1" fill="currentColor"/>`,
  dog_walker: `
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1"/>
    <circle cx="6.6" cy="5.6" r="1.6" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M6.6 7.2c0 4.2 2 6.2 5.6 6.2" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <circle cx="14.8" cy="15.2" r="3.1" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <path d="M14.8 18.3v1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,

  // ── Transport & voyage ────────────────────────────────────
  aeroport: `
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1"/>
    <path d="M11 4.3a1.35 1.35 0 0 1 2 0l.9 6.2 5 3v1.9l-5-1.35v3.55l1.7 1.25v1.45l-3.3-.95-3.3.95V18.8l1.7-1.25V14l-5 1.35V13.5l5-3z" fill="currentColor"/>`,
  transport: `
    <rect x="5" y="4" width="14" height="14" rx="3.2" fill="currentColor" opacity="0.16"/>
    <rect x="5.5" y="4.5" width="13" height="12" rx="2.6" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <path d="M5.5 11h13" stroke="currentColor" stroke-width="1.7"/>
    <circle cx="8.6" cy="14" r="1.05" fill="currentColor"/>
    <circle cx="15.4" cy="14" r="1.05" fill="currentColor"/>
    <path d="M7.6 18l-1.2 2M16.4 18l1.2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  station_carburant: `
    <rect x="5" y="5" width="8.5" height="14" rx="2.2" fill="currentColor" opacity="0.2"/>
    <path d="M6 19V7.2a2 2 0 0 1 2-2h2.6a2 2 0 0 1 2 2V19M5 19h8.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7.6 9.3h3.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M12.6 8.6l2.6 2.1v5.6a1.5 1.5 0 0 0 3 0V11.6l-1.9-1.9" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  aire_repos: `
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1"/>
    <circle cx="6.6" cy="8" r="2.6" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M6.6 10.6V15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M10 14.2h9M10 14.2V17M19 14.2V17M11.4 14.2v-1.6h6.2v1.6M12 17v1.6M17 17v1.6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  // ── Générique & alertes ───────────────────────────────────
  other: `
    <rect x="4" y="4" width="16" height="16" rx="5" fill="currentColor" opacity="0.16"/>
    <circle cx="9" cy="9" r="1.8" fill="currentColor"/>
    <circle cx="15" cy="9" r="1.8" fill="currentColor"/>
    <circle cx="9" cy="15" r="1.8" fill="currentColor"/>
    <circle cx="15" cy="15" r="1.8" fill="currentColor"/>`,
  __all__: `
    <ellipse cx="12" cy="14.6" rx="3.3" ry="2.7" fill="currentColor"/>
    <ellipse cx="6.9" cy="11.4" rx="1.7" ry="2" fill="currentColor"/>
    <ellipse cx="10.2" cy="8.6" rx="1.7" ry="2.1" fill="currentColor"/>
    <ellipse cx="13.8" cy="8.6" rx="1.7" ry="2.1" fill="currentColor"/>
    <ellipse cx="17.1" cy="11.4" rx="1.7" ry="2" fill="currentColor"/>`,
  __strays__: `
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1"/>
    <ellipse cx="14.6" cy="15.4" rx="2.2" ry="1.8" fill="currentColor"/>
    <circle cx="11.9" cy="13.3" r="1.05" fill="currentColor"/>
    <circle cx="13.4" cy="11.7" r="1.05" fill="currentColor"/>
    <circle cx="15.8" cy="11.7" r="1.05" fill="currentColor"/>
    <circle cx="17.3" cy="13.3" r="1.05" fill="currentColor"/>
    <ellipse cx="7.4" cy="9" rx="1.5" ry="1.25" fill="currentColor" opacity="0.5"/>
    <circle cx="5.8" cy="7.6" r="0.75" fill="currentColor" opacity="0.5"/>
    <circle cx="6.8" cy="6.4" r="0.75" fill="currentColor" opacity="0.5"/>
    <circle cx="8.4" cy="6.4" r="0.75" fill="currentColor" opacity="0.5"/>
    <circle cx="9.2" cy="7.7" r="0.75" fill="currentColor" opacity="0.5"/>`,
  __lost__: `
    <circle cx="10.6" cy="10.6" r="6.6" fill="currentColor" opacity="0.16"/>
    <circle cx="10.6" cy="10.6" r="5.6" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M15 15l4.2 4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="10.6" cy="11.4" rx="1.6" ry="1.3" fill="currentColor"/>
    <circle cx="8.6" cy="9.9" r="0.8" fill="currentColor"/>
    <circle cx="9.9" cy="8.8" r="0.8" fill="currentColor"/>
    <circle cx="11.4" cy="8.8" r="0.8" fill="currentColor"/>
    <circle cx="12.6" cy="9.9" r="0.8" fill="currentColor"/>`,
};

// Alias de clés (variantes présentes dans certains composants).
const ALIASES: Record<string, string> = {
  osteopathe: "masseur",
  cafe: "cafe_animalier",
  vetos: "veterinaire",
};

export type CategoryKey = keyof typeof P | string | null | undefined;

/** Résout une clé de catégorie (y compris null=Tous et clés spéciales) vers un fragment SVG. */
function resolve(category: CategoryKey): string {
  if (category == null) return P.__all__;
  const key = ALIASES[category] ?? category;
  return P[key] ?? P.other;
}

interface CategoryIconProps {
  category: CategoryKey;
  className?: string;
  size?: number;
}

/** Icône catégorie pour l'UI React. Hérite de la couleur via `currentColor`. */
export function CategoryIcon({ category, className, size }: CategoryIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: resolve(category) }}
    />
  );
}

/** Chaîne SVG simple (24x24). `color` pilote currentColor. */
export function categoryIconSvg(
  category: CategoryKey,
  { size = 20, color = "#fff" }: { size?: number; color?: string } = {},
): string {
  return `<svg viewBox="0 0 24 24" fill="none" width="${size}" height="${size}" style="color:${color}">${resolve(category)}</svg>`;
}

/** Éclaircit (amt>0) ou assombrit (amt<0) une couleur hex #RRGGBB. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round(r + (target - r) * p);
  g = Math.round(g + (target - g) * p);
  b = Math.round(b + (target - b) * p);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Silhouette de la goutte (viewBox 0 0 48 54) : gros bulbe rond + pointe courte, tip à (24,53).
const DROP_PATH = "M24 53C24 53 8 33 8 20A16 16 0 0 1 40 20C40 33 24 53 24 53Z";

/**
 * Goutte HD complète pour un marqueur Mapbox : dégradé, reflet, ombre douce, contour blanc
 * et l'icône blanche à l'intérieur. Les ids de gradient sont dérivés de la couleur pour
 * éviter les collisions entre marqueurs dans le même document. La pointe (bas) est le point d'ancrage.
 */
export function categoryPinSvg(category: CategoryKey, color: string, size = 40): string {
  const light = shade(color, 0.22);
  const dark = shade(color, -0.16);
  const uid = color.replace("#", "");
  const height = Math.round((size * 54) / 48);
  return `<svg width="${size}" height="${height}" viewBox="0 0 48 54" fill="none" style="overflow:visible;display:block">
    <defs>
      <linearGradient id="g_${uid}" x1="24" y1="4" x2="24" y2="53" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${light}"/><stop offset="0.55" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
      <radialGradient id="h_${uid}" cx="0.35" cy="0.28" r="0.55"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <filter id="s_${uid}" x="-45%" y="-30%" width="190%" height="175%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.4" flood-color="${dark}" flood-opacity="0.5"/></filter>
    </defs>
    <path d="${DROP_PATH}" fill="url(#g_${uid})" stroke="#fff" stroke-width="2" filter="url(#s_${uid})"/>
    <path d="${DROP_PATH}" fill="url(#h_${uid})"/>
    <ellipse cx="17.5" cy="13" rx="6.2" ry="3.6" fill="#fff" opacity="0.28" transform="rotate(-32 17.5 13)"/>
    <g transform="translate(12,8)" style="color:#fff"><svg viewBox="0 0 24 24" width="24" height="24" fill="none">${resolve(category)}</svg></g>
  </svg>`;
}
