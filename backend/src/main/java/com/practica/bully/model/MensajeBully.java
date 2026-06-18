package com.practica.bully.model;

public class MensajeBully {
    private String tipo;
    private int origen;
    private int destino;
    private long timestamp;

    public MensajeBully() {}

    public MensajeBully(String tipo, int origen, int destino) {
        this.tipo = tipo;
        this.origen = origen;
        this.destino = destino;
        this.timestamp = System.currentTimeMillis();
    }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public int getOrigen() { return origen; }
    public void setOrigen(int origen) { this.origen = origen; }
    public int getDestino() { return destino; }
    public void setDestino(int destino) { this.destino = destino; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}
