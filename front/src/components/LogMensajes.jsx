import React, { useEffect, useRef } from 'react'

const TIPO_BADGE = {
  ELECTION: 'bg-info-glow text-info-glow-text border-info-glow-border',
  OK: 'bg-success-glow text-success-glow-text border-success-glow-border',
  COORDINATOR: 'bg-warning-glow text-warning-glow-text border-warning-glow-border',
  FALLO: 'bg-danger-glow text-danger-glow-text border-danger-glow-border',
  INICIO_ELECCION: 'bg-purple-glow text-purple-glow-text border-purple-glow-border'
}

export default function LogMensajes({ mensajes }) {
  const containerRef = useRef(null)

  // Auto scroll to bottom on new logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [mensajes])

  if (!mensajes || mensajes.length === 0) {
    return (
      <div className="card glass-card">
        <div className="card-body text-center text-muted p-4">
          No hay mensajes en la bitácora
        </div>
      </div>
    )
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('es-EC', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
  }

  const formatDestino = (m) => {
    if (m.tipo === 'INICIO_ELECCION') return '—'
    if (m.tipo === 'COORDINATOR' && m.destino === -1) return 'TODOS (Difusión)'
    if (m.tipo === 'FALLO') return '—'
    return `P${m.destino}`
  }

  const formatLogContent = (m) => {
    switch (m.tipo) {
      case 'INICIO_ELECCION':
        return `El proceso P${m.origen} detectó falla y comenzó una ELECCIÓN.`
      case 'ELECTION':
        return `P${m.origen} envía mensaje ELECTION a P${m.destino}.`
      case 'OK':
        return `P${m.origen} responde OK a P${m.destino}.`
      case 'COORDINATOR':
        return m.destino === -1 
          ? `P${m.origen} se proclama nuevo COORDINADOR (Difunde a todos).`
          : `P${m.origen} anuncia COORDINADOR a P${m.destino}.`
      case 'FALLO':
        return `P${m.origen} no responde. ¡Falla detectada por heartbeat!`
      default:
        return `${m.tipo} de P${m.origen} a P${m.destino}`
    }
  }

  return (
    <div className="card glass-card border-none">
      <div className="card-header border-bottom border-dark-semi d-flex justify-content-between align-items-center bg-light-semi py-3 px-4">
        <h5 className="mb-0 text-dark fw-bold d-flex align-items-center gap-2">
          <span className="dot-pulse-indigo"></span>
          Consola del Sistema (Bitácora)
        </h5>
        <span className="badge bg-indigo-semi text-indigo-text font-mono px-3 py-1.5 rounded-pill border border-indigo-edge">
          {mensajes.length} registros
        </span>
      </div>
      <div 
        className="card-body p-0" 
        style={{ maxHeight: '320px', overflowY: 'auto' }}
        ref={containerRef}
      >
        <table className="table table-striped table-hover mb-0 log-table font-mono border-none">
          <thead className="table-lightsticky-top">
            <tr className="border-bottom border-dark-semi bg-light">
              <th className="py-2.5 px-4 text-muted w-10">#</th>
              <th className="py-2.5 px-2 text-muted w-20">TIPO</th>
              <th className="py-2.5 px-2 text-muted w-15">ORIGEN</th>
              <th className="py-2.5 px-2 text-muted w-15">→ DESTINO</th>
              <th className="py-2.5 px-2 text-muted w-20">HORA</th>
              <th className="py-2.5 px-4 text-muted w-30">DESCRIPCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {mensajes.map((m, i) => (
              <tr key={i} className="border-bottom border-dark-semi align-middle font-mono fs-8">
                <td className="py-2.5 px-4 text-muted">{i + 1}</td>
                <td className="py-2.5 px-2">
                  <span className={`badge ${TIPO_BADGE[m.tipo] || 'bg-secondary'} font-mono px-2 py-1 rounded-sm border`}>
                    {m.tipo}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-dark">P{m.origen}</td>
                <td className="py-2.5 px-2 text-dark">{formatDestino(m)}</td>
                <td className="py-2.5 px-2 text-muted">{formatTime(m.timestamp)}</td>
                <td className="py-2.5 px-4 text-secondary">{formatLogContent(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
