import React from 'react'

export default function PanelControl({
  onSimularFalla,
  onIniciarEleccion,
  onRefresh,
  onReset,
  loading
}) {
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Panel de Control</h5>
        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-danger"
            onClick={onSimularFalla}
            disabled={loading}
          >
            Simular falla (coordinador)
          </button>
          <button
            className="btn btn-warning text-dark"
            onClick={onIniciarEleccion}
            disabled={loading}
          >
            Iniciar elección (P2)
          </button>
          <button
            className="btn btn-primary"
            onClick={onRefresh}
            disabled={loading}
          >
            Refrescar
          </button>
          <button
            className="btn btn-secondary"
            onClick={onReset}
            disabled={loading}
          >
            Reiniciar cluster
          </button>
        </div>
      </div>
    </div>
  )
}
