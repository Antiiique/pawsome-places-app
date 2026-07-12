import React from "react";

/**
 * Jeu d'icônes catégories « duotone arrondi » — dessiné maison pour Pawsome Places.
 *
 * Source unique : chaque icône est un fragment SVG interne (viewBox 0 0 24 24) qui
 * utilise `currentColor` pour le glyphe plein et une forme douce à faible opacité
 * pour l'effet duotone. La couleur est donc pilotée par le contexte :
 *   - tuile inactive  -> currentColor = terracotta (text-foreground/primary)
 *   - tuile active    -> currentColor = blanc (sur fond primary)
 *   - pin de carte     -> currentColor = blanc (sur pastille colorée)
 *
 * Deux consommateurs :
 *   - <CategoryIcon />        pour l'UI React (filtres, listes, formulaires)
 *   - categoryIconSvg()       pour les pins Mapbox générés en innerHTML (chaîne SVG)
 */

const P: Record<string, string> = {
  // ── Soins & santé ─────────────────────────────────────────
  veterinaire: `
    <rect x="3.5" y="3.5" width="17" height="17" rx="5.5" fill="currentColor" opacity="0.22"/>
    <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`,
  toiletteur: `
    <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.14"/>
    <circle cx="7" cy="15.8" r="2.1" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="7" cy="9.6" r="2.1" stroke="currentColor" stroke-width="1.8"/>
    <path d="M8.9 14.7L18 6M8.9 10.7l4.4 4.4M17.5 17.5l-4.2-4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  masseur: `
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.13"/>
    <path d="M8 13V8.2a1.15 1.15 0 0 1 2.3 0M10.3 12.2V6.6a1.15 1.15 0 0 1 2.3 0V12M12.6 12V7.1a1.15 1.15 0 0 1 2.3 0v6.4c0 3-2.1 5-5.1 5-1.8 0-3-.8-4-2.2l-1.7-2.5a1.25 1.25 0 0 1 1.95-1.55l1.2 1.15" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  comportementaliste: `
    <circle cx="12" cy="11" r="8" fill="currentColor" opacity="0.15"/>
    <path d="M6.5 12.5a5.5 5.5 0 1 1 10.2 2.4c-.4.7-.7 1.2-.7 2v.6h-5v-.7c0-.8-.3-1.2-.7-1.9a5.5 5.5 0 0 1-3.8-2.4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"/>
    <path d="M9.7 20.3h4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  spa: `
    <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.14"/>
    <path d="M12 5.5c1.7 2.2 1.7 4.9 0 7.5-1.7-2.6-1.7-5.3 0-7.5Z" fill="currentColor"/>
    <path d="M12 13.5C9.3 10.8 6.6 10.8 4.4 12.6c1.1 3.3 4.4 4.4 7.6 1.1ZM12 13.5c2.7-2.7 5.4-2.7 7.6-.9-1.1 3.3-4.4 4.4-7.6.9Z" fill="currentColor" opacity="0.55"/>`,

  // ── Hébergement & garde ───────────────────────────────────
  hotel: `
    <rect x="3.2" y="10.5" width="17.6" height="8" rx="2.5" fill="currentColor" opacity="0.2"/>
    <path d="M3.5 10V18.5M3.5 14.5h17M20.5 18.5v-4a3 3 0 0 0-3-3H9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="5.8" y="10.8" width="4.6" height="3" rx="1.5" fill="currentColor"/>`,
  pension: `
    <path d="M5 11l7-5.5 7 5.5v8H5z" fill="currentColor" opacity="0.2"/>
    <path d="M4.3 11.3L12 5.4l7.7 5.9M6.4 10.8V19h11.2v-8.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="10.2" y="14" width="3.6" height="5" rx="1" fill="currentColor"/>`,
  pet_sitter: `
    <path d="M5 11l7-5.5 7 5.5v8H5z" fill="currentColor" opacity="0.18"/>
    <path d="M4.3 11.3L12 5.4l7.7 5.9M6.4 10.8V19h11.2v-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M12 17.8s-2.5-1.6-2.5-3.3a1.4 1.4 0 0 1 2.5-.85 1.4 1.4 0 0 1 2.5.85c0 1.7-2.5 3.3-2.5 3.3Z" fill="currentColor"/>`,
  refuge: `
    <circle cx="12" cy="11" r="8.3" fill="currentColor" opacity="0.15"/>
    <path d="M12 12.6s-3-2-3-4a1.7 1.7 0 0 1 3-1 1.7 1.7 0 0 1 3 1c0 2-3 4-3 4Z" fill="currentColor"/>
    <path d="M3.8 13.8l3.6 2.6c.6.45 1.35.65 2.1.65h5c.75 0 1.5-.2 2.1-.65l3.6-2.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  camping: `
    <path d="M12 6.4l7.6 12.1H4.4z" fill="currentColor" opacity="0.2"/>
    <path d="M12 6.4L4.4 18.5h15.2L12 6.4Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" fill="none"/>
    <path d="M12 11l-2.3 7.5M12 11l2.3 7.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M3 20l1.4-1.5M21 20l-1.4-1.5M12 6.4V4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,

  // ── Restauration ──────────────────────────────────────────
  restaurant: `
    <path d="M4.5 12.4h15a7.5 6.5 0 0 1-15 0Z" fill="currentColor" opacity="0.22"/>
    <path d="M3.8 12.4h16.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M6 12.6a6 6 0 0 0 12 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M9.4 5.4c-.7 1-.7 2 0 3M14.6 5.4c-.7 1-.7 2 0 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  cafe_animalier: `
    <path d="M5 8h11v4.5a5.5 5.5 0 0 1-11 0z" fill="currentColor" opacity="0.2"/>
    <path d="M5.5 8.5h10v4a5 5 0 0 1-10 0V8.5Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" fill="none"/>
    <path d="M15.5 9.5h1.4a2 2 0 0 1 0 4h-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M8 4.3c-.6.8-.6 1.5 0 2.3M11.5 4.3c-.6.8-.6 1.5 0 2.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,

  // ── Nature & plein air ────────────────────────────────────
  outdoor: `
    <circle cx="12" cy="9.5" r="6.8" fill="currentColor" opacity="0.2"/>
    <circle cx="12" cy="9" r="4.6" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M12 12.5V19M12 15l-3-2.4M12 13.2l3-2.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`,
  parc_chiens: `
    <circle cx="12" cy="13.5" r="7.5" fill="currentColor" opacity="0.16"/>
    <ellipse cx="12" cy="15" rx="3.3" ry="2.7" fill="currentColor"/>
    <circle cx="7.4" cy="12" r="1.65" fill="currentColor"/>
    <circle cx="10.1" cy="9.1" r="1.65" fill="currentColor"/>
    <circle cx="13.9" cy="9.1" r="1.65" fill="currentColor"/>
    <circle cx="16.6" cy="12" r="1.65" fill="currentColor"/>`,
  plage: `
    <circle cx="12" cy="9" r="5" fill="currentColor" opacity="0.2"/>
    <circle cx="12" cy="9" r="3.1" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M12 3.2v1.6M12 13.2v1.6M4.6 9h1.6M17.8 9h1.6M6.6 3.6l1.1 1.1M17.4 3.6l-1.1 1.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M3.8 18c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
  loisir: `
    <circle cx="12" cy="12" r="8.2" fill="currentColor" opacity="0.16"/>
    <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <circle cx="12" cy="12" r="1.3" fill="currentColor"/>`,
  evenement: `
    <rect x="4" y="6" width="16" height="14" rx="3.2" fill="currentColor" opacity="0.18"/>
    <rect x="4.5" y="6.5" width="15" height="13" rx="2.6" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M4.5 10.2h15M8 4.4v3M16 4.4v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="12" cy="15" r="1.5" fill="currentColor"/>`,

  // ── Commerces & services ──────────────────────────────────
  animalerie: `
    <path d="M6 8.2h12l-1 11H7z" fill="currentColor" opacity="0.2"/>
    <path d="M6.4 8.4h11.2l-1 10.6H7.4z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" fill="none"/>
    <path d="M9.4 8.8V7.4a2.6 2.6 0 0 1 5.2 0v1.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" fill="none"/>`,
  commerce: `
    <path d="M5 10.2h14V19H5z" fill="currentColor" opacity="0.18"/>
    <path d="M3.8 10.2l1.3-4.2h13.8l1.3 4.2M5.2 10.2V19h13.6v-8.8M3.8 10.2h16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M10 19v-3.8h4V19" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"/>`,
  educateur: `
    <path d="M12 5.8l9 4-9 4-9-4z" fill="currentColor" opacity="0.22"/>
    <path d="M3 9.8l9-4 9 4-9 4-9-4Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" fill="none"/>
    <path d="M7 11.6v3.8c0 1.1 2.2 2.1 5 2.1s5-1 5-2.1v-3.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M21 9.8v4.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  dog_walker: `
    <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.13"/>
    <ellipse cx="8.5" cy="16.2" rx="2" ry="1.6" fill="currentColor"/>
    <circle cx="6.4" cy="14.6" r="1" fill="currentColor"/>
    <circle cx="7.7" cy="13" r="1" fill="currentColor"/>
    <circle cx="9.4" cy="13" r="1" fill="currentColor"/>
    <circle cx="10.6" cy="14.6" r="1" fill="currentColor"/>
    <ellipse cx="15.5" cy="10.4" rx="1.7" ry="1.35" fill="currentColor" opacity="0.75"/>
    <circle cx="13.8" cy="9" r="0.85" fill="currentColor" opacity="0.75"/>
    <circle cx="15" cy="7.7" r="0.85" fill="currentColor" opacity="0.75"/>
    <circle cx="16.4" cy="7.7" r="0.85" fill="currentColor" opacity="0.75"/>
    <circle cx="17.4" cy="9" r="0.85" fill="currentColor" opacity="0.75"/>`,

  // ── Transport & voyage ────────────────────────────────────
  aeroport: `
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.12"/>
    <path d="M11 4.3a1.35 1.35 0 0 1 2 0l.9 6.2 5 3v1.9l-5-1.35v3.55l1.7 1.25v1.45l-3.3-.95-3.3.95V18.8l1.7-1.25V14l-5 1.35V13.5l5-3z" fill="currentColor"/>`,
  transport: `
    <rect x="5" y="4" width="14" height="14" rx="3.2" fill="currentColor" opacity="0.16"/>
    <rect x="5.5" y="4.5" width="13" height="12" rx="2.6" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M5.5 11h13" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="8.6" cy="14" r="1.05" fill="currentColor"/>
    <circle cx="15.4" cy="14" r="1.05" fill="currentColor"/>
    <path d="M7.6 18l-1.2 2M16.4 18l1.2 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  station_carburant: `
    <rect x="5" y="5" width="8.5" height="14" rx="2.2" fill="currentColor" opacity="0.2"/>
    <path d="M6 19V7.2a2 2 0 0 1 2-2h2.6a2 2 0 0 1 2 2V19M5 19h8.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M7.6 9.3h3.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M12.6 8.6l2.6 2.1v5.6a1.5 1.5 0 0 0 3 0V11.6l-1.9-1.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  aire_repos: `
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.12"/>
    <path d="M4.5 12.2h15M6.2 12.2v-2.4h11.6v2.4M4.5 12.2V16M19.5 12.2V16M8 16v2.2M16 16v2.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,

  // ── Générique & alertes ───────────────────────────────────
  other: `
    <circle cx="12" cy="12" r="8.4" fill="currentColor" opacity="0.16"/>
    <ellipse cx="12" cy="14.3" rx="2.9" ry="2.4" fill="currentColor"/>
    <circle cx="8" cy="11.6" r="1.45" fill="currentColor"/>
    <circle cx="10.4" cy="9" r="1.45" fill="currentColor"/>
    <circle cx="13.6" cy="9" r="1.45" fill="currentColor"/>
    <circle cx="16" cy="11.6" r="1.45" fill="currentColor"/>`,
  // Tous les lieux
  __all__: `
    <ellipse cx="12" cy="14.3" rx="3.1" ry="2.55" fill="currentColor"/>
    <circle cx="7.6" cy="11.4" r="1.55" fill="currentColor"/>
    <circle cx="10.3" cy="8.5" r="1.55" fill="currentColor"/>
    <circle cx="13.7" cy="8.5" r="1.55" fill="currentColor"/>
    <circle cx="16.4" cy="11.4" r="1.55" fill="currentColor"/>`,
  // Animaux errants (paw + piste)
  __strays__: `
    <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.15"/>
    <ellipse cx="13.5" cy="14.8" rx="2.2" ry="1.8" fill="currentColor"/>
    <circle cx="10.9" cy="12.8" r="1.05" fill="currentColor"/>
    <circle cx="12.4" cy="11.1" r="1.05" fill="currentColor"/>
    <circle cx="14.6" cy="11.1" r="1.05" fill="currentColor"/>
    <circle cx="16.1" cy="12.8" r="1.05" fill="currentColor"/>
    <circle cx="6.5" cy="9.2" r="0.9" fill="currentColor" opacity="0.55"/>
    <circle cx="8.3" cy="7.6" r="0.9" fill="currentColor" opacity="0.55"/>
    <circle cx="8.4" cy="11" r="0.9" fill="currentColor" opacity="0.55"/>`,
  // Animaux perdus (pin + patte)
  __lost__: `
    <path d="M12 3.4c3.7 0 6.7 2.8 6.7 6.4C18.7 14.6 12 20.8 12 20.8S5.3 14.6 5.3 9.8C5.3 6.2 8.3 3.4 12 3.4Z" fill="currentColor" opacity="0.22"/>
    <path d="M12 3.9c3.4 0 6.2 2.6 6.2 5.9C18.2 14.2 12 20 12 20S5.8 14.2 5.8 9.8C5.8 6.5 8.6 3.9 12 3.9Z" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <ellipse cx="12" cy="10.6" rx="1.9" ry="1.55" fill="currentColor"/>
    <circle cx="9.7" cy="8.9" r="0.9" fill="currentColor"/>
    <circle cx="11.1" cy="7.5" r="0.9" fill="currentColor"/>
    <circle cx="12.9" cy="7.5" r="0.9" fill="currentColor"/>
    <circle cx="14.3" cy="8.9" r="0.9" fill="currentColor"/>`,
};

export type CategoryKey = keyof typeof P | string | null | undefined;

// Alias de clés (variantes présentes dans certains composants).
const ALIASES: Record<string, string> = {
  osteopathe: "masseur",
  cafe: "cafe_animalier",
  vetos: "veterinaire",
};

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

/** Chaîne SVG pour les pins Mapbox (innerHTML). `color` pilote currentColor. */
export function categoryIconSvg(
  category: CategoryKey,
  { size = 20, color = "#fff" }: { size?: number; color?: string } = {},
): string {
  return `<svg viewBox="0 0 24 24" fill="none" width="${size}" height="${size}" style="color:${color}">${resolve(category)}</svg>`;
}
