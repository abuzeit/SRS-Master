# Proxmox Single Node Test Deployment Guide

This guide covers setting up **Phase 1** — testing the entire SCADA Master infrastructure on a single Proxmox VM.

This includes 3 Kafka brokers (KRaft), the Historian PostgreSQL instance, the Master Consumer, and **3 simulated Producer remote sites**, all running together for validation.

---

### Step 1: Provision a Proxmox VM

Create a single high-performance VM in your Proxmox environment.

#### Recommended VM Specs
*   **CPU:** 8 vCPUs (Kafka and PostgreSQL are CPU intensive)
*   **RAM:** 16 GB minimum (Kafka JVMs need memory)
*   **Disk:** 100 GB SSD/NVMe (Kafka append-only logs write heavily)
*   **OS:** Ubuntu Server 22.04 LTS or Debian 12

---

### Step 2: Install Docker & Docker Compose

SSH into your new VM and install Docker. The official Docker script is the fastest method.

```bash
# 1. Update packages
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker using the official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Add your user to the docker group (so you don't need 'sudo' for every command)
sudo usermod -aG docker $USER

# 4. ACTIVATE THE GROUP CHANGE (Important: Run this, or log out and log back in)
newgrp docker

# 5. Verify installation
docker compose version
```

---

### Step 3: Clone the Repository

Clone the SRS-Master code onto the VM.

```bash
# 1. Install git if not present
sudo apt-get install git -y

# 2. Clone the repository
git clone https://github.com/abuzeit/SRS-Master.git

# 3. Enter the directory
cd SRS-Master
```

---

### Step 4: Configure the Environment

For this single-node test, we run everything off the `docker-compose.test.yml` file. This file uses hardcoded test credentials and variables, so you don't need to configure `.env.master` or `.env.site` yet.

*Note: If you plan to customize the test environment, edit `docker-compose.test.yml` directly.*

---

### Step 5: Start the Test Stack

Bring up the entire testing infrastructure. This will build the Producer and Consumer Docker images natively on your VM using the multi-stage Dockerfiles.

```bash
# 1. Start all services in detached mode
docker compose -f docker-compose.test.yml up -d --build

# This process will take 2-5 minutes as it downloads the Kafka/Postgres images 
# and compiles the TypeScript code for the Producer and Consumer.
```

---

### Step 6: Verify the Deployment

Check that the containers are healthy and that data is flowing from the simulated sites.

#### 1. Check Container Status
Wait ~60 seconds for Kafka to form its quorum and for PostgreSQL to initialize.
```bash
docker compose -f docker-compose.test.yml ps
```
*You should see 10 containers. `srs-kafka-init` should be `exited (0)` (this means it successfully created the topics). The rest should be `Up` or `healthy`.*

#### 2. Verify Producer Sites (Data Generation)
Check the logs of one of the simulated remote sites to ensure it is generating telemetry and writing to its local outbox.
```bash
docker compose -f docker-compose.test.yml logs -f srs-producer-1
```
*(Press `Ctrl+C` to exit logs)*

#### 3. Verify the Master Consumer (Data Ingestion)
Check the consumer logs to see batch processing taking place as data arrives from Kafka.
```bash
docker compose -f docker-compose.test.yml logs -f srs-consumer
```

---

### Step 7: Access the Historian Database (Optional)

You can connect directly to the central Master PostgreSQL database to query the aggregated data.

First, identify your VM's IP address:
```bash
hostname -I
```

Use a database tool (like DBeaver or pgAdmin) on your laptop to connect:
*   **Host:** `[YOUR_VM_IP]`
*   **Port:** `5432`
*   **Database:** `scada_historian`
*   **Username:** `scada`
*   **Password:** `scada-secret-change-me`

Try running a query to see the data arriving from different simulated locations:
```sql
SELECT 
    plant_id, area_id, asset_id, tag_name, value, source_timestamp 
FROM telemetry 
ORDER BY source_timestamp DESC 
LIMIT 50;
```

---

### Step 8: Teardown

When you are finished testing, shut down the stack.

```bash
# Stop containers but keep the data volumes mapped
docker compose -f docker-compose.test.yml down

# OR: Stop containers and WIPE all database/Kafka data
docker compose -f docker-compose.test.yml down -v
```
