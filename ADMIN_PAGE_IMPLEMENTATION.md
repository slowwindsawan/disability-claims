# Next.js Admin Page - Implementation Steps

## Current State
The admin page (`frontend/app/admin/page.tsx`) currently uses **mock data** with hardcoded client information.

## Goal
Integrate real case data from the backend while maintaining the existing UI structure.

## Implementation Steps

### Step 1: Add Real Cases Tab
Update the "Active Claims" section to show real cases from the database instead of mock data.

**Location**: `frontend/app/admin/page.tsx` (around line 645)

**Current Code** (Mock Data):
```tsx
const mockClients: Client[] = [
  {
    id: "ZTC-001",
    name: "יוחאי כהן",
    // ... more mock data
  }
]

{businessLine === "active_claims" ? (
  // Current table with mockClients
) : (
  // Partner leads
)}
```

**Update Approach**:
1. Keep the mock data for reference/demo purposes
2. Add a toggle to switch between "Mock Data" and "Real Cases"
3. Use the new `AdminCasesTable` component for real cases
4. Keep the existing table for mock data initially

### Step 2: Import New Components and Hooks

Add to the imports section:
```tsx
import AdminCasesTable from "@/components/AdminCasesTable";
import { useAdminCases } from "@/hooks/useAdminCases";
import { CASE_STATUS, STATUS_LABELS } from "@/lib/caseStatusConstants";
```

### Step 3: Add Real Cases Hook

In the component body, add:
```tsx
const [useRealData, setUseRealData] = useState(false);
const { cases, loading, error, total } = useAdminCases({
  limit: 20,
  offset: 0
});
```

### Step 4: Add Data Toggle Button

Add a toggle to switch between real and mock data:
```tsx
<div className="flex gap-2 mb-4">
  <Button
    variant={!useRealData ? "default" : "outline"}
    onClick={() => setUseRealData(false)}
  >
    Demo Data
  </Button>
  <Button
    variant={useRealData ? "default" : "outline"}
    onClick={() => setUseRealData(true)}
  >
    Real Cases
  </Button>
</div>
```

### Step 5: Conditional Rendering

Replace the hardcoded table with conditional rendering:
```tsx
{businessLine === "active_claims" ? (
  useRealData ? (
    // New AdminCasesTable component
    <AdminCasesTable 
      cases={cases}
      loading={loading}
      onCaseClick={(caseData) => {
        // Handle case selection
        // Could open a detail modal or navigate
        console.log("Selected case:", caseData);
      }}
    />
  ) : (
    // Existing mock data table
    <Card className="bg-white shadow-md overflow-hidden">
      {/* Existing table code */}
    </Card>
  )
) : (
  // Partner leads (existing code)
)}
```

## Minimal Change Implementation

If you want minimal changes to the existing page:

### Option 1: New Admin Cases Tab (Recommended)

Add a new tab next to "Active Claims" and "Partner Leads":

```tsx
<TabsList>
  <TabsTrigger value="active-claims">Active Claims (Mock)</TabsTrigger>
  <TabsTrigger value="real-cases">Real Cases (Live)</TabsTrigger>
  <TabsTrigger value="partner-leads">Partner Leads</TabsTrigger>
</TabsList>

<TabsContent value="real-cases">
  <AdminCasesTable cases={cases} loading={loading} />
</TabsContent>
```

### Option 2: Replace Mock Data Gradually

Keep the structure but:
1. Update `mockClients` to pull from API instead
2. Transform API response to match Client interface
3. No UI changes needed

**Code Example**:
```tsx
useEffect(() => {
  const loadRealData = async () => {
    const response = await fetchAdminCases({ limit: 20 });
    const clients = response.cases.map((caseData) => ({
      id: caseData.id,
      name: caseData.user_name || 'Unknown',
      phone: '',
      status: mapCaseStatusToClientStatus(caseData.status),
      // ... map other fields
    }));
    setMockClients(clients);
  };
  loadRealData();
}, []);
```

## Integration with Case Detail View

When a case is clicked, you can:

### Option A: Show Case Summary Modal
```tsx
const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);

<AdminCasesTable 
  onCaseClick={(caseData) => setSelectedCase(caseData)}
/>

{selectedCase && (
  <CaseDetailModal 
    caseData={selectedCase}
    onClose={() => setSelectedCase(null)}
  />
)}
```

### Option B: Navigate to Case Detail Page
```tsx
import { useRouter } from "next/navigation";

const router = useRouter();

<AdminCasesTable 
  onCaseClick={(caseData) => {
    router.push(`/admin/cases/${caseData.id}`);
  }}
/>
```

## Case Detail Component (Create New)

Create `frontend/src/components/CaseDetailModal.tsx`:

```tsx
import { CaseData } from "@/lib/caseStatusConstants";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface CaseDetailModalProps {
  caseData: CaseData;
  onClose: () => void;
}

export default function CaseDetailModal({ caseData, onClose }: CaseDetailModalProps) {
  const callSummary = typeof caseData.call_summary === 'string' 
    ? JSON.parse(caseData.call_summary) 
    : caseData.call_summary;

  return (
    <Dialog open={!!caseData} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <h2 className="text-xl font-bold">{caseData.title || "Case Details"}</h2>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* User Info */}
          <div>
            <h3 className="font-semibold">User</h3>
            <p>{caseData.user_name}</p>
            <p className="text-sm text-gray-600">{caseData.user_email}</p>
          </div>

          {/* Products */}
          {callSummary?.products && (
            <div>
              <h3 className="font-semibold">Products</h3>
              <div className="flex gap-2">
                {callSummary.products.map((p: string) => (
                  <Badge key={p}>{p}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Case Summary */}
          {callSummary?.case_summary && (
            <div>
              <h3 className="font-semibold">Case Summary</h3>
              <p className="text-sm text-gray-700">{callSummary.case_summary}</p>
            </div>
          )}

          {/* Documents Requested */}
          {callSummary?.documents_requested_list && (
            <div>
              <h3 className="font-semibold">Documents Requested</h3>
              <ul className="list-disc pl-5 text-sm">
                {callSummary.documents_requested_list.map((doc: any, idx: number) => (
                  <li key={idx}>
                    {doc.name}
                    {doc.required && <span className="text-red-600">*</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Documents Uploaded */}
          {Object.keys(caseData.document_summaries || {}).length > 0 && (
            <div>
              <h3 className="font-semibold">Documents Uploaded</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(caseData.document_summaries || {}).map(([name, summary]: any) => (
                  <div key={name} className="p-2 border rounded text-sm">
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-gray-600 truncate">{summary?.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Mapping Case Status to Client Status

If keeping the existing Client interface, map statuses:

```tsx
const mapCaseStatusToClientStatus = (status?: string): ClientStatus => {
  switch (status) {
    case CASE_STATUS.INITIAL_QUESTIONNAIRE:
      return "document_collection";
    case CASE_STATUS.DOCUMENT_SUBMISSION:
      return "document_collection";
    case CASE_STATUS.SUBMISSION_PENDING:
      return "ready_for_submission";
    case CASE_STATUS.SUBMITTED:
      return "submitted";
    default:
      return "new";
  }
};
```

## Testing Checklist

- [ ] Admin can see real cases from database
- [ ] Cases display with correct status
- [ ] Products are shown from `call_summary.products`
- [ ] Document count shows "X/Y" correctly
- [ ] Can filter by status
- [ ] Can search by case ID, user name, email
- [ ] Progress bar displays correct percentage
- [ ] Case detail view shows full information
- [ ] No console errors
- [ ] Page loads within 2 seconds

## Performance Optimization

If you have many cases, add:

```tsx
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(20);

const { cases } = useAdminCases({
  limit,
  offset: (page - 1) * limit
});

// Add pagination controls
<div className="flex justify-center gap-4">
  <button onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
  <span>Page {page}</span>
  <button onClick={() => setPage(p => p + 1)}>Next</button>
</div>
```

## Rollback Plan

If issues occur:
1. Keep both versions initially
2. Add feature flag: `const useRealData = process.env.NEXT_PUBLIC_USE_REAL_CASES !== 'false'`
3. Can disable via environment variable
4. Or revert to mock data toggle

## Next Steps

1. Import the new components
2. Add the useAdminCases hook
3. Create the toggle/tab structure
4. Test with real cases
5. Remove mock data once stable
6. Create case detail view
7. Add case actions (email, status update, etc.)
