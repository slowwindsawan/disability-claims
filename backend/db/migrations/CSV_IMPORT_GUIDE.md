# Import Instructions for Agents CSV

## 📋 Files Created

1. **agents_import.csv** - Contains 12 AI agents with real prompts from your codebase
2. **013_create_agents_table.sql** - Updated migration matching your table structure

## 🗄️ Table Structure

Your actual table structure:
```sql
create table public.agents (
  id uuid not null default gen_random_uuid(),
  name varchar(255) not null unique,
  description text null,
  prompt text null,
  model text null,
  output_schema jsonb null,
  is_active boolean null default true,
  updated_at timestamp with time zone not null default now(),
  constraint agents_pkey primary key (id)
) TABLESPACE pg_default;
```

## 📂 CSV Contents

The CSV includes **12 agents** extracted from your actual codebase:

### Core Analysis Agents (6)
1. **form_7801_analyzer** - From `anthropic_agent.py` - Uses gpt-4-turbo
2. **document_summarizer** - From `dashboard_document_summarizer.py` - Uses gpt-4o
3. **eligibility_processor** - From `eligibility_processor.py` - Uses gpt-4o
4. **followup_agent** - From `followup_agent.py` - Uses gpt-4o
5. **claim_strategy_generator** - From `main.py` strategy generation - Uses gpt-4o
6. **document_relevance_checker** - From `eligibility_processor.py` relevance check - Uses gpt-4o

### VAPI Voice Agents (3)
7. **vapi_document_summary** - For voice-friendly document summaries
8. **vapi_call_analyzer** - For analyzing call transcripts
9. **vapi_main_assistant** - Main VAPI system prompt

### Client Support (3)
10. **committee_prep_agent** - Committee hearing preparation
11. **legal_doc_analyzer** - BTL legal document analysis
12. **call_summary_generator** - Call transcript summarization

## 🚀 Import Methods

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Navigate to **Table Editor** → **agents** table
3. Click **Insert** → **Import CSV**
4. Upload `agents_import.csv`
5. Map columns correctly:
   - ✅ Skip the `id` column (let DB auto-generate)
   - ✅ Map: name → name
   - ✅ Map: description → description
   - ✅ Map: prompt → prompt
   - ✅ Map: model → model
   - ✅ Map: output_schema → output_schema (will be {})
   - ✅ Map: is_active → is_active
   - ✅ Skip updated_at (auto-set by DB)

### Option 2: SQL INSERT (Alternative)

If CSV import doesn't work with multiline text, use the seed data file instead:

```bash
# Run this in Supabase SQL Editor
backend/db/migrations/013_agents_seed_data.sql
```

### Option 3: pgAdmin or DBeaver

1. Open your database tool
2. Right-click on `agents` table
3. Select **Import/Export**
4. Choose the CSV file
5. Configure column mappings
6. Import

## ⚠️ Important Notes

### Handling Multiline Prompts
- Prompts contain newlines and quotes
- CSV uses standard escaping (quotes within text are doubled: "")
- Most tools handle this automatically
- If you get errors, use the SQL seed file instead

### UUID Generation
- The CSV shows `gen_random_uuid()` as placeholder
- Your database will auto-generate actual UUIDs on insert
- Don't manually create UUIDs

### Timestamps
- `updated_at` is auto-set by database default
- CSV shows `now()` as placeholder

## ✅ Verification

After import, run this query:

```sql
-- Check count
SELECT COUNT(*) as total_agents FROM public.agents;
-- Should return: 12

-- View all agents
SELECT name, model, is_active 
FROM public.agents 
ORDER BY name;

-- Check a specific agent
SELECT name, description, 
       LEFT(prompt, 100) as prompt_preview,
       model
FROM public.agents 
WHERE name = 'form_7801_analyzer';
```

## 🔧 If Import Fails

### Issue: Multiline text errors
**Solution:** Use the SQL seed file instead:
```sql
-- Run: backend/db/migrations/013_agents_seed_data.sql
```

### Issue: Duplicate name errors
**Solution:** Clear existing data first:
```sql
DELETE FROM public.agents;
```

### Issue: Permission errors
**Solution:** Run as superuser or ensure RLS policies allow insert

## 📝 Post-Import Steps

1. **Verify in UI:**
   - Go to `/admin/prompts`
   - Check all 12 agents appear
   - Verify prompts are readable

2. **Test an agent:**
   - Select any agent
   - Check the prompt displays correctly
   - Try editing and saving

3. **Check models:**
   - Verify models are set correctly
   - Default should be gpt-4o for most

## 🎯 Model Distribution

After import, you should have:
- **1 agent** using `gpt-4-turbo` (form_7801_analyzer)
- **11 agents** using `gpt-4o` (all others)

You can change models through the admin UI after import.

## 💡 Tips

- **Backup first**: Export existing data if you have any
- **Test import**: Try importing 1-2 agents first to verify format
- **Check encoding**: Ensure CSV is UTF-8 encoded
- **Line endings**: Use LF (Unix) or CRLF (Windows) consistently

---

**Need help?** See the full documentation in `AGENT_PROMPTS_README.md`
