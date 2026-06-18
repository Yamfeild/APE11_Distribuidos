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
    // If we have new messages, trigger travel animations
    if (mensajes.length > prevMensajesLengthRef.current) {
      const newMsgs = mensajes.slice(prevMensajesLengthRef.current)
      
      const newAnims = newMsgs
        .map((msg, index) => {
          // Skip loopbacks or logs without explicit destination
          if (msg.origen === msg.destino || msg.destino === -1) {
            // If it is a COORDINATOR broadcast, we can broadcast to all active lower peers
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
            // If it is INICIO_ELECCION or FALLO, no direct target animation
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
        // Cleanup animations after 1 second
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
      case 'ELECTION': return '#00d2ff'
      case 'OK': return '#00ff87'
      case 'COORDINATOR': return '#ffc107'
      default: return '#ffffff'
    }
  }

  return (
    <div className="card glass-card h-100 d-flex flex-column align-items-center justify-content-center p-3 text-center">
      <h5 className="card-title text-light mb-1">Topología del Cluster</h5>
      <p className="text-muted small mb-3">Flujo de mensajes en tiempo real</p>
      
      <div className="position-relative" style={{ width: '100%', maxWidth: '320px', aspectRatio: '1/1' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-heavy" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Gradients for nodes */}
            <radialGradient id="gradient-coordinador" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffbdf" />
              <stop offset="60%" stopColor="#ffd23f" />
              <stop offset="100%" stopColor="#ee9b00" />
            </radialGradient>
            
            <radialGradient id="gradient-activo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e8fcf3" />
              <stop offset="60%" stopColor="#00ff87" />
              <stop offset="100%" stopColor="#00a86b" />
            </radialGradient>
            
            <radialGradient id="gradient-inactivo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4a4d52" />
              <stop offset="100%" stopColor="#1a1c1e" />
            </radialGradient>
          </defs>

          {/* Draw fully connected background mesh */}
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
                  stroke={isBothConnected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)'}
                  strokeWidth="1.5"
                  strokeDasharray={isBothConnected ? 'none' : '4 4'}
                />
              )
            })
          )}

          {/* Draw active message travel pulses */}
          {animations.map(anim => {
            const coordA = getCoordinates(anim.origen, totalNodes)
            const coordB = getCoordinates(anim.destino, totalNodes)
            const color = getMessageColor(anim.tipo)
            
            return (
              <g key={anim.id}>
                {/* Line path segment highlighting */}
                <line
                  x1={coordA.x}
                  y1={coordA.y}
                  x2={coordB.x}
                  y2={coordB.y}
                  stroke={color}
                  strokeWidth="2.5"
                  opacity="0.6"
                  filter="url(#glow)"
                />
                {/* Traveling dot */}
                <circle r="6" fill={color} filter="url(#glow)">
                  <animate attributeName="cx" from={coordA.x} to={coordB.x} dur="0.8s" fill="freeze" />
                  <animate attributeName="cy" from={coordA.y} to={coordB.y} dur="0.8s" fill="freeze" />
                </circle>
              </g>
            )
          })}

          {/* Draw node status representations */}
          {procesos.map(p => {
            const coord = getCoordinates(p.id, totalNodes)
            const isCoord = p.esCoordinador
            const isConnected = p.conectado
            const isActive = p.activo && isConnected

            let nodeFill = 'url(#gradient-inactivo)'
            let nodeStroke = 'rgba(255, 255, 255, 0.1)'
            let filterEffect = 'none'

            if (isConnected) {
              if (isActive) {
                if (isCoord) {
                  nodeFill = 'url(#gradient-coordinador)'
                  nodeStroke = '#ffd23f'
                  filterEffect = 'url(#glow)'
                } else {
                  nodeFill = 'url(#gradient-activo)'
                  nodeStroke = '#00ff87'
                  filterEffect = 'url(#glow)'
                }
              } else {
                // Connected, but marked inactive in memory (simulated fail, or just failed)
                nodeFill = '#e63946'
                nodeStroke = '#ff4d6d'
                filterEffect = 'url(#glow)'
              }
            } else {
              // Physically disconnected (unreachable)
              nodeFill = '#343a40'
              nodeStroke = '#6c757d'
            }

            return (
              <g key={p.id} className="node-group" style={{ cursor: 'pointer' }}>
                {/* Node outer glow rings */}
                {isActive && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isCoord ? '26' : '22'}
                    fill="none"
                    stroke={nodeStroke}
                    strokeWidth="1"
                    opacity="0.4"
                    className="pulse-ring"
                  />
                )}
                {/* Main circle */}
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
                {/* Node ID label inside or next to circle */}
                <text
                  x={coord.x}
                  y={coord.y + 5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontWeight="bold"
                  fontSize="12"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  P{p.id}
                </text>
                
                {/* Node Label underneath */}
                <text
                  x={coord.x}
                  y={coord.y + (isCoord ? 38 : 32)}
                  textAnchor="middle"
                  fill={isConnected ? (isActive ? '#00ff87' : '#ff4d6d') : '#6c757d'}
                  fontSize="9.5"
                  fontWeight="600"
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
          <span className="d-inline-block rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#ffd23f' }}></span>
          Líder
        </span>
        <span className="d-flex align-items-center gap-1">
          <span className="d-inline-block rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#00ff87' }}></span>
          Activo
        </span>
        <span className="d-flex align-items-center gap-1">
          <span className="d-inline-block rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#e63946' }}></span>
          Falla Memoria
        </span>
        <span className="d-flex align-items-center gap-1">
          <span className="d-inline-block rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#6c757d' }}></span>
          Offline (Proceso Muerto)
        </span>
      </div>
    </div>
  )
}
