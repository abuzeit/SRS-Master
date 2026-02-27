#!/bin/bash
# =============================================================================
# SRS Master — TLS Certificate Generation Script
# =============================================================================
#
# Generates a complete TLS PKI for the Kafka cluster:
#
#   1. Root CA (self-signed)
#   2. Broker certificates (one per broker, signed by CA)
#   3. Client certificates (for producers and consumers)
#
# Output directory: ./certs/
#
# WARNING: These are SELF-SIGNED certificates for development and internal use.
#          Production deployments should use an enterprise PKI or trusted CA.
#
# Usage:
#   ./generate-certs.sh
# =============================================================================

set -euo pipefail

CERT_DIR="$(dirname "$0")/../certs"
CA_VALIDITY=3650    # 10 years for CA
CERT_VALIDITY=365   # 1 year for broker/client certs
KEY_SIZE=4096
CA_PASSWORD="ca-secret"
KEYSTORE_PASSWORD="keystore-secret"

mkdir -p "${CERT_DIR}"
cd "${CERT_DIR}"

echo "=== Generating TLS Certificates ==="
echo "Output directory: $(pwd)"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Root Certificate Authority (CA)
# ---------------------------------------------------------------------------

echo "[1/4] Generating Root CA..."

openssl req -new -x509 \
  -keyout ca-key.pem \
  -out ca-cert.pem \
  -days ${CA_VALIDITY} \
  -passout pass:${CA_PASSWORD} \
  -subj "/C=US/ST=Industrial/L=Plant/O=SRS-SCADA/OU=Security/CN=SRS-Root-CA"

echo "Root CA generated: ca-cert.pem, ca-key.pem"

# ---------------------------------------------------------------------------
# Step 2: Broker Certificates (one per broker)
# ---------------------------------------------------------------------------

echo "[2/4] Generating broker certificates..."

for BROKER_ID in 1 2 3; do
  BROKER_NAME="kafka-${BROKER_ID}"
  echo "  Generating certificate for ${BROKER_NAME}..."

  # Generate private key
  openssl genrsa -out "${BROKER_NAME}-key.pem" ${KEY_SIZE}

  # Generate CSR
  openssl req -new \
    -key "${BROKER_NAME}-key.pem" \
    -out "${BROKER_NAME}.csr" \
    -subj "/C=US/ST=Industrial/L=Plant/O=SRS-SCADA/OU=Kafka/CN=${BROKER_NAME}"

  # Create SAN extension file (important for hostname verification)
  cat > "${BROKER_NAME}-san.cnf" <<EOF
[v3_req]
subjectAltName = DNS:${BROKER_NAME},DNS:localhost,IP:127.0.0.1
EOF

  # Sign with CA
  openssl x509 -req \
    -in "${BROKER_NAME}.csr" \
    -CA ca-cert.pem \
    -CAkey ca-key.pem \
    -CAcreateserial \
    -out "${BROKER_NAME}-cert.pem" \
    -days ${CERT_VALIDITY} \
    -passin pass:${CA_PASSWORD} \
    -extensions v3_req \
    -extfile "${BROKER_NAME}-san.cnf"

  # Cleanup CSR and SAN config
  rm -f "${BROKER_NAME}.csr" "${BROKER_NAME}-san.cnf"
  echo "  ${BROKER_NAME}: cert and key generated"
done

# ---------------------------------------------------------------------------
# Step 3: Client Certificates (producer + consumer)
# ---------------------------------------------------------------------------

echo "[3/4] Generating client certificates..."

for CLIENT in producer consumer; do
  echo "  Generating certificate for ${CLIENT}..."

  openssl genrsa -out "${CLIENT}-key.pem" ${KEY_SIZE}

  openssl req -new \
    -key "${CLIENT}-key.pem" \
    -out "${CLIENT}.csr" \
    -subj "/C=US/ST=Industrial/L=Plant/O=SRS-SCADA/OU=Clients/CN=${CLIENT}-user"

  openssl x509 -req \
    -in "${CLIENT}.csr" \
    -CA ca-cert.pem \
    -CAkey ca-key.pem \
    -CAcreateserial \
    -out "${CLIENT}-cert.pem" \
    -days ${CERT_VALIDITY} \
    -passin pass:${CA_PASSWORD}

  rm -f "${CLIENT}.csr"
  echo "  ${CLIENT}: cert and key generated"
done

# ---------------------------------------------------------------------------
# Step 4: Verify and summarize
# ---------------------------------------------------------------------------

echo "[4/4] Verifying certificates..."
echo ""

for CERT in ca-cert.pem kafka-1-cert.pem kafka-2-cert.pem kafka-3-cert.pem producer-cert.pem consumer-cert.pem; do
  echo "  ${CERT}:"
  openssl x509 -in "${CERT}" -noout -subject -dates 2>/dev/null || echo "  VERIFICATION FAILED"
done

echo ""
echo "=== TLS Certificate Generation Complete ==="
echo ""
echo "Files generated in: $(pwd)"
ls -la *.pem
