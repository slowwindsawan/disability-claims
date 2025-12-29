# AI Agent Prompt Management System

## Overview

This feature allows administrators to manage and configure GPT agent prompts dynamically through a web interface. Prompts are stored in the database instead of being hardcoded, enabling real-time updates without code changes.

## Features

- **Agent List View**: Browse all configured AI agents in the system
- **Prompt Editor**: Edit agent prompts with a full-featured text editor
- **Model Switcher**: Change between GPT models (GPT-4o, GPT-4o Mini, GPT-4, etc.)
- **Version Control**: Track when prompts were created and last updated
- **Admin-Only Access**: Only full admins (not subadmins) can edit prompts
- **Real-time Preview**: See agent configurations and metadata

## Database Schema

### Agents Table

```sql
CREATE TABLE public.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    prompt TEXT NOT NULL,
    model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
    output_schema JSONB,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Default Agents

The seed data file includes the following 12 agents:

### Core Analysis Agents
1. **form_7801_analyzer**: Analyzes disability claim documents and generates Form 7801 strategy
2. **document_summarizer**: Summarizes medical documents for disability claims
3. **eligibility_processor**: Processes eligibility based on medical evidence and guidelines
4. **followup_agent**: Analyzes cases and generates follow-up recommendations
5. **claim_strategy_generator**: Generates comprehensive claim strategy
6. **document_relevance_checker**: Checks document relevance for disability claims
7. **legal_doc_analyzer**: Analyzes legal documents and BTL correspondence

### VAPI (Voice Assistant) Agents
8. **vapi_document_summary**: Generates summaries for voice assistant conversations
9. **vapi_call_analyzer**: Analyzes call transcripts to extract structured information
10. **vapi_main_assistant**: Main system prompt for VAPI voice intake interviews
11. **call_summary_generator**: Generates structured summaries from call transcripts

### Client Preparation
12. **committee_prep_agent**: Prepares clients for BTL medical committee hearings

## API Endpoints

### List All Agents
```
GET /api/agents
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": "ok",
  "agents": [...],
  "can_edit": true
}
```

### Get Agent Details
```
GET /api/agents/{agent_id}
Authorization: Bearer {token}
```

### Update Agent
```
PUT /api/agents/{agent_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "prompt": "New prompt text...",
  "model": "gpt-4o",
  "description": "Agent description"
}
```

### Create New Agent
```
POST /api/agents
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "new_agent",
  "prompt": "Prompt text...",
  "model": "gpt-4o",
  "description": "Agent description"
}
```

### Delete Agent
```
DELETE /api/agents/{agent_id}
Authorization: Bearer {token}
```

## Available GPT Models

- **gpt-4o**: Most capable model, best for complex tasks
- **gpt-4o-mini**: Fast and affordable, good for simple tasks
- **gpt-4**: Previous generation flagship model
- **gpt-4-turbo**: Faster version of GPT-4
- **o1-preview**: Advanced reasoning model
- **o1-mini**: Fast reasoning model

## Using Prompt Variables

Prompts can include placeholders that will be replaced with actual data:

- `{context_text}` - Document context or summary
- `{document_text}` - Raw document text
- `{medical_evidence}` - Medical evidence data
- `{case_data}` - Case information
- `{case_overview}` - Case overview summary

**Example:**
```
You are an expert attorney analyzing disability claims.

**Case Information:**
{case_data}

**Medical Evidence:**
{medical_evidence}

Please provide your analysis...
```

## Frontend Access

Navigate to `/admin/prompts` after logging in as an admin user.

**Features:**
- Left sidebar shows all agents with their current model
- Click an agent to view and edit its details
- Edit prompt in the large textarea
- Select GPT model from the grid of options
- Click "Save Changes" to update the agent
- Visual feedback for save success/errors

## Access Control

### Admins (Full Access)
- View all agents
- Edit prompts
- Change models
- Create new agents
- Delete agents

### Subadmins (Read-Only)
- View all agents
- View prompts
- Cannot edit or create

### Regular Users
- No access to this feature

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend/db/migrations

# Step 1: Create the agents table
# Run 013_create_agents_table.sql in your Supabase SQL editor

# Step 2: Populate with seed data
# Run 013_agents_seed_data.sql in your Supabase SQL editor
```

Or use the Supabase dashboard SQL editor to execute both files in sequence.

### 2. Verify Backend Setup

The backend endpoints are already integrated in `backend/app/main.py`. Ensure you have the OpenAI API key configured:

```bash
export OPENAI_API_KEY=your_api_key_here
```

### 3. Access the UI

1. Log in as an admin user
2. Navigate to `/admin/prompts`
3. Select an agent from the list
4. Edit the prompt or change the model
5. Click "Save Changes"

## Best Practices

### Prompt Writing
1. **Be Specific**: Clearly define the agent's role and task
2. **Include Examples**: Show the format you expect
3. **Use Placeholders**: Make prompts reusable with variables
4. **Test Thoroughly**: Test prompts with various inputs before deploying

### Model Selection
- **GPT-4o**: Use for complex analysis requiring deep reasoning
- **GPT-4o Mini**: Use for simple tasks like summarization
- **O1 Models**: Use when advanced reasoning is needed
The `updated_at` timestamp automatically tracks when prompts were last modified
### Version Control
- Always test changes before saving
- Keep the description updated to reflect what the agent does
- Monitor the `updated_at` timestamp to track changes

## Security

- All endpoints require admin authentication
- Subadmins have read-only access
- Row-level security (RLS) policies protect the agents table
- Only authenticated admin users can access via API
- Automatic timestamp tracking with `updated_at` field

## Troubleshooting

### "Failed to load agents"
- Check if the migration was run successfully
- Verify Supabase connection
- Check browser console for detailed errors

### "Only admin can update agents"
- Ensure you're logged in as admin (not subadmin)
- Check `is_subadmin` flag in user profile

### Changes not saving
- Verify the prompt is not empty
- Check if the selected model is valid
- Look for errors in the browser console
- Check backend logs for API errors

## Future Enhancements

Potential improvements:
- **Prompt Versioning**: Track history of prompt changes
- **A/B Testing**: Test different prompts side-by-side
- **Performance Metrics**: Track token usage and response times
- **Prompt Templates**: Library of reusable prompt patterns
- **Testing Interface**: Test prompts with sample data in the UI
- **Rollback Feature**: Revert to previous prompt versions

## Support

For issues or questions:
1. Check the browser console for errors
2. Review backend logs for API issues
3. Verify database migrations are complete
4. Ensure proper admin permissions
