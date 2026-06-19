import React from 'react'

export default function ProcesoCard({ proceso }) {
  if (!proceso) return null

  const { id, ip, puerto, activo, conectado, esCoordinador, enEleccion } = proceso

  const statusColorClass = conectado
    ? (activo ? 'text-success' : 'text-danger')
    : 'text-muted'

  const statusText = conectado
    ? (activo ? 'Activo (En ejecución)' : 'Simulando Falla')
    : 'Offline (Proceso apagado)'

  return (
    <div 
      className={`card glass-card h-100 transition-all duration-300 hover-elevate ${
        esCoordinador ? 'border-leader shadow-leader' : ''
      } ${!conectado || !activo ? 'opacity-70' : ''}`}
    >
      <div className="card-body text-center p-3 d-flex flex-column justify-content-between">
        <div>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="badge bg-light border text-secondary font-mono">ID: {id}</span>
            <span className="d-flex align-items-center gap-1.5 small font-mono">
              <span className={`status-dot ${conectado ? (activo ? 'dot-active' : 'dot-fail') : 'dot-offline'}`} />
              <span className={`${statusColorClass} fw-semibold`}>P{id}</span>
            </span>
          </div>

          <h4 className="card-title text-dark mb-1 d-flex align-items-center justify-content-center gap-2">
            Proceso {id}
            {esCoordinador && (
              <span className="badge bg-leader-gold text-dark fs-8 p-1 px-2 rounded-pill shadow-sm animate-pulse">
                LÍDER
              </span>
            )}
          </h4>

          <div className="text-muted small font-mono mb-2">
            {ip}:{puerto}
          </div>
        </div>

        <div className="mt-2 pt-2 border-top border-dark-semi">
          <div className="small text-muted mb-1">Estado de Conexión:</div>
          <div className={`fw-semibold fs-7 ${statusColorClass}`}>
            {statusText}
          </div>
          
          {enEleccion && (
            <div className="mt-2 d-flex align-items-center justify-content-center gap-2 text-primary">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              <span className="small font-mono fw-bold text-primary">Elegiendo...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
