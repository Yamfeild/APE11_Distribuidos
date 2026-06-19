package com.practica.bully.controller;

import com.practica.bully.model.BftNodeConfig;
import com.practica.bully.service.BftService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bft")
@CrossOrigin(origins = "*")
public class BftController {

    private final BftService bftService;

    public BftController(BftService bftService) {
        this.bftService = bftService;
    }

    @GetMapping("/config")
    public ResponseEntity<List<BftNodeConfig>> getConfigs() {
        return ResponseEntity.ok(bftService.getAllBftConfigs());
    }

    @PostMapping("/configure")
    public ResponseEntity<String> configureNode(@RequestBody BftNodeConfig config) {
        bftService.updateBftConfig(config.getId(), config);
        return ResponseEntity.ok("Nodo configurado con éxito");
    }

    @GetMapping("/vote")
    public ResponseEntity<String> getVote(@RequestParam int callerId) {
        String voto = bftService.emitirVoto(callerId);
        return ResponseEntity.ok(voto);
    }

    @GetMapping("/collect-votes")
    public ResponseEntity<Map<Integer, String>> collectVotes() {
        return ResponseEntity.ok(bftService.recolectarVotosLocales());
    }

    @PostMapping("/sync-configs")
    public ResponseEntity<String> syncConfigs(@RequestBody List<BftNodeConfig> configs) {
        bftService.setAllConfigs(configs);
        return ResponseEntity.ok("Configuraciones sincronizadas");
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startConsensus() {
        Map<String, Object> resultado = bftService.iniciarConsensoBft();
        return ResponseEntity.ok(resultado);
    }
}
