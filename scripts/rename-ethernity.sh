#!/bin/bash
# rename-ethernity.sh

echo "🔄 Renombrando Ethernity → Ethernal..."

# Función para reemplazar en archivos
replace_in_file() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/$1/$2/g" "$3"
  else
    # Linux
    sed -i "s/$1/$2/g" "$3"
  fi
}

# i18n locales
echo "📝 Actualizando traducciones..."
replace_in_file "Ethernity DAO Foundation" "Ethernal" "src/i18n/locales/en.json"
replace_in_file "Ethernity DAO" "Ethernal" "src/i18n/locales/en.json"
replace_in_file "Ethernity" "Ethernal" "src/i18n/locales/en.json"

replace_in_file "Ethernity DAO" "Ethernal" "src/i18n/locales/es.json"
replace_in_file "Ethernity" "Ethernal" "src/i18n/locales/es.json"

replace_in_file "Ethernity DAO" "Ethernal" "src/i18n/locales/de.json"
replace_in_file "Ethernity" "Ethernal" "src/i18n/locales/de.json"

replace_in_file "Ethernity DAO" "Ethernal" "src/i18n/locales/it.json"
replace_in_file "Ethernity" "Ethernal" "src/i18n/locales/it.json"

replace_in_file "Ethernity DAO" "Ethernal" "src/i18n/locales/pt.json"
replace_in_file "Ethernity" "Ethernal" "src/i18n/locales/pt.json"

# Código
echo "💻 Actualizando código..."
replace_in_file "Ethernity DAO" "Ethernal" "src/config/web3.ts"
replace_in_file "Ethernity DAO" "Ethernal" "src/components/layout/Navbar.tsx"
replace_in_file "Ethernity DAO" "Ethernal" "src/components/layout/Footer.tsx"
replace_in_file "Ethernity" "Ethernal" "src/components/layout/Footer.tsx"
replace_in_file "Ethernity DAO" "Ethernal" "src/components/common/LoadingScreen.tsx"
replace_in_file "Ethernity DAO" "Ethernal" "src/main.tsx"

# Hooks
echo "🪝 Actualizando hooks..."
replace_in_file "useEthernityDAO" "useEthernal" "src/hooks/index.ts"

echo "✅ Renombrado completado!"
echo ""
echo "📋 Siguiente paso:"
echo "   1. Renombrar archivo: src/hooks/useEthernityDAO.ts → src/hooks/useEthernal.ts"
echo "   2. Ejecutar: pnpm build"
echo "   3. Verificar: grep -r 'Ethernity' src/"

# Comandos 
# chmod +x scripts/rename-ethernity.sh
# ./scripts/rename-ethernity.sh puede ir sin ./ solo /scripts/rename-ethernity.sh 