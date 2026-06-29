import { createTheme, type Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

/** Design tokens extracted verbatim from the approved V1.3 mockup (--pt-* custom properties). */
export interface Tokens {
  bg: string;
  surface: string;
  surface2: string;
  sidebar: string;
  text: string;
  muted: string;
  faint: string;
  border: string;
  border2: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  onPrimary: string;
  violet: string;
  violetSoft: string;
  success: string;
  successSoft: string;
  amber: string;
  amberSoft: string;
  red: string;
  redSoft: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

const LIGHT: Tokens = {
  bg: '#f4f6fb',
  surface: '#ffffff',
  surface2: '#f1f5f9',
  sidebar: '#ffffff',
  text: '#0f172a',
  muted: '#475569',
  faint: '#94a3b8',
  border: '#e6eaf1',
  border2: '#cbd5e1',
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: '#eaf1ff',
  onPrimary: '#ffffff',
  violet: '#7c3aed',
  violetSoft: '#f3edff',
  success: '#15803d',
  successSoft: '#e7f6ec',
  amber: '#b45309',
  amberSoft: '#fbf0db',
  red: '#dc2626',
  redSoft: '#fdecec',
  shadowSm: '0 1px 2px rgba(15,23,42,.06),0 1px 3px rgba(15,23,42,.05)',
  shadowMd: '0 6px 18px rgba(15,23,42,.09),0 2px 6px rgba(15,23,42,.05)',
  shadowLg: '0 22px 48px rgba(15,23,42,.16),0 8px 18px rgba(15,23,42,.08)',
};

const DARK: Tokens = {
  bg: '#080c16',
  surface: '#0f1626',
  surface2: '#172033',
  sidebar: '#0c1220',
  text: '#e8ecf4',
  muted: '#9aa6bd',
  faint: '#64748b',
  border: '#1d2740',
  border2: '#33415c',
  primary: '#5b8bf7',
  primaryHover: '#7aa3fb',
  primarySoft: '#16223f',
  onPrimary: '#ffffff',
  violet: '#a78bfa',
  violetSoft: '#211a3d',
  success: '#34d399',
  successSoft: '#0f2a20',
  amber: '#fbbf24',
  amberSoft: '#2c2008',
  red: '#f87171',
  redSoft: '#2c1416',
  shadowSm: '0 1px 2px rgba(0,0,0,.4)',
  shadowMd: '0 6px 18px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.3)',
  shadowLg: '0 22px 48px rgba(0,0,0,.6),0 8px 18px rgba(0,0,0,.4)',
};

export const TOKENS: Record<ThemeMode, Tokens> = { light: LIGHT, dark: DARK };

/** The brand gradient used on the logo mark + accents. */
export const BRAND_GRADIENT = (t: Tokens) =>
  `linear-gradient(135deg, ${t.primary} 0%, ${t.violet} 100%)`;

export function getTheme(mode: ThemeMode): Theme {
  const t = TOKENS[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: t.primary, dark: t.primaryHover, contrastText: t.onPrimary },
      secondary: { main: t.violet, contrastText: '#ffffff' },
      success: { main: t.success },
      warning: { main: t.amber },
      error: { main: t.red },
      info: { main: t.primary },
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.text, secondary: t.muted },
      divider: t.border,
    },
    typography: {
      fontFamily: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: { fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600 },
      body1: { lineHeight: 1.6 },
      button: { fontWeight: 600, textTransform: 'none', fontSize: '0.84rem' },
    },
    shape: { borderRadius: 10 },
    components: {
      // Flat surfaces — kill MUI's dark-mode elevation overlay so colors match the tokens.
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowSm,
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, padding: '8px 16px', boxShadow: 'none' },
          contained: { '&:hover': { boxShadow: t.shadowMd } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 600 },
        },
      },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiTextField: { defaultProps: { variant: 'outlined' } },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: t.surface,
            color: t.text,
            boxShadow: 'none',
            borderBottom: `1px solid ${t.border}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: t.sidebar,
            borderRight: `1px solid ${t.border}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '&.Mui-selected': {
              backgroundColor: t.primarySoft,
              color: t.primary,
              '& .MuiListItemIcon-root': { color: t.primary },
              '&:hover': { backgroundColor: t.primarySoft },
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8, fontSize: '0.75rem' } },
      },
    },
  });
}

/** Default (light) theme — kept for tests that import the theme directly. */
const theme = getTheme('light');
export default theme;
