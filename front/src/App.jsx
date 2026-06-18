import React, { useState, useEffect, useCallback, useRef } from 'react'
import ProcesoCard from './components/ProcesoCard'
import PanelControl from './components/PanelControl'
import LogMensajes from './components/LogMensajes'
import {
  fetchAllPeersStatus,
  fetchLogsFromAll,
  toggleFail,
  startElection,
  reset,
  PEERS_CONFIG
} from './services/api'

export default function App() {
  const [procesos, setProcesos] = useState([])
  const [mensajes, setMensajes] = useState([])
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef(null)

  const refreshAll = useCallback(async () => {
    const [statusList, logs] = await Promise.all([
      fetchAllPeersStatus(),
      fetchLogsFromAll()
    ])
    setProcesos(statusList)
    setMensajes(logs)
  }, [])

  useEffect(() => {
    refreshAll()
    intervalRef.current = setInterval(refreshAll, 5000)
    return () => clearInterval(intervalRef.current)
  }, [refreshAll])

  const handleFailP5 = async () => {
    setLoading(true)
    const p5 = PEERS_CONFIG.find(p => p.id === 5)
    if (p5) await toggleFail(p5)
    await refreshAll()
    setLoading(false)
  }

  const handleDetectFailure = async () => {
    setLoading(true)
    const p2 = PEERS_CONFIG.find(p => p.id === 2)
    if (p2) await startElection(p2)
    await new Promise(r => setTimeout(r, 6000))
    await refreshAll()
    setLoading(false)
  }

  const handleRefresh = async () => {
    setLoading(true)
    await refreshAll()
    setLoading(false)
  }

  const handleReset = async () => {
    setLoading(true)
    await Promise.all(PEERS_CONFIG.map(p => reset(p)))
    await refreshAll()
    setLoading(false)
  }

  const coordinador = procesos.find(p => p.esCoordinador)
  const inactivos = procesos.filter(p => !p.activo).length

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h1 className="display-6">Práctica 10 — Algoritmo Bully</h1>
        <p className="text-muted">
          Sistemas Distribuidos &middot; Elección de Coordinador
        </p>
      </div>

      <div className="row mb-3">
        <div className="col-md-4">
          <div className="card bg-light">
            <div className="card-body text-center py-2">
              <small className="text-muted">Coordinador actual</small>
              <h4 className="mb-0">
                {coordinador ? `P${coordinador.id}` : 'Ninguno'}
              </h4>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-light">
            <div className="card-body text-center py-2">
              <small className="text-muted">Procesos activos</small>
              <h4 className="mb-0">
                {procesos.filter(p => p.activo).length} / {procesos.length}
              </h4>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-light">
            <div className="card-body text-center py-2">
              <small className="text-muted">Mensajes totales</small>
              <h4 className="mb-0">{mensajes.length}</h4>
            </div>
          </div>
        </div>
      </div>

      <PanelControl
        onFailP5={handleFailP5}
        onDetectFailure={handleDetectFailure}
        onRefresh={handleRefresh}
        onReset={handleReset}
        loading={loading}
      />

      <div className="row row-cols-1 row-cols-md-3 row-cols-lg-5 g-3 mb-4">
        {procesos.map(p => (
          <div className="col" key={p.id}>
            <ProcesoCard proceso={p} />
          </div>
        ))}
      </div>

      <LogMensajes mensajes={mensajes} />

      <footer className="mt-4 text-center text-muted small">
        Práctica 10 - FEIRNNR &middot; Carrera de Computación
      </footer>
    </div>
  )
}
