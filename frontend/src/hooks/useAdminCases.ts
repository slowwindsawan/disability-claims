/**
 * useAdminCases Hook
 * Manages fetching and filtering of cases for admin dashboard
 */

import { useState, useEffect, useCallback } from "react";
import { CaseData } from "@/lib/caseStatusConstants";
import { fetchAdminCases } from "@/lib/adminCasesApi";

interface UseAdminCasesOptions {
  limit?: number;
  offset?: number;
  status?: string;
  eligibility?: string;
  search?: string;
}

interface UseAdminCasesResult {
  cases: CaseData[];
  loading: boolean;
  error: Error | null;
  total: number;
  refetch: () => Promise<void>;
  updateFilters: (options: Partial<UseAdminCasesOptions>) => void;
}

export function useAdminCases(initialOptions?: UseAdminCasesOptions): UseAdminCasesResult {
  const [cases, setCases] = useState<CaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState<UseAdminCasesOptions>({
    limit: 200,
    offset: 0,
    ...initialOptions,
  });

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdminCases(options.limit || 200, options.offset || 0);
      setCases(response.cases || []);
      setTotal(response.total || 0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch cases");
      setError(error);
      setCases([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [options]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const updateFilters = useCallback((newOptions: Partial<UseAdminCasesOptions>) => {
    setOptions((prev) => ({ ...prev, ...newOptions, offset: 0 }));
  }, []);

  return {
    cases,
    loading,
    error,
    total,
    refetch: fetchCases,
    updateFilters,
  };
}
