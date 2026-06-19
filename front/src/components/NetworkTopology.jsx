import React, { useEffect, useState, useRef } from 'react'

export default function NetworkTopology({ procesos, mensajes }) {
  const [animations, setAnimations] = useState([])
  const prevMensajesLengthRef = useRef(mensajes.length)
  const prevMensajesRef = useRef(mensajes)

  // Layout parameters
  const size = 320
  const center = size / 2
  const radius = 100

  // Calculate coordinates for each node by ID
  const getCoordinates = (id, total) => {
    const index = procesos.findIndex(p => p.id === id)
    if (index === -1) return { x: center, y: center }
    const angle = (2 * Math.PI * index) / total - Math.PI / 2
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }

  const totalNodes = procesos.length

  useEffect(() => {
    if (mensajes.length > prevMensajesLengthRef.current) {
      const newMsgs = mensajes.slice(prevMensajesLengthRef.current)
      
      const newAnims = newMsgs
        .map((msg, index) => {
          if (msg.origen === msg.destino || msg.destino === -1) {
            if (msg.tipo === 'COORDINATOR') {
              return procesos
                .filter(p => p.id !== msg.origen && p.activo)
                .map(p => ({
                  id: `${msg.timestamp}-${msg.origen}-${p.id}-${index}`,
                  origen: msg.origen,
                  destino: p.id,
                  tipo: msg.tipo,
                  timestamp: msg.timestamp
                }))
            }
            return null
          }
          return {
            id: `${msg.timestamp}-${msg.origen}-${msg.destino}-${index}`,
            origen: msg.origen,
            destino: msg.destino,
            tipo: msg.tipo,
            timestamp: msg.timestamp
          }
        })
        .flat()
        .filter(Boolean)

      if (newAnims.length > 0) {
        setAnimations(prev => [...prev, ...newAnims])
        setTimeout(() => {
          setAnimations(prev => prev.filter(anim => !newAnims.some(na => na.id === anim.id)))
        }, 1000)
      }
    }
    prevMensajesLengthRef.current = mensajes.length
    prevMensajesRef.current = mensajes
  }, [mensajes, procesos])

  const getMessageColor = (tipo) => {
    switch (tipo) {
      case 'ELECTION': return '#0284c7' // clean sky-blue
      case 'OK': return '#16a34a' // green
      case 'COORDINATOR': return '#d97706' // amber
      default: return '#64748b'
    }
  }

  return (
    <div className="card glass-card h-100 d-flex flex-column align-items-center justify-content-center p-3 text-center">
      <h5 className="card-title text-dark fw-bold mb-1">Topología del Cluster</h5>
      <p className="text-muted small mb-3">Flujo de mensajes en tiempo real</p>
      
      <div className="position-relative" style={{ width: '100%', maxWidth: '320px', aspectRatio: '1/1' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Gradients for nodes in light mode */}
            <radialGradient id="gradient-coordinador" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
            
            <radialGradient id="gradient-activo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f0fdf4" />
              <stop offset="60%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </radialGradient>
            
            <radialGradient id="gradient-inactivo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>
          </defs>

          {/* Draw connection lines */}
          {procesos.map((pA, idxA) => 
            procesos.map((pB, idxB) => {
              if (pA.id >= pB.id) return null
              const coordA = getCoordinates(pA.id, totalNodes)
              const coordB = getCoordinates(pB.id, totalNodes)
              const isBothConnected = pA.conectado && pB.conectado
              return (
                <line
                  key={`${pA.id}-${pB.id}`}
                  x1={coordA.x}
                  y1={coordA.y}
                  x2={coordB.x}
                  y2={coordB.y}
                  stroke={isBothConnected ? 'rgba(15, 23, 42, 0.12)' : 'rgba(15, 23, 42, 0.03)'}
                  strokeWidth="1.5"
                  strokeDasharray={isBothConnected ? 'none' : '4 4'}
                />
              )
            })
          )}

          {/* Message flow animations */}
          {animations.map(anim => {
            const coordA = getCoordinates(anim.origen, totalNodes)
            const coordB = getCoordinates(anim.destino, totalNodes)
            const color = getMessageColor(anim.tipo)
            
            return (
              <g key={anim.id}>
                <line
                  x1={coordA.x}
                  y1={coordA.y}
                  x2={coordB.x}
                  y2={coordB.y}
                  stroke={color}
                  strokeWidth="2.5"
                  opacity="0.4"
                  filter="url(#glow)"
                />
                <circle r="6" fill={color} filter="url(#glow)">
                  <animate attributeName="cx" from={coordA.x} to={coordB.x} dur="0.8s" fill="freeze" />
                  <animate attributeName="cy" from={coordA.y} to={coordB.y} dur="0.8s" fill="freeze" />
                </circle>
              </g>
            )
          })}

          {/* Render nodes */}
          {procesos.map(p => {
            const coord = getCoordinates(p.id, totalNodes)
            const isCoord = p.esCoordinador
            const isConnected = p.conectado
            const isActive = p.activo && isConnected

            let nodeFill = 'url(#gradient-inactivo)'
            let nodeStroke = 'rgba(15, 23, 42, 0.1)'
            let filterEffect = 'none'

            if (isConnected) {
              if (isActive) {
                if (isCoord) {
                  nodeFill = 'url(#gradient-coordinador)'
                  nodeStroke = '#d97706'
                  filterEffect = 'url(#glow)'
                } else {
                  nodeFill = 'url(#gradient-activo)'
                  nodeStroke = '#16a34a'
                  filterEffect = 'url(#glow)'
                }
              } else {
                nodeFill = '#fca5a5'
                nodeStroke = '#ef4444'
                filterEffect = 'url(#glow)'
              }
            } else {
              nodeFill = '#e2e8f0'
              nodeStroke = '#94a3b8'
            }

            return (
              <g key={p.id} className="node-group" style={{ cursor: 'pointer' }}>
                {isActive && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isCoord ? '26' : '22'}
                    fill="none"
                    stroke={nodeStroke}
                    strokeWidth="1"
                    opacity="0.25"
                    className="pulse-ring"
                  />
                )}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isCoord ? '20' : '16'}
                  fill={nodeFill}
                  stroke={nodeStroke}
                  strokeWidth="2.5"
                  filter={filterEffect}
                  className="transition-all duration-300"
                />
                <text
                  x={coord.x}
                  y={coord.y + 4}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontWeight="bold"
                  fontSize="12"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  P{p.id}
                </text>
                
                <text
                  x={coord.x}
                  y={coord.y + (isCoord ? 38 : 32)}
                  textAnchor="middle"
                  fill={isConnected ? (isActive ? (isCoord ? '#b45309' : '#16a34a') : '#ef4444') : '#94a3b8'}
                  fontSize="9.5"
                  fontWeight="700"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {isConnected ? (isActive ? (isCoord ? 'LÍDER' : 'ACTIVO') : 'FALLA') : 'OFFLINE'}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="d-flex justify-content-center gap-3 mt-2 flex-wrap text-muted small">
        <span className="d-flex align-items-center gap-1">
          <span className="d-inline-block rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#fbbf24' }}></span>
          Líder
        </span>
        <span className="d-flex align-items-center gap-1">
          <span className="d-inline-block rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#4ade80' }}></span>
          Activo
        </span>
        <span className="d-flex align-items-center gap-1">
          <span className="d-inline-block rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#ef4444' }}></span>
          Falla Memoria
        </span>
        <span className="d-flex align-items-center gap-1">
          <span className="d-inline-block rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#cbd5e1' }}></span>
          Offline (Proceso Muerto)
        </span>
      </div>
    </div>
  )
}
