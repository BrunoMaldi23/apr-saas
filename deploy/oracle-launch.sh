#!/usr/bin/env bash
set -euo pipefail

REGION="${REGION:-us-chicago-1}"
DISPLAY_NAME="${DISPLAY_NAME:-apr}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/apr_oracle.pub}"
OCPUS="${OCPUS:-1}"
MEMORY_GB="${MEMORY_GB:-6}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-100}"
TENANCY="${TENANCY:-$(awk -F= '/^tenancy=/{gsub(/ /,"",$2); print $2; exit}' "$HOME/.oci/config" 2>/dev/null || true)}"

if [[ -z "$TENANCY" ]]; then
  echo "No se pudo leer el tenancy de ~/.oci/config. Pasa TENANCY=ocid1.tenancy..."
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "No existe la llave pública SSH: $SSH_KEY"
  exit 1
fi

oid() {
  local query="$1"
  shift
  oci "$@" --region "$REGION" -r --query "$query" | head -n 1 | tr -d '"'
}

LAST_OUT=""
run_oci() {
  if LAST_OUT=$(oci "$@" --region "$REGION" 2>&1); then
    return 0
  fi
  return 1
}

echo "Región: $REGION | Shape: ${OCPUS} OCPU / ${MEMORY_GB} GB | Tenancy: ${TENANCY:0:40}..."

VCN_ID=$(oid 'data.id' network vcn create \
  --compartment-id "$TENANCY" \
  --display-name 'apr-vcn' \
  --cidr-block '10.0.0.0/16')

IGW_ID=$(oid 'data.id' network internet-gateway create \
  --compartment-id "$TENANCY" \
  --vcn-id "$VCN_ID" \
  --display-name 'apr-igw' \
  --is-enabled true)

SUBNET_ID=$(oid 'data.id' network subnet create \
  --compartment-id "$TENANCY" \
  --vcn-id "$VCN_ID" \
  --display-name 'apr-public' \
  --cidr-block '10.0.1.0/24')

ROUTE_TABLE_ID=$(oid 'data[0].id' network route-table list \
  --compartment-id "$TENANCY" \
  --vcn-id "$VCN_ID")

ROUTE_RULES="[{\"destination\":\"0.0.0.0/0\",\"networkEntityId\":\"$IGW_ID\"}]"
run_oci network route-table update \
  --rt-id "$ROUTE_TABLE_ID" \
  --route-rules "$ROUTE_RULES" \
  --force

IMAGE_ID=$(oid 'data[0].id' compute image list \
  --compartment-id "$TENANCY" \
  --operating-system 'Canonical Ubuntu' \
  --operating-system-version '24.04 Minimal aarch64' \
  --shape 'VM.Standard.A1.Flex' 2>/dev/null || true)

if [[ -z "$IMAGE_ID" ]]; then
  IMAGE_ID=$(oid "data[?contains(display-name,'24.04') && contains(display-name,'aarch64')].id | [0]" \
    compute image list --compartment-id "$TENANCY")
fi

if [[ -z "$IMAGE_ID" ]]; then
  echo "No encontré imagen Ubuntu 24.04 aarch64 en esta región."
  exit 1
fi

mapfile -t ADS < <(oci iam availability-domain list \
  --compartment-id "$TENANCY" \
  --region "$REGION" \
  -r --query 'data[].name' | tr -d '"')

if [[ ${#ADS[@]} -eq 0 ]]; then
  echo "No hay availability domains disponibles."
  exit 1
fi

SHAPE_CONFIG="{\"OCPUs\":${OCPUS},\"MemoryInGBs\":${MEMORY_GB}}"
INSTANCE_ID=""

for ((attempt = 1; attempt <= MAX_ATTEMPTS; attempt++)); do
  for ad in "${ADS[@]}"; do
    echo "Intento ${attempt}/${MAX_ATTEMPTS} - AD: ${ad}"

    if run_oci compute instance launch \
      --compartment-id "$TENANCY" \
      --availability-domain "$ad" \
      --display-name "$DISPLAY_NAME" \
      --shape 'VM.Standard.A1.Flex' \
      --shape-config "$SHAPE_CONFIG" \
      --image-id "$IMAGE_ID" \
      --subnet-id "$SUBNET_ID" \
      --assign-public-ip true \
      --ssh-authorized-keys-file "$SSH_KEY"; then

      INSTANCE_ID=$(printf '%s' "$LAST_OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')
      echo "Instancia creada: $INSTANCE_ID"
      break 2
    fi

    case "$LAST_OUT" in
      *"Out of capacity"*) echo "Sin capacidad en este AD; probando el siguiente." ;;
      *"Too many requests"*) echo "Rate limit; esperando 60 s."; sleep 60 ;;
      *) echo "$LAST_OUT" ;;
    esac
  done

  sleep 30
done

if [[ -z "$INSTANCE_ID" ]]; then
  echo "No se pudo crear la instancia después de ${MAX_ATTEMPTS} intentos."
  exit 1
fi

PUBLIC_IP=$(oid 'data[0].public-ip' compute instance list-vnics --instance-id "$INSTANCE_ID")

echo ""
echo "INSTANCE_ID=$INSTANCE_ID"
echo "IP_PUBLICA=$PUBLIC_IP"
