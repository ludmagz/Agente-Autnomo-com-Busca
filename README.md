# Agente-Autonomo-com-Busca
Projeto da disciplina de Sistemas Inteligentes 2026.2 - Estratégias de busca em um ambiente discreto e observável.

Um agente coleta comidas em um grid gerado aleatoriamente com quatro terrenos (areia, atoleiro, água e obstáculo), usando Largura, Profundidade, Custo Uniforme, Gulosa ou A* (heurística de Manhattan). A busca é animada passo a passo, e depois o agente percorre o caminho encontrado, mais devagar em terrenos de custo mais alto.

## Como executar

Sirva a pasta com um servidor local e abra `index.html` no navegador, por exemplo:

```
python -m http.server
```

e acesse `http://localhost:8000`. A extensão Live Server do VS Code também funciona.

## Controles

| Tecla | Ação |
|---|---|
| `1` / `B` | Busca em Largura |
| `2` / `D` | Busca em Profundidade |
| `3` / `U` | Busca de Custo Uniforme |
| `4` / `G` | Busca Gulosa |
| `5` / `A` | A* |
| `P` | Pausa / retoma a execução (busca e movimento do agente) |
| `+` / `-` | Acelera / desacelera a animação da busca |
| `ESPAÇO` / `R` | Gera um novo mapa |

Depois que o usuário escolhe a busca, o agente e a comida aparecem. Cada vez que o agente coleta uma comida, outra surge e a mesma busca é executada de novo a partir da posição atual do agente. Trocar de tecla durante a execução troca o algoritmo.

## Terrenos

| Terreno | Custo | Velocidade do agente |
|---|---|---|
| Areia | 1 | rápida |
| Atoleiro | 5 | média |
| Água | 10 | lenta |
| Obstáculo | — | intransponível |

## Legenda da busca

- **Círculo escuro**: nó já explorado
- **Contorno amarelo**: nó na fronteira
- **Linha magenta**: caminho final
