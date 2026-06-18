const PEERS_CONFIG = [
  { id: 1, ip: '192.168.1.10', puerto: 8085 },
  { id: 2, ip: '192.168.1.11', puerto: 8085 },
  { id: 3, ip: '192.168.1.12', puerto: 8085 }
]

function peerUrl(peer) {
  return `http://${peer.ip}:${peer.puerto}/api/bully`
}

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getStatus(peer) {
  return fetchJson(`${peerUrl(peer)}/status`)
}

export async function getPeers(peer) {
  return fetchJson(`${peerUrl(peer)}/peers`)
}

export async function getLog(peer) {
  return fetchJson(`${peerUrl(peer)}/log`)
}

export async function startElection(peer) {
  return fetchJson(`${peerUrl(peer)}/election`, { method: 'POST' })
}

export async function toggleFail(peer) {
  return fetchJson(`${peerUrl(peer)}/fail`, { method: 'POST' })
}

export async function reset(peer) {
  return fetchJson(`${peerUrl(peer)}/reset`, { method: 'POST' })
}

export async function fetchAllPeersStatus() {
  const results = []
  for (const peer of PEERS_CONFIG) {
    const status = await getStatus(peer)
    results.push({
      id: peer.id,
      ip: peer.ip,
      puerto: peer.puerto,
      activo: status ? status.activo : false,
      esCoordinador: status ? status.esCoordinador : false,
      conectado: status !== null,
      enEleccion: status ? status.enEleccion : false,
      processId: status ? status.processId : null,
      coordinadorActual: status ? status.coordinadorActual : null
    })
  }
  return results
}

export async function fetchLogsFromAll() {
  const allLogs = []
  for (const peer of PEERS_CONFIG) {
    const logs = await getLog(peer)
    if (logs) allLogs.push(...logs)
  }
  allLogs.sort((a, b) => a.timestamp - b.timestamp)
  return allLogs
}

export { PEERS_CONFIG }
