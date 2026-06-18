package com.practica.bully.model;

public class Proceso {
    private int id;
    private String ip;
    private int puerto;
    private boolean activo;
    private boolean esCoordinador;

    public Proceso() {}

    public Proceso(int id, String ip, int puerto) {
        this.id = id;
        this.ip = ip;
        this.puerto = puerto;
        this.activo = true;
        this.esCoordinador = false;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
    public int getPuerto() { return puerto; }
    public void setPuerto(int puerto) { this.puerto = puerto; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public boolean isEsCoordinador() { return esCoordinador; }
    public void setEsCoordinador(boolean esCoordinador) { this.esCoordinador = esCoordinador; }
}
