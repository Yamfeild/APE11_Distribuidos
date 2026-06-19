package com.practica.bully.model;

public class BftNodeConfig {
    private int id;
    private boolean bizantino;
    private String votoBase; // "SI" or "NO"
    private String comportamiento; // "HONESTO", "MENTIROSO", "CONTRADICTORIO"

    public BftNodeConfig() {}

    public BftNodeConfig(int id) {
        this.id = id;
        this.bizantino = false;
        this.votoBase = "SI";
        this.comportamiento = "HONESTO";
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public boolean isBizantino() { return bizantino; }
    public void setBizantino(boolean bizantino) { this.bizantino = bizantino; }
    public String getVotoBase() { return votoBase; }
    public void setVotoBase(String votoBase) { this.votoBase = votoBase; }
    public String getComportamiento() { return comportamiento; }
    public void setComportamiento(String comportamiento) { this.comportamiento = comportamiento; }
}
