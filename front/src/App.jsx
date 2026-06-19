import React, { useState, useEffect, useCallback, useRef } from 'react'
import ProcesoCard from './components/ProcesoCard'
import LogMensajes from './components/LogMensajes'
import ConfiguracionPeers from './components/ConfiguracionPeers'
import {
  fetchAllPeersStatus,
  fetchLogsFromAll
} from './services/api'

export default function App() {
  const [procesos, setProcesos] = useState([])
  const [mensajes, setMensajes] = useState([])
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef(null)

  const refreshAll = useCallback(async () => {
    try {
      const [statusList, logs] = await Promise.all([
        fetchAllPeersStatus(),
        fetchLogsFromAll()
      ])
      setProcesos(statusList)
      setMensajes(logs)
    } catch (err) {
      console.error('Error refreshing cluster status', err)
    }
  }, [])

  // Poll faster (every 1.5 seconds) to make the manual disconnection detection feel instantaneous
  useEffect(() => {
    refreshAll()
    intervalRef.current = setInterval(refreshAll, 1500)
    return () => clearInterval(intervalRef.current)
  }, [refreshAll])

  const activePeer = procesos.find(p => p.conectado && p.activo && p.coordinadorActual !== null && p.coordinadorActual !== -1)
    || procesos.find(p => p.conectado && p.coordinadorActual !== null && p.coordinadorActual !== -1)
  const coordinadorId = activePeer ? activePeer.coordinadorActual : null
  const coordinador = procesos.find(p => p.id === coordinadorId)
  
  const totalPeers = procesos.length
  const conectadosCount = procesos.filter(p => p.conectado).length
  const activosCount = procesos.filter(p => p.conectado && p.activo).length

  return (
    <div className="container py-4 max-w-7xl">
      <header className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 border-bottom border-dark-semi pb-4">
        <div>
          <span className="badge bg-indigo-semi text-indigo-text px-3 py-1.5 rounded-pill border border-indigo-edge mb-2 d-inline-block font-mono">
            Sistemas Distribuidos
          </span>
          <h1 className="display-5 text-dark fw-extrabold tracking-tight mb-1">
            Algoritmo Bully <span className="text-gradient">Interactivo</span>
          </h1>
          <p className="text-muted mb-0">
            Simulador automático y en tiempo real de elección de coordinador ante fallas físicas
          </p>
        </div>
        <div className="d-flex align-items-center gap-3 bg-light p-2.5 rounded-lg border border-secondary-subtle">
          <div className="text-end">
            <div className="text-muted small">Estado General</div>
            <div className="text-dark fw-bold font-mono">
              {conectadosCount === 0 ? 'Sin Nodos Conectados' : `${activosCount} / ${totalPeers} Activos`}
            </div>
          </div>
          <span className={`status-dot ${conectadosCount > 0 ? (activosCount === totalPeers ? 'dot-active' : 'dot-fail') : 'dot-offline'} size-large`} />
        </div>
      </header>

      {/* Peer Configuration Manager */}
      <ConfiguracionPeers />

      {/* Cluster Quick Statistics */}
      <div className="row mb-4 g-3">
        <div className="col-md-4">
          <div className="card glass-card h-100 border-none">
            <div className="card-body py-3 d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted d-block uppercase tracking-wider fs-9">Líder Electo</small>
                <h3 className="mb-0 text-dark fw-bold font-mono">
                  {coordinador ? `Proceso ${coordinador.id}` : 'Buscando...'}
                </h3>
              </div>
              <div className="icon-badge bg-warning-glow text-warning-glow-text rounded p-2">
                👑
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card glass-card h-100 border-none">
            <div className="card-body py-3 d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted d-block uppercase tracking-wider fs-9">Procesos en Línea</small>
                <h3 className="mb-0 text-dark fw-bold font-mono">
                  {conectadosCount} / {totalPeers}
                </h3>
              </div>
              <div className="icon-badge bg-success-glow text-success-glow-text rounded p-2">
                🔌
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card glass-card h-100 border-none">
            <div className="card-body py-3 d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted d-block uppercase tracking-wider fs-9">Mensajes Intercambiados</small>
                <h3 className="mb-0 text-dark fw-bold font-mono">
                  {mensajes.length}
                </h3>
              </div>
              <div className="icon-badge bg-info-glow text-info-glow-text rounded p-2">
                💬
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Process Grid Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card glass-card p-4 border-none">
            <h5 className="text-dark fw-bold mb-3 d-flex align-items-center gap-2">
              <span className="d-inline-block rounded-circle bg-success dot-active" style={{ width: 8, height: 8 }}></span>
              Monitor de Procesos
            </h5>
            <p className="text-muted small mb-4">
              Apaga o enciende procesos manualmente en tu terminal (ej: matando el proceso de Spring Boot). Los latidos del sistema (heartbeats) detectarán la caída del líder en un máximo de 3 segundos, iniciando la elección inmediatamente.
            </p>
            
            {procesos.length === 0 ? (
              <div className="text-center text-muted p-5 bg-light rounded border border-secondary-subtle font-mono">
                Ningún proceso configurado responde. Asegúrate de iniciar las instancias del backend en los puertos configurados.
              </div>
            ) : (
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                {procesos.map(p => (
                  <div className="col" key={p.id}>
                    <ProcesoCard proceso={p} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Messages System Console */}
      <div className="mb-5">
        <LogMensajes mensajes={mensajes} />
      </div>

      <footer className="border-top border-dark-semi mt-5 pt-4 text-center text-muted small">
        Práctica 10 - Sistemas Distribuidos &middot; Carrera de Computación &middot; FEIRNNR
      </footer>
    </div>
  )
}
