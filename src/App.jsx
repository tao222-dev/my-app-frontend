import './App.css'

function App() {
  const tasks = [
    { name: '用户登录页面设计', project: '产品设计', priority: 'high', status: 'progress', date: '2026-07-15' },
    { name: 'API 接口联调',       project: '后端API',  priority: 'high', status: 'progress', date: '2026-07-16' },
    { name: '导航栏组件开发',     project: '前端开发', priority: 'mid',  status: 'done',     date: '2026-07-10' },
    { name: '数据库表结构设计',   project: '后端API',  priority: 'mid',  status: 'done',     date: '2026-07-09' },
    { name: '响应式布局适配',     project: '前端开发', priority: 'low',  status: 'todo',     date: '2026-07-20' },
  ]

  const priorityLabel = { high: '高', mid: '中', low: '低' }
  const statusLabel   = { progress: '进行中', done: '已完成', todo: '待开始' }

  return (
    <div className="app">
      {/* ===== 顶部导航 ===== */}
      <header className="header">
        <div className="header-left">
          <span className="logo">📋</span>
          <h1>TaskFlow</h1>
        </div>
        <nav className="header-nav">
          <a href="#" className="nav-link active">工作台</a>
          <a href="#" className="nav-link">项目</a>
          <a href="#" className="nav-link">日历</a>
          <a href="#" className="nav-link">报表</a>
        </nav>
        <div className="header-right">
          <button className="btn-avatar">👤</button>
        </div>
      </header>

      <div className="body">
        {/* ===== 侧边栏 ===== */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>菜单</h3>
            <ul className="sidebar-menu">
              <li className="menu-item active"><span className="menu-icon">📊</span> 总览</li>
              <li className="menu-item"><span className="menu-icon">✅</span> 我的任务</li>
              <li className="menu-item"><span className="menu-icon">📅</span> 日程</li>
              <li className="menu-item"><span className="menu-icon">📁</span> 文件</li>
              <li className="menu-item"><span className="menu-icon">⚙️</span> 设置</li>
            </ul>
          </div>
          <div className="sidebar-section">
            <h3>项目列表</h3>
            <ul className="sidebar-menu">
              <li className="menu-item"><span className="dot blue"></span> 产品设计</li>
              <li className="menu-item"><span className="dot green"></span> 前端开发</li>
              <li className="menu-item"><span className="dot orange"></span> 后端API</li>
            </ul>
          </div>
        </aside>

        {/* ===== 主内容区 ===== */}
        <main className="content">
          {/* 统计卡片 */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-info">
                <span className="stat-number">12</span>
                <span className="stat-label">总任务数</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <span className="stat-number">5</span>
                <span className="stat-label">进行中</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <span className="stat-number">7</span>
                <span className="stat-label">已完成</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-info">
                <span className="stat-number">3</span>
                <span className="stat-label">高优先级</span>
              </div>
            </div>
          </div>

          {/* 任务列表 */}
          <div className="card">
            <div className="card-header">
              <h2>近期任务</h2>
              <button className="btn-primary">+ 新建任务</button>
            </div>
            <table className="task-table">
              <thead>
                <tr>
                  <th>任务名称</th>
                  <th>所属项目</th>
                  <th>优先级</th>
                  <th>状态</th>
                  <th>截止日期</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={i}>
                    <td>{t.name}</td>
                    <td>{t.project}</td>
                    <td><span className={`badge badge-${t.priority}`}>{priorityLabel[t.priority]}</span></td>
                    <td><span className={`badge badge-${t.status}`}>{statusLabel[t.status]}</span></td>
                    <td>{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
