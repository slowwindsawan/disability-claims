import { useState } from 'react'
import './Mailbox.css'

interface MailboxProps {
  onLogout: () => void
  onNavigate: (page: string) => void
}

interface Message {
  id: string
  sender: string
  preview: string
  time: string
  avatar: string
  color: string
  unread: boolean
}

interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'other'
  time: string
}

function Mailbox({ onLogout, onNavigate }: MailboxProps) {
  const [activeMenu, setActiveMenu] = useState('mailbox')
  const [selectedChat, setSelectedChat] = useState<string>('4')
  const [messageInput, setMessageInput] = useState('')

  const messages: Message[] = [
    { id: '1', sender: 'Tee', preview: 'You: Hey whats up', time: '15 Min', avatar: 'T', color: '#1f2937', unread: false },
    { id: '2', sender: 'Zeepay', preview: 'Hi Neequaye Kotey...', time: '12:36 PM', avatar: 'Z', color: '#fbbf24', unread: true },
    { id: '3', sender: 'CloudOTP', preview: '789508 is your veri...', time: '12:36 PM', avatar: 'C', color: '#f3f4f6', unread: false },
    { id: '4', sender: 'Gatekeeper', preview: 'Welcome to Our G...', time: '12:36 PM', avatar: 'GK', color: '#60a5fa', unread: true },
    { id: '5', sender: 'MyMTN 2.0', preview: 'Y\'ello MTNer, do...', time: '12:36 PM', avatar: 'M', color: '#fbbf24', unread: false },
    { id: '6', sender: 'Mama K', preview: 'Where is you fath...', time: '12:36 PM', avatar: 'MK', color: '#10b981', unread: false },
    { id: '7', sender: 'Nana', preview: 'yo man, food dey...', time: '12:36 PM', avatar: 'N', color: '#ef4444', unread: false },
    { id: '8', sender: 'VodaCash', preview: 'Payment of GHS 3...', time: '12:36 PM', avatar: 'VC', color: '#f3f4f6', unread: false },
    { id: '9', sender: 'Bunda', preview: '', time: '12:36 PM', avatar: 'B', color: '#3b82f6', unread: false },
  ]

  const chatMessages: ChatMessage[] = [
    { id: '1', text: 'Welcome to Our Gatekeeper. Download the app here:iPhone: https://apple.co/3LnrQCJAndroid: https://bit.ly/3do0jEkLogin with 0256811558', sender: 'other', time: 'Thursday, Jan 4 • 6:21 PM' }
  ]

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="mailbox">
      

      <div>
        <aside className="admin-sidebar">
          <div
            className={`admin-sidebar-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-dashboard')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Dashboard</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'users' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-users')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Users Management</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'subscriptions' ? 'active' : ''}`}
            onClick={() => onNavigate('user-subscriptions')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            <span>Users & Subscriptions</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'subadmins' ? 'active' : ''}`}
            onClick={() => onNavigate('manage-subadmins')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <path d="M20 8v6M23 11h-6"/>
            </svg>
            <span>Manage Subadmins</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'calendar' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-calendar')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Calendar</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'mailbox' ? 'active' : ''}`}
            onClick={() => setActiveMenu('mailbox')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>MailBox</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'setting' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-settings')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
            </svg>
            <span>Setting</span>
          </div>
        </aside>

        <main className="max-h-[100vh] overflow-auto">
          <div className="mailbox-container">
            <div className="mailbox-sidebar">
              <button className="start-chat-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Start Chat
              </button>

              <div className="messages-list">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message-item ${selectedChat === msg.id ? 'active' : ''} ${msg.unread ? 'unread' : ''}`}
                    onClick={() => setSelectedChat(msg.id)}
                  >
                    <div className="message-avatar" style={{ background: msg.color }}>
                      {msg.avatar}
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-sender">{msg.sender}</span>
                        <span className="message-time">{msg.time}</span>
                      </div>
                      <div className="message-preview">{msg.preview}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mailbox-chat">
              <div className="chat-header">
                <h2>{messages.find(m => m.id === selectedChat)?.sender || 'Gatekeeper'}</h2>
                <button className="chat-menu-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
              </div>

              <div className="chat-messages">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="chat-message-wrapper">
                    <div className="chat-timestamp">{msg.time}</div>
                    <div className={`chat-message ${msg.sender}`}>
                      {msg.sender === 'other' && (
                        <div className="chat-message-avatar" style={{ background: '#60a5fa' }}>
                          GK
                        </div>
                      )}
                      <div className="chat-message-bubble">
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input-container">
                <input
                  type="text"
                  placeholder="Text message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="chat-input"
                />
                <button className="send-btn" onClick={handleSendMessage}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Mailbox
