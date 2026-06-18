# Práctica 10 — Algoritmo Bully

## Descripción del Proyecto

Este proyecto implementa un **sistema de simulación de nodos hospitalarios distribuidos** que demuestra el **algoritmo Bully** para la elección de coordinador en un clúster de 5 nodos. Simula un sistema distribuido donde los nodos hospitalarios se comunican para elegir y mantener un coordinador, implementando conceptos fundamentales de sistemas distribuidos.

### Características Principales

- **Algoritmo Bully**: Implementación del algoritmo clásico de elección de coordinador
- **Monitoreo en Tiempo Real**: Interfaz web para visualizar el estado y proceso de elección
- **Simulación de Fallos**: Capacidad para simular fallos de nodos y desencadenar re-elecciones
- **Registro de Mensajes**: Historial completo de todos los eventos de elección y comunicación
- **Sincronización de Relojes**: Implementa el algoritmo de Cristian's para sincronización de tiempo

## Arquitectura

### Backend (Java Spring Boot)
- **Framework**: Spring Boot con Spring MVC (no WebFlux)
- **Puerto**: 8085 para comunicación interna P2P
- **Componentes**:
  - `BullyApplication.java` - Aplicación principal de Spring Boot
  - `BullyService.java` - Lógica central del algoritmo Bully
  - `BullyController.java` - Endpoints de API REST
  - `AppConfig.java` - Configuración y definición de beans
  - Modelos: `Proceso.java`, `MensajeBully.java`

### Frontend (React + Vite)
- **Framework**: React con Vite
- **Puerto**: 5173 para servidor de desarrollo
- **Componentes**:
  - `App.jsx` - Contenedor principal de la aplicación
  - `ProcesoCard.jsx` - Visualización de estado de nodos individuales
  - `PanelControl.jsx` - Panel de control para acciones de simulación
  - `LogMensajes.jsx` - Visualización del registro de mensajes
  - `api.js` - Capa de servicios de API

### Capas de Comunicación
- **P2P Interna**: HTTP REST en puerto 8085 entre nodos
- **Broadcast**: Socket.IO en puerto 3001 para comunicación multicast
- **Frontend-Backend**: HTTP REST hacia cualquier nodo (típicamente nodo 1)

## Requisitos del Sistema

### Prerrequisitos
- Java 17+ (para backend)
- Node.js 18+ (para frontend)
- Maven 3.9+ (para backend)
- npm/yarn (para frontend)

### Instalación y Configuración

#### 1. Configurar Backend

1. Navegar al directorio backend:
   ```bash
   cd backend
   ```

2. Editar `src/main/resources/application.properties` para ajustar:
   - `bully.process-id` - ID del nodo actual (1-5)
   - `bully.peers[*].ip` - IPs reales de la red local
   - `bully.coordinador-inicial` - Coordinador inicial deseado

3. Construir y ejecutar:
   ```bash
   mvn spring-boot:run
   ```
   **Nota**: Requiere sudo para `date -s` (cambios de reloj del sistema)

#### 2. Configurar Frontend

1. Navegar al directorio frontend:
   ```bash
   cd front
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Ejecutar servidor de desarrollo:
   ```bash
   npm run dev -- --host
   ```

4. Acceder en navegador:
   ```
   http://localhost:5173
   ```

#### 3. Iniciar Simulación

1. **Iniciar backend** en una terminal (con sudo si es necesario):
   ```bash
   cd backend && sudo mvn spring-boot:run
   ```

2. **Iniciar frontend** en otra terminal:
   ```bash
   cd front && npm run dev -- --host
   ```

3. **Esperar** a que ambos servicios estén listos (puede tomar unos segundos)

## Comandos del Proyecto

| Comando | Descripción |
|---------|-------------|
| `cd backend && sudo mvn spring-boot:run` | Ejecutar backend |
| `cd front && npm run dev -- --host` | Ejecutar frontend |
| `cd front && npm run build` | Construir frontend para producción |
| `cd front && npm run lint` | Ejecutar linter de frontend |
| `cd front && npm preview` | Previsualizar aplicación construida |

## Componentes Clave

### Backend

#### 1. `BullyApplication.java`
- Punto de entrada para Spring Boot
- Auto-configuración y gestión de beans

#### 2. `BullyService.java` (Lógica Central)
Implementa el algoritmo Bully con:
- `iniciarEleccion()`: Inicia proceso de elección
- `recibirMensaje()`: Maneja mensajes entrantes
- `declararseCoordinador()`: Se declara como coordinador
- Gestión de estado con control de concurrencia
- Registro de historial (últimos 100 mensajes)

#### 3. `BullyController.java` (API REST)
Endpoints disponibles:
- `GET /api/bully/status` - Estado del nodo actual
- `GET /api/bully/peers` - Lista de peers
- `POST /api/bully/message` - Recibir mensaje
- `POST /api/bully/election` - Iniciar elección
- `POST /api/bully/fail` - Simular fallo
- `GET /api/bully/log` - Obtener registro
- `POST /api/bully/reset` - Reiniciar simulación

### Frontend

#### 1. `App.jsx` (Contenedor Principal)
- Gestiona estado global (procesos, mensajes, loading)
- Actualiza estado cada 5 segundos
- Proporciona controles para simulación

#### 2. `ProcesoCard.jsx` (Visualización de Nodo)
- Muestra estado individual (activo/inactivo)
- Resalta coordinador con estilo especial
- Muestra estado de conexión y elección

#### 3. `PanelControl.jsx` (Controles)
- **Simular falla P5**: Desactiva nodo 5
- **Detectar falla (P2)**: Inicia elección tras fallo de nodo 2
- **Refrescar estado**: Actualización manual
- **Reiniciar**: Reinicia toda la simulación

#### 4. `LogMensajes.jsx` (Registro de Auditoría)
- Muestra registro formateado con timestamps
- Colores codificados por tipo de mensaje
- Visualiza flujo y sincronización de mensajes

## Algoritmo Bully

### Proceso de Elección

1. **Nodo candidato** inicia elección enviando mensajes ELECTION a nodos activos con ID mayor
2. **Nodos superiores** responden con OK si están activos
3. **Tiempo de espera**: Si no se recibe OK en timeout (5000ms), candidato se convierte en coordinador
4. **Nuevo coordinador** broadcasta mensaje COORDINATOR a nodos con ID menor
5. **Todos los nodos** actualizan su estado de coordinador

### Manejo de Fallos

- Nodos pueden ser desactivados vía `toggleFail()`
- Coordinador actual se detecta como fallado si se desactiva
- Proceso de elección se reinicia automáticamente
- Vector clocks mantienen ordenamiento causal de mensajes

## Arquitectura de Red

- **Identidad de Nodo**: Derivada de posición en `hospital.nodes.ips` (1-indexada)
- **Detección de IP**: Backend auto-detecta su IP de interfaces de red
- **Comunicación**:
  - **P2P**: HTTP REST en puerto 8085
  - **Broadcast**: Socket.IO en puerto 3001
  - **Frontend**: HTTP REST hacia cualquier nodo (típicamente nodo 1)

## Características Técnicas

### Sincronización de Relojes (Cristian's Algorithm)
- Coordinador envía timestamp real a todos los nodos
- Nodos ajustan reloj del sistema usando `date -s`
- Requiere privilegios root y sistema Linux

### Control de Concurrencia
- `synchronized` métodos en `BullyService`
- `ConcurrentHashMap` para `okRecibidos`
- `CopyOnWriteArrayList` para donantes

### Registro de Mensajes
- `LinkedList` mantiene últimos 100 mensajes
- Sincronizado con `synchronized(bitacora)`
- Formateado para visualización en frontend

## Uso

### Escenario de Simulación Típico

1. **Iniciar todos los nodos** (5 nodos, cada uno en máquina diferente)
2. **Configurar IPs** en `application.properties` según topología de red
3. **Ejecutar backend** en cada nodo (con sudo)
4. **Ejecutar frontend** en máquina separada
5. **Probar escenario**:
   - Simular fallo de nodo 5
   - Iniciar elección desde nodo 2
   - Observar nuevo coordinador
   - Reiniciar simulación

### Flujo de Trabajo Típico

1. **Configurar** IPs y IDs de nodos según infraestructura
2. **Iniciar backend** en cada nodo (5 terminales separadas)
3. **Ejecutar frontend** en navegador
4. **Probar elecciones** usando controles del panel
5. **Analizar logs** para entender comportamiento del algoritmo

## Proyecto Educativo

Este proyecto sirve como ejemplo integral de conceptos de sistemas distribuidos, enfocándose en:

- **Algoritmos distribuidos**: Bully para elección de coordinador
- **Comunicación en red**: HTTP REST y Socket.IO
- **Sincronización de relojes**: Algoritmo de Cristian's
- **Manejo de fallos**: Detección y recuperación
- **Control de concurrencia**: Hilos seguros y atomicidad
- **Visualización**: Interfaz React en tiempo real

Es ideal para laboratorio de sistemas distribuidos o cursos de computación distribuida.
