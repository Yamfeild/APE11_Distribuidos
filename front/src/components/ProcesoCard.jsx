import React from 'react'

export default function ProcesoCard({ proceso }) {
  if (!proceso) return null

  const cardClass = [
    'card h-100',
    proceso.esCoordinador ? 'card-coordinador' : '',
    !proceso.activo ? 'card-inactivo' : ''
  ].filter(Boolean).join(' ')

  const badgeClass = proceso.esCoordinador ? 'bg-warning text-dark' : 'bg-secondary'

  return (
    <div className={cardClass}>
      <div className="card-body text-center">
        <h5 className="card-title">
          P{proceso.id}
          {proceso.esCoordinador && (
            <span className={`badge ms-2 ${badgeClass}`}>
              Coordinador
            </span>
          )}
        </h5>
        <div className="mb-2">
          <span className={`badge ${proceso.activo ? 'bg-success' : 'bg-danger'}`}>
            {proceso.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <p className="card-text small text-muted mb-1">
          {proceso.ip}:{proceso.puerto}
        </p>
        <p className="card-text small text-muted mb-0">
          {proceso.conectado ? 'Conectado' : 'Desconectado'}
        </p>
        {proceso.enEleccion && (
          <div className="mt-2">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">En elección...</span>
            </div>
            <small className="ms-1 text-primary">En elección</small>
          </div>
        )}
      </div>
    </div>
  )
}
