// OnboardingWithDocsDashboard.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

interface OnboardingProps {
  onClose?: () => void;
  onNavigate?: (page: string) => void;
}

export default function OnboardingWithDocsDashboard({ onClose, onNavigate }: OnboardingProps) {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuthStore();
  const [step, setStep] = useState<number>(1);

  // Personal details (now BEFORE eligibility)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    idNumber: "",
    dob: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
  });

  // eligibility answers (moved to after personal details)
  const [elig, setElig] = useState({
    employed: null as boolean | null,
    hasMedicalDocs: null as boolean | null,
    conditionType: "chronic",
    conditionDurationMonths: 0,
  });

  // claim (in-memory)
  const [claim, setClaim] = useState<any | null>(null);

  // documents dashboard state
  const [requiredDocs, setRequiredDocs] = useState<
    { id: string; title: string; description: string; required: boolean; uploaded: boolean; files: string[] }[]
  >([]);

  // pipeline outputs
  const [ocrText, setOcrText] = useState("");
  const [entities, setEntities] = useState<any[]>([]);
  const [btlItems, setBtlItems] = useState<any[]>([]);
  const [combinedPercentage, setCombinedPercentage] = useState<number | null>(null);
  const [viability, setViability] = useState<string | null>(null);
  const [projectedRange, setProjectedRange] = useState<string | null>(null);

  // payment / next steps
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [qas, setQas] = useState<{ id: string; q: string }[]>([]);
  const [qaAnswers, setQaAnswers] = useState<Record<string, string>>({});
  const [agentRoute, setAgentRoute] = useState<string | null>(null);
  const [subAgentResult, setSubAgentResult] = useState<any | null>(null);

  // ---------- State helpers ----------
  function clearDownstreamFrom(fromStep: number) {
    if (fromStep <= 3) {
      setClaim(null);
    }
    if (fromStep <= 4) {
      setRequiredDocs([]);
    }
    if (fromStep <= 5) {
      setOcrText("");
      setEntities([]);
      setBtlItems([]);
      setCombinedPercentage(null);
      setViability(null);
      setProjectedRange(null);
    }
    if (fromStep <= 7) {
      setPaymentStatus(null);
    }
    if (fromStep <= 8) {
      setQas([]);
      setQaAnswers({});
    }
    if (fromStep <= 9) {
      setAgentRoute(null);
    }
    if (fromStep <= 10) {
      setSubAgentResult(null);
    }
  }

  function goToStep(target: number) {
    if (target < step) {
      clearDownstreamFrom(target + 1);
    }
    setStep(target);
  }

  // ---------- Field update helpers ----------
  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    clearDownstreamFrom(3);
    setForm((s) => ({ ...s, [key]: value }));
  }

  function updateElig<K extends keyof typeof elig>(key: K, value: (typeof elig)[K]) {
    clearDownstreamFrom(4);
    setElig((s) => ({ ...s, [key]: value }));
  }

  // ---------- Simulated backend/AI helpers ----------
  function simulateCreateClaimRecord() {
    const id = `claim_${Date.now()}`;
    const newClaim = {
      id,
      owner: form.idNumber || "unknown",
      contact: { email: form.email, phone: form.phone },
      intake: { ...form, ...elig },
      status: "Created",
      createdAt: new Date().toISOString(),
    };
    setClaim(newClaim);
    return newClaim;
  }

  function simulateAIRequiredDocs(eligAnswers: typeof elig) {
    const docs: { id: string; title: string; description: string; required: boolean; uploaded: boolean; files: string[] }[] = [];
    let id = 1;

    docs.push({
      id: `d${id++}`,
      title: "Medical reports / discharge summaries",
      description: "All recent medical reports describing diagnosis, tests and treatment.",
      required: true,
      uploaded: false,
      files: [],
    });

    if (eligAnswers.conditionType === "chronic") {
      docs.push({
        id: `d${id++}`,
        title: "Specialist (neurology/rehab) letter",
        description: "Specialist letter describing functional limitations and prognosis.",
        required: true,
        uploaded: false,
        files: [],
      });
      if (eligAnswers.conditionDurationMonths >= 6) {
        docs.push({
          id: `d${id++}`,
          title: "Longitudinal treatment summary",
          description: "Summary of care across months/years showing chronicity.",
          required: true,
          uploaded: false,
          files: [],
        });
      }
    }

    if (eligAnswers.conditionType === "accident") {
      docs.push({
        id: `d${id++}`,
        title: "Accident report / ER notes",
        description: "Emergency reports, police or occupational documentation describing the accident.",
        required: true,
        uploaded: false,
        files: [],
      });
    }

    if (eligAnswers.conditionType !== "other") {
      docs.push({
        id: `d${id++}`,
        title: "Relevant imaging (X-ray / MRI / CT)",
        description: "Upload any imaging that supports the diagnosis.",
        required: false,
        uploaded: false,
        files: [],
      });
    }

    if (eligAnswers.employed === true) {
      docs.push({
        id: `d${id++}`,
        title: "Employment proof (pay slips / employer letter)",
        description: "Documents that show current job, hours and recent earnings.",
        required: true,
        uploaded: false,
        files: [],
      });
    } else {
      docs.push({
        id: `d${id++}`,
        title: "Work history / evidence of job loss",
        description: "If applicable, documents showing inability to work or job termination.",
        required: false,
        uploaded: false,
        files: [],
      });
    }

    return docs;
  }

  function handleUploadDoc(docId: string, filenames: string[]) {
    clearDownstreamFrom(5);
    setRequiredDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, files: filenames, uploaded: filenames.length > 0 } : d)));
  }

  function isAllRequiredDocsUploaded() {
    return requiredDocs.every((d) => (!d.required ? true : d.uploaded === true));
  }

  // Simplified pipeline steps
  function simulateOCR(uploadedFiles: string[]) {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      setOcrText("");
      return "";
    }
    const text = uploadedFiles.map((f, i) => `REPORT_${i + 1}: Findings: chronic pain, limited mobility; date: 2023-11-0${(i % 9) + 1}`).join("\n");
    setOcrText(text);
    return text;
  }

  function simulateNER(text: string) {
    const ents: any[] = [];
    if (!text) {
      setEntities([]);
      return [];
    }
    if (text.includes("chronic")) ents.push({ type: "Diagnosis", text: "Chronic pain" });
    if (text.includes("limited mobility")) ents.push({ type: "FunctionalLimitation", text: "Limited mobility" });
    setEntities(ents);
    return ents;
  }

  function simulateBTLMapping(ents: any[], currentFiles: string[]) {
    const items: any[] = [];
    if (ents.find((e) => e.type === "Diagnosis")) {
      items.push({ btl_code: "34.02", description_he: "הפרעת ריכוז/כאב כרוני", medical_percentage: 40 });
    }
    if (ents.find((e) => e.type === "FunctionalLimitation")) {
      items.push({ btl_code: "06.01", description_he: "מגבלת תנועה", medical_percentage: 25 });
    }
    if (items.length === 0 && currentFiles.length > 0) {
      items.push({ btl_code: "99.01", description_he: "ממצא לא מזוהה", medical_percentage: 10 });
    }
    setBtlItems(items);
    return items;
  }

  function combineBTLPercentages(items: any[]) {
    if (!items || items.length === 0) {
      setCombinedPercentage(0);
      return 0;
    }
    let prod = 1;
    items.forEach((it) => {
      const p = Math.max(0, Math.min(100, it.medical_percentage || 0));
      prod *= 1 - p / 100;
    });
    const combined = Math.round((1 - prod) * 100);
    setCombinedPercentage(combined);
    return combined;
  }

  function evaluateViability(percent: number) {
    let label = "Non-Viable";
    let range = "0% - 5%";
    if (percent >= 30) {
      label = "High";
      range = `${Math.max(25, percent - 5)}% - ${Math.min(80, percent + 10)}%`;
    } else if (percent >= 15) {
      label = "Medium";
      range = `${Math.max(10, percent - 3)}% - ${Math.min(40, percent + 5)}%`;
    } else if (percent >= 5) {
      label = "Low";
      range = "5% - 15%";
    }
    setViability(label);
    setProjectedRange(range);
    return { label, range };
  }

  function simulateHypPayment(viabilityLabel: string | null) {
    setPaymentStatus("Pending");
    if (viabilityLabel === "Non-Viable") {
      setPaymentStatus("Skipped");
      return { status: "Skipped" };
    }
    setPaymentStatus("Paid");
    return { status: "Paid" };
  }

  function generateInteractiveQs(items: any[], percent: number) {
    const qs: { id: string; q: string }[] = [];
    let id = 1;
    if (!items || items.length === 0) {
      qs.push({ id: `q${id++}`, q: "Do you have any medical reports from a doctor describing your condition?" });
    } else {
      items.forEach((it: any) => {
        qs.push({ id: `q${id++}`, q: `Please confirm the diagnosis related to code ${it.btl_code} (${it.description_he})` });
      });
    }
    if (percent >= 15) {
      qs.push({ id: `q${id++}`, q: "Has your condition limited your ability to work in the last 12 months?" });
    }
    const finalQs = qs.slice(0, 5);
    setQas(finalQs);
    return finalQs;
  }

  function simulateAgentRouting(percent: number, viabilityLabel: string) {
    let route = "Initial Claim Submission Agent";
    if (viabilityLabel === "High" && percent >= 40) route = "Medical Committee Prep Agent";
    else if (viabilityLabel === "High") route = "Initial Claim Submission Agent";
    else if (viabilityLabel === "Medium" && elig.hasMedicalDocs) route = "Expert Doctor Prep Agent";
    else if (viabilityLabel === "Low") route = "Initial Claim Submission Agent (HITL review recommended)";
    else route = "Referral / Non-viable - refer out";

    if (percent >= 60) route = "Vocational Rehabilitation Agent (plus Committee Prep)";

    setAgentRoute(route);
    return route;
  }

  // ---------- Step handlers ----------
  function startFromLanding() {
    setStep(2);
  }

  function proceedFromPersonalToEligibility() {
    setStep(3);
  }

  function submitEligibilityAnswers() {
    setStep(3.5);
  }

  function confirmProceedToDocs(shouldProceed: boolean) {
    if (!shouldProceed) {
      setStep(3);
      return;
    }
    simulateCreateClaimRecord();
    const docs = simulateAIRequiredDocs(elig);
    setRequiredDocs(docs);
    setStep(4);
  }

  function proceedToCoreAnalysisFromDocs() {
    const allFiles = requiredDocs.flatMap((d) => d.files || []);
    const text = simulateOCR(allFiles);
    const ents = simulateNER(text);
    const mapped = simulateBTLMapping(ents, allFiles);
    const combined = combineBTLPercentages(mapped);
    evaluateViability(combined);
    setStep(5);
    setStep(6);
  }

  function proceedToPayment() {
    simulateHypPayment(viability);
    setStep(7);
  }

  function afterPaymentContinue() {
    if (paymentStatus === "Paid") {
      generateInteractiveQs(btlItems, combinedPercentage || 0);
      setStep(8);
    }
  }

  // FIXED: Combined QA handling, routing, and onboarding completion/navigation.
  function submitQAAndRoute() {
    const answeredCount = Object.values(qaAnswers).filter(Boolean).length;
    const bump = Math.min(10, answeredCount * 3);
    const newCombined = Math.min(100, Math.round((combinedPercentage || 0) + bump));
    setCombinedPercentage(newCombined);

    const evalRes = evaluateViability(newCombined);
    simulateAgentRouting(newCombined, evalRes.label);

    // Complete onboarding and navigate to dashboard (if provided)
    try {
      completeOnboarding();
    } catch (err) {
      // ignore if store action not available — still navigate
    }

    if (onClose) onClose();
    if (onNavigate) {
      onNavigate("dashboard");
    } else {
      navigate("/dashboard", { replace: true });
    }
  }

  function runSubAgentNow() {
    let result = { status: "Done", summary: "" };
    if (agentRoute?.includes("Initial Claim")) {
      result.summary = "Generated pre-filled BTL claim form and attachment checklist.";
    } else if (agentRoute?.includes("Medical Committee")) {
      result.summary = "Prepared committee talking points and mock Q&A.";
    } else if (agentRoute?.includes("Expert Doctor Prep")) {
      result.summary = "Produced doctor prep script and suggested tests.";
    } else if (agentRoute?.includes("Vocational Rehabilitation")) {
      result.summary = "Recommended vocational rehab tracks.";
    } else {
      result.summary = "Referred or manual follow-up suggested.";
    }
    setSubAgentResult(result);
    setStep(10);
  }

  // UI helpers
  const stepLabels = [
    "Landing",
    "Personal details",
    "Eligibility",
    "Documents",
    "Analysis",
    "Monetization",
    "Payment",
    "Q&A",
    "Routing",
    "Sub-agent",
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => goToStep(1)} className="text-sm px-3 py-1 rounded-full border">Restart</button>
            <button onClick={onClose} className="text-sm px-3 py-1 rounded-full border">Close</button>
          </div>
        </header>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {stepLabels.map((label, i) => (
            <button
              key={label}
              onClick={() => goToStep(i + 1)}
              className={`text-sm px-3 py-1 rounded-full border ${step === i + 1 ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${Math.min(100, (step / 10) * 100)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2">
            {/* Step 1: Landing */}
            {step === 1 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Welcome</h2>
                <p className="text-sm text-slate-600 mb-4">Start by filling your personal details so we can pre-fill parts of the intake.</p>
                <button onClick={startFromLanding} className="px-4 py-2 bg-blue-600 text-white rounded-3xl">Start</button>
              </section>
            )}

            {/* Step 2: Personal details */}
            {step === 2 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Personal details</h2>
                <p className="text-sm text-slate-600 mb-4">Provide name, contact and address. These are required before eligibility.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="First name" value={form.firstName} onChange={(e) => updateForm("firstName", e.target.value)} className="p-2 rounded border bg-slate-50" />
                  <input placeholder="Last name" value={form.lastName} onChange={(e) => updateForm("lastName", e.target.value)} className="p-2 rounded border bg-slate-50" />
                  <input placeholder="ID / T.Z." value={form.idNumber} onChange={(e) => updateForm("idNumber", e.target.value)} className="p-2 rounded border bg-slate-50" />
                  <input placeholder="DOB" value={form.dob} onChange={(e) => updateForm("dob", e.target.value)} className="p-2 rounded border bg-slate-50" />
                  <input placeholder="Email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} className="p-2 rounded border bg-slate-50" />
                  <input placeholder="Phone" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} className="p-2 rounded border bg-slate-50" />
                  <input placeholder="Address line 1" value={form.addressLine1} onChange={(e) => updateForm("addressLine1", e.target.value)} className="p-2 rounded border bg-slate-50 md:col-span-2" />
                  <input placeholder="Address line 2 (optional)" value={form.addressLine2} onChange={(e) => updateForm("addressLine2", e.target.value)} className="p-2 rounded border bg-slate-50 md:col-span-2" />
                  <input placeholder="City" value={form.city} onChange={(e) => updateForm("city", e.target.value)} className="p-2 rounded border bg-slate-50" />
                  <input placeholder="Postcode" value={form.postcode} onChange={(e) => updateForm("postcode", e.target.value)} className="p-2 rounded border bg-slate-50" />
                </div>

                <div className="mt-4 flex gap-3">
                  <button onClick={proceedFromPersonalToEligibility} className="px-4 py-2 rounded bg-blue-600 text-white">Save & Continue to eligibility</button>
                  <button onClick={() => goToStep(1)} className="px-4 py-2 rounded border">Back</button>
                </div>
              </section>
            )}

            {/* Step 3: Eligibility questionnaire */}
            {step === 3 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Eligibility questionnaire</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-700">Are you currently employed?</label>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => updateElig("employed", true)} className={`px-3 py-2 border rounded-3xl ${elig.employed === true ? "bg-blue-600 text-white" : ""}`}>Yes</button>
                      <button onClick={() => updateElig("employed", false)} className={`px-3 py-2 border rounded-3xl ${elig.employed === false ? "bg-blue-600 text-white" : ""}`}>No</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700">Do you have medical records?</label>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => updateElig("hasMedicalDocs", true)} className={`px-3 py-2 rounded-3xl border ${elig.hasMedicalDocs === true ? "bg-blue-600 text-white" : ""}`}>Yes</button>
                      <button onClick={() => updateElig("hasMedicalDocs", false)} className={`px-3 py-2 rounded-3xl border ${elig.hasMedicalDocs === false ? "bg-blue-600 text-white" : ""}`}>No</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-700">Condition type</label>
                      <select value={elig.conditionType} onChange={(e) => updateElig("conditionType", e.target.value)} className="mt-1 block w-full rounded border p-2 bg-slate-50">
                        <option value="chronic">Chronic</option>
                        <option value="accident">Accident</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-700">Duration (months)</label>
                      <input type="number" min="0" value={elig.conditionDurationMonths} onChange={(e) => updateElig("conditionDurationMonths", Number(e.target.value))} className="mt-1 block w-full rounded border p-2 bg-slate-50" />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button onClick={submitEligibilityAnswers} className="px-4 py-2 rounded-3xl bg-blue-600 text-white">Submit eligibility answers</button>
                    <button onClick={() => goToStep(2)} className="px-4 py-2 rounded-3xl border">Back to personal details</button>
                  </div>
                </div>
              </section>
            )}

            {/* Step 3.5: confirm proceed to docs */}
            {step === 3.5 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Eligibility: Next step</h2>
                <p className="text-sm text-slate-600 mb-4">Based on your answers we can run a quick AI review and collect specific documents/data required for a proper claim analysis. Would you like to proceed?</p>
                <div className="flex gap-3">
                  <button onClick={() => confirmProceedToDocs(true)} className="px-4 py-2 rounded bg-green-600 text-white">Yes — collect required items</button>
                  <button onClick={() => confirmProceedToDocs(false)} className="px-4 py-2 rounded border">No — stay here</button>
                </div>
              </section>
            )}

            {/* Step 4: Documents Dashboard */}
            {step === 4 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Documents Dashboard</h2>
                <p className="text-sm text-slate-600 mb-4">Complete the required items below. The dashboard shows what's left and what to do.</p>

                <div className="space-y-4">
                  {requiredDocs.map((d) => (
                    <div key={d.id} className="p-4 rounded-lg border bg-slate-50">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="font-semibold">{d.title} {d.required && <span className="text-red-500 text-sm">required</span>}</div>
                          <div className="text-sm text-slate-600">{d.description}</div>
                        </div>

                        <div className="w-48 text-right">
                          <div className="text-sm mb-2">{d.uploaded ? "Uploaded" : "Not uploaded"}</div>

                          <div className="flex gap-2">
                            <button onClick={() => handleUploadDoc(d.id, [`${d.id}_file1.pdf`])} className="px-3 py-1 rounded border text-sm">Upload sample</button>
                            <button onClick={() => handleUploadDoc(d.id, [])} className="px-3 py-1 rounded border text-sm">Clear</button>
                          </div>
                        </div>
                      </div>

                      {d.files && d.files.length > 0 && (
                        <div className="mt-3 text-sm text-slate-700">
                          <strong>Files:</strong> {d.files.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <button onClick={proceedToCoreAnalysisFromDocs} className="px-4 py-2 rounded bg-blue-600 text-white" disabled={!isAllRequiredDocsUploaded()}>
                    {isAllRequiredDocsUploaded() ? "All required items complete — Run Core Analysis" : "Complete all required items to run analysis"}
                  </button>

                  <button onClick={() => goToStep(3)} className="px-4 py-2 rounded border">Back to Eligibility</button>
                </div>
              </section>
            )}

            {/* Step 5 & 6: Analysis/Monetization */}
            {step === 5 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Core Analysis (running)</h2>
                <p className="text-sm text-slate-600">Running OCR, NER, BTL mapping and combining percentages... (simulated)</p>
              </section>
            )}

            {step === 6 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Monetization Screen</h2>
                <div className="p-4 rounded border bg-slate-50 mb-3">
                  <div><strong>Viability:</strong> {viability || "—"}</div>
                  <div><strong>Projected range:</strong> {projectedRange || "—"}</div>
                  <div><strong>Combined %:</strong> {combinedPercentage != null ? `${combinedPercentage}%` : "—"}</div>
                </div>

                <div className="flex gap-3">
                  <button onClick={proceedToPayment} className="px-4 py-2 rounded bg-green-600 text-white">Proceed to payment (simulate)</button>
                  <button onClick={() => goToStep(4)} className="px-4 py-2 rounded border">Back to docs</button>
                </div>
              </section>
            )}

            {/* Step 7 Payment */}
            {step === 7 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Payment (Hyp) simulation</h2>
                <div className="mb-3"><strong>Payment status:</strong> {paymentStatus || "Not started"}</div>
                <div className="flex gap-3">
                  <button onClick={afterPaymentContinue} className="px-4 py-2 rounded bg-blue-600 text-white" disabled={paymentStatus !== "Paid"}>Continue after payment</button>
                  <button onClick={() => goToStep(6)} className="px-4 py-2 rounded border">Back to monetization</button>
                </div>
                <p className="text-sm text-slate-500 mt-3">If Viability is Non-Viable, payment will be skipped.</p>
              </section>
            )}

            {/* Step 8 Q&A */}
            {step === 8 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Interactive Q&A</h2>
                {qas.length === 0 ? (
                  <div className="text-sm text-slate-600">No questions generated.</div>
                ) : (
                  <div className="space-y-3">
                    {qas.map((q) => (
                      <div key={q.id}>
                        <div className="text-sm font-medium">{q.q}</div>
                        <input placeholder="Answer..." value={qaAnswers[q.id] || ""} onChange={(e) => setQaAnswers((s) => ({ ...s, [q.id]: e.target.value }))} className="mt-1 block w-full rounded border p-2 bg-white" />
                      </div>
                    ))}
                    <div className="flex gap-3 mt-3">
                      <button onClick={submitQAAndRoute} className="px-4 py-2 rounded bg-blue-600 text-white">Submit answers</button>
                      <button onClick={() => goToStep(7)} className="px-4 py-2 rounded border">Back to payment</button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Step 9 Routing */}
            {step === 9 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Agent Strategy & Routing</h2>
                <div className="mb-3"><strong>Selected route:</strong> {agentRoute || "—"}</div>
                <div className="flex gap-3">
                  <button onClick={runSubAgentNow} className="px-4 py-2 rounded bg-blue-600 text-white">Run sub-agent (simulate)</button>
                  <button onClick={() => goToStep(8)} className="px-4 py-2 rounded border">Back to Q&A</button>
                </div>
              </section>
            )}

            {/* Step 10 Sub-agent */}
            {step === 10 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Sub-agent result</h2>
                <div className="p-4 rounded border bg-slate-50 mb-3">
                  <div><strong>Status:</strong> {subAgentResult?.status || "—"}</div>
                  <div className="mt-2"><strong>Summary:</strong> {subAgentResult?.summary || "—"}</div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => goToStep(1)} className="px-4 py-2 rounded bg-green-600 text-white">Finish and return to start</button>
                  <button onClick={() => goToStep(4)} className="px-4 py-2 rounded border">Back to Documents</button>
                </div>
              </section>
            )}
          </div>
        </div>

        <footer className="mt-6 text-sm text-slate-500">
          This demo simulates the data-collection dashboard step. Replace simulated functions with real backend / n8n calls when integrating.
        </footer>
      </div>
    </div>
  );
}
