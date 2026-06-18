import React from 'react'

const TIPO_BADGE = {
  ELECTION: 'badge-election',
  OK: 'badge-ok',
  COORDINATOR: 'badge-coordinator',
  FALLO: 'badge-fallo',
  INICIO_ELECCION: 'badge-election'
}

export default function LogMensajes({ mensajes }) {
  if (!mensajes || mensajes.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center text-muted">
          No hay mensajes registrados
        </div>
      </div>
    )
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('es-EC', { hour12: false })
  }

  const formatDestino = (m) => {
    if (m.tipo === 'INICIO_ELECCION') return '—'
    if (m.tipo === 'COORDINATOR' && m.destino === -1) return 'TODOS'
    if (m.tipo === 'FALLO') return '—'
    return `P${m.destino}`
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Bitácora de Mensajes</h5>
        <span className="badge bg-primary">{mensajes.length} mensajes</span>
      </div>
      <div className="card-body p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table className="table table-sm table-striped mb-0 log-table">
          <thead className="table-dark sticky-top">
            <tr>
              <th>#</th>
              <th>TIPO</th>
              <th>ORIGEN</th>
              <th>→ DESTINO</th>
              <th>HORA</th>
            </tr>
          </thead>
          <tbody>
            {mensajes.map((m, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <span className={`badge ${TIPO_BADGE[m.tipo] || 'bg-secondary'}`}>
                    {m.tipo}
                  </span>
                </td>
                <td>P{m.origen}</td>
                <td>{formatDestino(m)}</td>
                <td>{formatTime(m.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
