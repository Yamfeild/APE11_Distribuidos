package com.practica.bully.service;

import com.practica.bully.config.AppConfig;
import com.practica.bully.model.BftNodeConfig;
import com.practica.bully.model.Proceso;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class BftService {

    private final int processId;
    private final List<Proceso> peers;
    private final RestTemplate restTemplate;
    
    // In-memory BFT configuration of all nodes in this node's view
    private final Map<Integer, BftNodeConfig> bftConfigs = new ConcurrentHashMap<>();

    public BftService(AppConfig config, List<Proceso> procesos, RestTemplate restTemplate) {
        this.processId = config.getProcessId();
        this.peers = procesos;
        this.restTemplate = restTemplate;

        // Initialize BFT configurations for all peers (including self)
        for (Proceso p : procesos) {
            bftConfigs.put(p.getId(), new BftNodeConfig(p.getId()));
        }
    }

    public BftNodeConfig getLocalBftConfig() {
        return bftConfigs.computeIfAbsent(processId, id -> new BftNodeConfig(processId));
    }

    public List<BftNodeConfig> getAllBftConfigs() {
        return new ArrayList<>(bftConfigs.values());
    }

    public void updateBftConfig(int id, BftNodeConfig newConfig) {
        BftNodeConfig current = bftConfigs.get(id);
        if (current != null) {
            current.setBizantino(newConfig.isBizantino());
            current.setVotoBase(newConfig.getVotoBase());
            current.setComportamiento(newConfig.getComportamiento());
        }
    }

    /**
     * Returns the vote of this node to a specific caller.
     * If the node is honest, it returns its voteBase.
     * If Byzantine:
     * - "MENTIROSO": returns the opposite of its voteBase.
     * - "CONTRADICTORIO": returns "SI" to odd caller IDs, "NO" to even caller IDs (split vote).
     */
    public String emitirVoto(int callerId) {
        BftNodeConfig config = getLocalBftConfig();
        if (!config.isBizantino() || "HONESTO".equals(config.getComportamiento())) {
            return config.getVotoBase();
        }

        if ("MENTIROSO".equals(config.getComportamiento())) {
            return "SI".equals(config.getVotoBase()) ? "NO" : "SI";
        }

        if ("CONTRADICTORIO".equals(config.getComportamiento())) {
            return (callerId % 2 == 1) ? "SI" : "NO";
        }

        return config.getVotoBase();
    }

    /**
     * Executes the first phase: Collect votes from all active peers.
     */
    public Map<Integer, String> recolectarVotosLocales() {
        Map<Integer, String> votosRecolectados = new HashMap<>();
        
        // Include own vote
        votosRecolectados.put(processId, emitirVoto(processId));

        for (Proceso p : peers) {
            if (p.getId() == processId || !p.isActivo()) {
                continue;
            }

            try {
                String url = "http://" + p.getIp() + ":" + p.getPuerto() + "/api/bft/vote?callerId=" + processId;
                String voto = restTemplate.getForObject(url, String.class);
                if (voto != null) {
                    votosRecolectados.put(p.getId(), voto);
                }
            } catch (Exception e) {
                // If offline, do not record vote
            }
        }
        return votosRecolectados;
    }

    /**
     * Synchronize BFT configs across all nodes so that all nodes have the same honest/Byzantine settings.
     */
    public void sincronizarConfiguraciones() {
        List<BftNodeConfig> localConfigs = getAllBftConfigs();
        for (Proceso p : peers) {
            if (p.getId() == processId || !p.isActivo()) {
                continue;
            }
            try {
                String url = "http://" + p.getIp() + ":" + p.getPuerto() + "/api/bft/sync-configs";
                restTemplate.postForObject(url, localConfigs, String.class);
            } catch (Exception ignored) {}
        }
    }

    public void setAllConfigs(List<BftNodeConfig> configs) {
        for (BftNodeConfig c : configs) {
            updateBftConfig(c.getId(), c);
        }
    }

    /**
     * Starts BFT Consensus round. Can only be triggered from the coordinator.
     */
    public Map<String, Object> iniciarConsensoBft() {
        // 1. Sync BFT node configs across the cluster first
        sincronizarConfiguraciones();

        // Map containing BFT results of each active node
        Map<Integer, Map<Integer, String>> matrizVotosCruzados = new HashMap<>();
        
        // 2. Step 1: Every active node collects votes from all other nodes
        // Coordinator triggers each active node to collect votes and send them back
        matrizVotosCruzados.put(processId, recolectarVotosLocales());

        for (Proceso p : peers) {
            if (p.getId() == processId || !p.isActivo()) {
                continue;
            }
            try {
                String url = "http://" + p.getIp() + ":" + p.getPuerto() + "/api/bft/collect-votes";
                @SuppressWarnings("unchecked")
                Map<String, String> response = restTemplate.getForObject(url, Map.class);
                if (response != null) {
                    Map<Integer, String> votosNode = new HashMap<>();
                    for (Map.Entry<String, String> entry : response.entrySet()) {
                        votosNode.put(Integer.parseInt(entry.getKey()), entry.getValue());
                    }
                    matrizVotosCruzados.put(p.getId(), votosNode);
                }
            } catch (Exception e) {
                // Node offline
            }
        }

        // 3. Step 2: Detect inconsistencies
        // An inconsistency happens when node A reports that node B voted "SI" to A,
        // but node C reports that node B voted "NO" to C.
        List<String> inconsistencias = new ArrayList<>();
        Set<String> inconsistenciasSet = new HashSet<>();

        for (Map.Entry<Integer, Map<Integer, String>> entryA : matrizVotosCruzados.entrySet()) {
            int receptorA = entryA.getKey();
            Map<Integer, String> votosA = entryA.getValue();

            for (Map.Entry<Integer, Map<Integer, String>> entryB : matrizVotosCruzados.entrySet()) {
                int receptorB = entryB.getKey();
                Map<Integer, String> votosB = entryB.getValue();

                if (receptorA == receptorB) continue;

                // Compare votes of all processes
                for (int pid = 1; pid <= bftConfigs.size(); pid++) {
                    String votoParaA = votosA.get(pid);
                    String votoParaB = votosB.get(pid);

                    if (votoParaA != null && votoParaB != null && !votoParaA.equals(votoParaB)) {
                        String key = Math.min(receptorA, receptorB) + "-" + Math.max(receptorA, receptorB) + "-" + pid;
                        if (!inconsistenciasSet.contains(key)) {
                            inconsistenciasSet.add(key);
                            inconsistencias.add("Nodo " + pid + " envió votos contradictorios: \"" + votoParaA + "\" al Nodo " + receptorA + " y \"" + votoParaB + "\" al Nodo " + receptorB);
                        }
                    }
                }
            }
        }

        // 4. Step 3: Compute final decision for each node
        // In simple BFT, each honest node decides based on the majority of votes it received.
        Map<Integer, String> decisionesFinales = new HashMap<>();
        Map<Integer, Boolean> consensoAlcanzado = new HashMap<>();

        for (Map.Entry<Integer, Map<Integer, String>> entry : matrizVotosCruzados.entrySet()) {
            int node = entry.getKey();
            Map<Integer, String> votos = entry.getValue();

            int siCount = 0;
            int noCount = 0;
            for (String v : votos.values()) {
                if ("SI".equals(v)) siCount++;
                else if ("NO".equals(v)) noCount++;
            }

            String decision = (siCount > noCount) ? "APROBADA" : "RECHAZADA";
            decisionesFinales.put(node, decision);
        }

        // Check if all honest nodes reached the same decision
        boolean mismoConsenso = true;
        String decisionConsenso = null;
        for (Map.Entry<Integer, String> entry : decisionesFinales.entrySet()) {
            int nodeId = entry.getKey();
            BftNodeConfig config = bftConfigs.get(nodeId);
            Proceso p = peers.stream().filter(pr -> pr.getId() == nodeId).findFirst().orElse(null);
            
            // Skip Byzantine nodes or offline nodes from decision alignment check
            if (config != null && config.isBizantino() && !"HONESTO".equals(config.getComportamiento())) {
                continue;
            }
            if (p != null && !p.isActivo()) {
                continue;
            }

            if (decisionConsenso == null) {
                decisionConsenso = entry.getValue();
            } else if (!decisionConsenso.equals(entry.getValue())) {
                mismoConsenso = false;
            }
        }

        Map<String, Object> results = new LinkedHashMap<>();
        results.put("matrizVotos", matrizVotosCruzados);
        results.put("inconsistencias", inconsistencias);
        results.put("decisiones", decisionesFinales);
        results.put("consensoGlobal", mismoConsenso && decisionConsenso != null ? decisionConsenso : "FALLIDO");
        results.put("nodosActivos", matrizVotosCruzados.size());
        results.put("nodosBizantinos", bftConfigs.values().stream().filter(c -> c.isBizantino() && !"HONESTO".equals(c.getComportamiento())).count());
        
        return results;
    }
}
