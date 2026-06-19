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

    private int coordinadorActual;
    private boolean enEleccion;
    private final Set<Integer> okRecibidos = ConcurrentHashMap.newKeySet();
    private final LinkedList<MensajeBully> bitacora = new LinkedList<>();
    private static final int MAX_LOG = 100;

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

    public synchronized String iniciarEleccion() {
        if (enEleccion) return "YA_EN_ELECCION";
        enEleccion = true;
        okRecibidos.clear();

        Proceso este = getProceso(processId);
        if (este == null || !este.isActivo()) {
            enEleccion = false;
            return "PROCESO_INACTIVO";
        }

        try {
            log("INICIO_ELECCION", processId, -1);

            List<Proceso> superiores = peers.stream()
                    .filter(p -> p.getId() > processId)
                    .sorted(Comparator.comparingInt(Proceso::getId))
                    .collect(Collectors.toList());

            if (superiores.isEmpty()) {
                declararseCoordinador();
                return "NUEVO_COORDINADOR:" + processId;
            }

            for (Proceso superior : superiores) {
                MensajeBully msg = new MensajeBully("ELECTION", processId, superior.getId());
                if (enviarMensaje(superior, msg)) {
                    log("ELECTION", processId, superior.getId());
                }
            }

            try {
                Thread.sleep(timeoutMs);
            } catch (InterruptedException ignored) {}

            boolean alguienRespondio = false;
            for (Proceso superior : superiores) {
                if (okRecibidos.contains(superior.getId())) {
                    alguienRespondio = true;
                    break;
                }
            }

            if (!alguienRespondio) {
                declararseCoordinador();
                return "NUEVO_COORDINADOR:" + processId;
            }

            return "ELECCION_EN_CURSO";
        } finally {
            enEleccion = false;
        }
    }

    public synchronized String recibirMensaje(MensajeBully msg) {
        log(msg.getTipo(), msg.getOrigen(), msg.getDestino());

        switch (msg.getTipo()) {
            case "ELECTION":
                return handleElection(msg);
            case "OK":
                okRecibidos.add(msg.getOrigen());
                return "OK_RECIBIDO";
            case "COORDINATOR":
                coordinadorActual = msg.getOrigen();
                for (Proceso p : peers) {
                    p.setEsCoordinador(p.getId() == msg.getOrigen());
                }
                okRecibidos.clear();
                enEleccion = false;
                return "COORDINATOR_ACK";
            default:
                return "TIPO_DESCONOCIDO";
        }
    }

    private String handleElection(MensajeBully msg) {
        Proceso este = getProceso(processId);
        if (este == null || !este.isActivo()) return "INACTIVO";

        MensajeBully ok = new MensajeBully("OK", processId, msg.getOrigen());
        enviarMensaje(getProceso(msg.getOrigen()), ok);

        if (!enEleccion) {
            new Thread(() -> {
                try {
                    Thread.sleep(100);
                    iniciarEleccion();
                } catch (InterruptedException ignored) {}
            }).start();
        }

        return "OK_ENVIADO";
    }

    private void declararseCoordinador() {
        coordinadorActual = processId;
        for (Proceso p : peers) {
            p.setEsCoordinador(p.getId() == processId);
        }

        log("COORDINATOR", processId, -1);

        for (Proceso p : peers) {
            if (p.getId() < processId) {
                MensajeBully msg = new MensajeBully("COORDINATOR", processId, p.getId());
                enviarMensaje(p, msg);
            }
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
                destino.setActivo(false);
                destino.setEsCoordinador(false);
                return false;
            }
            destino.setActivo(true);
            return true;
        } catch (ResourceAccessException e) {
            destino.setActivo(false);
            destino.setEsCoordinador(false);
            return false;
        } catch (Exception e) {
            destino.setActivo(false);
            destino.setEsCoordinador(false);
            return false;
        }
    }

    public synchronized void toggleFail() {
        Proceso este = getProceso(processId);
        if (este != null) {
            este.setActivo(!este.isActivo());
            if (!este.isActivo()) {
                este.setEsCoordinador(false);
                if (coordinadorActual == processId) {
                    coordinadorActual = -1;
                }
            }
        }
    }

    public synchronized void reset() {
        enEleccion = false;
        okRecibidos.clear();
        bitacora.clear();
        int maxId = peers.stream().mapToInt(Proceso::getId).max().orElse(1);
        coordinadorActual = maxId;
        for (Proceso p : peers) {
            p.setActivo(true);
            p.setEsCoordinador(p.getId() == maxId);
        }
        getProceso(processId).setActivo(true);
    }

    public Proceso getProceso(int id) {
        return peers.stream().filter(p -> p.getId() == id).findFirst().orElse(null);
    }

    public int getProcessId() { return processId; }
    public int getCoordinadorActual() { return coordinadorActual; }
    public boolean isEnEleccion() { return enEleccion; }
    public List<Proceso> getPeers() { return peers; }

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
        if (enEleccion) {
            return;
        }
        Proceso este = getProceso(processId);
        if (este == null || !este.isActivo()) {
            return;
        }

        int coordId = coordinadorActual;
        if (coordId == processId) {
            return;
        }

        if (coordId == -1) {
            new Thread(this::iniciarEleccion).start();
            return;
        }

        Proceso coord = getProceso(coordId);
        if (coord == null) {
            coordinadorActual = -1;
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
                    coord.setActivo(true);
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
        coord.setActivo(false);
        coord.setEsCoordinador(false);
        coordinadorActual = -1;
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
