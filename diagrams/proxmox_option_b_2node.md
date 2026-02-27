```mermaid
flowchart TD
    %% Styling
    classDef proxmox fill:#E65100,stroke:#BF360C,stroke-width:2px,color:white;
    classDef kafka fill:#3949AB,stroke:#1A237E,stroke-width:2px,color:white;
    classDef postgres fill:#0277BD,stroke:#01579B,stroke-width:2px,color:white;
    classDef producer fill:#43A047,stroke:#1B5E20,stroke-width:2px,color:white;
    classDef consumer fill:#8E24AA,stroke:#4A148C,stroke-width:2px,color:white;
    classDef network fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px,stroke-dasharray: 5 5;
    classDef wan fill:#E0F7FA,stroke:#00ACC1,stroke-width:2px;

    subgraph MasterZone["Master Station (Central Location)"]
        direction LR
        
        subgraph Proxmox1["Proxmox Server 1"]
            direction TB
            K1[Kafka Broker 1]:::kafka
            K2[Kafka Broker 2]:::kafka
            C1[Consumer (Aggregator)]:::consumer
            HDB[(Historian PostgreSQL)]:::postgres
            
            C1 -->|Persists| HDB
            C1 -->|Consumes| K1
        end

        subgraph Proxmox2["Proxmox Server 2"]
            direction TB
            K3[Kafka Broker 3]:::kafka
            C2[Consumer 2 (HA Backup)]:::consumer
        end

        K1 <-.->|KRaft/Internal| K2
        K2 <-.->|KRaft/Internal| K3
        K1 <-.->|KRaft/Internal| K3
    end
    
    WAN((WAN / Secure VPN)):::wan

    subgraph RemoteZones["Remote Sites (1 to 100)"]
        direction LR
        
        subgraph Site1["Remote Site 1 VM"]
            direction TB
            P1[Producer Node 1]:::producer
            ODB1[(Transactional Outbox)]:::postgres
            P1 -->|Writes Atomic| ODB1
        end

        subgraph Site2["Remote Site 2 VM"]
            direction TB
            P2[Producer Node 2]:::producer
            ODB2[(Transactional Outbox)]:::postgres
            P2 -->|Writes Atomic| ODB2
        end
        
        subgraph SiteN["Remote Site N VM"]
            direction TB
            PN[Producer Node N]:::producer
            ODBN[(Transactional Outbox)]:::postgres
            PN -->|Writes Atomic| ODBN
        end
    end

    %% Connections
    MasterZone --- WAN
    WAN --- RemoteZones
    
    %% Semantic flow
    P1 -->|TLS + SASL/SCRAM| K1
    P2 -->|TLS + SASL/SCRAM| K2
    PN -->|TLS + SASL/SCRAM| K3

    class Proxmox1,Proxmox2 proxmox;
    class Site1,Site2,SiteN network;
```
