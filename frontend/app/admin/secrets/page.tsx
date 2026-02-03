"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Key, Eye, EyeOff, Save, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { BACKEND_BASE_URL } from '@/variables'

interface Secret {
  id: number
  provider: string
  key: string
}

export default function SecretsManagementPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({})
  const [editingKeys, setEditingKeys] = useState<Record<number, string>>({})
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [successIds, setSuccessIds] = useState<Set<number>>(new Set())
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/admin/login')
          return
        }

        const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          router.push('/admin/login')
          return
        }

        const userData = await response.json()
        if (userData.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setIsAuthorized(true)
        await fetchSecrets()
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchSecrets = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${BACKEND_BASE_URL}/admin/secrets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSecrets(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch secrets:', error)
      setErrorMessage('Failed to load secrets')
    }
  }

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleEdit = (secret: Secret) => {
    setEditingKeys(prev => ({
      ...prev,
      [secret.id]: secret.key
    }))
  }

  const handleSave = async (secret: Secret) => {
    console.log('handleSave called for secret:', secret.id)
    const newKey = editingKeys[secret.id]
    console.log('Current key in editing:', newKey)
    console.log('Original key:', secret.key)
    
    if (!newKey || newKey === secret.key) {
      console.log('Key unchanged or empty, canceling edit')
      // Cancel edit if unchanged
      setEditingKeys(prev => {
        const copy = { ...prev }
        delete copy[secret.id]
        return copy
      })
      return
    }

    console.log('Saving new key, adding to savingIds')
    setSavingIds(prev => new Set(prev).add(secret.id))
    setErrorMessage("")

    try {
      const token = localStorage.getItem('access_token')
      console.log('Making PUT request to /admin/secrets/', secret.id)
      const response = await fetch(`${BACKEND_BASE_URL}/admin/secrets/${secret.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: newKey })
      })

      console.log('Response status:', response.status, response.ok)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error('Failed to update secret')
      }

      console.log('Successfully saved secret')
      // Update local state
      setSecrets(prev => prev.map(s => 
        s.id === secret.id ? { ...s, key: newKey } : s
      ))

      // Remove from editing state
      setEditingKeys(prev => {
        const copy = { ...prev }
        delete copy[secret.id]
        return copy
      })

      // Show success indicator
      setSuccessIds(prev => new Set(prev).add(secret.id))
      setTimeout(() => {
        setSuccessIds(prev => {
          const copy = new Set(prev)
          copy.delete(secret.id)
          return copy
        })
      }, 2000)

    } catch (error) {
      console.error('Failed to save secret:', error)
      setErrorMessage('Failed to update secret')
    } finally {
      setSavingIds(prev => {
        const copy = new Set(prev)
        copy.delete(secret.id)
        return copy
      })
    }
  }

  const maskKey = (key: string) => {
    if (key.length <= 8) return '•'.repeat(key.length)
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Back to Admin Panel
          </button>
          <div className="flex items-center gap-3">
            <Key className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Secrets Management</h1>
          </div>
          <p className="text-gray-600 mt-2">Manage API keys and secrets used by the system</p>
        </motion.div>

        {/* Error Message */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{errorMessage}</p>
          </motion.div>
        )}

        {/* Secrets List */}
        <div className="space-y-4">
          {secrets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-sm p-12 text-center"
            >
              <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No secrets configured yet</p>
            </motion.div>
          ) : (
            secrets.map((secret, index) => {
              const isEditing = secret.id in editingKeys
              const isSaving = savingIds.has(secret.id)
              const isSuccess = successIds.has(secret.id)

              return (
                <motion.div
                  key={secret.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-sm p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {secret.provider}
                      </h3>
                      <p className="text-sm text-gray-500">ID: {secret.id}</p>
                    </div>
                    {isSuccess && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Saved</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <input
                        type={visibleKeys[secret.id] ? "text" : "password"}
                        value={editingKeys[secret.id]}
                        onChange={(e) => setEditingKeys(prev => ({
                          ...prev,
                          [secret.id]: e.target.value
                        }))}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm overflow-x-auto"
                      />
                    ) : (
                      <div className="flex-1 px-4 py-2 bg-gray-50 rounded-lg font-mono text-sm text-gray-700 overflow-hidden break-all max-h-16 overflow-y-auto">
                        {visibleKeys[secret.id] ? secret.key : maskKey(secret.key)}
                      </div>
                    )}

                    <button
                      onClick={() => toggleKeyVisibility(secret.id)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {visibleKeys[secret.id] ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>

                    {isEditing ? (
                      <button
                        onClick={() => handleSave(secret)}
                        disabled={savingIds.has(secret.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {savingIds.has(secret.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(secret)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
