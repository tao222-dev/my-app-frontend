import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-six-lemon-57.vercel.app'

function App() {
  const [convs, setConvs] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [bubbleWidth, setBubbleWidth] = useState('wide')  // 'wide' | 'narrow'
  const [enterToSend, setEnterToSend] = useState(true)
  const [motionOn, setMotionOn] = useState(true)
  const [search, setSearch] = useState('')
  // 自定义 API 设置（持久化到 localStorage）
  const [customApiUrl, setCustomApiUrl] = useState(() => localStorage.getItem('lumen_api_url') || '')
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('lumen_api_key') || '')
  const [customModel, setCustomModel] = useState(() => localStorage.getItem('lumen_api_model') || '')
  const [showApiKey, setShowApiKey] = useState(false)
  // 模型列表
  const [availableModels, setAvailableModels] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lumen_models') || '[]') } catch { return [] }
  })
  const [fetchingModels, setFetchingModels] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const activeConv = convs.find(c => c.id === activeId)
  const messages = activeConv?.messages || []

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 自定义 API 配置持久化
  useEffect(() => { localStorage.setItem('lumen_api_url', customApiUrl) }, [customApiUrl])
  useEffect(() => { localStorage.setItem('lumen_api_key', customApiKey) }, [customApiKey])
  useEffect(() => { localStorage.setItem('lumen_api_model', customModel) }, [customModel])

  // 获取可用模型列表
  const fetchModels = async () => {
    const apiUrl = customApiUrl || 'https://api.deepseek.com/v1/chat/completions'
    const apiKey = customApiKey
    if (!apiKey) {
      setAvailableModels([])
      return
    }
    setFetchingModels(true)
    setModelsError('')
    try {
      const res = await fetch(`${API_BASE}/api/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl, apiKey }),
      })
      const data = await res.json()
      if (data.models?.length) {
        setAvailableModels(data.models)
        localStorage.setItem('lumen_models', JSON.stringify(data.models))
        // 如果当前 model 不在列表中，自动选第一个
        if (!data.models.includes(customModel)) {
          const best = data.models.find(m => m.includes('chat') || m.includes('gpt') || m.includes('claude')) || data.models[0]
          setCustomModel(best)
        }
      } else {
        setModelsError(data.error || '未获取到模型')
      }
    } catch {
      setModelsError('请求失败')
    } finally {
      setFetchingModels(false)
    }
  }

  // 填完 URL 和 Key 后自动拉取模型列表（带防抖）
  useEffect(() => {
    if (!customApiKey) return
    const timer = setTimeout(fetchModels, 600)
    return () => clearTimeout(timer)
  }, [customApiUrl, customApiKey])

  // 自动调整输入框高度
  const autoGrow = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const newChat = () => {
    setActiveId(null)
    setInput('')
    setSidebarOpen(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const selectConv = (id) => {
    setActiveId(id)
    setSidebarOpen(false)
  }

  const deleteConv = (id, e) => {
    e.stopPropagation()
    setConvs(prev => prev.filter(c => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const sendMessage = async (promptText) => {
    const text = (promptText || input).trim()
    if (!text || sending) return

    const userMsg = { role: 'user', text }
    setInput('')
    setSending(true)

    let convId = activeId
    if (!convId) {
      convId = 'c' + Date.now()
      const title = text.length > 14 ? text.slice(0, 14) + '…' : text
      const newConv = { id: convId, title, group: '今天', messages: [] }
      setConvs(prev => [newConv, ...prev])
      setActiveId(convId)
    }

    // 插入用户消息
    setConvs(prev =>
      prev.map(c =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, userMsg],
              title: c.messages.length === 0
                ? (text.length > 14 ? text.slice(0, 14) + '…' : text)
                : c.title,
            }
          : c
      )
    )

    // 自动调整输入框
    setTimeout(autoGrow, 0)

    try {
      const body = { message: text }
      // 如果用户在设置中填写了自定义 API，一并传给后端
      if (customApiUrl) body.apiUrl = customApiUrl
      if (customApiKey) body.apiKey = customApiKey
      if (customModel)  body.model  = customModel

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      const reply = data.reply || data.error || '（未收到回复）'

      setConvs(prev =>
        prev.map(c =>
          c.id === convId
            ? { ...c, messages: [...c.messages, { role: 'ai', text: reply }] }
            : c
        )
      )
    } catch {
      setConvs(prev =>
        prev.map(c =>
          c.id === convId
            ? { ...c, messages: [...c.messages, { role: 'ai', text: '❌ 网络请求失败，请检查后端是否在线' }] }
            : c
        )
      )
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 分组对话
  const filteredConvs = convs.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )
  const groupedConvs = {}
  filteredConvs.forEach(c => {
    const g = c.group || '今天'
    if (!groupedConvs[g]) groupedConvs[g] = []
    groupedConvs[g].push(c)
  })

  const demoChips = ['整理想法', '雨天片单', '解释概念']

  return (
    <div className={`app ${collapsed ? 'sidebar-hidden' : ''} ${!motionOn ? 'no-motion' : ''}`}>
      {/* ===== 侧边栏 ===== */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div className="logo">
            <span className="logo-orb"></span>
            <span className="logo-name">Lumen</span>
          </div>
          <button className="icon-btn collapse-btn" onClick={() => { setCollapsed(true); setSidebarOpen(false) }} title="收起侧边栏">
            <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <button className="new-chat-btn" onClick={newChat}>
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          新对话
        </button>

        <div className="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input type="text" placeholder="搜索对话…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <nav className="conv-list">
          {Object.keys(groupedConvs).length === 0 ? (
            <div className="conv-empty">没有匹配的对话</div>
          ) : (
            Object.entries(groupedConvs).map(([group, items]) => (
              <div key={group}>
                <div className="conv-group-label">{group}</div>
                {items.map(conv => (
                  <button
                    key={conv.id}
                    className={`conv-item ${conv.id === activeId ? 'active' : ''}`}
                    onClick={() => selectConv(conv.id)}
                  >
                    <span className="dot"></span>
                    <span className="conv-name">{conv.title}</span>
                    <span className="conv-delete" onClick={(e) => deleteConv(conv.id, e)} title="删除">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="user-card">
            <div className="avatar user-avatar">T</div>
            <div className="user-meta">
              <span className="user-name">Tao</span>
              <span className="user-plan">创作者版</span>
            </div>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="设置">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09A1.7 1.7 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* 展开按钮 */}
      <button className="icon-btn expand-btn" onClick={() => { setCollapsed(false) }} title="展开侧边栏">
        <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {/* ===== 主区域 ===== */}
      <main className="main">
        <div className="aurora" aria-hidden="true"></div>

        <header className="chat-head">
          <button className="icon-btn mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="chat-title-wrap">
            <h1 className="chat-title">{activeConv ? activeConv.title : '新对话'}</h1>
            <span className="model-tag">{customModel || 'DeepSeek · 深度模式'}</span>
          </div>
          <div className="head-actions">
            <button className="icon-btn" title="分享对话">
              <svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7 9m5-5l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </header>

        <section className="messages">
          <div className={`msg-col ${bubbleWidth === 'narrow' ? 'narrow' : ''}`}>
            {messages.length === 0 ? (
              <div className="hello">
                <span className="logo-orb"></span>
                <h2>今天想聊点什么？</h2>
                <p>可以提问、写作、讨论想法，或者只是随便说说。</p>
                <div className="hello-chips">
                  {demoChips.map(chip => (
                    <button key={chip} onClick={() => sendMessage(chip)}>{chip}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div className={`avatar ${m.role === 'ai' ? 'ai-avatar' : 'user-avatar'}`}>
                    {m.role === 'user' ? 'T' : ''}
                  </div>
                  <div className="msg-body">
                    <div className="msg-role">{m.role === 'ai' ? 'Lumen' : 'Tao'}</div>
                    <div className="bubble">{m.text}</div>
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="msg ai">
                <div className="avatar ai-avatar thinking"></div>
                <div className="msg-body">
                  <div className="msg-role">Lumen</div>
                  <div className="typing"><i></i><i></i><i></i></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}></div>
          </div>
        </section>

        <footer className="composer-wrap">
          <div className="composer">
            <textarea
              ref={inputRef}
              rows="1"
              value={input}
              onChange={e => { setInput(e.target.value); setTimeout(autoGrow, 0) }}
              onKeyDown={handleKeyDown}
              placeholder="给 Lumen 发消息…"
              disabled={sending}
            />
            <div className="composer-tools">
              <button className="icon-btn" title="附件">
                <svg viewBox="0 0 24 24"><path d="M21 12.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 4.9a3.7 3.7 0 0 1 5.2 5.2l-8.3 8.3a1.8 1.8 0 0 1-2.6-2.6l7.6-7.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="send-btn" onClick={() => sendMessage()} disabled={sending || !input.trim()}>
                <svg viewBox="0 0 24 24"><path d="M5 12l14-7-4 7 4 7-14-7z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
          <p className="composer-hint">Enter 发送 · Shift+Enter 换行</p>
        </footer>
      </main>

      {/* ===== 设置弹窗 ===== */}
      <div className="modal-mask" hidden={!showSettings} onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}>
        <div className="modal">
          <div className="modal-head">
            <h2>设置</h2>
            <button className="icon-btn" onClick={() => setShowSettings(false)}>
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="setting-row">
            <div>
              <span className="setting-label">回复气泡宽度</span>
              <span className="setting-desc">窄栏更适合长文阅读</span>
            </div>
            <div className="seg">
              <button className={bubbleWidth === 'narrow' ? 'active' : ''} onClick={() => setBubbleWidth('narrow')}>窄</button>
              <button className={bubbleWidth === 'wide' ? 'active' : ''} onClick={() => setBubbleWidth('wide')}>宽</button>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <span className="setting-label">发送方式</span>
              <span className="setting-desc">关闭后仅点击按钮发送</span>
            </div>
            <button
              className={`switch ${enterToSend ? 'active' : ''}`}
              role="switch"
              aria-checked={enterToSend}
              onClick={() => setEnterToSend(!enterToSend)}
            ></button>
          </div>
          <div className="setting-row">
            <div>
              <span className="setting-label">界面动效</span>
              <span className="setting-desc">光晕与消息入场动画</span>
            </div>
            <button
              className={`switch ${motionOn ? 'active' : ''}`}
              role="switch"
              aria-checked={motionOn}
              onClick={() => setMotionOn(!motionOn)}
            ></button>
          </div>

          {/* ---- 自定义 API ---- */}
          <div className="setting-section-title">自定义 API</div>
          <p className="setting-section-desc">留空则使用默认 DeepSeek 接口</p>

          <div className="setting-row setting-row-col">
            <label className="setting-label" htmlFor="api-url">接口地址</label>
            <input
              id="api-url"
              className="setting-input"
              type="url"
              placeholder="https://api.deepseek.com/v1/chat/completions"
              value={customApiUrl}
              onChange={e => setCustomApiUrl(e.target.value)}
            />
          </div>

          <div className="setting-row setting-row-col">
            <label className="setting-label" htmlFor="api-model">模型名称</label>
            {availableModels.length > 0 ? (
              <div className="setting-input-wrap">
                <select
                  id="api-model"
                  className="setting-input setting-select"
                  value={customModel}
                  onChange={e => setCustomModel(e.target.value)}
                >
                  {availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button
                  className="icon-btn toggle-vis-btn"
                  onClick={fetchModels}
                  disabled={fetchingModels}
                  title="刷新模型列表"
                >
                  <svg viewBox="0 0 24 24" style={fetchingModels ? {animation: 'spin 0.8s linear infinite'} : {}}><path d="M1 4v6h6M23 20v-6h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            ) : (
              <div className="setting-input-wrap">
                <input
                  id="api-model"
                  className="setting-input"
                  type="text"
                  placeholder="deepseek-chat"
                  value={customModel}
                  onChange={e => setCustomModel(e.target.value)}
                />
                <button
                  className="icon-btn toggle-vis-btn"
                  onClick={fetchModels}
                  disabled={fetchingModels || !customApiKey}
                  title="获取模型列表"
                >
                  {fetchingModels ? (
                    <span className="spinner-sm"></span>
                  ) : (
                    <svg viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  )}
                </button>
              </div>
            )}
            {modelsError && <span className="setting-desc" style={{color: '#e0567a'}}>{modelsError}</span>}
          </div>

          <div className="setting-row setting-row-col">
            <label className="setting-label" htmlFor="api-key">API Key</label>
            <div className="setting-input-wrap">
              <input
                id="api-key"
                className="setting-input"
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={customApiKey}
                onChange={e => setCustomApiKey(e.target.value)}
              />
              <button
                className="icon-btn toggle-vis-btn"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? '隐藏' : '显示'}
              >
                {showApiKey ? (
                  <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
