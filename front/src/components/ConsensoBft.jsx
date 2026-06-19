import React, { useState, useEffect } from 'react'
import { configureBftNodeOnAll, startBftConsensus, getBftConfig } from '../services/api'

export default function ConsensoBft({ procesos, coordinador }) {
  const [bftConfigs, setBftConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Local identity state: which node ID does this browser instance represent?
  const [localNodeId, setLocalNodeId] = useState(() => {
    const saved = localStorage.getItem('bft_local_node_id')
    return saved ? parseInt(saved) : null
  })

  // Auto-detect browser identity by matching hostname to process IP configurations
  useEffect(() => {
    const hostname = window.location.hostname
    const match = procesos.find(p => p.ip === hostname)
    if (match) {
      setLocalNodeId(match.id)
    }
  }, [procesos])

  // Fetch or initialize BFT configs initially when processes change
  useEffect(() => {
    const activePeer = procesos.find(p => p.conectado)
    if (activePeer) {
      getBftConfig(activePeer)
        .then(configs => {
          if (configs && configs.length > 0) {
            const merged = mergeConfigs(configs)
            setBftConfigs(merged)
          } else {
            initializeDefaultConfigs()
          }
        })
        .catch(() => {
          initializeDefaultConfigs()
        })
    } else {
      initializeDefaultConfigs()
    }
  }, [procesos.map(p => p.id).join(','), procesos.map(p => p.conectado).join(',')])

  // Poll BFT configs from any active node every 2 seconds to synchronize browser instances in real-time
  useEffect(() => {
    let active = true
    const poll = async () => {
      const activePeer = procesos.find(p => p.conectado)
      if (activePeer) {
        try {
          const configs = await getBftConfig(activePeer)
          if (active && configs && configs.length > 0) {
            const merged = mergeConfigs(configs)
            setBftConfigs(prev => {
              // Only update if changes are found to avoid unnecessary re-renders
              if (JSON.stringify(prev) !== JSON.stringify(merged)) {
                return merged
              }
              return prev
            })
          }
        } catch (err) {
          // ignore
        }
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [procesos.map(p => p.id).join(','), procesos.map(p => p.conectado).join(',')])

  const mergeConfigs = (fetched) => {
    const merged = [...fetched]
    procesos.forEach(p => {
      if (!merged.some(c => c.id === p.id)) {
        merged.push({
          id: p.id,
          bizantino: false,
          votoBase: 'SI',
          comportamiento: 'HONESTO'
        })
      }
    })
    return merged.sort((a, b) => a.id - b.id)
  }

  const initializeDefaultConfigs = () => {
    setBftConfigs(prev => {
      const newConfigs = [...prev]
      procesos.forEach(p => {
        if (!newConfigs.some(c => c.id === p.id)) {
          newConfigs.push({
            id: p.id,
            bizantino: false,
            votoBase: 'SI',
            comportamiento: 'HONESTO'
          })
        }
      })
      return newConfigs.sort((a, b) => a.id - b.id)
    })
  }

  const handleLocalNodeSelect = (val) => {
    const idVal = val ? parseInt(val) : null
    setLocalNodeId(idVal)
    if (idVal) {
      localStorage.setItem('bft_local_node_id', idVal.toString())
    } else {
      localStorage.removeItem('bft_local_node_id')
    }
  }

  const handleConfigChange = async (nodeId, updatedFields) => {
    const updatedConfigs = bftConfigs.map(c => {
      if (c.id === nodeId) {
        const newConfig = { ...c, ...updatedFields }
        if (!newConfig.bizantino) {
          newConfig.comportamiento = 'HONESTO'
        } else if (newConfig.comportamiento === 'HONESTO') {
          newConfig.comportamiento = 'MENTIROSO'
        }
        return newConfig
      }
      return c
    })

    setBftConfigs(updatedConfigs)

    const configToUpdate = updatedConfigs.find(c => c.id === nodeId)
    const activePeers = procesos.filter(p => p.conectado)
    try {
      await configureBftNodeOnAll(activePeers, configToUpdate)
    } catch (err) {
      console.error('Error applying configuration', err)
    }
  }

  const handleStartConsensus = async () => {
    if (!coordinador) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await startBftConsensus(coordinador)
      if (res) {
        setResult(res)
      } else {
        setError('Error al iniciar el consenso BFT: El coordinador no respondió.')
      }
    } catch (err) {
      setError('Error al iniciar el consenso BFT: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // BFT variables
  const activeNodesCount = procesos.filter(p => p.conectado && p.activo).length
  const byzantineNodesCount = bftConfigs.filter(c => {
    const proc = procesos.find(p => p.id === c.id)
    return proc && proc.conectado && proc.activo && c.bizantino && c.comportamiento !== 'HONESTO'
  }).length

  const ruleSatisfied = activeNodesCount >= (3 * byzantineNodesCount + 1)
  const requiredNodes = 3 * byzantineNodesCount + 1

  return (
    <div className="card glass-card p-4 mb-4 border-none transition-all duration-300">
      <h5 className="text-dark fw-bold mb-3 d-flex align-items-center gap-2">
        <span className="d-inline-block rounded-circle bg-purple-glow text-purple-glow-text" style={{ padding: '2px 6px', fontSize: '10px' }}>BFT</span>
        Consenso Tolerante a Fallas Bizantinas (Práctica 11)
      </h5>
      <p className="text-muted small mb-4">
        Simula el comportamiento de nodos maliciosos (bizantinos) que transmiten información contradictoria o falsa al resto del sistema durante el consenso de "Aprobar Transacción". El consenso se inicia desde el líder Bully actual.
      </p>

      <div className="row g-4">
        {/* Left Panel: Scenario Configuration */}
        <div className="col-lg-5">
          <div className="bg-light p-3 rounded border border-secondary-subtle h-100">
            <h6 className="text-dark fw-bold mb-3 border-bottom pb-2">Configuración de Comportamiento BFT</h6>
            
            {/* Identity select card */}
            <div className="mb-3 bg-white p-2.5 rounded border border-secondary-subtle shadow-sm">
              <label className="form-label text-dark fw-bold fs-8 mb-1.5 d-flex justify-content-between align-items-center">
                <span>🖥️ Identidad de este Navegador:</span>
                {localNodeId && (
                  <span className="badge bg-success-glow text-success-glow-text font-mono fs-9">
                    Nodo {localNodeId} Activo
                  </span>
                )}
              </label>
              <select
                className="form-select form-select-sm text-dark bg-white font-mono fs-8"
                value={localNodeId || ''}
                onChange={(e) => handleLocalNodeSelect(e.target.value)}
              >
                <option value="">-- Modo Libre: Editar cualquier nodo --</option>
                {procesos.map(p => (
                  <option key={p.id} value={p.id}>
                    Nodo {p.id} ({p.ip}) {p.ip === window.location.hostname ? '(Detectado por IP)' : ''}
                  </option>
                ))}
              </select>
              <small className="text-muted d-block mt-1.5" style={{ fontSize: '10px', lineHeight: '1.2' }}>
                {localNodeId 
                  ? "Solo puedes modificar la configuración de tu propio nodo. Los demás están bloqueados para emular un entorno distribuido real." 
                  : "Modo libre: Ideal para probar localmente en una sola máquina modificando a todos los nodos."
                }
              </small>
            </div>

            {procesos.length === 0 ? (
              <div className="text-muted text-center py-4 font-mono small">
                Sin procesos cargados.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {procesos.map(p => {
                  const config = bftConfigs.find(c => c.id === p.id) || {
                    id: p.id,
                    bizantino: false,
                    votoBase: 'SI',
                    comportamiento: 'HONESTO'
                  }

                  // Only editable if we are in free mode (localNodeId is null) OR this is our localNodeId
                  const isEditable = !localNodeId || p.id === localNodeId

                  return (
                    <div 
                      key={p.id} 
                      className={`p-2.5 rounded border bg-white ${p.conectado && p.activo ? '' : 'opacity-70'} ${!isEditable ? 'bg-light-semi' : ''}`} 
                      style={{ 
                        borderLeft: config.bizantino ? '4px solid var(--glow-danger-text)' : '4px solid var(--glow-success-text)',
                        boxShadow: isEditable && localNodeId ? '0 0 8px rgba(79, 70, 229, 0.15)' : 'none'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-indigo-semi text-indigo-text font-mono">
                            Nodo {p.id}
                          </span>
                          {localNodeId && p.id === localNodeId && (
                            <span className="badge bg-success-glow text-success-glow-text font-mono fs-9 px-1.5 py-0.5 rounded-pill">
                              👤 Tú
                            </span>
                          )}
                          {localNodeId && p.id !== localNodeId && (
                            <span className="text-muted font-mono fs-9 opacity-50" title="Solo lectura">
                              🔒 Bloqueado
                            </span>
                          )}
                          <span className={`status-dot ${p.conectado ? (p.activo ? 'dot-active' : 'dot-fail') : 'dot-offline'} size-small`} />
                          <small className="text-muted font-mono" style={{ fontSize: '11px' }}>
                            {p.ip}
                          </small>
                        </div>
                        
                        <div className="form-check form-switch mb-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id={`bizantino-${p.id}`}
                            checked={config.bizantino}
                            disabled={!p.conectado || !p.activo || !isEditable}
                            onChange={(e) => handleConfigChange(p.id, { bizantino: e.target.checked })}
                          />
                          <label className="form-check-label text-dark small fw-semibold" htmlFor={`bizantino-${p.id}`}>
                            Bizantino
                          </label>
                        </div>
                      </div>

                      <div className="row g-2">
                        <div className="col-6">
                          <label className="text-muted fs-9 uppercase fw-bold mb-1 d-block">Voto Base</label>
                          <select
                            className="form-select form-select-sm text-dark bg-white font-mono"
                            value={config.votoBase}
                            disabled={!p.conectado || !p.activo || !isEditable}
                            onChange={(e) => handleConfigChange(p.id, { votoBase: e.target.value })}
                          >
                            <option value="SI">SÍ</option>
                            <option value="NO">NO</option>
                          </select>
                        </div>

                        <div className="col-6">
                          <label className="text-muted fs-9 uppercase fw-bold mb-1 d-block">Comportamiento</label>
                          <select
                            className="form-select form-select-sm text-dark bg-white font-mono"
                            value={config.comportamiento}
                            disabled={!p.conectado || !p.activo || !config.bizantino || !isEditable}
                            onChange={(e) => handleConfigChange(p.id, { comportamiento: e.target.value })}
                          >
                            {!config.bizantino && <option value="HONESTO">Honesto</option>}
                            <option value="MENTIROSO">Mentiroso (Invertido)</option>
                            <option value="CONTRADICTORIO">Contradictorio (SI/NO split)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Consensus execution & results */}
        <div className="col-lg-7">
          <div className="bg-light p-3 rounded border border-secondary-subtle h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <h6 className="text-dark fw-bold mb-0">Lanzamiento & Resultados</h6>
                <div>
                  {coordinador ? (
                    <span className="badge bg-warning-glow text-warning-glow-text font-mono">
                      👑 Líder Bully: Nodo {coordinador.id}
                    </span>
                  ) : (
                    <span className="badge bg-danger-glow text-danger-glow-text">
                      ⚠️ Sin Coordinador Bully
                    </span>
                  )}
                </div>
              </div>

              {/* BFT mathematical rule check */}
              <div className="card border-none bg-white p-2.5 mb-3 rounded shadow-sm">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small d-block">Regla de Resiliencia BFT</span>
                    <strong className="text-dark font-mono fs-7">
                      N &ge; 3f + 1 &nbsp;&rArr;&nbsp; {activeNodesCount} &ge; 3({byzantineNodesCount}) + 1 = {requiredNodes}
                    </strong>
                  </div>
                  <div>
                    {ruleSatisfied ? (
                      <span className="badge bg-success-glow text-success-glow-text py-2 px-2.5 rounded font-mono">
                        Cumplido ✅
                      </span>
                    ) : (
                      <span className="badge bg-danger-glow text-danger-glow-text py-2 px-2.5 rounded font-mono">
                        Riesgo ⚠️
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-muted mt-1.5" style={{ fontSize: '11px', lineHeight: '1.3' }}>
                  {ruleSatisfied 
                    ? `El cluster de ${activeNodesCount} nodos activos puede tolerar hasta ${byzantineNodesCount} fallas bizantinas de forma segura.` 
                    : `¡Alerta! Con ${byzantineNodesCount} nodo(s) bizantino(s), se requieren al menos ${requiredNodes} nodos activos. El consenso puede fallar.`
                  }
                </div>
              </div>

              {/* Execution control button */}
              <div className="d-grid mb-3">
                <button
                  className="btn btn-indigo fw-bold py-2.5 rounded-pill d-flex align-items-center justify-content-center gap-2"
                  disabled={loading || !coordinador || activeNodesCount < 1}
                  onClick={handleStartConsensus}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Difundiendo votos y procesando consenso...
                    </>
                  ) : (
                    <>
                      ⚡ Iniciar Ronda de Consenso (Aprobar Transacción)
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="alert alert-danger font-mono fs-8 p-2.5 mb-3" role="alert">
                  {error}
                </div>
              )}

              {/* Consensus details result rendering */}
              {result && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center p-3 rounded mb-3 text-center" style={{
                    backgroundColor: result.consensoGlobal === 'APROBADA' ? 'rgba(34, 197, 94, 0.1)' : 
                                    result.consensoGlobal === 'RECHAZADA' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: result.consensoGlobal === 'APROBADA' ? '1px solid rgba(34, 197, 94, 0.3)' :
                            result.consensoGlobal === 'RECHAZADA' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    <div className="mx-auto">
                      <span className="text-muted fs-8 uppercase d-block tracking-wider fw-bold">Decisión Global de Consenso</span>
                      <h4 className="fw-extrabold mb-0 font-mono" style={{
                        color: result.consensoGlobal === 'APROBADA' ? '#16a34a' :
                               result.consensoGlobal === 'RECHAZADA' ? '#dc2626' : '#b45309'
                      }}>
                        {result.consensoGlobal === 'APROBADA' && '✅ TRANSACCIÓN APROBADA'}
                        {result.consensoGlobal === 'RECHAZADA' && '❌ TRANSACCIÓN RECHAZADA'}
                        {result.consensoGlobal === 'FALLIDO' && '⚠️ CONSENSO FALLIDO (Inconsistente)'}
                      </h4>
                    </div>
                  </div>

                  {/* Matrix of cross votes */}
                  <h6 className="text-dark fw-bold fs-7 mb-2">Matriz de Votos Recibidos (Fase de Broadcast)</h6>
                  <div className="table-responsive mb-3 border rounded">
                    <table className="table table-sm table-striped font-mono fs-8 mb-0 align-middle">
                      <thead className="table-light-semi">
                        <tr>
                          <th>Emisor (Quien Vota)</th>
                          {Object.keys(result.matrizVotos).map(receptorId => (
                            <th key={receptorId} className="text-center">A Nodo {receptorId}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const allSenders = new Set()
                          Object.values(result.matrizVotos).forEach(votesMap => {
                            Object.keys(votesMap).forEach(senderId => allSenders.add(parseInt(senderId)))
                          })
                          const senderList = Array.from(allSenders).sort((a, b) => a - b)

                          return senderList.map(senderId => {
                            const nodeConfig = bftConfigs.find(c => c.id === senderId)
                            const isNodeBizantino = nodeConfig?.bizantino && nodeConfig?.comportamiento !== 'HONESTO'

                            return (
                              <tr key={senderId}>
                                <td>
                                  <span className="fw-semibold">Nodo {senderId}</span>
                                  {isNodeBizantino && (
                                    <span className="badge bg-danger-glow text-danger-glow-text ms-1.5 fs-9">Bizantino</span>
                                  )}
                                </td>
                                {Object.keys(result.matrizVotos).map(receptorId => {
                                  const vote = result.matrizVotos[receptorId][senderId]
                                  return (
                                    <td key={receptorId} className="text-center">
                                      {vote ? (
                                        <span className={`badge ${vote === 'SI' ? 'bg-success-glow text-success-glow-text' : 'bg-danger-glow text-danger-glow-text'} px-2 py-1`}>
                                          {vote}
                                        </span>
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Discrepancies / Inconsistencies detected */}
                  <h6 className="text-dark fw-bold fs-7 mb-2">Inconsistencias y Mentiras Detectadas</h6>
                  {result.inconsistencias && result.inconsistencias.length > 0 ? (
                    <div className="alert alert-warning py-2 px-3 border border-warning-subtle rounded mb-3">
                      <ul className="mb-0 ps-3 font-mono fs-8 text-warning-glow-text d-flex flex-column gap-1">
                        {result.inconsistencias.map((inc, i) => (
                          <li key={i}>{inc}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-success-glow text-success-glow-text border border-success-subtle rounded py-2 px-3 fs-8 font-mono mb-3">
                      🟢 No se detectaron inconsistencias. Todos los nodos emitieron votos consistentes.
                    </div>
                  )}

                  {/* Individual decisions list */}
                  <h6 className="text-dark fw-bold fs-7 mb-2">Decisión Individual de Nodos Honestos</h6>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {Object.entries(result.decisiones).map(([nodeId, decision]) => {
                      const idNum = parseInt(nodeId)
                      const nodeConfig = bftConfigs.find(c => c.id === idNum)
                      const isNodeBizantino = nodeConfig?.bizantino && nodeConfig?.comportamiento !== 'HONESTO'
                      
                      return (
                        <div key={nodeId} className="bg-white border rounded px-2.5 py-1.5 d-flex align-items-center gap-2 shadow-sm font-mono fs-8">
                          <strong>Nodo {nodeId}:</strong>
                          {isNodeBizantino ? (
                            <span className="text-muted small italic">Ignorado (Bizantino)</span>
                          ) : (
                            <span className={`badge ${decision === 'APROBADA' ? 'bg-success text-white' : 'bg-danger text-white'} px-1.5 py-0.5`}>
                              {decision}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {!result && !error && !loading && (
              <div className="text-center text-muted font-mono fs-8 py-5">
                Presiona "Iniciar Ronda de Consenso" para recopilar votos y evaluar la resiliencia del sistema distribuido.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
