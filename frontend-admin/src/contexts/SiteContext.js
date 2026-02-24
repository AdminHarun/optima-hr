// Site Context - Multi-tenant site yönetimi
import React, { createContext, useContext, useState, useEffect } from 'react';

const SiteContext = createContext();

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within SiteProvider');
  }
  return context;
};

export const SiteProvider = ({ children }) => {
  // LocalStorage'dan siteleri yükle veya varsayılanları kullan
  const getInitialSites = () => {
    const saved = localStorage.getItem('sites');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Sites parse error:', e);
      }
    }
    // Varsayılan siteler
    return [
      { 
        code: 'FXB', 
        name: 'FIXBET', 
        color: '#FF0000', 
        isActive: true,
        createdAt: '15.01.2024',
        updatedAt: '30.01.2025'
      },
      { 
        code: 'MTD', 
        name: 'MATADORBET', 
        color: '#0000FF', 
        isActive: true,
        createdAt: '20.02.2024',
        updatedAt: '28.01.2025'
      },
      { 
        code: 'ZBH', 
        name: 'ZBahis', 
        color: '#00FF00', 
        isActive: true,
        createdAt: '10.03.2024',
        updatedAt: '29.01.2025'
      }
    ];
  };

  const [sites, setSites] = useState(getInitialSites());

  // LocalStorage'dan son seçili siteyi al
  const getInitialSite = () => {
    const saved = localStorage.getItem('optima_current_site');
    if (saved) {
      const site = sites.find(s => s.code === saved);
      if (site) return site;
    }
    return sites[0]; // Varsayılan: İlk site
  };

  const [currentSite, setCurrentSite] = useState(getInitialSite());

  // Site değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('optima_current_site', currentSite.code);
  }, [currentSite]);

  // Sites değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('sites', JSON.stringify(sites));
  }, [sites]);

  const changeSite = (siteCode) => {
    const site = sites.find(s => s.code === siteCode);
    if (site) {
      setCurrentSite(site);
      // Sayfa yenilenecek (veriler yeniden çekilecek)
      window.location.reload();
    }
  };

  // Site CRUD İşlemleri
  const addSite = (newSite) => {
    // Site kodu benzersiz olmalı
    if (sites.find(s => s.code === newSite.code)) {
      throw new Error('Bu site kodu zaten kullanımda');
    }

    const now = new Date().toLocaleDateString('tr-TR');
    const siteWithDates = {
      ...newSite,
      createdAt: now,
      updatedAt: now
    };

    // Yeni site icin bos veri alanlari olustur
    const code = newSite.code;
    const defaults = {
      [`applications_${code}`]: [],
      [`user_profiles_${code}`]: [],
      [`user_securities_${code}`]: [],
      [`all_sessions_${code}`]: [],
      [`invitation_links_${code}`]: [],
      [`payroll_data_${code}`]: [],
      [`management_users_${code}`]: [],
      [`management_permissions_${code}`]: {},
      [`management_audit_logs_${code}`]: [],
    };
    Object.entries(defaults).forEach(([key, value]) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });

    setSites([...sites, siteWithDates]);
    return siteWithDates;
  };

  const updateSite = (siteCode, updatedData) => {
    const now = new Date().toLocaleDateString('tr-TR');
    setSites(sites.map(site => 
      site.code === siteCode 
        ? { ...site, ...updatedData, updatedAt: now }
        : site
    ));

    // Eğer güncellenen site aktif site ise, güncelle
    if (currentSite.code === siteCode) {
      setCurrentSite(prev => ({ ...prev, ...updatedData, updatedAt: now }));
    }
  };

  const deleteSite = (siteCode) => {
    // En az bir site olmalı
    if (sites.length === 1) {
      throw new Error('En az bir site bulunmalıdır');
    }

    // Eğer silinen site aktif site ise, başka bir siteye geç
    if (currentSite.code === siteCode) {
      const remainingSites = sites.filter(s => s.code !== siteCode);
      setCurrentSite(remainingSites[0]);
    }

    setSites(sites.filter(site => site.code !== siteCode));
  };

  return (
    <SiteContext.Provider value={{ 
      currentSite, 
      sites, 
      changeSite,
      addSite,
      updateSite,
      deleteSite
    }}>
      {children}
    </SiteContext.Provider>
  );
};
