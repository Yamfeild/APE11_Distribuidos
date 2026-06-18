package com.practica.bully;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties
@org.springframework.scheduling.annotation.EnableScheduling
public class BullyApplication {
    public static void main(String[] args) {
        SpringApplication.run(BullyApplication.class, args);
    }
}
