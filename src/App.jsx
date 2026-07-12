import { useState, useEffect, useRef } from 'react'
import './App.css'

const DEFAULT_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEFAULT_MODEL = 'deepseek-chat'

const SUGGESTIONS = [
  { icon: '💻', title: '代码解释', desc: '解释复杂代码逻辑，帮你理解程序', prompt: '请帮我解释以下代码的逻辑：' },
  { icon: '🌐', title: '文本翻译', desc: '多语言互译，地道自然', prompt: '请将以下文本翻译成英文：' },
  { icon: '✍️', title: '文案生成', desc: '撰写各类文案，提升效率', prompt: '请帮我写一份产品介绍文案：' },
  { icon: '📊', title: '数据分析', desc: '分析数据趋势，给出洞察建议', prompt: '请帮我分析以下数据：' },
]

function App() {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_chat_settings')
      return saved ? JSON.parse(saved) : { apiKey: '', apiUrl: DEFAULT_API_URL, model: DEFAULT_MODEL }
    } catch {
      return { apiKey: '', apiUrl: DEFAULT_API_URL, model: DEFAULT_MODEL }
    }
  })
  const [tempSettings, setTempSettings] = useState({ ...settings })
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const activeConv = conversations.find(c => c.id === activeId)
  const messages = activeConv?.messages || []

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 打开设置时同步临时值
  useEffect(() => {
    setTempSettings({ ...settings })
  }, [showSettings, settings])

  const createNewChat = () => {
    setActiveId(null)
    setInput('')
    setShowSettings(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const selectConversation = (id) => {
    setActiveId(id)
    setShowSettings(false)
  }

  const sendMessage = async (promptText) => {
    const text = (promptText || input).trim()
    if (!text || sending) return

    const userMsg = { role: 'user', content: text }
    setInput('')
    setSending(true)

    let convId = activeId
    if (!convId) {
      convId = Date.now().toString()
      const newConv = {
        id: convId,
        title: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
        messages: [],
      }
      setConversations(prev => [newConv, ...prev])
      setActiveId(convId)
    }

    // 插入用户消息
    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, userMsg],
              title: c.messages.length === 0
                ? text.slice(0, 30) + (text.length > 30 ? '...' : '')
                : c.title,
            }
          : c
      )
    )

    try {
      const apiUrl = settings.apiUrl || DEFAULT_API_URL
      const apiKey = settings.apiKey
      const model = settings.model || DEFAULT_MODEL

      if (!apiKey) {
        setConversations(prev =>
          prev.map(c =>
            c.id === convId
              ? { ...c, messages: [...c.messages, { role: 'ai', content: '⚠️ 请先在右侧设置中配置 API Key' }] }
              : c
          )
        )
        setSending(false)
        return
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: [{ role: 'user', content: text }],
        }),
      })

      const data = await res.json()

      const aiContent =
        data.choices?.[0]?.message?.content ||
        data.error?.message ||
        '（AI 未返回内容）'

      setConversations(prev =>
        prev.map(c =>
          c.id === convId
            ? { ...c, messages: [...c.messages, { role: 'ai', content: aiContent }] }
            : c
        )
      )
    } catch {
      setConversations(prev =>
        prev.map(c =>
          c.id === convId
            ? { ...c, messages: [...c.messages, { role: 'ai', content: '❌ 网络请求失败，请检查 API 地址是否正确' }] }
            : c
        )
      )
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const saveSettings = () => {
    setSettings({ ...tempSettings })
    localStorage.setItem('ai_chat_settings', JSON.stringify(tempSettings))
    setShowSettings(false)
  }

  const deleteConversation = (id, e) => {
    e.stopPropagation()
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  return (
    <div className="app">
      {/* ===== 左侧边栏 ===== */}
      <aside className={`sidebar ${showSettings ? 'sidebar--shrink' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">✦</div>
            <span className="logo-text">AI Chat</span>
          </div>
        </div>

        <button className="btn-new-chat" onClick={createNewChat}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新对话
        </button>

        <div className="conversation-list">
          <div className="sidebar-label">对话历史</div>
          {conversations.length === 0 ? (
            <div className="no-conversations">暂无对话记录</div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`conv-item ${conv.id === activeId ? 'active' : ''}`}
                onClick={() => selectConversation(conv.id)}
              >
                <div className="conv-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="conv-content">
                  <div className="conv-title">{conv.title}</div>
                  <div className="conv-meta">{conv.messages.length} 条消息</div>
                </div>
                <button
                  className="conv-delete"
                  onClick={(e) => deleteConversation(conv.id, e)}
                  title="删除对话"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button
            className={`sidebar-settings-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            设置
          </button>
          <div className="sidebar-user">
            <div className="user-avatar">U</div>
            <span className="user-name">用户</span>
          </div>
        </div>
      </aside>

      {/* ===== 中间聊天区 ===== */}
      <main className="chat-area">
        {messages.length === 0 ? (
          /* 欢迎页 */
          <div className="welcome">
            <div className="welcome-brand">
              <div className="welcome-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="14" fill="url(#grad)" />
                  <path d="M24 14c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zm-1 15v-4h-4v-2h4v-4h2v4h4v2h-4v4h-2z" fill="#fff" />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="48" y2="48">
                      <stop stopColor="#7272b0" />
                      <stop offset="1" stopColor="#2f3559" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="welcome-title">AI Assistant</h2>
              <p className="welcome-subtitle">开始对话，探索无限可能</p>
            </div>
            <div className="suggestions">
              {SUGGESTIONS.map((s, i) => (
                <div
                  key={i}
                  className="suggestion-card"
                  onClick={() => sendMessage(s.prompt)}
                >
                  <div className="suggestion-icon">{s.icon}</div>
                  <div className="suggestion-info">
                    <div className="suggestion-title">{s.title}</div>
                    <div className="suggestion-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 消息列表 */
          <div className="messages-container">
            <div className="messages-list">
              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  <div className={`message-avatar ${msg.role}`}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="message-body">
                    <div className="message-text">{msg.content}</div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="message ai">
                  <div className="message-avatar ai">AI</div>
                  <div className="message-body">
                    <div className="message-text typing">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* 输入框 */}
        <div className="input-area">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，Enter 发送..."
              disabled={sending}
            />
            <button
              className="btn-send"
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* ===== 右侧设置面板 ===== */}
      {showSettings && (
        <aside className="settings-panel">
          <div className="settings-header">
            <h3>API 设置</h3>
            <button className="settings-close" onClick={() => setShowSettings(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="settings-body">
            <div className="form-group">
              <label>API Key</label>
              <input
                type="password"
                value={tempSettings.apiKey}
                onChange={e => setTempSettings(s => ({ ...s, apiKey: e.target.value }))}
                placeholder="sk-..."
              />
            </div>
            <div className="form-group">
              <label>API URL</label>
              <input
                type="text"
                value={tempSettings.apiUrl}
                onChange={e => setTempSettings(s => ({ ...s, apiUrl: e.target.value }))}
                placeholder={DEFAULT_API_URL}
              />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input
                type="text"
                value={tempSettings.model}
                onChange={e => setTempSettings(s => ({ ...s, model: e.target.value }))}
                placeholder={DEFAULT_MODEL}
              />
            </div>
            <button className="btn-save-settings" onClick={saveSettings}>
              保存设置
            </button>
            <p className="settings-note">
              API Key 仅保存在浏览器本地，不会上传到服务器。
            </p>
          </div>
        </aside>
      )}
    </div>
  )
}

export default App
