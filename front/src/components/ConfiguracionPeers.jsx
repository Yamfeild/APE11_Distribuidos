import React, { useState } from 'react'
import { getPeersConfig, savePeersConfig, resetPeersConfig } from '../services/api'

export default function ConfiguracionPeers() {
  const [isOpen, setIsOpen] = useState(false)
  const [peers, setPeers] = useState(() => getPeersConfig())

  const handleFieldChange = (index, field, value) => {
    const updated = [...peers]
    if (field === 'id' || field === 'puerto') {
      updated[index][field] = parseInt(value) || 0
    } else {
      updated[index][field] = value
    }
    setPeers(updated)
  }

  const handleSave = () => {
    savePeersConfig(peers)
    alert('Configuración guardada. Se recargará la aplicación.')
    window.location.reload()
  }

  const handleReset = () => {
    if (window.confirm('¿Seguro que deseas restaurar la configuración por defecto?')) {
      resetPeersConfig()
      window.location.reload()
    }
  }

  const handleAddPeer = () => {
    const nextId = peers.length > 0 ? Math.max(...peers.map(p => p.id)) + 1 : 1
    const newPeer = {
      id: nextId,
      ip: '127.0.0.1',
      puerto: 8080 + nextId
    }
    setPeers([...peers, newPeer])
  }

  const handleRemovePeer = (index) => {
    if (peers.length <= 1) {
      alert('Debe haber al menos un proceso en el cluster.')
      return
    }
    const updated = peers.filter((_, i) => i !== index)
    setPeers(updated)
  }

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fs-5 text-dark fw-bold mb-0">Nodos del Sistema</h3>
          <p className="text-muted fs-8 mb-0">Gestiona la topología local o distribuida del cluster</p>
        </div>
        <button 
          className="btn btn-outline-dark btn-sm px-3 rounded-pill"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Ocultar Configuración' : 'Configurar Cluster'}
        </button>
      </div>

      {isOpen && (
        <div className="card glass-card border-none p-4 mb-4 transition-all duration-300">
          <h5 className="text-dark mb-3 fw-bold">Configuración de Procesos</h5>
          <p className="text-muted small">
            Define la IP y el puerto de cada nodo. Si estás ejecutando todo localmente, usa <code>127.0.0.1</code> y asigna puertos diferentes para cada instancia (por ejemplo, 8081, 8082, 8083).
          </p>

          <div className="row g-2 mb-3">
            {peers.map((peer, idx) => (
              <div key={idx} className="col-12 p-3 bg-light border rounded mb-2 d-flex flex-wrap align-items-center gap-3 justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-indigo-semi text-indigo-text font-mono py-2 px-2.5 rounded">
                    Nodo {peer.id}
                  </span>
                  <div className="d-flex align-items-center gap-1.5">
                    <label className="text-secondary small font-mono mb-0">ID:</label>
                    <input 
                      type="number" 
                      className="form-control form-control-sm bg-white text-dark border-secondary-subtle font-mono" 
                      style={{ width: '60px' }}
                      value={peer.id}
                      onChange={(e) => handleFieldChange(idx, 'id', e.target.value)}
                    />
                  </div>
                </div>

                <div className="d-flex flex-grow-1 flex-wrap gap-2 max-w-lg align-items-center">
                  <div className="d-flex align-items-center gap-1.5 flex-grow-1">
                    <label className="text-secondary small font-mono mb-0">IP:</label>
                    <input 
                      type="text" 
                      className="form-control form-control-sm bg-white text-dark border-secondary-subtle font-mono"
                      value={peer.ip}
                      onChange={(e) => handleFieldChange(idx, 'ip', e.target.value)}
                    />
                  </div>
                  <div className="d-flex align-items-center gap-1.5 flex-grow-1">
                    <label className="text-secondary small font-mono mb-0">Puerto:</label>
                    <input 
                      type="number" 
                      className="form-control form-control-sm bg-white text-dark border-secondary-subtle font-mono"
                      style={{ width: '90px' }}
                      value={peer.puerto}
                      onChange={(e) => handleFieldChange(idx, 'puerto', e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-outline-danger btn-sm p-1 px-2.5 rounded-sm"
                  onClick={() => handleRemovePeer(idx)}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>

          <div className="d-flex gap-2 justify-content-between flex-wrap">
            <button 
              type="button" 
              className="btn btn-outline-success btn-sm px-3 rounded-pill"
              onClick={handleAddPeer}
            >
              + Agregar Nodo
            </button>
            <div className="d-flex gap-2">
              <button 
                type="button" 
                className="btn btn-outline-secondary btn-sm px-3 rounded-pill"
                onClick={handleReset}
              >
                Restaurar Defectos
              </button>
              <button 
                type="button" 
                className="btn btn-indigo btn-sm px-4 rounded-pill fw-bold"
                onClick={handleSave}
              >
                Guardar y Recargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
