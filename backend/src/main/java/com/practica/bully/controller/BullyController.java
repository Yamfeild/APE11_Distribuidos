package com.practica.bully.controller;

import com.practica.bully.config.AppConfig;
import com.practica.bully.model.MensajeBully;
import com.practica.bully.model.Proceso;
import com.practica.bully.service.BullyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/bully")
@CrossOrigin(origins = "*")
public class BullyController {

    private final BullyService bullyService;
    private final AppConfig appConfig;

    public BullyController(BullyService bullyService, AppConfig appConfig) {
        this.bullyService = bullyService;
        this.appConfig = appConfig;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("processId", bullyService.getProcessId());
        data.put("coordinadorActual", bullyService.getCoordinadorActual());
        data.put("enEleccion", bullyService.isEnEleccion());

        Proceso este = bullyService.getProceso(bullyService.getProcessId());
        data.put("activo", este != null && este.isActivo());
        data.put("esCoordinador", este != null && este.isEsCoordinador());

        return ResponseEntity.ok(data);
    }

    @GetMapping("/peers")
    public ResponseEntity<List<Map<String, Object>>> getPeers() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Proceso p : bullyService.getPeers()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("ip", p.getIp());
            m.put("puerto", p.getPuerto());
            m.put("activo", p.isActivo());
            m.put("esCoordinador", p.isEsCoordinador());
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/message")
    public ResponseEntity<String> receiveMessage(@RequestBody MensajeBully msg) {
        String result = bullyService.recibirMensaje(msg);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/election")
    public ResponseEntity<Map<String, Object>> startElection() {
        String result = bullyService.iniciarEleccion();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("resultado", result);
        response.put("coordinadorActual", bullyService.getCoordinadorActual());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/fail")
    public ResponseEntity<Map<String, Object>> toggleFail() {
        bullyService.toggleFail();
        Proceso este = bullyService.getProceso(bullyService.getProcessId());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("processId", bullyService.getProcessId());
        response.put("activo", este != null && este.isActivo());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/log")
    public ResponseEntity<List<MensajeBully>> getLog() {
        return ResponseEntity.ok(bullyService.getBitacora());
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset() {
        bullyService.reset();
        Map<String, String> response = new LinkedHashMap<>();
        response.put("resultado", "OK");
        return ResponseEntity.ok(response);
    }
}
