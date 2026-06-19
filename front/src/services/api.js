const DEFAULT_PEERS = [
  { id: 1, ip: '192.168.1.10', puerto: 8085 },
  { id: 2, ip: '192.168.1.11', puerto: 8085 },
  { id: 3, ip: '192.168.1.12', puerto: 8085 },
  { id: 4, ip: '192.168.1.13', puerto: 8085 }
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
  const timeout = options.timeout || 1000
  const fetchOptions = { ...options }
  delete fetchOptions.timeout

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...fetchOptions
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    return await res.json()
  } catch {
    clearTimeout(timeoutId)
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

// Fetch status of all configured peers in parallel to prevent sequential fetch blocking
export async function fetchAllPeersStatus() {
  const config = getPeersConfig()
  const promises = config.map(async (peer) => {
    const status = await getStatus(peer)
    return {
      id: peer.id,
      ip: peer.ip,
      puerto: peer.puerto,
      activo: status ? status.activo : false,
      esCoordinador: status ? status.esCoordinador : false,
      conectado: status !== null,
      enEleccion: status ? status.enEleccion : false,
      processId: status ? status.processId : null,
      coordinadorActual: status ? status.coordinadorActual : null
    }
  })
  return Promise.all(promises)
}

// Fetch logs of all configured peers in parallel
export async function fetchLogsFromAll() {
  const config = getPeersConfig()
  const promises = config.map(async (peer) => {
    const logs = await getLog(peer)
    return logs || []
  })
  
  const results = await Promise.all(promises)
  const allLogs = results.flat()
  
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

function bftPeerUrl(peer) {
  return `http://${peer.ip}:${peer.puerto}/api/bft`
}

export async function getBftConfig(peer) {
  return fetchJson(`${bftPeerUrl(peer)}/config`)
}

export async function configureBftNode(peer, config) {
  return fetchJson(`${bftPeerUrl(peer)}/configure`, {
    method: 'POST',
    body: JSON.stringify(config),
    timeout: 3000
  })
}

export async function startBftConsensus(peer) {
  return fetchJson(`${bftPeerUrl(peer)}/start`, { 
    method: 'POST',
    timeout: 15000 
  })
}

export async function configureBftNodeOnAll(activePeers, config) {
  const promises = activePeers.map(peer => {
    if (peer.conectado) {
      return configureBftNode(peer, config)
    }
    return Promise.resolve(null)
  })
  return Promise.all(promises)
}

