/**
 * useEmployeeDirectory Hook - Calisan Rehberi Yonetimi
 *
 * Ozellikler:
 * - Calisan listesi (sayfalama ile)
 * - Departman filtreleme
 * - Arama
 * - Online calisanlar
 * - DM baslat
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getConfig } from '../config/config';

const API_BASE = getConfig().API_URL;

export function useEmployeeDirectory(token) {
  // State
  const [employees, setEmployees] = useState([]);
  const [onlineEmployees, setOnlineEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // API Headers
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }), [token]);

  /**
   * Calisanlari yukle
   */
  const fetchEmployees = useCallback(async (options = {}) => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: options.page || page,
        limit: options.limit || 50,
      });

      if (options.department || selectedDepartment) {
        params.append('department', options.department || selectedDepartment);
      }

      if (options.search || searchQuery) {
        params.append('search', options.search || searchQuery);
      }

      if (options.onlineOnly || showOnlineOnly) {
        params.append('onlineOnly', 'true');
      }

      const response = await fetch(
        `${API_BASE}/chat/api/employees/directory?${params}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Calisanlar yuklenemedi');
      }

      const data = await response.json();

      if (data.success) {
        setEmployees(data.data.employees);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.total);
      }
    } catch (err) {
      console.error('[useEmployeeDirectory] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, page, selectedDepartment, searchQuery, showOnlineOnly, headers]);

  /**
   * Online calisanlari yukle
   */
  const fetchOnlineEmployees = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE}/chat/api/employees/online`,
        { headers }
      );

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setOnlineEmployees(data.data.employees);
      }
    } catch (err) {
      console.error('[useEmployeeDirectory] Online fetch error:', err);
    }
  }, [token, headers]);

  /**
   * Departmanlari yukle
   */
  const fetchDepartments = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE}/chat/api/employees/departments`,
        { headers }
      );

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setDepartments(data.data.departments);
      }
    } catch (err) {
      console.error('[useEmployeeDirectory] Departments fetch error:', err);
    }
  }, [token, headers]);

  /**
   * Arama yap
   */
  const searchEmployees = useCallback((query) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  /**
   * Departman filtrele
   */
  const filterByDepartment = useCallback((department) => {
    setSelectedDepartment(department);
    setPage(1);
  }, []);

  /**
   * Online filtresi
   */
  const toggleOnlineFilter = useCallback(() => {
    setShowOnlineOnly(prev => !prev);
    setPage(1);
  }, []);

  /**
   * DM baslat
   */
  const startDM = useCallback(async (targetEmployeeId) => {
    if (!token) return null;

    try {
      const response = await fetch(
        `${API_BASE}/chat/api/employees/dm/create`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ targetEmployeeId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'DM olusturulamadi');
      }

      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useEmployeeDirectory] Start DM error:', err);
      setError(err.message);
      return null;
    }
  }, [token, headers]);

  /**
   * Calisan presence bilgisini al
   */
  const getEmployeePresence = useCallback(async (employeeId) => {
    if (!token) return null;

    try {
      const response = await fetch(
        `${API_BASE}/chat/api/employees/${employeeId}/presence`,
        { headers }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (err) {
      console.error('[useEmployeeDirectory] Presence fetch error:', err);
      return null;
    }
  }, [token, headers]);

  /**
   * Toplu presence sorgula
   */
  const bulkGetPresence = useCallback(async (employeeIds) => {
    if (!token || !employeeIds?.length) return {};

    try {
      const response = await fetch(
        `${API_BASE}/chat/api/employees/presence/bulk`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ employeeIds }),
        }
      );

      if (!response.ok) return {};

      const data = await response.json();
      return data.success ? data.data.presence : {};
    } catch (err) {
      console.error('[useEmployeeDirectory] Bulk presence error:', err);
      return {};
    }
  }, [token, headers]);

  /**
   * Filtrelenmis calisanlar
   */
  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    // Online filtresi (client-side ek filtreleme)
    if (showOnlineOnly) {
      const onlineIds = new Set(onlineEmployees.map(e => e.id));
      result = result.filter(emp =>
        onlineIds.has(emp.id) ||
        emp.presence?.status === 'online' ||
        emp.presence?.status === 'away' ||
        emp.presence?.status === 'busy'
      );
    }

    return result;
  }, [employees, showOnlineOnly, onlineEmployees]);

  /**
   * Departmana gore grupla
   */
  const employeesByDepartment = useMemo(() => {
    const grouped = {};

    filteredEmployees.forEach(emp => {
      const dept = emp.department || 'Diger';
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(emp);
    });

    return grouped;
  }, [filteredEmployees]);

  // Initial fetch
  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [page, selectedDepartment, searchQuery, showOnlineOnly]);

  // Online calisanlari periyodik guncelle
  useEffect(() => {
    fetchOnlineEmployees();
    const interval = setInterval(fetchOnlineEmployees, 30000); // 30 saniye
    return () => clearInterval(interval);
  }, [fetchOnlineEmployees]);

  return {
    // Data
    employees: filteredEmployees,
    onlineEmployees,
    departments,
    employeesByDepartment,

    // State
    isLoading,
    error,

    // Filters
    searchQuery,
    selectedDepartment,
    showOnlineOnly,

    // Pagination
    page,
    totalPages,
    totalCount,

    // Actions
    searchEmployees,
    filterByDepartment,
    toggleOnlineFilter,
    setPage,
    startDM,
    getEmployeePresence,
    bulkGetPresence,
    refresh: fetchEmployees,
  };
}

export default useEmployeeDirectory;
