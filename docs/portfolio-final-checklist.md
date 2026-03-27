# Portfolio Final Checklist

Estado recomendado del repo: `finalizado como v1.0.0`.

## Producto

- calculadora web util y coherente para pre-trade
- validacion de setups LONG y SHORT
- escenarios, historico y exportaciones utilizables
- mini backtester visual suficiente para demo

## Arquitectura

- core compartido de calculo desacoplado del DOM
- CLI headless para generar artifacts deterministas
- boundary hacia QuantLab explicitamente acotado
- runtime C++ alternativo con pruebas de paridad

## Calidad

- CI de contrato y paridad activa
- smoke tests de navegador sobre el flujo principal
- deploy de GitHub Pages alineado con la estructura `web/`
- arranque local simple con `npm run dev`

## Presentacion

- README alineado con la realidad del repo
- descripcion, website y topics configurados en GitHub
- changelog corto para marcar la salida `v1.0.0`

## Opcional despues de cerrar

- crear release/tag `v1.0.0` en GitHub sobre `main`
- añadir captura o GIF en el README
- escoger una licencia si quieres abrirlo mas formalmente
