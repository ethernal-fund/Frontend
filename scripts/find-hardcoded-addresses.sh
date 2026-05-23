#!/usr/bin/env bash
# find_hardcoded_addresses.sh
# Busca todas las addresses Ethereum hardcodeadas en el frontend.
# Correrlo desde la raíz del proyecto frontend.
#
# Uso:
#   chmod +x find_hardcoded_addresses.sh
#   ./find_hardcoded_addresses.sh
#   ./find_hardcoded_addresses.sh --only-dupes   # solo addresses en 2+ archivos

set -euo pipefail

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

ROOT="."
EXTENSIONS=("ts" "tsx" "js" "jsx" "json" "env" "env.example" "md" "yaml" "yml")
IGNORE_DIRS=("node_modules" ".git" "dist" "build" ".next" "out" "coverage" ".turbo")

ONLY_DUPES=false
[[ "${1:-}" == "--only-dupes" ]] && ONLY_DUPES=true

# Colores
RED='\033[0;31m'
YEL='\033[1;33m'
GRN='\033[0;32m'
CYN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

# =============================================================================
# BUILD GREP ARGS
# =============================================================================

# Armar --include y --exclude-dir para grep
INCLUDE_ARGS=()
for ext in "${EXTENSIONS[@]}"; do
  INCLUDE_ARGS+=("--include=*.${ext}")
done

EXCLUDE_ARGS=()
for dir in "${IGNORE_DIRS[@]}"; do
  EXCLUDE_ARGS+=("--exclude-dir=${dir}")
done

GREP_BASE=(grep -rn --color=never "${EXCLUDE_ARGS[@]}" "${INCLUDE_ARGS[@]}")

# Regex de address Ethereum (40 hex chars después de 0x)
ADDR_REGEX='\b0x[0-9a-fA-F]{40}\b'

# =============================================================================
# SCAN
# =============================================================================

echo "================================================================="
echo "  ADDRESSES ETHEREUM HARDCODEADAS — FRONTEND"
echo "  Root: $(pwd)"
echo "================================================================="

# Todos los hits crudos: "archivo:linea:contenido"
RAW=$("${GREP_BASE[@]}" -P "$ADDR_REGEX" "$ROOT" 2>/dev/null || true)

if [[ -z "$RAW" ]]; then
  echo -e "\n  ${GRN}✅ Ninguna address hardcodeada encontrada.${NC}\n"
  exit 0
fi

# =============================================================================
# FILTRAR EJEMPLOS / MOCKS
# =============================================================================

REAL_HITS=""
EXAMPLE_HITS=""

while IFS= read -r line; do
  line_lower="${line,,}"
  # Zero address o palabras de ejemplo → probable mock
  if echo "$line_lower" | grep -qP \
    'placeholder|dummy|fake|mock|example|todo|fixme|replace|insert|0x0{40}|0xdead'; then
    EXAMPLE_HITS+="$line"$'\n'
  else
    REAL_HITS+="$line"$'\n'
  fi
done <<< "$RAW"

# =============================================================================
# MOSTRAR HITS REALES
# =============================================================================

REAL_COUNT=$(echo -n "$REAL_HITS" | grep -c . || true)
FILE_COUNT=$(echo "$REAL_HITS" | grep -oP '^[^:]+' | sort -u | grep -c . || true)

echo -e "\n${CYN}🔍 ADDRESSES ENCONTRADAS${NC} (${REAL_COUNT} ocurrencias en ${FILE_COUNT} archivos)\n"

if [[ -z "$REAL_HITS" ]]; then
  echo -e "  ${GRN}✅ Ninguna address real encontrada.${NC}"
else
  CURRENT_FILE=""
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    FILE=$(echo "$line" | cut -d: -f1)
    LINENO=$(echo "$line" | cut -d: -f2)
    CONTENT=$(echo "$line" | cut -d: -f3-)

    if [[ "$FILE" != "$CURRENT_FILE" ]]; then
      echo -e "  ${YEL}📄 ${FILE}${NC}"
      CURRENT_FILE="$FILE"
    fi

    # Extraer la address de la línea
    ADDR=$(echo "$CONTENT" | grep -oP '\b0x[0-9a-fA-F]{40}\b' | head -1)
    echo -e "  ${DIM}  ${LINENO} │${NC} ${RED}${ADDR}${NC}"
    echo -e "  ${DIM}      │ $(echo "$CONTENT" | sed 's/^[[:space:]]*//' | cut -c1-100)${NC}"
  done <<< "$REAL_HITS"
fi

# =============================================================================
# MOSTRAR EJEMPLOS / MOCKS
# =============================================================================

if [[ -n "$EXAMPLE_HITS" ]]; then
  EX_COUNT=$(echo -n "$EXAMPLE_HITS" | grep -c . || true)
  echo -e "\n${DIM}⚠️  POSIBLES MOCKS / EJEMPLOS (${EX_COUNT} — revisar manualmente)${NC}\n"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    FILE=$(echo "$line" | cut -d: -f1)
    LINENO=$(echo "$line" | cut -d: -f2)
    CONTENT=$(echo "$line" | cut -d: -f3-)
    ADDR=$(echo "$CONTENT" | grep -oP '\b0x[0-9a-fA-F]{40}\b' | head -1)
    echo -e "  ${DIM}${FILE}:${LINENO} │ ${ADDR}${NC}"
  done <<< "$EXAMPLE_HITS"
fi

# =============================================================================
# ÍNDICE DE ADDRESSES ÚNICAS
# =============================================================================

echo -e "\n================================================================="
echo -e "  RESUMEN DE ADDRESSES ÚNICAS"
echo -e "=================================================================\n"

# Extraer todas las addresses del output real
ALL_ADDRS=$(echo "$REAL_HITS" | grep -oP '\b0x[0-9a-fA-F]{40}\b' | tr '[:upper:]' '[:lower:]' | sort | uniq)

DUPES_FOUND=false

while IFS= read -r addr; do
  [[ -z "$addr" ]] && continue
  # Archivos donde aparece esta address (case-insensitive)
  FILES=$(echo "$REAL_HITS" | grep -iP "${addr}" | cut -d: -f1 | sort -u)
  FILE_N=$(echo "$FILES" | grep -c . || true)

  if [[ "$FILE_N" -gt 1 ]]; then
    DUPES_FOUND=true
    echo -e "  🔁 ${RED}${addr}${NC}  ${DIM}(${FILE_N} archivos)${NC}"
    while IFS= read -r f; do
      echo -e "     ${DIM}→ ${f}${NC}"
    done <<< "$FILES"
    echo
  elif [[ "$ONLY_DUPES" == false ]]; then
    SINGLE_FILE=$(echo "$FILES" | head -1)
    SINGLE_LINE=$(echo "$REAL_HITS" | grep -iP "${addr}" | cut -d: -f2 | head -1)
    echo -e "  📌 ${addr}"
    echo -e "     ${DIM}→ ${SINGLE_FILE}:${SINGLE_LINE}${NC}"
  fi
done <<< "$ALL_ADDRS"

if [[ "$ONLY_DUPES" == true && "$DUPES_FOUND" == false ]]; then
  echo -e "  ${GRN}✅ Ninguna address aparece en múltiples archivos.${NC}"
fi

# =============================================================================
# TOTALES
# =============================================================================

UNIQUE_COUNT=$(echo "$ALL_ADDRS" | grep -c . || true)
DUPE_COUNT=$(
  while IFS= read -r addr; do
    [[ -z "$addr" ]] && continue
    N=$(echo "$REAL_HITS" | grep -iP "${addr}" | cut -d: -f1 | sort -u | grep -c . || true)
    [[ "$N" -gt 1 ]] && echo "$addr"
  done <<< "$ALL_ADDRS" | grep -c . || true
)

echo -e "\n================================================================="
printf "  %-35s %s\n" "Archivos con addresses:" "$FILE_COUNT"
printf "  %-35s %s\n" "Addresses únicas encontradas:" "$UNIQUE_COUNT"
printf "  %-35s %s\n" "En múltiples archivos:" "$DUPE_COUNT"
echo "================================================================="

[[ "$REAL_COUNT" -gt 0 ]] && exit 1 || exit 0