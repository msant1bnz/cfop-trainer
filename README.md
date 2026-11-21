# CFOP Trainer

App personal (PWA para iPhone) para aprender y practicar CFOP en el cubo 3x3.

- Abrir: https://msant1bnz.github.io/cfop-trainer/ → Safari › Compartir › Agregar a pantalla de inicio.
- Orientación de armado: amarillo arriba, verde al frente (cruz blanca abajo).

## Qué trae
- Notación con cubo 3D y práctica.
- Cross: entrenador con inspección, tiempo y solución más corta (BFS sobre las 4 aristas blancas).
- F2L (41), OLL en 2 pasos (10), PLL en 2 pasos (6), OLL completo (57) y PLL completo (21): fichas con animación paso a paso y entrenador con repetición espaciada.
- Cronómetro con +2/DNF, promedios de 5 y 12 e historial. Respaldo JSON y exportación CSV.

## Código
- `src/logic.js`: lógica pura (cubo, cruz, diagramas, repetición espaciada). Pruebas: `node tests/logic.test.js`.
- `src/cases.js`: casos generados y verificados con `node tools/gen_cases.js` (cada algoritmo se comprueba con el simulador).
- `src/cube3d.js`, `src/cases-ui.js`, `src/ui.js`, `src/styles.css`, `src/template.html`.
- `python3 build.py` arma `index.html`, `manifest.webmanifest`, `sw.js` y los íconos en la raíz.
