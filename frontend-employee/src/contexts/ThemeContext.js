// ThemeContext.js - Liquid Glass Theme System for Optima HR
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// WCAG Luminance Contrast Algorithm
// Calculates relative luminance of a color
const getLuminance = (hexColor) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

// Returns appropriate text color based on background luminance (WCAG AA)
export const getContrastText = (bgColor) => {
  if (!bgColor || bgColor.includes('gradient') || bgColor.includes('rgba')) {
    return '#FFFFFF'; // Default to white for gradients/transparent
  }
  const luminance = getLuminance(bgColor);
  return luminance > 0.179 ? '#1a1a1a' : '#FFFFFF'; // Dark text on light bg, white on dark
};

// Liquid Glass Theme definitions
export const THEMES = [
  // ==================== BASIC THEMES (Original Solid Design) ====================
  {
    id: 'basic-light',
    name: 'Basic Light',
    description: 'Klasik açık tema',
    wallpaper: '/site_background.jpg',
    preview: null,
    isBasic: true,
    colors: {
      primary: '#1c61ab',
      secondary: '#8bb94a',
      accent: '#6366f1',
      sidebar: {
        bg: 'linear-gradient(180deg, rgba(28, 97, 171, 0.95) 0%, rgba(139, 185, 74, 0.95) 100%)',
        text: '#FFFFFF',
        active: 'rgba(255, 255, 255, 0.2)',
        hover: 'rgba(255, 255, 255, 0.1)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.95)',
        border: 'rgba(28, 97, 171, 0.1)',
        shadow: '0 8px 32px rgba(28, 97, 171, 0.15)',
        text: '#1a1a1a',
      },
      header: {
        bg: 'linear-gradient(135deg, rgba(28, 97, 171, 0.95), rgba(139, 185, 74, 0.95))',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
        secondary: 'rgba(255, 255, 255, 0.15)',
        text: '#FFFFFF',
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
      opacity: '0.95',
      borderOpacity: '0.1',
    },
  },
  {
    id: 'basic-dark',
    name: 'Basic Dark',
    description: 'Klasik koyu tema',
    wallpaper: '/site_background.jpg',
    preview: null,
    isBasic: true,
    colors: {
      primary: '#4a9eff',
      secondary: '#a4d65e',
      accent: '#818cf8',
      sidebar: {
        bg: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
        text: '#FFFFFF',
        active: 'rgba(74, 158, 255, 0.3)',
        hover: 'rgba(255, 255, 255, 0.08)',
      },
      card: {
        bg: 'rgba(30, 41, 59, 0.95)',
        border: 'rgba(255, 255, 255, 0.1)',
        shadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        text: '#FFFFFF',
      },
      header: {
        bg: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #4a9eff 0%, #a4d65e 100%)',
        secondary: 'rgba(255, 255, 255, 0.1)',
        text: '#FFFFFF',
      },
      status: {
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#60A5FA',
      },
    },
    glass: {
      blur: '20px',
      saturation: '150%',
      opacity: '0.98',
      borderOpacity: '0.15',
    },
  },
  // ==================== WALLPAPER THEMES (Transparent Glass) ====================
  {
    id: 'sakura-sunset',
    name: 'Sakura Sunset',
    description: 'Japon kiraz çiçekleri',
    wallpaper: '/wallpapers/31214-1920x1080-desktop-1080p-japan-background-image.jpg',
    preview: '/wallpapers/31214-1920x1080-desktop-1080p-japan-background-image.jpg',
    colors: {
      primary: '#8B5CF6',
      secondary: '#EC4899',
      accent: '#F97316',
      sidebar: {
        bg: 'rgba(139, 92, 246, 0.15)',
        text: '#FFFFFF',
        active: 'rgba(236, 72, 153, 0.35)',
        hover: 'rgba(139, 92, 246, 0.25)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.12)',
        border: 'rgba(255, 255, 255, 0.25)',
        shadow: '0 8px 32px rgba(139, 92, 246, 0.2)',
        text: '#FFFFFF',
      },
      header: {
        bg: 'rgba(139, 92, 246, 0.2)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
        secondary: 'rgba(255, 255, 255, 0.15)',
        text: '#FFFFFF',
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
      borderOpacity: '0.3',
    },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Turkuaz deniz manzarası',
    wallpaper: '/wallpapers/711007-2000x1500-desktop-hd-miyako-island-wallpaper-image.jpg',
    preview: '/wallpapers/711007-2000x1500-desktop-hd-miyako-island-wallpaper-image.jpg',
    colors: {
      primary: '#06B6D4',
      secondary: '#14B8A6',
      accent: '#10B981',
      sidebar: {
        bg: 'rgba(6, 182, 212, 0.15)',
        text: '#FFFFFF',
        active: 'rgba(20, 184, 166, 0.35)',
        hover: 'rgba(6, 182, 212, 0.25)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.12)',
        border: 'rgba(255, 255, 255, 0.25)',
        shadow: '0 8px 32px rgba(6, 182, 212, 0.2)',
        text: '#FFFFFF',
      },
      header: {
        bg: 'rgba(6, 182, 212, 0.2)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #06B6D4 0%, #14B8A6 100%)',
        secondary: 'rgba(255, 255, 255, 0.15)',
        text: '#FFFFFF',
      },
      status: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#06B6D4',
      },
    },
    glass: {
      blur: '24px',
      saturation: '160%',
      opacity: '0.12',
      borderOpacity: '0.25',
    },
  },
  {
    id: 'alpine-night',
    name: 'Alpine Night',
    description: 'Karlı dağlar ve sıcak ışıklar',
    wallpaper: '/wallpapers/bad-goisern-hallstatter-see-lake-in-salzkammergut-austria-night-landscape-desktop-hd-wallpaper-for-pc-tablet-and-mobile-3840×2160-wallpaper-e8864db830907ca8c07c41ce0862344a.jpg',
    preview: '/wallpapers/bad-goisern-hallstatter-see-lake-in-salzkammergut-austria-night-landscape-desktop-hd-wallpaper-for-pc-tablet-and-mobile-3840×2160-wallpaper-e8864db830907ca8c07c41ce0862344a.jpg',
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#F59E0B',
      sidebar: {
        bg: 'rgba(30, 58, 138, 0.35)',
        text: '#FFFFFF',
        active: 'rgba(59, 130, 246, 0.45)',
        hover: 'rgba(30, 58, 138, 0.5)',
      },
      card: {
        bg: 'rgba(15, 23, 42, 0.45)',
        border: 'rgba(255, 255, 255, 0.15)',
        shadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      header: {
        bg: 'rgba(30, 58, 138, 0.4)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        secondary: 'rgba(255, 255, 255, 0.1)',
        text: '#FFFFFF',
      },
      status: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
    glass: {
      blur: '30px',
      saturation: '140%',
      opacity: '0.25',
      borderOpacity: '0.2',
    },
  },
  {
    id: 'golden-meadows',
    name: 'Golden Meadows',
    description: 'Sisli tepeler ve sabah güneşi',
    wallpaper: '/wallpapers/nature-trees-hills-mist-wallpaper-98d61c7abf8c97591e3029d21269ebb0.jpg',
    preview: '/wallpapers/nature-trees-hills-mist-wallpaper-98d61c7abf8c97591e3029d21269ebb0.jpg',
    colors: {
      primary: '#84CC16',
      secondary: '#EAB308',
      accent: '#F97316',
      sidebar: {
        bg: 'rgba(132, 204, 22, 0.2)',
        text: '#FFFFFF',
        active: 'rgba(234, 179, 8, 0.4)',
        hover: 'rgba(132, 204, 22, 0.3)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.15)',
        border: 'rgba(255, 255, 255, 0.3)',
        shadow: '0 8px 32px rgba(132, 204, 22, 0.25)',
      },
      header: {
        bg: 'rgba(132, 204, 22, 0.25)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #84CC16 0%, #EAB308 100%)',
        secondary: 'rgba(255, 255, 255, 0.15)',
        text: '#FFFFFF',
      },
      status: {
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
    glass: {
      blur: '18px',
      saturation: '170%',
      opacity: '0.15',
      borderOpacity: '0.28',
    },
  },
  {
    id: 'autumn-reflection',
    name: 'Autumn Reflection',
    description: 'Sonbahar renkleri ve yansıma',
    wallpaper: '/wallpapers/wp3404850.jpg',
    preview: '/wallpapers/wp3404850.jpg',
    colors: {
      primary: '#D97706',
      secondary: '#65A30D',
      accent: '#DC2626',
      sidebar: {
        bg: 'rgba(217, 119, 6, 0.2)',
        text: '#FFFFFF',
        active: 'rgba(101, 163, 13, 0.4)',
        hover: 'rgba(217, 119, 6, 0.3)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.12)',
        border: 'rgba(255, 255, 255, 0.25)',
        shadow: '0 8px 32px rgba(217, 119, 6, 0.2)',
      },
      header: {
        bg: 'rgba(217, 119, 6, 0.25)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #D97706 0%, #65A30D 100%)',
        secondary: 'rgba(255, 255, 255, 0.15)',
        text: '#FFFFFF',
      },
      status: {
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#DC2626',
        info: '#3B82F6',
      },
    },
    glass: {
      blur: '22px',
      saturation: '160%',
      opacity: '0.14',
      borderOpacity: '0.26',
    },
  },
  {
    id: 'tropical-cave',
    name: 'Tropical Cave',
    description: 'Mağara ve turkuaz deniz',
    wallpaper: '/wallpapers/wp5143119.jpg',
    preview: '/wallpapers/wp5143119.jpg',
    colors: {
      primary: '#0891B2',
      secondary: '#06B6D4',
      accent: '#22D3EE',
      sidebar: {
        bg: 'rgba(8, 145, 178, 0.2)',
        text: '#FFFFFF',
        active: 'rgba(6, 182, 212, 0.4)',
        hover: 'rgba(8, 145, 178, 0.3)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.1)',
        border: 'rgba(255, 255, 255, 0.2)',
        shadow: '0 8px 32px rgba(8, 145, 178, 0.25)',
      },
      header: {
        bg: 'rgba(8, 145, 178, 0.25)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)',
        secondary: 'rgba(255, 255, 255, 0.12)',
        text: '#FFFFFF',
      },
      status: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#06B6D4',
      },
    },
    glass: {
      blur: '28px',
      saturation: '150%',
      opacity: '0.12',
      borderOpacity: '0.22',
    },
  },
  {
    id: 'alpine-lake',
    name: 'Alpine Lake',
    description: 'Alp gölü manzarası',
    wallpaper: '/wallpapers/wp5236220.jpg',
    preview: '/wallpapers/wp5236220.jpg',
    colors: {
      primary: '#0EA5E9',
      secondary: '#10B981',
      accent: '#8B5CF6',
      sidebar: {
        bg: 'rgba(14, 165, 233, 0.18)',
        text: '#FFFFFF',
        active: 'rgba(16, 185, 129, 0.4)',
        hover: 'rgba(14, 165, 233, 0.28)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.14)',
        border: 'rgba(255, 255, 255, 0.28)',
        shadow: '0 8px 32px rgba(14, 165, 233, 0.2)',
      },
      header: {
        bg: 'rgba(14, 165, 233, 0.22)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)',
        secondary: 'rgba(255, 255, 255, 0.15)',
        text: '#FFFFFF',
      },
      status: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
      },
    },
    glass: {
      blur: '20px',
      saturation: '165%',
      opacity: '0.15',
      borderOpacity: '0.25',
    },
  },
  {
    id: 'zen-garden',
    name: 'Zen Garden',
    description: 'Japon bahçesi atmosferi',
    wallpaper: '/wallpapers/wp5278950.jpg',
    preview: '/wallpapers/wp5278950.jpg',
    colors: {
      primary: '#16A34A',
      secondary: '#84CC16',
      accent: '#F472B6',
      sidebar: {
        bg: 'rgba(22, 163, 74, 0.2)',
        text: '#FFFFFF',
        active: 'rgba(132, 204, 22, 0.4)',
        hover: 'rgba(22, 163, 74, 0.3)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.12)',
        border: 'rgba(255, 255, 255, 0.25)',
        shadow: '0 8px 32px rgba(22, 163, 74, 0.2)',
      },
      header: {
        bg: 'rgba(22, 163, 74, 0.25)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #16A34A 0%, #84CC16 100%)',
        secondary: 'rgba(255, 255, 255, 0.15)',
        text: '#FFFFFF',
      },
      status: {
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
    glass: {
      blur: '18px',
      saturation: '170%',
      opacity: '0.14',
      borderOpacity: '0.26',
    },
  },
  {
    id: 'mountain-valley',
    name: 'Mountain Valley',
    description: 'Yeşil çayırlar ve dağlar',
    wallpaper: '/wallpapers/wp6405251.jpg',
    preview: '/wallpapers/wp6405251.jpg',
    colors: {
      primary: '#15803D',
      secondary: '#166534',
      accent: '#84CC16',
      sidebar: {
        bg: 'rgba(21, 128, 61, 0.25)',
        text: '#FFFFFF',
        active: 'rgba(22, 101, 52, 0.45)',
        hover: 'rgba(21, 128, 61, 0.35)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.1)',
        border: 'rgba(255, 255, 255, 0.2)',
        shadow: '0 8px 32px rgba(21, 128, 61, 0.25)',
      },
      header: {
        bg: 'rgba(21, 128, 61, 0.3)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
        secondary: 'rgba(255, 255, 255, 0.12)',
        text: '#FFFFFF',
      },
      status: {
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
    glass: {
      blur: '24px',
      saturation: '155%',
      opacity: '0.18',
      borderOpacity: '0.22',
    },
  },
  {
    id: 'enchanted-forest',
    name: 'Enchanted Forest',
    description: 'Sonbahar orman patikası',
    wallpaper: '/wallpapers/wp6405278.jpg',
    preview: '/wallpapers/wp6405278.jpg',
    colors: {
      primary: '#65A30D',
      secondary: '#B45309',
      accent: '#F59E0B',
      sidebar: {
        bg: 'rgba(101, 163, 13, 0.22)',
        text: '#FFFFFF',
        active: 'rgba(180, 83, 9, 0.4)',
        hover: 'rgba(101, 163, 13, 0.32)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.1)',
        border: 'rgba(255, 255, 255, 0.22)',
        shadow: '0 8px 32px rgba(101, 163, 13, 0.25)',
      },
      header: {
        bg: 'rgba(101, 163, 13, 0.28)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #65A30D 0%, #B45309 100%)',
        secondary: 'rgba(255, 255, 255, 0.12)',
        text: '#FFFFFF',
      },
      status: {
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
    glass: {
      blur: '26px',
      saturation: '150%',
      opacity: '0.16',
      borderOpacity: '0.24',
    },
  },
  {
    id: 'nordic-fjord',
    name: 'Nordic Fjord',
    description: 'Norveç fiyordları',
    wallpaper: '/wallpapers/wp6405324.jpg',
    preview: '/wallpapers/wp6405324.jpg',
    colors: {
      primary: '#059669',
      secondary: '#0891B2',
      accent: '#6366F1',
      sidebar: {
        bg: 'rgba(5, 150, 105, 0.2)',
        text: '#FFFFFF',
        active: 'rgba(8, 145, 178, 0.4)',
        hover: 'rgba(5, 150, 105, 0.3)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.12)',
        border: 'rgba(255, 255, 255, 0.25)',
        shadow: '0 8px 32px rgba(5, 150, 105, 0.2)',
      },
      header: {
        bg: 'rgba(5, 150, 105, 0.25)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
        secondary: 'rgba(255, 255, 255, 0.15)',
        text: '#FFFFFF',
      },
      status: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
    glass: {
      blur: '22px',
      saturation: '165%',
      opacity: '0.14',
      borderOpacity: '0.26',
    },
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    description: 'Pembe çiçekli patika',
    wallpaper: '/wallpapers/wp6405436.jpg',
    preview: '/wallpapers/wp6405436.jpg',
    colors: {
      primary: '#DB2777',
      secondary: '#BE185D',
      accent: '#F472B6',
      sidebar: {
        bg: 'rgba(219, 39, 119, 0.2)',
        text: '#FFFFFF',
        active: 'rgba(190, 24, 93, 0.4)',
        hover: 'rgba(219, 39, 119, 0.3)',
      },
      card: {
        bg: 'rgba(255, 255, 255, 0.12)',
        border: 'rgba(255, 255, 255, 0.28)',
        shadow: '0 8px 32px rgba(219, 39, 119, 0.25)',
      },
      header: {
        bg: 'rgba(219, 39, 119, 0.25)',
        text: '#FFFFFF',
      },
      button: {
        primary: 'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
        secondary: 'rgba(255, 255, 255, 0.15)',
        text: '#FFFFFF',
      },
      status: {
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
    glass: {
      blur: '20px',
      saturation: '170%',
      opacity: '0.15',
      borderOpacity: '0.28',
    },
  },
];

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('basic-light');
  const [themeConfig, setThemeConfig] = useState(THEMES[0]);
  const [isLoading, setIsLoading] = useState(false);

  // Apply theme CSS variables to document
  const applyTheme = useCallback((theme) => {
    const root = document.documentElement;
    const { colors, glass } = theme;

    // Primary colors
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-secondary', colors.secondary);
    root.style.setProperty('--theme-accent', colors.accent);

    // Sidebar colors
    root.style.setProperty('--theme-sidebar-bg', colors.sidebar.bg);
    root.style.setProperty('--theme-sidebar-text', colors.sidebar.text);
    root.style.setProperty('--theme-sidebar-active', colors.sidebar.active);
    root.style.setProperty('--theme-sidebar-hover', colors.sidebar.hover);

    // Card colors
    root.style.setProperty('--theme-card-bg', colors.card.bg);
    root.style.setProperty('--theme-card-border', colors.card.border);
    root.style.setProperty('--theme-card-shadow', colors.card.shadow);
    // Text color - default to white for glass themes, dark for basic themes
    const textColor = colors.card.text || (theme.isBasic ? '#1a1a1a' : '#FFFFFF');
    root.style.setProperty('--theme-card-text', textColor);
    // Also set as body color for inheritance
    document.body.style.color = textColor;

    // Header colors
    root.style.setProperty('--theme-header-bg', colors.header.bg);
    root.style.setProperty('--theme-header-text', colors.header.text);

    // Button colors
    root.style.setProperty('--theme-button-primary', colors.button.primary);
    root.style.setProperty('--theme-button-secondary', colors.button.secondary);
    root.style.setProperty('--theme-button-text', colors.button.text);

    // Status colors
    root.style.setProperty('--theme-status-success', colors.status.success);
    root.style.setProperty('--theme-status-warning', colors.status.warning);
    root.style.setProperty('--theme-status-error', colors.status.error);
    root.style.setProperty('--theme-status-info', colors.status.info);

    // Glass effect
    root.style.setProperty('--theme-glass-blur', glass.blur);
    root.style.setProperty('--theme-glass-saturation', glass.saturation);
    root.style.setProperty('--theme-glass-opacity', glass.opacity);
    root.style.setProperty('--theme-glass-border-opacity', glass.borderOpacity);

    // Wallpaper
    root.style.setProperty('--theme-wallpaper', `url(${theme.wallpaper})`);

    // Add transition class
    document.body.classList.add('theme-transition');
  }, []);

  // Change theme
  const changeTheme = useCallback((themeId) => {
    setIsLoading(true);
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

    try {
      applyTheme(theme);
      setCurrentTheme(themeId);
      setThemeConfig(theme);
      localStorage.setItem('optima_theme', themeId);
    } catch (error) {
      console.error('Failed to apply theme:', error);
      setCurrentTheme('basic-light');
      setThemeConfig(THEMES[0]);
      applyTheme(THEMES[0]);
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  }, [applyTheme]);

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('optima_theme') || 'basic-light';
    const theme = THEMES.find(t => t.id === savedTheme) || THEMES[0];
    setCurrentTheme(savedTheme);
    setThemeConfig(theme);
    applyTheme(theme);
  }, [applyTheme]);

  const value = {
    currentTheme,
    themeConfig,
    themes: THEMES,
    isLoading,
    changeTheme,
    getCurrentTheme: () => THEMES.find(t => t.id === currentTheme) || THEMES[0]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
