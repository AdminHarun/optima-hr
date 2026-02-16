/**
 * useDynamicTheme - Image-to-Theme Color Extraction Hook
 *
 * Extracts dominant colors from images and applies them as theme variables.
 * Uses ColorThief library for color extraction.
 */

import { useState, useCallback } from 'react';
import ColorThief from 'colorthief';

const colorThief = new ColorThief();

export const useDynamicTheme = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedColors, setExtractedColors] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Extract colors from an image source
   * @param {string} imageSource - URL or data URL of the image
   * @returns {Promise<object>} Extracted colors
   */
  const extractColors = useCallback(async (imageSource) => {
    setIsExtracting(true);
    setError(null);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          // Get dominant color
          const dominantRgb = colorThief.getColor(img);

          // Get color palette (5 colors)
          const palette = colorThief.getPalette(img, 5);

          const colors = {
            dominant: rgbToHex(dominantRgb),
            dominantRgb: dominantRgb,
            palette: palette.map(rgbToHex),
            paletteRgb: palette,
            accent: rgbToHex(palette[1]), // Second most dominant
            secondary: rgbToHex(palette[2]),
            text: getContrastText(dominantRgb),
            // Generate shades
            dominantLight: adjustBrightness(dominantRgb, 30),
            dominantDark: adjustBrightness(dominantRgb, -30),
          };

          setExtractedColors(colors);
          setIsExtracting(false);
          resolve(colors);
        } catch (err) {
          setIsExtracting(false);
          setError(err.message);
          reject(err);
        }
      };

      img.onerror = (err) => {
        setIsExtracting(false);
        setError('Failed to load image');
        reject(new Error('Failed to load image'));
      };

      img.src = imageSource;
    });
  }, []);

  /**
   * Apply extracted colors to CSS custom properties
   * @param {object} colors - Colors object from extractColors
   */
  const applyColorsToTheme = useCallback((colors) => {
    if (!colors) return;

    const root = document.documentElement;

    // Primary colors
    root.style.setProperty('--theme-primary', colors.dominant);
    root.style.setProperty('--theme-accent', colors.accent);
    root.style.setProperty('--theme-secondary', colors.secondary);

    // RGB values for rgba() usage
    root.style.setProperty('--theme-primary-rgb', colors.dominantRgb.join(','));
    root.style.setProperty('--theme-accent-rgb', colors.paletteRgb[1].join(','));

    // Sidebar (dominant color based transparent)
    root.style.setProperty('--theme-sidebar-bg',
      `rgba(${colors.dominantRgb.join(',')}, 0.2)`);
    root.style.setProperty('--theme-sidebar-active',
      `rgba(${colors.dominantRgb.join(',')}, 0.35)`);
    root.style.setProperty('--theme-sidebar-hover',
      `rgba(${colors.dominantRgb.join(',')}, 0.25)`);

    // Header
    root.style.setProperty('--theme-header-bg',
      `rgba(${colors.dominantRgb.join(',')}, 0.25)`);

    // Text contrast
    root.style.setProperty('--theme-sidebar-text', colors.text);
    root.style.setProperty('--theme-header-text', colors.text);

    // Card backgrounds
    root.style.setProperty('--theme-card-bg', 'rgba(255, 255, 255, 0.12)');
    root.style.setProperty('--theme-card-text', colors.text);
    root.style.setProperty('--theme-card-border', 'rgba(255, 255, 255, 0.25)');

    // Buttons
    root.style.setProperty('--theme-button-primary',
      `linear-gradient(135deg, ${colors.dominant} 0%, ${colors.accent} 100%)`);
    root.style.setProperty('--theme-button-text', colors.text);

    // Add transition class for smooth changes
    document.body.classList.add('theme-transition');
    setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, 300);

  }, []);

  /**
   * Generate a complete theme object from colors
   * @param {object} colors - Colors object from extractColors
   * @returns {object} Theme configuration
   */
  const generateThemeConfig = useCallback((colors, name = 'Custom Theme', wallpaper = null) => {
    if (!colors) return null;

    return {
      id: `custom-${Date.now()}`,
      name,
      description: 'User generated theme',
      wallpaper: wallpaper || '/site_background.jpg',
      preview: wallpaper,
      isCustom: true,
      colors: {
        primary: colors.dominant,
        secondary: colors.secondary,
        accent: colors.accent,
        sidebar: {
          bg: `rgba(${colors.dominantRgb.join(',')}, 0.2)`,
          text: colors.text,
          active: `rgba(${colors.dominantRgb.join(',')}, 0.35)`,
          hover: `rgba(${colors.dominantRgb.join(',')}, 0.25)`,
        },
        card: {
          bg: 'rgba(255, 255, 255, 0.12)',
          border: 'rgba(255, 255, 255, 0.25)',
          shadow: `0 8px 32px rgba(${colors.dominantRgb.join(',')}, 0.2)`,
          text: colors.text,
        },
        header: {
          bg: `rgba(${colors.dominantRgb.join(',')}, 0.25)`,
          text: colors.text,
        },
        button: {
          primary: `linear-gradient(135deg, ${colors.dominant} 0%, ${colors.accent} 100%)`,
          secondary: 'rgba(255, 255, 255, 0.15)',
          text: colors.text,
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
      glass: {
        blur: '20px',
        saturation: '180%',
        opacity: '0.15',
        borderOpacity: '0.25',
      },
    };
  }, []);

  /**
   * Reset to default theme
   */
  const resetTheme = useCallback(() => {
    const root = document.documentElement;

    // Remove custom properties
    const customProps = [
      '--theme-primary', '--theme-accent', '--theme-secondary',
      '--theme-primary-rgb', '--theme-accent-rgb',
      '--theme-sidebar-bg', '--theme-sidebar-active', '--theme-sidebar-hover',
      '--theme-header-bg', '--theme-sidebar-text', '--theme-header-text',
      '--theme-card-bg', '--theme-card-text', '--theme-card-border',
      '--theme-button-primary', '--theme-button-text'
    ];

    customProps.forEach(prop => {
      root.style.removeProperty(prop);
    });

    setExtractedColors(null);
  }, []);

  return {
    extractColors,
    applyColorsToTheme,
    generateThemeConfig,
    resetTheme,
    isExtracting,
    extractedColors,
    error
  };
};

// ==================== Utility Functions ====================

/**
 * Convert RGB array to hex color
 */
const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

/**
 * Convert hex to RGB array
 */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

/**
 * Calculate relative luminance (WCAG)
 */
const getLuminance = ([r, g, b]) => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Get contrasting text color (black or white)
 */
const getContrastText = (rgb) => {
  const luminance = getLuminance(rgb);
  return luminance > 0.179 ? '#1a1a1a' : '#FFFFFF';
};

/**
 * Adjust brightness of RGB color
 */
const adjustBrightness = (rgb, amount) => {
  const adjusted = rgb.map(c => Math.max(0, Math.min(255, c + amount)));
  return rgbToHex(adjusted);
};

/**
 * Check contrast ratio between two colors
 */
const getContrastRatio = (color1, color2) => {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export default useDynamicTheme;
