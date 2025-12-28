/**
 * AdminCasesTable Component
 * Displays disability claims cases with status, products, documents, and actions
 * Includes advanced filtering by status, AI score, income potential, and dates
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Eye,
  MessageCircle,
  Phone,
  FileText,
  AlertCircle,
  Download,
  ChevronRight,
  Zap,
  DollarSign,
  Activity,
  Filter,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CASE_STATUS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_PROGRESS,
  type CaseData,
  getProductsList,
  formatDate,
  getDocumentCount,
} from "@/lib/caseStatusConstants";

interface AdminCasesTableProps {
  cases?: CaseData[];
  loading?: boolean;
  onCaseClick?: (caseData: CaseData) => void;
  fetchFromApi?: boolean;
}

interface AdvancedFilters {
  status: string[];
  minAiScore: number | null;
  maxAiScore: number | null;
  minIncomePotential: number | null;
  maxIncomePotential: number | null;
  startDate: string | null;
  endDate: string | null;
  searchQuery: string;
}

export const AdminCasesTable: React.FC<AdminCasesTableProps> = ({
  cases: initialCases = [],
  loading: initialLoading = false,
  onCaseClick,
  fetchFromApi = true,
}) => {
  const [cases, setCases] = useState<CaseData[]>(initialCases);
  const [filteredCases, setFilteredCases] = useState<CaseData[]>(initialCases);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(initialLoading);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    status: [],
    minAiScore: null,
    maxAiScore: null,
    minIncomePotential: null,
    maxIncomePotential: null,
    startDate: null,
    endDate: null,
    searchQuery: "",
  });
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [applyingAdvancedFilter, setApplyingAdvancedFilter] = useState(false);

  // Fetch claims from admin API on component mount
  useEffect(() => {
    console.log('AdminCasesTable useEffect - fetchFromApi:', fetchFromApi, 'cases.length:', cases.length);
    
    // Only fetch if fetchFromApi is true AND we haven't already fetched
    if (!fetchFromApi) {
      console.log('fetchFromApi is false, skipping fetch');
      return;
    }
    
    if (cases.length > 0) {
      console.log('Cases already loaded, skipping fetch');
      return;
    }
    
    const fetchCases = async () => {
      try {
        setLoading(true);
        console.log('Starting fetch from /api/admin/claims-table...');
        
        const response = await fetch('/api/admin/claims-table?limit=200&offset=0', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        console.log('Response received, status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched claims:', data);
          
          // Transform API response to match CaseData interface
          const transformedCases = data.data?.map((row: any) => ({
            id: row.case_id,
            user_id: row.user_id,
            user_name: row.client_name,
            user_email: row.client_email,
            user_phone: row.client_phone,
            user_photo_url: row.client_photo,
            status: row.status,
            ai_score: row.ai_score,
            eligibility_status: row.eligibility_status,
            estimated_claim_amount: row.estimated_claim_amount,
            recent_activity: row.recent_activity,
            created_at: row.created_at,
            updated_at: row.updated_at,
            call_summary: {
              products: row.products,
            },
          })) || [];
          
          console.log('Transformed cases:', transformedCases);
          setCases(transformedCases);
        } else {
          console.error('Failed to fetch claims - Status:', response.status, response.statusText);
          const errorData = await response.text();
          console.error('Error response:', errorData);
        }
      } catch (error) {
        console.error('Error fetching claims:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [fetchFromApi]);

  // Fetch saved filters for the admin
  useEffect(() => {
    const fetchSavedFilters = async () => {
      try {
        const response = await fetch('/api/admin/filters', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setSavedFilters(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching saved filters:', error);
      }
    };

    fetchSavedFilters();
  }, []);

  // Apply advanced filters
  const applyAdvancedFilters = async () => {
    try {
      setApplyingAdvancedFilter(true);
      
      const payload = {
        status: advancedFilters.status.length > 0 ? advancedFilters.status : undefined,
        min_ai_score: advancedFilters.minAiScore,
        max_ai_score: advancedFilters.maxAiScore,
        min_income_potential: advancedFilters.minIncomePotential,
        max_income_potential: advancedFilters.maxIncomePotential,
        start_date: advancedFilters.startDate,
        end_date: advancedFilters.endDate,
        search_query: advancedFilters.searchQuery || undefined,
        limit: 200,
        offset: 0,
      };
      
      const response = await fetch('/api/admin/cases/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Transform API response to match CaseData interface
        const transformedCases = data.data?.map((row: any) => ({
          id: row.case_id,
          user_id: row.user_id,
          user_name: row.client_name,
          user_email: row.client_email,
          user_phone: row.client_phone,
          status: row.status,
          ai_score: row.ai_score,
          eligibility_status: row.eligibility_status,
          estimated_claim_amount: row.estimated_claim_amount,
          created_at: row.created_at,
          updated_at: row.updated_at,
          call_summary: {
            products: row.products,
            risk_assessment: row.risk_assessment,
          },
        })) || [];
        
        setCases(transformedCases);
        setFilteredCases(transformedCases);
        setShowAdvancedFilters(false);
      }
    } catch (error) {
      console.error('Error applying advanced filters:', error);
    } finally {
      setApplyingAdvancedFilter(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setAdvancedFilters({
      status: [],
      minAiScore: null,
      maxAiScore: null,
      minIncomePotential: null,
      maxIncomePotential: null,
      startDate: null,
      endDate: null,
      searchQuery: "",
    });
    setSearchQuery("");
    setStatusFilter("");
  };

  // Filter cases when search query or status filter changes (client-side filtering)
  useEffect(() => {
    let filtered = cases;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.user_name?.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          c.user_email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    setFilteredCases(filtered);
  }, [cases, searchQuery, statusFilter]);

  const renderProductBadges = (callSummary?: any) => {
    const products = getProductsList(callSummary);
    if (products.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1">
        {products.map((product, idx) => (
          <Badge key={idx} className="bg-blue-100 text-blue-700 text-xs">
            {product}
          </Badge>
        ))}
      </div>
    );
  };

  const renderStatusSection = (caseData: CaseData) => {
    const statusColor = STATUS_COLORS[caseData.status as keyof typeof STATUS_COLORS] || "bg-slate-100 text-slate-700";
    const statusLabel = STATUS_LABELS[caseData.status as keyof typeof STATUS_LABELS] || "לא ידוע";
    const progress = STATUS_PROGRESS[caseData.status as keyof typeof STATUS_PROGRESS] || 0;
    const docCount = getDocumentCount(caseData.document_summaries);
    const requestedDocs = caseData.call_summary?.documents_requested_list?.length || 0;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={statusColor}>{statusLabel}</Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{progress}% הושלם</span>
        </div>

        {/* Documents Status */}
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1 text-slate-600">
            <FileText className="w-3 h-3" />
            <span>
              מסמכים: {docCount}/{requestedDocs}
            </span>
          </div>
          {caseData.call_summary?.risk_assessment && (
            <div className="flex items-center gap-1 text-slate-600">
              <AlertCircle className="w-3 h-3" />
              <span>{caseData.call_summary.risk_assessment}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <Card className="p-4 bg-white shadow-md">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם, מספר תיק או אימייל..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              סינון מתקדם
            </Button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-slate-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    סטטוס
                  </label>
                  <div className="space-y-2">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={advancedFilters.status.includes(key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAdvancedFilters({
                                ...advancedFilters,
                                status: [...advancedFilters.status, key],
                              });
                            } else {
                              setAdvancedFilters({
                                ...advancedFilters,
                                status: advancedFilters.status.filter((s) => s !== key),
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* AI Score Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ציון AI
                  </label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        מינימום
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={advancedFilters.minAiScore ?? ""}
                        onChange={(e) =>
                          setAdvancedFilters({
                            ...advancedFilters,
                            minAiScore: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        מקסימום
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={advancedFilters.maxAiScore ?? ""}
                        onChange={(e) =>
                          setAdvancedFilters({
                            ...advancedFilters,
                            maxAiScore: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Income Potential Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    פוטנציאל הכנסה
                  </label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        מינימום
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={advancedFilters.minIncomePotential ?? ""}
                        onChange={(e) =>
                          setAdvancedFilters({
                            ...advancedFilters,
                            minIncomePotential: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        מקסימום
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={advancedFilters.maxIncomePotential ?? ""}
                        onChange={(e) =>
                          setAdvancedFilters({
                            ...advancedFilters,
                            maxIncomePotential: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="999999999"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Filters */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    תאריכים
                  </label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        מתאריך (יצירה)
                      </label>
                      <Input
                        type="date"
                        value={advancedFilters.startDate ?? ""}
                        onChange={(e) =>
                          setAdvancedFilters({
                            ...advancedFilters,
                            startDate: e.target.value || null,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        עד תאריך (תאריך עדכון אחרון של התיק)
                      </label>
                      <Input
                        type="date"
                        value={advancedFilters.endDate ?? ""}
                        onChange={(e) =>
                          setAdvancedFilters({
                            ...advancedFilters,
                            endDate: e.target.value || null,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={applyAdvancedFilters}
                  disabled={applyingAdvancedFilter}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  {applyingAdvancedFilter ? "מסנן..." : "הפעל סינון"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  אפס סינון
                </Button>
              </div>
            </motion.div>
          )}

          {/* Status Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("")}
            >
              הכל ({cases.length})
            </Button>
            {Object.values(CASE_STATUS).map((status) => {
              const count = cases.filter((c) => c.status === status).length;
              return (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {STATUS_LABELS[status as keyof typeof STATUS_LABELS]} ({count})
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Cases Table */}
      <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 bg-white shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                  משתמש
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                  מוצרים
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                  AI Score
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                  סכום עתודה משוער
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                  סטטוס
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                  פעילות אחרונה
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                  תאריך יצירה
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      טוען תיקים...
                    </div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    לא נמצאו תיקים
                  </td>
                </tr>
              ) : (
                filteredCases.map((caseData, index) => (
                  <motion.tr
                    key={caseData.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onCaseClick?.(caseData)}
                  >
                    {/* User Info */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {caseData.user_name || "לא ידוע"}
                        </p>
                        <p className="text-sm text-slate-500">{caseData.id}</p>
                        {caseData.user_email && (
                          <p className="text-xs text-slate-400">{caseData.user_email}</p>
                        )}
                      </div>
                    </td>

                    {/* Products */}
                    <td className="px-6 py-4">
                      {renderProductBadges(caseData.call_summary)}
                    </td>

                    {/* AI Score */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {caseData.ai_score || 0}%
                          </p>
                          <p className="text-xs text-slate-500">
                            {caseData?.status}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Estimated Claim Amount */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <p className="font-semibold text-slate-900">
                          {caseData.estimated_claim_amount 
                            ? `₪${caseData.estimated_claim_amount.toLocaleString('he-IL')}`
                            : "לא חושב"}
                        </p>
                      </div>
                    </td>

                    {/* Status with Progress */}
                    <td className="px-6 py-4">
                      {renderStatusSection(caseData)}
                    </td>

                    {/* Recent Activity */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        <p className="text-sm text-slate-600">
                          {caseData.recent_activity || "לא זמין"}
                        </p>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(caseData.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" title="צפה בפרטים">
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="שלח הודעה"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (caseData.user_email) {
                              window.location.href = `mailto:${caseData.user_email}`;
                            }
                          }}
                        >
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="פרטי התקשרות"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (caseData.user_phone) {
                              window.location.href = `tel:${caseData.user_phone}`;
                            }
                          }}
                        >
                          <Phone className="w-4 h-4 text-orange-600" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Stats */}
      {filteredCases.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600">סה"כ תיקים</p>
              <p className="text-2xl font-bold text-slate-900">{filteredCases.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">בשלב שאלון</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredCases.filter((c) => c.status === CASE_STATUS.INITIAL_QUESTIONNAIRE).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">בהמתנה להגשה</p>
              <p className="text-2xl font-bold text-amber-600">
                {filteredCases.filter((c) => c.status === CASE_STATUS.DOCUMENT_SUBMISSION).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">הוגשו</p>
              <p className="text-2xl font-bold text-emerald-600">
                {filteredCases.filter((c) => c.status === CASE_STATUS.SUBMITTED).length}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminCasesTable;
