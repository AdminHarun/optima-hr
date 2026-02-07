// Optima Chat Theme - Based on brand colors
// Blue-green gradient: #1c61ab (blue) to #8bb94a (green)

export const optimaChatTheme = {
  // Primary brand colors
  primary: {
    main: '#1c61ab', // Optima blue
    light: '#4a8bd4',
    dark: '#144887',
    contrastText: '#ffffff'
  },

  // Secondary accent colors
  secondary: {
    main: '#8bb94a', // Optima green
    light: '#a8ca6f',
    dark: '#6b9337',
    contrastText: '#ffffff'
  },

  // Background colors
  background: {
    default: '#f5f6f7',
    paper: '#ffffff',
    chat: '#f5f6f7',
    message: '#ffffff',
    ownMessage: '#e3f2fd', // Light blue for own messages
    hover: 'rgba(28, 97, 171, 0.04)' // Subtle blue hover
  },

  // Text colors
  text: {
    primary: '#2c3e50',
    secondary: '#6c757d',
    disabled: '#adb5bd',
    hint: '#adb5bd'
  },

  // Status colors
  status: {
    online: '#44b700',
    offline: '#bdbdbd',
    away: '#ffa726',
    busy: '#ef5350'
  },

  // Message status colors
  messageStatus: {
    sending: '#adb5bd',
    sent: '#6c757d',
    delivered: '#6c757d',
    read: '#1c61ab', // Optima blue
    failed: '#ef5350'
  },

  // Semantic colors
  success: {
    main: '#8bb94a',
    light: '#a8ca6f',
    dark: '#6b9337'
  },

  error: {
    main: '#ef5350',
    light: '#ff6f6c',
    dark: '#c62828'
  },

  warning: {
    main: '#ffa726',
    light: '#ffb74d',
    dark: '#f57c00'
  },

  info: {
    main: '#1c61ab',
    light: '#4a8bd4',
    dark: '#144887'
  },

  // Divider
  divider: 'rgba(0, 0, 0, 0.12)',

  // Borders
  border: {
    light: '#e9ecef',
    main: '#dee2e6',
    dark: '#ced4da'
  },

  // Shadows
  shadows: {
    message: '0 1px 2px rgba(0, 0, 0, 0.05)',
    toolbar: '0 2px 8px rgba(0, 0, 0, 0.15)',
    composer: '0 -2px 8px rgba(0, 0, 0, 0.08)',
    header: '0 1px 4px rgba(0, 0, 0, 0.08)'
  },

  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
    primarySubtle: 'linear-gradient(135deg, rgba(28, 97, 171, 0.1) 0%, rgba(139, 185, 74, 0.1) 100%)',
    header: 'linear-gradient(90deg, #1c61ab 0%, #4a8bd4 100%)'
  },

  // Typography
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: {
      small: '0.75rem',
      body: '0.875rem',
      message: '0.9375rem',
      large: '1rem'
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },

  // Border radius
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    round: 24,
    circle: '50%'
  },

  // Transitions
  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms'
  },

  // Z-index
  zIndex: {
    header: 10,
    toolbar: 20,
    popover: 30,
    modal: 40,
    tooltip: 50
  }
};

// Helper function to apply Optima theme to MUI theme
export const applyOptimaTheme = (muiTheme) => {
  return {
    ...muiTheme,
    palette: {
      ...muiTheme.palette,
      primary: optimaChatTheme.primary,
      secondary: optimaChatTheme.secondary,
      background: optimaChatTheme.background,
      text: optimaChatTheme.text,
      success: optimaChatTheme.success,
      error: optimaChatTheme.error,
      warning: optimaChatTheme.warning,
      info: optimaChatTheme.info,
      divider: optimaChatTheme.divider
    },
    typography: {
      ...muiTheme.typography,
      fontFamily: optimaChatTheme.typography.fontFamily
    },
    shape: {
      ...muiTheme.shape,
      borderRadius: optimaChatTheme.borderRadius.medium
    }
  };
};

export default optimaChatTheme;
