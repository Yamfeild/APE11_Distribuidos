package com.practica.bully.config;

import com.practica.bully.model.Proceso;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "bully")
public class AppConfig {

    private int processId;
    private int timeoutMs = 5000;
    private int coordinadorInicial = 3;
    private final List<PeerConfig> peers = new ArrayList<>();

    public int getProcessId() { return processId; }
    public void setProcessId(int processId) { this.processId = processId; }
    public int getTimeoutMs() { return timeoutMs; }
    public void setTimeoutMs(int timeoutMs) { this.timeoutMs = timeoutMs; }
    public int getCoordinadorInicial() { return coordinadorInicial; }
    public void setCoordinadorInicial(int coordinadorInicial) { this.coordinadorInicial = coordinadorInicial; }
    public List<PeerConfig> getPeers() { return peers; }

    public static class PeerConfig {
        private int id;
        private String ip;
        private int puerto = 8085;

        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public String getIp() { return ip; }
        public void setIp(String ip) { this.ip = ip; }
        public int getPuerto() { return puerto; }
        public void setPuerto(int puerto) { this.puerto = puerto; }
    }

    @Bean
    public List<Proceso> procesos() {
        List<Proceso> lista = new ArrayList<>();
        for (PeerConfig peer : peers) {
            Proceso p = new Proceso(peer.getId(), peer.getIp(), peer.getPuerto());
            p.setEsCoordinador(peer.getId() == coordinadorInicial);
            lista.add(p);
        }
        return lista;
    }

    @Bean
    public RestTemplate restTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(1000);
        factory.setReadTimeout(1500);
        return new RestTemplate(factory);
    }
}
