// @optima/shared - Central export file
// All shared modules are re-exported from here for easy imports

// Config
export { default as config } from './config/config.js';
export { API_BASE_URL, WS_BASE_URL, PUBLIC_URL, API_ENDPOINTS, WS_ENDPOINTS, getFileUrl } from './config/config.js';

// Services
export { default as webSocketService } from './services/webSocketService.js';

// Theme
export { ThemeProvider, useTheme } from './theme/ThemeContext.js';

// Hooks
export { default as useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
export { default as useDynamicTheme } from './hooks/useDynamicTheme.js';

// Components
export { default as FileUpload } from './components/FileUpload.js';
export { default as KeyboardShortcutsModal } from './components/KeyboardShortcutsModal.js';
