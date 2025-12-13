import { useState } from 'react';
import { Save, RefreshCw, FileText, MessageSquare } from 'lucide-react';
import './AdminPromptEditor.css';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'vapi' | 'eligibility' | 'document';
  lastUpdated: string;
}

export default function AdminPromptEditor() {
  const [selectedPromptId, setSelectedPromptId] = useState<string>('vapi-system');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mock prompt templates - will be fetched from backend later
  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    {
      id: 'vapi-system',
      name: 'VAPI Interview System Prompt',
      description: 'Main system prompt for the AI voice interview agent',
      category: 'vapi',
      lastUpdated: '2024-12-11T10:30:00Z',
      content: `### ROLE
You are "Alex," the Senior Intake & Strategy Agent for the "Zero-Touch Claims System."
Your goal is to replace a traditional attorney by executing the **Maximization Principle**: securing the highest possible financial benefit (Kitzbah) and maximum Retroactivity (up to 12 months).
You are interviewing the claimant to prepare their "Statement of Claims" for the Bituach Leumi Medical Committee.

### KNOWLEDGE BASE (BTL REGULATIONS)
You have access to the following knowledge base regarding Bituach Leumi disability claims:
- **Medical Committee Guidelines:** Understand the criteria for disability percentages, retroactivity rules, and required documentation.
- **Maximization Principle:** Strategies to maximize claim amounts through stacking disabilities, proving impairment of earning capacity (IEL), and securing retroactivity.
- **Common Pitfalls:** Awareness of common mistakes claimants make that lead to reduced benefits or claim denials.

### CORE STRATEGY: THE 3 PILLARS OF MAXIMIZATION
Your interview must satisfy these three legal priorities in order:

**P1: RETROACTIVITY (The "Money Left on the Table")**
- **Goal:** Secure 12 months of back-pay.
- **Action:** Ask: "When was the *very first* time a doctor diagnosed this?" and "When did you first start losing income because of it?"
- **Logic:** We need to push the "Claim Start Date" back as far as legally possible (up to 1 year).

**P2: MEDICAL THRESHOLD (>20% Stacking)**
- **Goal:** Cross the 20% medical disability threshold to unlock Rehabilitation.
- **Action - Disability Stacking:** Do not settle for one condition. If they have ADHD, ask about "Anxiety" or "Depression." If they have Back Pain, ask about "Radicular pain in the legs" (Neuropathy).
- **Why:** We need to "stack" multiple small percentages to cross 20% weighted disability.

**P3: IEL (Impairment of Earning Capacity)**
- **Goal:** Prove functional inability to work (50%-100% incapacity).
- **Action:** Shift focus from "pain" to "function."
- **Key Question:** "Describe a specific instance where your condition caused you to **quit a job, miss a promotion, or fail a project**."
- **Sheram Check:** Ask: "Do you need physical help from another person for daily tasks like dressing, eating, or bathing?" (Eligibility for Special Services).

### INTERVIEW FLOW
1.  **Anchor Diagnosis:** "What is the main medical condition preventing you from working?"
2.  **The "Functional" Deep Dive (IEL Focus):**
    - *Wrong Question:* "Does it hurt?"
    - *Right Question:* "Does the pain stop you from sitting for 8 hours? Did you have to reduce your shift hours?"
3.  **The "Secondary" Hunt (Stacking):**
    - "Does this physical condition affect your mood, sleep, or concentration?" (Aiming for Items 33/34 - Psychiatric).
    - "Do your medications cause side effects like stomach issues or fatigue?"
4.  **Vocational Rehab Check:**
    - If the user is young or a student: "Are you currently studying? Would you be interested in Bituach Leumi paying for your degree?" (Maximize 'Dmei Shikum').

### BEHAVIOR & TONE
- **Tone:** Professional, Empathetic, but "Coaching."
- **Stress-Test:** If their answer is vague ("I just can't work"), challenge them gently: "To win this claim, the committee needs specifics. Tell me exactly *why* you couldn't finish your last shift."
- **One Question at a Time:** Keep it conversational.

### RESTRICTIONS
- Do NOT list documents orally.
- Do NOT mention "JSON" or technical backend terms.
- Focus purely on extracting the **Date of Onset**, **Functional Loss**, and **Secondary Conditions**.`,
    },
    {
      id: 'eligibility-analyzer',
      name: 'Eligibility Analysis Prompt',
      description: 'Prompt for analyzing questionnaire answers and documents',
      category: 'eligibility',
      lastUpdated: '2024-12-11T09:15:00Z',
      content: `You are an expert disability claims analyst evaluating eligibility for Bituach Leumi (Israeli National Insurance) disability benefits.

Your task is to analyze the user's questionnaire answers and medical documents to determine:
1. Eligibility status (eligible/needs_review/not_eligible)
2. Eligibility score (0-100)
3. Strengths and weaknesses of the claim
4. Required next steps

Guidelines:
- Medical documentation is essential
- Work history and functional limitations are critical
- Look for opportunities to "stack" multiple conditions
- Assess retroactivity potential (up to 12 months)
- Evaluate impairment of earning capacity (IEL)

Provide a structured analysis with clear recommendations.`,
    },
    {
      id: 'document-analysis',
      name: 'Document Relevance Checker',
      description: 'Prompt for checking if uploaded documents are medically relevant',
      category: 'document',
      lastUpdated: '2024-12-11T08:45:00Z',
      content: `You are a medical document classifier for disability claims.

Analyze the provided document text and determine:
1. Is this a medical document relevant to disability claims?
2. What type of medical document is it?
3. What is the primary medical condition discussed?
4. Key findings and test results
5. Treatment recommendations
6. Functional limitations mentioned

Documents should be:
- Medical records
- Doctor's reports
- Test results (lab, imaging, psychological)
- Treatment plans
- Specialist evaluations

NOT relevant:
- Bills/invoices
- Appointment reminders
- Generic health information
- Non-medical documents

Provide a summary focusing on disability-relevant information.`,
    },
  ]);

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  const handlePromptChange = (content: string) => {
    setPrompts(
      prompts.map((p) =>
        p.id === selectedPromptId ? { ...p, content } : p
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Simulate API call - will be replaced with actual backend integration
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update last updated timestamp
    setPrompts(
      prompts.map((p) =>
        p.id === selectedPromptId
          ? { ...p, lastUpdated: new Date().toISOString() }
          : p
      )
    );

    setIsSaving(false);
    setSaveSuccess(true);

    // Hide success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (
      confirm(
        'Are you sure you want to reset this prompt to default? This cannot be undone.'
      )
    ) {
      // Will fetch default from backend in actual implementation
      alert('Reset functionality will be implemented with backend integration');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vapi':
        return <MessageSquare size={16} className="text-purple-600" />;
      case 'eligibility':
        return <FileText size={16} className="text-blue-600" />;
      case 'document':
        return <FileText size={16} className="text-green-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'vapi':
        return 'bg-purple-100 text-purple-800';
      case 'eligibility':
        return 'bg-blue-100 text-blue-800';
      case 'document':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="admin-prompt-editor">
      <div className="prompt-editor-header">
        <div>
          <h1 className="page-title">AI Prompt Editor</h1>
          <p className="page-description">
            Manage and customize AI prompts for interviews, eligibility analysis, and document processing
          </p>
        </div>
      </div>

      <div className="prompt-editor-layout">
        {/* Sidebar - Prompt List */}
        <div className="prompt-sidebar">
          <h2 className="sidebar-title">Prompt Templates</h2>
          <div className="prompt-list">
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedPromptId(prompt.id)}
                className={`prompt-item ${
                  selectedPromptId === prompt.id ? 'active' : ''
                }`}
              >
                <div className="prompt-item-header">
                  <div className="prompt-item-icon">
                    {getCategoryIcon(prompt.category)}
                  </div>
                  <span className={`category-badge ${getCategoryBadgeClass(prompt.category)}`}>
                    {prompt.category}
                  </span>
                </div>
                <h3 className="prompt-item-name">{prompt.name}</h3>
                <p className="prompt-item-description">{prompt.description}</p>
                <p className="prompt-item-updated">
                  Updated: {new Date(prompt.lastUpdated).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Editor */}
        <div className="prompt-editor-main">
          {selectedPrompt && (
            <>
              <div className="editor-header">
                <div>
                  <h2 className="editor-title">{selectedPrompt.name}</h2>
                  <p className="editor-description">{selectedPrompt.description}</p>
                </div>
                <div className="editor-actions">
                  <button
                    onClick={handleReset}
                    className="btn btn-secondary"
                    title="Reset to default"
                  >
                    <RefreshCw size={18} />
                    Reset
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn btn-primary"
                  >
                    {isSaving ? (
                      <>
                        <div className="spinner" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>

              {saveSuccess && (
                <div className="save-success">
                  ✅ Prompt saved successfully!
                </div>
              )}

              <div className="editor-container">
                <textarea
                  value={selectedPrompt.content}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="prompt-textarea"
                  placeholder="Enter your prompt here..."
                  spellCheck={false}
                />
              </div>

              <div className="editor-footer">
                <div className="character-count">
                  {selectedPrompt.content.length.toLocaleString()} characters
                </div>
                <div className="last-updated">
                  Last updated: {new Date(selectedPrompt.lastUpdated).toLocaleString()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
