# Quick Start: Agent Prompts Management

## 🚀 Quick Setup (5 minutes)

### Step 1: Database Setup
1. Open your Supabase SQL Editor
2. Execute these files in order:
   ```
   backend/db/migrations/013_create_agents_table.sql
   backend/db/migrations/013_agents_seed_data.sql
   ```

### Step 2: Verify Installation
Run this query to check if agents were created:
```sql
SELECT name, model, is_active FROM public.agents ORDER BY name;
```

You should see 12 agents listed.

### Step 3: Access the UI
1. Log in as an admin user
2. Go to `/admin/prompts`
3. You're ready to manage prompts! 🎉

---

## 📋 What You Get

### 12 Pre-configured Agents

**Analysis & Processing**
- ✅ Form 7801 Analyzer
- ✅ Document Summarizer  
- ✅ Eligibility Processor
- ✅ Follow-up Agent
- ✅ Claim Strategy Generator
- ✅ Document Relevance Checker
- ✅ Legal Document Analyzer

**VAPI Voice Integration**
- ✅ VAPI Document Summary
- ✅ VAPI Call Analyzer
- ✅ VAPI Main Assistant
- ✅ Call Summary Generator

**Client Support**
- ✅ Committee Prep Agent

---

## 🎯 Common Tasks

### Edit a Prompt
1. Click the agent from the list
2. Modify the prompt text
3. Change model if needed
4. Click "Save Changes"

### Change GPT Model
1. Select an agent
2. Click on the desired model from the grid
3. Save changes

### View Agent Details
- Agent list shows: name, model, active status
- Click any agent to see full prompt and description

---

## 🔑 Access Levels

| Role | Can View | Can Edit |
|------|----------|----------|
| Admin | ✅ | ✅ |
| Subadmin | ✅ | ❌ |
| User | ❌ | ❌ |

---

## 💡 Pro Tips

1. **Use Placeholders**: `{context_text}`, `{document_text}`, `{medical_evidence}` etc.
2. **Test First**: Make small changes and verify before major edits
3. **Model Selection**: 
   - GPT-4o for complex analysis
   - GPT-4o Mini for simple tasks
4. **Keep Descriptions Current**: Update agent description when changing purpose

---

## 🐛 Troubleshooting

**Can't see agents?**
- Check if migration ran successfully
- Verify you're logged in as admin

**Can't save changes?**
- Ensure you're admin (not subadmin)
- Check browser console for errors

**Model options not showing?**
- Refresh the page
- Check network connection

---

## 📚 Full Documentation

See [AGENT_PROMPTS_README.md](./AGENT_PROMPTS_README.md) for:
- API documentation
- Detailed setup instructions
- Best practices
- Advanced features
