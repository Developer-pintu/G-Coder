import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString('en-US', { hour12: false }), level: "info", msg: "Dashboard initialized. Awaiting live telemetry..." },
  ])
  const [activeModel, setActiveModel] = useState("gemini-2.5-pro")
  const [tasksCompleted, setTasksCompleted] = useState(12)
  const [ipcStatus, setIpcStatus] = useState("Disconnected")
  const [command, setCommand] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket('ws://localhost:8080');
      wsRef.current.onopen = () => {
        setIpcStatus("Listening on 8080");
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', { hour12: false }), level: "success", msg: "Connected to Ghost IPC" }]);
      };
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry') {
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', { hour12: false }), level: data.level || "info", msg: data.msg }]);
            if (data.level === 'success' || data.level === 'error') setIsExecuting(false);
          } else if (data.type === 'chatResponse') {
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', { hour12: false }), level: "success", msg: `Agent Response: ${data.content.substring(0, 50)}...` }]);
          } else if (data.type === 'status') {
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', { hour12: false }), level: "info", msg: `Agent Status: ${data.data}` }]);
          }
        } catch (e) {}
      };
      wsRef.current.onclose = () => {
        setIpcStatus("Disconnected");
        setTimeout(connect, 3000); // Reconnect every 3s
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  const handleCommandSubmit = (e) => {
    if (e.key === 'Enter' && command.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = command.trim();
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-US', { hour12: false }), level: "info", msg: `> ${payload}` }]);
      wsRef.current.send(JSON.stringify({ type: 'execute', payload }));
      setCommand("");
      setIsExecuting(true);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="header-left">
          <h1>G-Coder</h1>
          <p>Autonomous AI Engineering Suite</p>
        </div>
        <div className="status-badge">System Online</div>
      </header>

      <div className="grid">
        <div className="card">
          <div className="card-header">
            <h3>Active Provider</h3>
            <span className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
          </div>
          <div className="metric" style={{ color: 'var(--accent-blue)' }}>{activeModel}</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3>Tasks Completed</h3>
            <span className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </span>
          </div>
          <div className="metric">{tasksCompleted} <span className="metric-sub">today</span></div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Ghost IPC Status</h3>
            <span className="card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
            </span>
          </div>
          <div className="metric" style={{ color: ipcStatus.includes('Listening') ? 'var(--accent-green)' : 'var(--accent-amber)', fontSize: '1.25rem' }}>{ipcStatus}</div>
        </div>
      </div>

      <div className="terminal-card">
        <div className="terminal-header">
          <div className="window-controls">
            <div className="control close"></div>
            <div className="control minimize"></div>
            <div className="control maximize"></div>
          </div>
          <span className="terminal-title">g-coder@local:~</span>
        </div>
        <div className="logs-container">
          {logs.map((log, i) => (
            <div key={i} className="log-entry">
              <span className="log-time">[{log.time}]</span>
              <span className={`log-msg log-${log.level}`}>{log.msg}</span>
            </div>
          ))}
          <div className="log-entry">
            <span className="log-time">[{new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
            <span className="log-msg" style={{ color: '#a3a3a3' }}>
              {isExecuting ? (
                <>_ AI is executing remote command<span className="typing-indicator"></span></>
              ) : (
                <>_ Awaiting operations<span className="typing-indicator"></span></>
              )}
            </span>
          </div>
        </div>
        <div className="terminal-input-container">
          <span className="prompt-symbol">❯</span>
          <input 
            type="text" 
            className="terminal-input" 
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleCommandSubmit}
            placeholder="Type a command for G-Coder to execute remotely..."
            disabled={isExecuting || !ipcStatus.includes('Listening')}
          />
        </div>
      </div>
    </div>
  )
}

export default App
