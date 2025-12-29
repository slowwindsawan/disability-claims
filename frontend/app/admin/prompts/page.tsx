"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { BACKEND_BASE_URL } from '@/variables'
import {
  Bot,
  Menu,
  LogOut,
  Home,
  ShieldCheck,
  BarChart3,
  Settings,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  Code,
  Zap,
  Eye,
  Users,
  Activity,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

interface Agent {
  id: string
  name: string
  description: string
  prompt: string
  model: string
  output_schema?: any
  is_active: boolean
  created_at: string
  updated_at: string
}

const modelOptions = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Most capable model' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and affordable' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Previous generation' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Faster GPT-4' },
  { value: 'o1-preview', label: 'O1 Preview', description: 'Reasoning model' },
  { value: 'o1-mini', label: 'O1 Mini', description: 'Fast reasoning' },
]

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic'

export default function AdminPromptsPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [editedPrompt, setEditedPrompt] = useState("")
  const [editedModel, setEditedModel] = useState("")
  const [editedDescription, setEditedDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState("")
  const [testOutput, setTestOutput] = useState("")
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/')
          return
        }

        const meResp = await fetch(`${BACKEND_BASE_URL}/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const meData = await meResp.json()

        if (!meData.user) {
          router.push('/')
          return
        }

        const profile = meData.user.profile || {}
        const role = meData.user.role || profile.role
        const isAdmin = role === 'admin' || profile.is_admin || profile.is_superadmin
        const isSubAdmin = profile.is_subadmin

        if (!isAdmin) {
          router.push('/dashboard')
          return
        }

        setIsAuthorized(true)
        setCanEdit(!isSubAdmin)
        fetchAgents()
      } catch (err) {
        console.error('Authorization check failed:', err)
        router.push('/')
      }
    }

    checkAuthorization()
  }, [router])

  const fetchAgents = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${BACKEND_BASE_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch agents')
      }

      const data = await response.json()
      setAgents(data.agents || [])
      setCanEdit(data.can_edit)
    } catch (err: any) {
      setError(err.message || 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setEditedPrompt(agent.prompt)
    setEditedModel(agent.model)
    setEditedDescription(agent.description || '')
    setTestOutput("")
    setSaveSuccess(false)
    setError("")
  }

  const handleSave = async () => {
    if (!selectedAgent || !canEdit) return

    try {
      setIsSaving(true)
      setError("")
      const token = localStorage.getItem('access_token')
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: editedPrompt,
          model: editedModel,
          description: editedDescription
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update agent')
      }

      const data = await response.json()
      
      // Update local state
      setAgents(agents.map(a => a.id === selectedAgent.id ? data.agent : a))
      setSelectedAgent(data.agent)
      setSaveSuccess(true)
      
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    router.push('/')
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  const getAgentIcon = (agentName: string) => {
    if (agentName.includes('form') || agentName.includes('7801')) return FileText
    if (agentName.includes('document')) return FileText
    if (agentName.includes('eligibility')) return CheckCircle2
    if (agentName.includes('followup')) return Activity
    if (agentName.includes('strategy')) return Zap
    return Bot
  }

  const formatAgentName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col"
            >
              <div className="p-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-1">
                  Admin Panel
                </h1>
                <p className="text-sm text-slate-400">Agent Management</p>
              </div>

              <nav className="flex-1 px-3">
                <Link href="/admin">
                  <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 mb-1">
                    <Home className="h-4 w-4 mr-3" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin/analytics">
                  <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 mb-1">
                    <BarChart3 className="h-4 w-4 mr-3" />
                    Analytics
                  </Button>
                </Link>
                <Link href="/admin/team">
                  <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 mb-1">
                    <Users className="h-4 w-4 mr-3" />
                    Team
                  </Button>
                </Link>
                <Link href="/admin/prompts">
                  <Button variant="ghost" className="w-full justify-start bg-white/10 text-white mb-1">
                    <Bot className="h-4 w-4 mr-3" />
                    AI Prompts
                  </Button>
                </Link>
                <Link href="/admin/settings">
                  <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 mb-1">
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </Button>
                </Link>
              </nav>

              <div className="p-3 border-t border-white/10">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Logout
                </Button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-white">GPT Agent Prompts</h2>
                  <p className="text-sm text-slate-400">
                    Manage AI agent configurations and prompts
                  </p>
                </div>
              </div>
              {!canEdit && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  <Eye className="h-3 w-3 mr-1" />
                  View Only
                </Badge>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-hidden flex">
            {/* Agent List */}
            <div className="w-80 border-r border-white/10 bg-slate-900/30">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">
                    AI Agents ({agents.length})
                  </h3>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {agents.map((agent) => {
                        const AgentIcon = getAgentIcon(agent.name)
                        const isSelected = selectedAgent?.id === agent.id
                        
                        return (
                          <Card
                            key={agent.id}
                            className={`p-4 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-500/20 border-blue-500/50'
                                : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70'
                            }`}
                            onClick={() => handleSelectAgent(agent)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                isSelected ? 'bg-blue-500/30' : 'bg-slate-700/50'
                              }`}>
                                <AgentIcon className={`h-5 w-5 ${
                                  isSelected ? 'text-blue-300' : 'text-slate-400'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-white mb-1 truncate">
                                  {formatAgentName(agent.name)}
                                </h4>
                                <p className="text-xs text-slate-400 line-clamp-2">
                                  {agent.description || 'No description'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                                    {agent.model}
                                  </Badge>
                                  {agent.is_active ? (
                                    <Badge variant="outline" className="text-xs border-green-600 text-green-400">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs border-red-600 text-red-400">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Agent Details */}
            <div className="flex-1 overflow-hidden">
              {selectedAgent ? (
                <div className="h-full flex flex-col" style={{overflowY:'scroll'}}>
                  {/* Agent Header */}
                  <div className="border-b border-white/10 bg-slate-900/30 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                          {(() => {
                            const AgentIcon = getAgentIcon(selectedAgent.name)
                            return <AgentIcon className="h-6 w-6 text-blue-300" />
                          })()}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">
                            {formatAgentName(selectedAgent.name)}
                          </h2>
                          <p className="text-slate-400 text-sm">
                            {selectedAgent.description || 'No description provided'}
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Model Selector */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">
                        GPT Model
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {modelOptions.map((model) => (
                          <button
                            key={model.value}
                            onClick={() => canEdit && setEditedModel(model.value)}
                            disabled={!canEdit}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              editedModel === model.value
                                ? 'border-blue-500 bg-blue-500/20 text-white'
                                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                            } ${!canEdit && 'cursor-not-allowed opacity-50'}`}
                          >
                            <div className="font-medium text-sm">{model.label}</div>
                            <div className="text-xs opacity-70">{model.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status Messages */}
                    {saveSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                        <span className="text-green-300 text-sm">Changes saved successfully!</span>
                      </motion.div>
                    )}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2"
                      >
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <span className="text-red-300 text-sm">{error}</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Prompt Editor */}
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6 max-w-5xl">
                      {/* Description */}
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Description
                        </label>
                        <Textarea
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          disabled={!canEdit}
                          className="bg-slate-800/50 border-slate-700 text-white min-h-[60px]"
                          placeholder="Describe what this agent does..."
                        />
                      </div>

                      {/* Prompt */}
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          System Prompt
                        </label>
                        <Textarea
                          value={editedPrompt}
                          onChange={(e) => setEditedPrompt(e.target.value)}
                          disabled={!canEdit}
                          className="bg-slate-800/50 border-slate-700 text-white font-mono text-sm min-h-[400px]"
                          placeholder="Enter the system prompt for this agent..."
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          Use placeholders like {'{context_text}'}, {'{document_text}'}, {'{medical_evidence}'} in your prompt
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="pt-4 border-t border-white/10">
                        <div>
                          <label className="text-xs text-slate-500">Last Updated</label>
                          <p className="text-sm text-slate-300">
                            {new Date(selectedAgent.updated_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Bot className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-400 mb-2">
                      Select an Agent
                    </h3>
                    <p className="text-sm text-slate-500">
                      Choose an agent from the list to view and edit its prompt
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
