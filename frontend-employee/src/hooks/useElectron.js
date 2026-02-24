/**
 * useElectron Hook
 * Electron API'lerine güvenli erişim sağlar.
 * Web tarayıcısında çalışırken hata vermez.
 */

import { useState, useEffect } from 'react';

export const useElectron = () => {
    const [isElectron, setIsElectron] = useState(false);
    const [platform, setPlatform] = useState('web');
    const [version, setVersion] = useState(null);

    useEffect(() => {
        // Check if running in Electron
        const checkElectron = async () => {
            if (window.electronAPI) {
                setIsElectron(true);
                try {
                    const plat = await window.electronAPI.getPlatform();
                    const ver = await window.electronAPI.getVersion();
                    setPlatform(plat);
                    setVersion(ver);
                } catch (e) {
                    console.error('Failed to get electron info', e);
                }
            }
        };
        checkElectron();
    }, []);

    const showNotification = (title, body) => {
        if (isElectron && window.electronAPI) {
            window.electronAPI.showNotification(title, body);
        } else if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    };

    const alertNewMessage = (fromName) => {
        if (isElectron && window.electronAPI) {
            window.electronAPI.alertNewMessage(fromName);
        }
    };

    return {
        isElectron,
        platform, // 'darwin', 'win32', 'linux', 'web'
        version,
        showNotification,
        alertNewMessage
    };
};

export default useElectron;
