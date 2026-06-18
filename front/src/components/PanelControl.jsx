import React from 'react'

export default function PanelControl({
  onFailP5,
  onDetectFailure,
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
            onClick={onFailP5}
            disabled={loading}
          >
            Simular falla P5
          </button>
          <button
            className="btn btn-warning text-dark"
            onClick={onDetectFailure}
            disabled={loading}
          >
            Detectar falla (P2)
          </button>
          <button
            className="btn btn-primary"
            onClick={onRefresh}
            disabled={loading}
          >
            Refrescar estado
          </button>
          <button
            className="btn btn-secondary"
            onClick={onReset}
            disabled={loading}
          >
            Reiniciar
          </button>
        </div>
      </div>
    </div>
  )
}
