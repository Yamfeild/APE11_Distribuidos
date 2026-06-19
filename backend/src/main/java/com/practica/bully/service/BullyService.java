package com.practica.bully.service;

import com.practica.bully.config.AppConfig;
import com.practica.bully.model.MensajeBully;
import com.practica.bully.model.Proceso;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class BullyService {

    private final int processId;
    private final List<Proceso> peers;
    private final RestTemplate restTemplate;
    private final int timeoutMs;

    private volatile int coordinadorActual;
    private volatile boolean enEleccion;
    private final Set<Integer> okRecibidos = ConcurrentHashMap.newKeySet();
    private final LinkedList<MensajeBully> bitacora = new LinkedList<>();
    private static final int MAX_LOG = 100;
    
    // Fine-grained lock for shared state variables (coordinadorActual, enEleccion, okRecibidos)
    // to prevent distributed deadlocks when performing network calls
    private final Object stateLock = new Object();

    public BullyService(AppConfig config, List<Proceso> procesos, RestTemplate restTemplate) {
        this.processId = config.getProcessId();
        this.peers = procesos;
        this.restTemplate = restTemplate;
        this.timeoutMs = config.getTimeoutMs();
        this.coordinadorActual = config.getCoordinadorInicial();
        this.enEleccion = false;

        Proceso este = getProceso(processId);
        if (este != null) {
            este.setActivo(true);
            este.setEsCoordinador(processId == coordinadorActual);
        }
    }

    public String iniciarEleccion() {
        synchronized (stateLock) {
            if (enEleccion) return "YA_EN_ELECCION";
            enEleccion = true;
            coordinadorActual = -1; // Coordinator is unknown during election
            okRecibidos.clear();
        }

        try {
            log("INICIO_ELECCION", processId, -1);

            List<Proceso> superiores;
            synchronized (this) {
                superiores = peers.stream()
                        .filter(p -> p.getId() > processId)
                        .sorted(Comparator.comparingInt(Proceso::getId))
                        .collect(Collectors.toList());
            }

            if (superiores.isEmpty()) {
                declararseCoordinador();
                return "NUEVO_COORDINADOR:" + processId;
            }

            for (Proceso superior : superiores) {
                MensajeBully msg = new MensajeBully("ELECTION", processId, superior.getId());
                // enviarMensaje is called OUTSIDE of the stateLock to prevent HTTP call deadlock
                if (enviarMensaje(superior, msg)) {
                    log("ELECTION", processId, superior.getId());
                }
            }

            try {
                Thread.sleep(timeoutMs);
            } catch (InterruptedException ignored) {}

            boolean alguienRespondio = false;
            synchronized (stateLock) {
                for (Proceso superior : superiores) {
                    if (okRecibidos.contains(superior.getId())) {
                        alguienRespondio = true;
                        break;
                    }
                }
            }

            if (!alguienRespondio) {
                // Double check if a higher coordinator has declared itself during our sleep
                int currentCoord;
                synchronized (stateLock) {
                    currentCoord = coordinadorActual;
                }
                if (currentCoord == -1 || currentCoord <= processId) {
                    declararseCoordinador();
                    return "NUEVO_COORDINADOR:" + processId;
                }
            }

            return "ELECCION_EN_CURSO";
        } finally {
            synchronized (stateLock) {
                enEleccion = false;
            }
        }
    }

    public String recibirMensaje(MensajeBully msg) {
        log(msg.getTipo(), msg.getOrigen(), msg.getDestino());

        switch (msg.getTipo()) {
            case "ELECTION":
                return handleElection(msg);
            case "OK":
                synchronized (stateLock) {
                    okRecibidos.add(msg.getOrigen());
                }
                return "OK_RECIBIDO";
            case "COORDINATOR":
                synchronized (stateLock) {
                    coordinadorActual = msg.getOrigen();
                    for (Proceso p : peers) {
                        p.setEsCoordinador(p.getId() == msg.getOrigen());
                    }
                    okRecibidos.clear();
                    enEleccion = false;
                }
                return "COORDINATOR_ACK";
            default:
                return "TIPO_DESCONOCIDO";
        }
    }

    private String handleElection(MensajeBully msg) {
        Proceso este = getProceso(processId);
        if (este == null || !este.isActivo()) return "INACTIVO";

        MensajeBully ok = new MensajeBully("OK", processId, msg.getOrigen());
        // enviarMensaje is called OUTSIDE the lock
        enviarMensaje(getProceso(msg.getOrigen()), ok);

        boolean startElectionThread = false;
        synchronized (stateLock) {
            if (!enEleccion) {
                startElectionThread = true;
                enEleccion = true; // reserve election state
            }
        }

        if (startElectionThread) {
            new Thread(() -> {
                try {
                    Thread.sleep(100);
                    synchronized (stateLock) {
                        enEleccion = false;
                    }
                    iniciarEleccion();
                } catch (InterruptedException ignored) {}
            }).start();
        }

        return "OK_ENVIADO";
    }

    private void declararseCoordinador() {
        synchronized (stateLock) {
            coordinadorActual = processId;
            for (Proceso p : peers) {
                p.setEsCoordinador(p.getId() == processId);
            }
        }

        log("COORDINATOR", processId, -1);

        List<Proceso> targets;
        synchronized (this) {
            targets = peers.stream()
                    .filter(p -> p.getId() < processId)
                    .collect(Collectors.toList());
        }

        for (Proceso p : targets) {
            MensajeBully msg = new MensajeBully("COORDINATOR", processId, p.getId());
            enviarMensaje(p, msg);
        }
    }

    private boolean enviarMensaje(Proceso destino, MensajeBully msg) {
        if (destino == null) return false;

        if (destino.getId() == processId) {
            recibirMensaje(msg);
            return true;
        }

        try {
            String url = "http://" + destino.getIp() + ":" + destino.getPuerto() + "/api/bully/message";
            String response = restTemplate.postForObject(url, msg, String.class);
            if ("INACTIVO".equals(response)) {
                synchronized (this) {
                    destino.setActivo(false);
                    destino.setEsCoordinador(false);
                }
                return false;
            }
            synchronized (this) {
                destino.setActivo(true);
            }
            return true;
        } catch (ResourceAccessException e) {
            synchronized (this) {
                destino.setActivo(false);
                destino.setEsCoordinador(false);
            }
            return false;
        } catch (Exception e) {
            synchronized (this) {
                destino.setActivo(false);
                destino.setEsCoordinador(false);
            }
            return false;
        }
    }

    public void toggleFail() {
        Proceso este = getProceso(processId);
        if (este != null) {
            synchronized (stateLock) {
                este.setActivo(!este.isActivo());
                if (!este.isActivo()) {
                    este.setEsCoordinador(false);
                    if (coordinadorActual == processId) {
                        coordinadorActual = -1;
                    }
                }
            }
        }
    }

    public void reset() {
        synchronized (stateLock) {
            enEleccion = false;
            okRecibidos.clear();
            bitacora.clear();
            int maxId = peers.stream().mapToInt(Proceso::getId).max().orElse(1);
            coordinadorActual = maxId;
            for (Proceso p : peers) {
                p.setActivo(true);
                p.setEsCoordinador(p.getId() == maxId);
            }
        }
    }

    public Proceso getProceso(int id) {
        synchronized (this) {
            return peers.stream().filter(p -> p.getId() == id).findFirst().orElse(null);
        }
    }

    public int getProcessId() { return processId; }
    
    public int getCoordinadorActual() {
        synchronized (stateLock) {
            return coordinadorActual;
        }
    }
    
    public boolean isEnEleccion() {
        synchronized (stateLock) {
            return enEleccion;
        }
    }
    
    public List<Proceso> getPeers() {
        synchronized (this) {
            return new ArrayList<>(peers);
        }
    }

    public List<MensajeBully> getBitacora() {
        synchronized (bitacora) {
            return new ArrayList<>(bitacora);
        }
    }

    private void log(String tipo, int origen, int destino) {
        synchronized (bitacora) {
            if (bitacora.size() >= MAX_LOG) bitacora.pollFirst();
            bitacora.addLast(new MensajeBully(tipo, origen, destino));
        }
    }

    // --- HEARTBEAT & STARTUP ELECTION FUNCTIONALITIES ---

    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 3000, initialDelay = 5000)
    public void checkCoordinatorHeartbeat() {
        if (isEnEleccion()) {
            return;
        }
        Proceso este = getProceso(processId);
        if (este == null || !este.isActivo()) {
            return;
        }

        int coordId = getCoordinadorActual();
        if (coordId == processId) {
            return;
        }

        if (coordId == -1) {
            new Thread(this::iniciarEleccion).start();
            return;
        }

        Proceso coord = getProceso(coordId);
        if (coord == null) {
            synchronized (stateLock) {
                coordinadorActual = -1;
            }
            new Thread(this::iniciarEleccion).start();
            return;
        }

        try {
            String url = "http://" + coord.getIp() + ":" + coord.getPuerto() + "/api/bully/status";
            org.springframework.http.ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Boolean active = (Boolean) response.getBody().get("activo");
                if (active != null && !active) {
                    handleCoordinatorFailure(coord);
                } else {
                    synchronized (this) {
                        coord.setActivo(true);
                    }
                }
            } else {
                handleCoordinatorFailure(coord);
            }
        } catch (Exception e) {
            handleCoordinatorFailure(coord);
        }
    }

    private void handleCoordinatorFailure(Proceso coord) {
        log("FALLO", coord.getId(), -1);
        synchronized (stateLock) {
            coord.setActivo(false);
            coord.setEsCoordinador(false);
            coordinadorActual = -1;
        }
        new Thread(this::iniciarEleccion).start();
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void onStartup() {
        new Thread(() -> {
            try {
                Thread.sleep(2000);
                Proceso este = getProceso(processId);
                if (este != null && este.isActivo()) {
                    iniciarEleccion();
                }
            } catch (InterruptedException ignored) {}
        }).start();
    }
}
