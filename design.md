# Design — TidePath Family Alliance

A shared visual system for the application, adopted from the user-supplied Programs reference on November 7, 2026. Preserve the existing routes, API operations, role boundaries, data, and business rules when applying this system.

## Provenance

Source: `preview-desktop.png`, `preview-mobile.png`, and supplied assets. The user explicitly selected this as the style for the entire TidePath app. Palette and font names come from the HTML, with visual hierarchy checked against both previews. See docs/STYLE-REFERENCE.md for supplied photo credits.

## Genre and structure

Modern-minimal, with a bold community-service brand voice. App pages use a Workbench family: a persistent navy navigation rail, white utility bar, navy page heading, task-focused white panels and responsive tables. Dashboard metrics use a muted blue-gray band. Programs use photo-led numbered cards. Registration uses a navy form surface; login combines navy text and supplied photography with a white sign-in area. Content pages and printable reports keep readable, quiet typography.

## Palette

Navy `#0B1B2B`, secondary navy `#132A40`, tangerine `#FF5A1F`, muted blue-gray `#CAD8E4`, white `#FFFFFF`, mist `#F2F4F7`. Supporting sky and sun accents come from the reference. CSS uses equivalent OKLCH values in public/tokens.css. Orange fills carry navy text. Small orange links use a darker accessible orange. Use light text and muted-blue text on navy surfaces. Status text and icons accompany color.

## Typography

Display and wordmark: Bricolage Grotesque, weights 700–800, tight tracking. Body and controls: Inter Tight, weights 400–700. Headings have short line heights without glyph collisions. Operational page titles remain compact; the login heading can be larger. Numbers are tabular.

## Spacing and controls

Named 4-point spacing scale in tokens.css. Cards use 12px corners; controls use 8px. Touch targets remain at least 44px. Visible labels, stable input borders, instantly visible focus rings and explicit loading/error states are required. Primary buttons are tangerine with navy text. Secondary buttons are outlined or navy depending on their surface. No uniform hover-scale effects or layout animations. Respect reduced-motion preferences.

## Screen rules

- Dashboard: navy introduction, muted blue-gray live-data metrics, white task panels. Show actual demo totals, not the organization's annual reach figures.
- Programs: supplied photos, large ordinal numerals and colored category chips; all five profiles remain available.
- Participants, attendance, follow-ups, volunteers: readable white working surfaces with navy headings, orange actions and coherent status colors. Preserve functional density and all existing controls.
- Registration: navy form panel with lighter navy fields, white labels, muted blue-gray selection/focus states and an orange submit button. Keep current language controls and registration API.
- Reports: use the same typography and accents on screen, with a quiet print stylesheet.
- Modals: navy heading, white content and the same form/control states. Illustrative program photos may appear in program details.
- Mobile: top navigation scrolls horizontally; tables scroll inside their panels; attendance becomes a touch-friendly roster; program cards stack. No page-wide horizontal overflow.

## Images

Photos are illustrative user-supplied assets, not images of the fictional children or actual counseling clients. Use the supplied orange mark. Operational tables and rosters do not need photographs. Avoid adding decorative illustrations to task screens.

## Exports

### CSS tokens

```css
/* TidePath · reference palette converted from sRGB to OKLCH. */
:root {
  --color-paper: oklch(96.648% 0.00454 258.325); /* #F2F4F7 */
  --color-surface: oklch(100.000% 0.00000 89.876); /* #FFFFFF */
  --color-ink: oklch(21.710% 0.03847 250.010); /* #0B1B2B */
  --color-muted: oklch(45.463% 0.03157 251.944); /* #4A5868 */
  --color-rule: oklch(91.070% 0.00980 252.816); /* #DDE2E8 */
  --color-accent: oklch(68.235% 0.21076 37.698); /* #FF5A1F */
  --color-accent-ink: oklch(21.710% 0.03847 250.010); /* #0B1B2B */
  --color-accent-text: oklch(51.401% 0.18142 34.207); /* #B82C04 */
  --color-tint: oklch(94.329% 0.01035 247.936); /* #E7EDF3 */
  --color-highlight: oklch(87.526% 0.02247 243.834); /* #CAD8E4 */
  --color-dark: oklch(21.710% 0.03847 250.010); /* #0B1B2B */
  --color-dark-2: oklch(27.803% 0.05025 249.120); /* #132A40 */
  --color-dark-3: oklch(33.997% 0.05872 249.124); /* #1E3A55 */
  --color-rule-dark: oklch(38.831% 0.05738 248.652); /* #2B4762 */
  --color-on-dark: oklch(100.000% 0.00000 89.876); /* #FFFFFF */
  --color-muted-dark: oklch(82.057% 0.02321 248.111); /* #B9C6D3 */
  --color-sky: oklch(75.898% 0.12410 258.404); /* #7FB2FF */
  --color-sun: oklch(84.800% 0.15628 82.442); /* #FFC23D */
  --color-warning: oklch(42.217% 0.09161 69.717); /* #6D4300 */
  --color-warning-bg: oklch(96.252% 0.04761 90.056); /* #FFF2CF */
  --color-error: oklch(47.035% 0.16421 30.137); /* #A32518 */
  --color-error-bg: oklch(94.645% 0.02207 24.441); /* #FCE8E6 */
  --color-focus: oklch(54.761% 0.24991 264.082); /* #1F5BFF */
  --color-blue: oklch(36.351% 0.11675 259.190); /* #123B7A */
  --color-blue-bg: oklch(95.280% 0.02240 260.723); /* #E7F0FF */
  --color-overlay: oklch(20% .04 250 / .62);
  --color-photo-shadow: oklch(17% .04 250 / .78);
  --font-body: 'Inter Tight', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
  --font-wordmark: var(--font-display);
  --space-xs: 4px; --space-sm: 8px; --space-md: 12px; --space-lg: 16px;
  --space-xl: 24px; --space-2xl: 32px; --space-3xl: 48px; --space-4xl: 64px;
  --text-xs: .8125rem; --text-sm: .9375rem; --text-base: 1rem;
  --text-lg: 1.25rem; --text-xl: 1.5625rem; --text-2xl: 2.125rem;
  --text-display: clamp(2rem, 3.5vw, 3rem);
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --rule-width: 1px;
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-in: cubic-bezier(.55, 0, 1, .45);
  --ease-in-out: cubic-bezier(.65, 0, .35, 1); --dur-fast: 120ms;
}
```

### Tailwind v4

```css
@theme {
  --color-paper: oklch(96.648% 0.00454 258.325);
  --color-surface: oklch(100.000% 0.00000 89.876);
  --color-ink: oklch(21.710% 0.03847 250.010);
  --color-muted: oklch(45.463% 0.03157 251.944);
  --color-rule: oklch(91.070% 0.00980 252.816);
  --color-accent: oklch(68.235% 0.21076 37.698);
  --color-accent-ink: oklch(21.710% 0.03847 250.010);
  --color-accent-text: oklch(51.401% 0.18142 34.207);
  --color-tint: oklch(94.329% 0.01035 247.936);
  --color-highlight: oklch(87.526% 0.02247 243.834);
  --color-dark: oklch(21.710% 0.03847 250.010);
  --color-dark-2: oklch(27.803% 0.05025 249.120);
  --color-dark-3: oklch(33.997% 0.05872 249.124);
  --color-rule-dark: oklch(38.831% 0.05738 248.652);
  --color-on-dark: oklch(100.000% 0.00000 89.876);
  --color-muted-dark: oklch(82.057% 0.02321 248.111);
  --color-sky: oklch(75.898% 0.12410 258.404);
  --color-sun: oklch(84.800% 0.15628 82.442);
  --color-warning: oklch(42.217% 0.09161 69.717);
  --color-warning-bg: oklch(96.252% 0.04761 90.056);
  --color-error: oklch(47.035% 0.16421 30.137);
  --color-error-bg: oklch(94.645% 0.02207 24.441);
  --color-focus: oklch(54.761% 0.24991 264.082);
  --color-blue: oklch(36.351% 0.11675 259.190);
  --color-blue-bg: oklch(95.280% 0.02240 260.723);
  --color-overlay: oklch(20% .04 250 / .62);
  --color-photo-shadow: oklch(17% .04 250 / .78);
  --font-body: 'Inter Tight', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
  --font-wordmark: var(--font-display);
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
  --spacing-3xl: 48px;
  --spacing-4xl: 64px;
  --text-xs: .8125rem;
  --text-sm: .9375rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5625rem;
  --text-2xl: 2.125rem;
  --text-display: clamp(2rem, 3.5vw, 3rem);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-in: cubic-bezier(.55, 0, 1, .45);
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);
}
```

### DTCG tokens

```json
{
  "color": {
    "paper": {
      "$type": "color",
      "$value": "oklch(96.648% 0.00454 258.325)"
    },
    "surface": {
      "$type": "color",
      "$value": "oklch(100.000% 0.00000 89.876)"
    },
    "ink": {
      "$type": "color",
      "$value": "oklch(21.710% 0.03847 250.010)"
    },
    "muted": {
      "$type": "color",
      "$value": "oklch(45.463% 0.03157 251.944)"
    },
    "rule": {
      "$type": "color",
      "$value": "oklch(91.070% 0.00980 252.816)"
    },
    "accent": {
      "$type": "color",
      "$value": "oklch(68.235% 0.21076 37.698)"
    },
    "accent-ink": {
      "$type": "color",
      "$value": "oklch(21.710% 0.03847 250.010)"
    },
    "accent-text": {
      "$type": "color",
      "$value": "oklch(51.401% 0.18142 34.207)"
    },
    "tint": {
      "$type": "color",
      "$value": "oklch(94.329% 0.01035 247.936)"
    },
    "highlight": {
      "$type": "color",
      "$value": "oklch(87.526% 0.02247 243.834)"
    },
    "dark": {
      "$type": "color",
      "$value": "oklch(21.710% 0.03847 250.010)"
    },
    "dark-2": {
      "$type": "color",
      "$value": "oklch(27.803% 0.05025 249.120)"
    },
    "dark-3": {
      "$type": "color",
      "$value": "oklch(33.997% 0.05872 249.124)"
    },
    "rule-dark": {
      "$type": "color",
      "$value": "oklch(38.831% 0.05738 248.652)"
    },
    "on-dark": {
      "$type": "color",
      "$value": "oklch(100.000% 0.00000 89.876)"
    },
    "muted-dark": {
      "$type": "color",
      "$value": "oklch(82.057% 0.02321 248.111)"
    },
    "sky": {
      "$type": "color",
      "$value": "oklch(75.898% 0.12410 258.404)"
    },
    "sun": {
      "$type": "color",
      "$value": "oklch(84.800% 0.15628 82.442)"
    },
    "warning": {
      "$type": "color",
      "$value": "oklch(42.217% 0.09161 69.717)"
    },
    "warning-bg": {
      "$type": "color",
      "$value": "oklch(96.252% 0.04761 90.056)"
    },
    "error": {
      "$type": "color",
      "$value": "oklch(47.035% 0.16421 30.137)"
    },
    "error-bg": {
      "$type": "color",
      "$value": "oklch(94.645% 0.02207 24.441)"
    },
    "focus": {
      "$type": "color",
      "$value": "oklch(54.761% 0.24991 264.082)"
    },
    "blue": {
      "$type": "color",
      "$value": "oklch(36.351% 0.11675 259.190)"
    },
    "blue-bg": {
      "$type": "color",
      "$value": "oklch(95.280% 0.02240 260.723)"
    },
    "overlay": {
      "$type": "color",
      "$value": "oklch(20% .04 250 / .62)"
    },
    "photo-shadow": {
      "$type": "color",
      "$value": "oklch(17% .04 250 / .78)"
    }
  },
  "font": {
    "body": {
      "$type": "fontFamily",
      "$value": "'Inter Tight', ui-sans-serif, system-ui, sans-serif"
    },
    "display": {
      "$type": "fontFamily",
      "$value": "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif"
    },
    "wordmark": {
      "$type": "fontFamily",
      "$value": "var(--font-display)"
    }
  },
  "space": {
    "xs": {
      "$type": "dimension",
      "$value": "4px"
    },
    "sm": {
      "$type": "dimension",
      "$value": "8px"
    },
    "md": {
      "$type": "dimension",
      "$value": "12px"
    },
    "lg": {
      "$type": "dimension",
      "$value": "16px"
    },
    "xl": {
      "$type": "dimension",
      "$value": "24px"
    },
    "2xl": {
      "$type": "dimension",
      "$value": "32px"
    },
    "3xl": {
      "$type": "dimension",
      "$value": "48px"
    },
    "4xl": {
      "$type": "dimension",
      "$value": "64px"
    }
  },
  "radius": {
    "sm": {
      "$type": "dimension",
      "$value": "8px"
    },
    "md": {
      "$type": "dimension",
      "$value": "12px"
    },
    "lg": {
      "$type": "dimension",
      "$value": "16px"
    }
  }
}
```

### shadcn/ui variables

```css
:root {
  --background: var(--color-paper);
  --foreground: var(--color-ink);
  --primary: var(--color-accent);
  --primary-foreground: var(--color-accent-ink);
  --secondary: var(--color-dark);
  --secondary-foreground: var(--color-on-dark);
  --muted: var(--color-paper);
  --muted-foreground: var(--color-muted);
  --border: var(--color-rule);
  --input: var(--color-rule);
  --ring: var(--color-focus);
  --radius: var(--radius-md);
}
```
