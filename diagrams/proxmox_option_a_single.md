```mermaid
flowchart TD
    %% Styling
    classDef proxmox fill:#E65100,stroke:#BF360C,stroke-width:2px,color:white;
    classDef kafka fill:#3949AB,stroke:#1A237E,stroke-width:2px,color:white;
    classDef postgres fill:#0277BD,stroke:#01579B,stroke-width:2px,color:white;
    classDef producer fill:#43A047,stroke:#1B5E20,stroke-width:2px,color:white;
    classDef consumer fill:#8E24AA,stroke:#4A148C,stroke-width:2px,color:white;
    classDef network fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px,stroke-dasharray: 5 5;

    subgraph Proxmox["Proxmox Server (Single Node Test)"]
        direction TB

        subgraph MasterStack["Master Station Stack (docker-compose.test.yml)"]
            direction LR
            K1[Kafka Broker 1]:::kafka
            K2[Kafka Broker 2]:::kafka
            K3[Kafka Broker 3]:::kafka
            
            C1[Consumer (Aggregator)]:::consumer
            HDB[(Historian PostgreSQL)]:::postgres

            K1 <--> K2 <--> K3
            C1 -->|Persists Data| HDB
            C1 -->|Consumes| K1
        end

        subgraph Site1["Simulated Site 1"]
            direction LR
            P1[Producer Node 1]:::producer
            ODB1[(Outbox PG 1)]:::postgres
            P1 -->|Writes| ODB1
        end

        subgraph Site2["Simulated Site 2"]
            direction LR
            P2[Producer Node 2]:::producer
            ODB2[(Outbox PG 2)]:::postgres
            P2 -->|Writes| ODB2
        end

        subgraph Site3["Simulated Site 3"]
            direction LR
            P3[Producer Node 3]:::producer
            ODB3[(Outbox PG 3)]:::postgres
            P3 -->|Writes| ODB3
        end

        %% Data Flow
        P1 -->|Publishes (Internal Network)| K1
        P2 -->|Publishes (Internal Network)| K2
        P3 -->|Publishes (Internal Network)| K3
    end

    class Proxmox proxmox;
    class MasterStack,Site1,Site2,Site3 network;
```
