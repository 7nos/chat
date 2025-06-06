// Design System Configuration
export const theme = {
  colors: {
    // Primary Colors
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
    // Neutral Colors
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#4b5563',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    // Semantic Colors
    success: {
      500: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.1)',
    },
    warning: {
      500: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    error: {
      500: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    info: {
      500: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
    },
    // Dark Theme Colors
    dark: {
      bg: {
        main: '#0f172a',
        sidebar: '#1e293b',
        header: '#1e293b',
        messages: '#0f172a',
        input: '#334155',
        widget: '#1e293b',
        card: '#1e293b',
      },
      text: {
        primary: '#f8fafc',
        secondary: '#94a3b8',
        muted: '#64748b',
      },
      border: {
        color: '#334155',
        light: '#475569',
      },
    },
  },
  spacing: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  typography: {
    fontFamily: {
      sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
};

// CSS Variables for use in CSS files
export const cssVariables = Object.entries(theme).reduce((acc, [key, value]) => {
  if (typeof value === 'object') {
    Object.entries(value).forEach(([subKey, subValue]) => {
      if (typeof subValue === 'object') {
        Object.entries(subValue).forEach(([nestedKey, nestedValue]) => {
          acc[`--${key}-${subKey}-${nestedKey}`] = nestedValue;
        });
      } else {
        acc[`--${key}-${subKey}`] = subValue;
      }
    });
  } else {
    acc[`--${key}`] = value;
  }
  return acc;
}, {});

// Helper function to generate CSS variables string
export const generateCssVariables = () => {
  return `:root {\n${Object.entries(cssVariables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')}\n}`;
};

export default theme; 