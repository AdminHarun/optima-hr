/**
 * useKeyboardShortcuts Hook
 * 
 * Provides global keyboard shortcut handling.
 * Supports Ctrl+Key, Ctrl+Shift+Key combinations.
 * Can be used anywhere, but typically at App root.
 */

import { useEffect } from 'react';

// Shortcut definitions - Can be expanded
export const shortcuts = {
    // Navigation
    'ctrl+k': { action: 'openSearch', description: 'Global arama' },
    'ctrl+shift+k': { action: 'openChannels', description: 'Kanal listesi' },
    // 'ctrl+shift+d': { action: 'openDMs', description: 'Direkt mesajlar' },

    // Actions
    'ctrl+n': { action: 'newMessage', description: 'Yeni mesaj' },
    'ctrl+shift+a': { action: 'openAllUnreads', description: 'Tüm okunmamışlar' },
    // 'ctrl+shift+t': { action: 'openThreads', description: 'Thread\'ler' },

    // App Control
    'ctrl+shift+\\': { action: 'toggleSidebar', description: 'Sidebar aç/kapat' },
    'esc': { action: 'closeModal', description: 'Pencereyi kapat' },

    // Formatting (Rich Text Editor handles these mostly, but global ones here)

    // Help
    'ctrl+/': { action: 'showShortcuts', description: 'Kısayollar listesi' }
};

export const useKeyboardShortcuts = (handlers) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Build key combo string
            const keys = [];
            if (e.ctrlKey || e.metaKey) keys.push('ctrl'); // Command on Mac acts as Ctrl here
            if (e.shiftKey) keys.push('shift');
            if (e.altKey) keys.push('alt');

            // Handle special keys
            let key = e.key.toLowerCase();
            if (key === 'control' || key === 'shift' || key === 'alt' || key === 'meta') return;
            if (key === 'escape') key = 'esc';
            if (key === ' ') key = 'space';

            keys.push(key);
            const combo = keys.join('+');

            // Check if combo exists in shortcuts map
            const shortcut = shortcuts[combo];

            if (shortcut && handlers[shortcut.action]) {
                e.preventDefault();
                e.stopPropagation();
                handlers[shortcut.action]();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers]);
};

export default useKeyboardShortcuts;
