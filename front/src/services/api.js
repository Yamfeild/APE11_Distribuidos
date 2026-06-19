const DEFAULT_PEERS = [
  { id: 1, ip: '127.0.0.1', puerto: 8081 },
  { id: 2, ip: '127.0.0.1', puerto: 8082 },
  { id: 3, ip: '127.0.0.1', puerto: 8083 }
]

export function getPeersConfig() {
  const saved = localStorage.getItem('bully_peers_config')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return DEFAULT_PEERS
    }
  }
  return DEFAULT_PEERS
}

export function savePeersConfig(config) {
  localStorage.setItem('bully_peers_config', JSON.stringify(config))
}

export function resetPeersConfig() {
  localStorage.removeItem('bully_peers_config')
  return DEFAULT_PEERS
}

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
  const config = getPeersConfig()
  for (const peer of config) {
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
  const config = getPeersConfig()
  for (const peer of config) {
    const logs = await getLog(peer)
    if (logs) allLogs.push(...logs)
  }
  
  // Remove duplicates by comparing timestamp, type, origin, and destino
  const uniqueLogs = []
  const seen = new Set()
  for (const log of allLogs) {
    const key = `${log.timestamp}-${log.tipo}-${log.origen}-${log.destino}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueLogs.push(log)
    }
  }
  
  uniqueLogs.sort((a, b) => a.timestamp - b.timestamp)
  return uniqueLogs
}
