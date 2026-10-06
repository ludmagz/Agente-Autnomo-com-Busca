# Documentação do código — Agente Autônomo com Busca

Este documento explica cada arquivo do repositório, seção por seção, e mostra como cada parte participa da busca: definir o problema, expandir nós, desenhar a busca, seguir o caminho e coletar a comida.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [index.html — ponto de entrada](#2-indexhtml--ponto-de-entrada)
3. [Cell.js — a célula do grid](#3-celljs--a-célula-do-grid)
4. [Map.js — terrenos, mapa e legenda](#4-mapjs--terrenos-mapa-e-legenda)
5. [Agent.js — o agente](#5-agentjs--o-agente)
6. [Food.js — a comida](#6-foodjs--a-comida)
7. [PriorityQueue.js — fila de prioridade](#7-priorityqueuejs--fila-de-prioridade)
8. [Search.js — as estratégias de busca](#8-searchjs--as-estratégias-de-busca)
9. [Sketch.js — o orquestrador](#9-sketchjs--o-orquestrador)
10. [Ciclo de vida de um frame](#10-ciclo-de-vida-de-um-frame)
11. [Comparativo das buscas](#11-comparativo-das-buscas)
12. [Do enunciado ao código](#12-do-enunciado-ao-código)

---

## 1. Visão geral

O projeto usa **p5.js**. A biblioteca chama `setup()` uma vez e `draw()` cerca de 60 vezes por segundo. Não há etapa de build: os arquivos `.js` são carregados em ordem pelo `index.html` e as classes ficam globais.

Cada arquivo tem um papel na formulação do problema de busca:

| Conceito de busca | Onde está |
|---|---|
| **Espaço de estados** (cada estado é uma célula do grid) | `Cell.js` e `MapGrid.grid` em `Map.js` |
| **Função sucessora** (para quais células dá para ir) | `MapGrid.neighbors()` em `Map.js` |
| **Custo de passo** | `TERRAIN[...].cost` em `Map.js` |
| **Estado inicial** | Célula do agente (`Agent.js`), passada em `startSearch()` no `Sketch.js` |
| **Estado objetivo** | Célula da comida (`Food.js`), passada em `startSearch()` |
| **Heurística** | `manhattan()` em `Search.js` |
| **Estratégias** (BFS, DFS, UCS, Gulosa, A*) | Classes em `Search.js` |
| **Fronteira ordenada por prioridade** | `MinHeap` em `PriorityQueue.js` |
| **Execução do plano** (andar pelo caminho) | `Agent.update()` em `Agent.js` |
| **Ciclo do agente e animação** | Máquina de estados em `Sketch.js` |

Fluxo geral:

```
 [ESPAÇO/R] ──► gera mapa ──► aguarda escolha (1–5)
                                   │
                                   ▼
                    agente e comida aparecem
                                   │
                                   ▼
       ┌──────────► BUSCANDO: search.step() a cada frame (animado)
       │                           │
       │              achou? ──não──► SEM CAMINHO (aviso)
       │                           │ sim
       │                           ▼
       │           MOVENDO: agent.update() segue search.path
       │                           │
       │                 chegou na comida
       │                           ▼
       └──── coleta: foodCount++, nova comida, nova busca
```

---

## 2. `index.html` — ponto de entrada

| Seção | O que faz |
|---|---|
| `<script src=".../p5.min.js">` | Carrega a p5.js 1.9.0 do CDN. Ela fornece `createCanvas`, `fill`, `rect`, `random`, `noise` etc. |
| Scripts das classes | Carrega `Cell.js`, `Map.js`, `Agent.js`, `Food.js`, `PriorityQueue.js` e `Search.js`, **nesta ordem**. |
| `<script src="Sketch.js">` | Carrega o orquestrador por último, porque ele usa todas as classes acima. |

**Papel na busca:** a ordem importa. `PriorityQueue.js` precisa vir antes de `Search.js`, porque `BestFirstSearch` cria um `MinHeap`. `Search.js` precisa vir antes de `Sketch.js`, porque `SEARCH_KEYS` referencia as classes de busca.

---

## 3. `Cell.js` — a célula do grid

```js
class Cell {
  constructor(col, row, terrainType) { ... }
  show(cellSize) { ... }
}
```

| Seção | O que faz |
|---|---|
| `constructor(col, row, terrainType)` | Guarda a posição (coluna e linha) e o tipo de terreno (um dos objetos de `TERRAIN`). |
| `show(cellSize)` | Desenha um quadrado na cor do terreno, com borda cinza-clara. |

**Papel na busca:** cada `Cell` é **um estado** do problema. As buscas trabalham com as próprias instâncias de `Cell` (e não com cópias), então elas servem de chave nos `Set` e `Map` (`closed`, `cameFrom`, `costSoFar`). O custo de entrar em uma célula é `cell.terrain.cost`.

---

## 4. `Map.js` — terrenos, mapa e legenda

### 4.1 Constante `TERRAIN`

```js
LOW:      { cost: 1,        speed: 0.12  }  // Areia
MEDIUM:   { cost: 5,        speed: 0.045 }  // Atoleiro
HIGH:     { cost: 10,       speed: 0.02  }  // Água
OBSTACLE: { cost: Infinity, speed: 0     }  // Obstáculo
```

Cada terreno define:
- `cost`: custo de **entrar** na célula. É o custo de passo usado por UCS, Gulosa (no cálculo de `g`) e A*, e também no custo final do caminho.
- `speed`: fração de célula que o agente anda **por frame** sobre esse terreno. A ~60 fps, atravessar uma célula leva ~8 frames na areia, ~22 no atoleiro e 50 na água.
- `name` e `color`: usados no desenho e na legenda.

**Papel na busca:** `cost` define o problema de custo (o que torna UCS e A* diferentes da BFS). `speed` define a execução do plano (requisito de velocidade diferente por terreno).

### 4.2 `MapGrid.constructor` e `generateMap()`

Cria a matriz `grid[row][col]` de `Cell`. A geração segue esta ordem:

1. Começa com tudo areia (`LOW`).
2. Sorteia obstáculos em **12–20%** das células, espalhados de forma aleatória, sem ruído, para não formar paredes contínuas.
3. Sorteia atoleiro em **10–20%** e água em **10–20%**, em manchas geradas por ruído de Perlin.
4. O que sobra (≥ 40%) continua areia.

**Papel na busca:** gera um **espaço de estados novo a cada execução**, como pede o enunciado. As manchas de água e atoleiro criam regiões caras, o que faz UCS e A* contornarem essas áreas, enquanto BFS e DFS as atravessam.

### 4.3 `placeTerrain(types, terrain, scale, fraction)`

Para as células ainda livres (areia), calcula um valor: `noise(...)` se houver `scale`, ou `random()` se `scale === null`. Depois ordena os valores do maior para o menor e converte as primeiras `fraction × total` células para o terreno pedido. Assim a proporção é exata e o ruído ainda forma "ilhas".

### 4.4 `randomFreeCell()`

Retorna uma célula aleatória que não é obstáculo.

**Papel na busca:** sorteia o **estado inicial** (agente) e o **estado objetivo** (comida) em posições válidas. Pode acontecer de a comida cair em uma área isolada; nesse caso a busca termina sem caminho e o programa mostra o aviso "Comida inalcançável".

### 4.5 `neighbors(col, row)`

Retorna as células vizinhas nas **4 direções**, na ordem cima, direita, baixo, esquerda, ignorando as que saem do grid e os obstáculos.

**Papel na busca:** é a **função sucessora**. Todas as estratégias chamam `neighbors()` ao expandir um nó. A vizinhança de 4 direções é o motivo de a distância de Manhattan ser a heurística adequada. A ordem dos vizinhos afeta a forma da DFS (ver 8.5).

### 4.6 `show()` e `drawLegend()`

`show()` desenha todas as células e chama `drawLegend()`, que monta abaixo do mapa:
- **Linha 1:** os 4 terrenos, com cor, nome e custo.
- **Linha 2:** as 3 marcações da busca (`SEARCH_MARKS.VISITED`, `FRONTIER` e `PATH`), desenhadas com o mesmo código usado no mapa.

**Papel na busca:** a legenda usa as próprias funções de desenho de `SEARCH_MARKS`, então ela é sempre igual ao que aparece no grid.

---

## 5. `Agent.js` — o agente

| Seção | O que faz |
|---|---|
| `constructor(col, row, cellSize)` | Guarda a célula lógica (`col`, `row`) e a posição em pixels (`x`, `y`) no centro dela. Começa com `path` vazio. |
| `get moving` | `true` enquanto ainda há células do caminho para percorrer. |
| `followPath(path)` | Recebe o caminho da busca. `path[0]` é a célula atual, então o agente começa indo para `path[1]`. |
| `stop()` | Cancela o caminho e volta o agente ao centro da última célula alcançada. É chamado no início de toda busca. |
| `update(mapGrid)` | Avança um frame (detalhado abaixo). |
| `show()` | Desenha o círculo preto na posição em pixels `(x, y)`. |

**Detalhe de `update()`:**

1. O alvo é o centro de `path[pathIndex]`.
2. Descobre **em qual célula o agente está agora**, pela posição em pixels, e usa `speed` do terreno dela. Na primeira metade do trajeto vale a velocidade da célula de origem; na segunda, a da célula de destino.
3. Se a distância até o alvo é menor que o passo, o agente chega: `col` e `row` passam a ser os do alvo e `pathIndex` avança. Senão, anda `speed` na direção do alvo.

**Papel na busca:** o agente é o **estado inicial** de cada busca (`agent.col` e `agent.row` em `startSearch()`) e o **executor do plano** encontrado. A velocidade por terreno atende ao passo 8 do enunciado.

---

## 6. `Food.js` — a comida

| Seção | O que faz |
|---|---|
| `constructor(col, row)` | Guarda a célula da comida. |
| `show(cellSize)` | Desenha um círculo vermelho no centro da célula. |

**Papel na busca:** a comida define o **estado objetivo** (passo 5 do enunciado: o agente percebe a comida e define a posição dela como objetivo). Em `startSearch()`, `goal = mapGrid.grid[food.row][food.col]`.

---

## 7. `PriorityQueue.js` — fila de prioridade

`MinHeap` é um heap binário de mínimo. Cada item guarda `{ value, priority, tie, order }`.

| Seção | O que faz |
|---|---|
| `constructor()` | Cria o array de itens e um contador de inserção. |
| `get size` | Quantidade de itens. |
| `push(value, priority, tie)` | Insere o item e o sobe até a posição correta (`siftUp`), em O(log n). |
| `pop()` | Remove e retorna o item de **menor prioridade**: coloca o último no topo e o desce (`siftDown`), em O(log n). |
| `values()` | Lista os valores guardados. É usada para desenhar a fronteira. |
| `less(a, b)` | Ordem de comparação: 1º `priority`; 2º `tie` (menor primeiro); 3º `order` (quem entrou primeiro sai primeiro). |
| `siftUp` / `siftDown` | Mantêm a propriedade de heap. |

**Papel na busca:** é a **fronteira** de UCS, Gulosa e A*. Para essas buscas, o `tie` recebe o valor da heurística `h`. Em um empate de prioridade, sai primeiro o nó mais perto da comida, o que deixa o A* visualmente "apontado" para o objetivo. O `order` deixa a animação estável (sem empates resolvidos ao acaso).

---

## 8. `Search.js` — as estratégias de busca

Todas as buscas funcionam **um passo por vez**: cada chamada de `step()` expande **um** nó. É isso que permite animar a busca frame a frame.

### 8.1 `SEARCH_MARKS` — marcações visuais

| Marca | Desenho | Significado |
|---|---|---|
| `VISITED` ("Explorada") | Círculo escuro no centro | Nó já **expandido** (retirado da fronteira e com sucessores gerados) |
| `FRONTIER` ("Fronteira") | Contorno amarelo com borda preta | Nó **gerado**, esperando ser expandido |
| `PATH` ("Caminho final") | Linha magenta | Caminho da solução, do agente até a comida |

As marcas não cobrem a cor do terreno, então dá para ver ao mesmo tempo o estado da busca e o tipo de terreno.

### 8.2 `manhattan(a, b)`

```js
(|a.col − b.col| + |a.row − b.row|) × TERRAIN.LOW.cost
```

É a heurística `h(n)` exigida pelo enunciado. Ela é **admissível** porque cada movimento custa pelo menos `TERRAIN.LOW.cost` (= 1) e, com 4 direções, são necessários pelo menos `|Δcol| + |Δrow|` movimentos. Ela também é **consistente**, então o A* com lista de fechados encontra o caminho de menor custo.

### 8.3 `GridSearch` — classe base

Guarda o estado comum a todas as buscas:

| Atributo | Significado |
|---|---|
| `start`, `goal` | Estado inicial e estado objetivo. |
| `closed` (`Set`) | Nós já expandidos, para não expandir duas vezes. |
| `expanded` (array) | Mesmos nós, na ordem de expansão. É o que se desenha como VISITED. |
| `cameFrom` (`Map`) | Ponteiro para o pai de cada nó, usado para reconstruir o caminho. |
| `current` | Último nó expandido. |
| `done`, `found` | Se a busca terminou e se encontrou a comida. |
| `path` | Caminho final (array de `Cell`, do início ao objetivo). |

| Método | Ação na busca |
|---|---|
| `get name` | Nome exibido no painel abaixo do mapa. |
| `frontierCells()` | Conteúdo bruto da fronteira. Cada subclasse devolve a sua estrutura (fila, pilha ou heap). |
| `visibleFrontier()` | Fronteira **real**: células únicas que ainda não foram expandidas. Remove duplicatas da pilha da DFS e entradas antigas do heap. É usada no desenho e no contador `Fronteira:` do painel. |
| `expand(cell)` | **Expande** um nó: marca como fechado, adiciona a `expanded` e faz o **teste de objetivo**. Se for a comida, monta o caminho e encerra com sucesso. O teste é feito **na expansão, e não na geração**, o que garante a otimalidade de UCS e A*. |
| `fail()` | Encerra sem solução (fronteira vazia). |
| `buildPath()` | Segue `cameFrom` da comida até o agente e inverte a lista. |
| `pathCost()` | Soma `terrain.cost` de cada célula do caminho, exceto a inicial (o agente não paga pela célula onde já está). |
| `show(cellSize)` | Desenha VISITED para cada nó expandido, FRONTIER para cada nó da fronteira real e, se encontrou, o caminho como uma linha que liga os centros das células. |

### 8.4 `BreadthFirstSearch` — Busca em Largura

- **Fronteira:** array usado como **fila FIFO** (`push` no fim, `shift` no início).
- **`discovered`:** células já colocadas na fila. Uma célula entra na fila uma única vez.
- **`step()`:** se a fila está vazia, chama `fail()`. Senão, retira a primeira célula e chama `expand()`. Para cada vizinho ainda não descoberto, marca como descoberto, registra o pai e coloca no fim da fila.

**Comportamento:** expande em "camadas" de mesma distância em passos, formando um losango ao redor do agente. **Ignora o custo do terreno.** Encontra o caminho com **menor número de passos**, que não é necessariamente o mais barato.

### 8.5 `DepthFirstSearch` — Busca em Profundidade

- **Fronteira:** array usado como **pilha LIFO** (`push` e `pop` no fim).
- **`step()`:** retira o topo da pilha, descartando células já expandidas. A mesma célula pode ter sido empilhada por mais de um vizinho. Depois chama `expand()` e empilha os vizinhos ainda não expandidos, atualizando o pai deles para o nó atual.
- O pai é sobrescrito a cada novo empilhamento. Isso é coerente com a pilha: a cópia que sai primeiro é sempre a empilhada por último, cujo pai é exatamente o último registrado.

**Comportamento:** como os vizinhos são empilhados na ordem cima, direita, baixo, esquerda, o último empilhado (esquerda) é o primeiro a sair. A exploração forma uma "cobra" que avança em uma direção até ficar sem saída e então volta. **Não é ótima** e costuma gerar caminhos longos e caros.

### 8.6 `BestFirstSearch` — base das buscas com prioridade

Base comum de UCS, Gulosa e A*. As subclasses só mudam **como a prioridade é calculada**.

| Seção | Ação na busca |
|---|---|
| `constructor` | Cria `costSoFar` (o `g(n)`, custo acumulado desde o início, com `g(início) = 0`) e um `MinHeap` como fronteira, já com o nó inicial. |
| `get updatesCost` | Se `true`, um nó já descoberto volta para a fronteira quando se encontra um caminho mais barato até ele (UCS e A*). Se `false`, isso não acontece (Gulosa). |
| `priority(cell, g)` | Prioridade do nó no heap. O padrão é `g` (UCS). |
| `heuristic(cell)` | `h(n) = manhattan(cell, goal)`. |
| `push(cell, g)` | Coloca na fronteira com `priority(cell, g)`, usando `h` para desempate. |
| `frontierCells()` | Conteúdo do heap. |
| `step()` | Ver abaixo. |

**`step()` passo a passo:**

1. Retira do heap o nó de **menor prioridade**. Entradas de nós já expandidos são descartadas ("remoção preguiçosa": em vez de atualizar a prioridade dentro do heap, insere-se uma entrada nova e a antiga é ignorada quando sair).
2. Se o heap ficou vazio, chama `fail()`.
3. Chama `expand(nó)`, que faz o teste de objetivo.
4. Para cada vizinho não expandido, calcula `novoG = g(atual) + vizinho.terrain.cost`. Se o vizinho é novo, ou se `updatesCost` está ativo e `novoG` é menor que o custo conhecido, atualiza `costSoFar` e o pai e coloca o vizinho no heap.

### 8.7 `UniformCostSearch` — Custo Uniforme

- **Prioridade:** `g(n)`, o custo acumulado.
- **Comportamento:** a expansão avança como uma "mancha de óleo" que se espalha rápido pela areia (barata) e devagar em água e atoleiro. Encontra o caminho de **menor custo**.

### 8.8 `GreedySearch` — Busca Gulosa

- **Prioridade:** `h(n)`, a distância de Manhattan até a comida, sem considerar o custo já gasto.
- **`updatesCost = false`:** depois de descoberto, o nó nunca é reavaliado. É o comportamento clássico da busca gulosa.
- **Comportamento:** vai quase em linha reta até a comida e expande **poucos nós**, mas pode atravessar água e atoleiro. **Não é ótima.**

### 8.9 `AStarSearch` — A*

- **Prioridade:** `f(n) = g(n) + h(n)`.
- **Comportamento:** a expansão fica alongada na direção da comida. Expande bem menos nós que o UCS e chega ao **mesmo custo ótimo**, porque Manhattan é admissível e consistente.

---

## 9. `Sketch.js` — o orquestrador

### 9.1 Constantes

| Constante | Significado |
|---|---|
| `COLS`, `ROWS`, `CELL_SIZE` | Grid de 32×20 células de 25 px. |
| `HUD_HEIGHT` | Altura da área de legenda e painel abaixo do mapa (120 px). |
| `SEARCH_SPEEDS` | Níveis de velocidade da animação, em **nós expandidos por frame**: 0,25 a 16. |
| `SEARCH_KEYS` | Liga cada tecla à classe de busca: `1`/`B` → BFS, `2`/`D` → DFS, `3`/`U` → UCS, `4`/`G` → Gulosa, `5`/`A` → A*. |
| `STATE` | Estados do programa: `WAITING`, `SEARCHING`, `MOVING` e `NO_PATH`. |

### 9.2 Variáveis globais

| Variável | Significado |
|---|---|
| `mapGrid` | O mapa atual. |
| `agent`, `food` | Agente e comida. Ficam `null` até o usuário escolher a busca. |
| `search` | A busca atual (instância de uma classe de `Search.js`). |
| `selectedSearch` | **Classe** da busca escolhida. É reutilizada automaticamente a cada nova comida. |
| `state` | Estado atual da máquina de estados. |
| `foodCount` | Comidas coletadas. |
| `stepBudget` | Acumulador de passos fracionários da animação. |
| `speedIndex` | Índice atual em `SEARCH_SPEEDS` (padrão: 2 nós por frame). |
| `paused` | Se a execução está pausada (tecla `P`). |

### 9.3 `setup()`

Cria o canvas (mapa mais a área de legenda e painel), gera o primeiro mapa e chama `resetWorld()`.

### 9.4 `draw()` — chamado a cada frame

1. Limpa a tela e desenha o mapa e a legenda.
2. Se não estiver pausado, chama `updateWorld()`.
3. Desenha as marcações da busca, a comida e o agente, **nesta ordem**, para o agente ficar por cima de tudo.
4. Desenha o painel abaixo do mapa.
5. Desenha as mensagens sobre o mapa: a caixa de escolha, o aviso de sem caminho e o selo de pausa.

### 9.5 `updateWorld()` — a máquina de estados

- **`SEARCHING`:** soma `SEARCH_SPEEDS[speedIndex]` ao `stepBudget` e executa `search.step()` enquanto houver pelo menos 1 passo inteiro acumulado. Com velocidade 0,25, por exemplo, um nó é expandido a cada 4 frames. Isso produz a **animação frame a frame**. Quando a busca termina:
  - se encontrou, chama `agent.followPath(search.path)` e passa para `MOVING`;
  - se não encontrou, passa para `NO_PATH`.
- **`MOVING`:** chama `agent.update(mapGrid)`. Quando a célula do agente é igual à da comida (a **colisão**), chama `collectFood()`.

### 9.6 `resetWorld()`

Volta ao passo 1: remove agente, comida e busca, zera o contador e a pausa e entra em `WAITING`.

### 9.7 `spawnAgent()` e `spawnFood()`

Colocam o agente e a comida em células aleatórias que não sejam obstáculo, usando `randomFreeCell()`. A comida nunca nasce na mesma célula do agente.

### 9.8 `startSearch(SearchType)`

1. Guarda a classe escolhida em `selectedSearch`.
2. Se é a primeira busca do mapa, cria o agente e a comida (passos 3 e 4).
3. Para o agente (`agent.stop()`).
4. Define `start` como a célula do agente e `goal` como a célula da comida, e cria a busca: `new SearchType(mapGrid, start, goal)` (passos 5 e 6).
5. Zera `stepBudget`, despausa e entra em `SEARCHING`.

Trocar de tecla durante a execução reinicia a busca a partir da posição atual do agente, para a mesma comida. Isso permite comparar estratégias.

### 9.9 `collectFood()`

Passos 9 e 10: soma 1 a `foodCount`, gera uma nova comida e chama `startSearch(selectedSearch)` a partir de onde o agente está.

### 9.10 `drawHud()`

Monta o painel abaixo do mapa:
- **Comidas coletadas**, à direita da linha de marcações.
- **Linha de status:** busca ativa, estado (ou "Pausado (...)"), nós expandidos, tamanho da fronteira real, passos e custo do caminho (quando encontrado) e velocidade da animação.
- **Linha de atalhos.**

**Papel na busca:** os números do painel permitem comparar as estratégias no mesmo mapa. Por exemplo, UCS e A* têm o mesmo custo, mas o A* expande menos nós.

### 9.11 Mensagens sobre o mapa

| Função | Quando aparece |
|---|---|
| `showMessageBox(title, subtitle, color)` | Função usada pelas mensagens abaixo para desenhar uma caixa centralizada. |
| `showChoicePrompt()` | No estado `WAITING`: "Escolha a estratégia de busca". |
| `showNoPathWarning()` | No estado `NO_PATH`: "Comida inalcançável". |
| `showPausedBadge()` | Com `paused` ativo: selo "❚❚ PAUSADO" no canto superior direito. |

### 9.12 `keyPressed()`

| Tecla | Ação |
|---|---|
| `ESPAÇO` / `R` | Gera um novo mapa e chama `resetWorld()`. |
| `P` | Pausa ou retoma (só depois que a execução começou). |
| `+` / `=` | Aumenta a velocidade da animação. |
| `-` / `_` | Diminui a velocidade da animação. |
| `1`–`5`, `B` `D` `U` `G` `A` | `startSearch()` com a classe correspondente. |

---

## 10. Ciclo de vida de um frame

Exemplo: A* com velocidade 1 nó por frame, no meio da busca.

```
draw()
 ├─ mapGrid.show()               → pinta terrenos e legenda
 ├─ updateWorld()
 │   └─ state = SEARCHING
 │       ├─ stepBudget += 1
 │       └─ search.step()        → AStarSearch (herdado de BestFirstSearch)
 │           ├─ frontier.pop()   → nó com menor g + h
 │           ├─ expand(nó)       → closed/expanded; é a comida? 
 │           └─ para cada vizinho em mapGrid.neighbors():
 │                novoG = g + vizinho.terrain.cost
 │                se melhor → costSoFar, cameFrom, frontier.push(f = novoG + h)
 ├─ search.show()                → círculos (visitados), contornos (fronteira), linha (caminho)
 ├─ food.show(), agent.show()
 └─ drawHud()                    → "Expandidos: 87 | Fronteira: 23 | ..."
```

Quando `expand()` encontra a comida, `search.done` vira `true`. No mesmo frame, `updateWorld()` passa o caminho ao agente. A partir do frame seguinte, o estado é `MOVING` e cada frame chama `agent.update()` em vez de `search.step()`.

---

## 11. Comparativo das buscas

| Busca | Estrutura da fronteira | Prioridade | Considera custo do terreno? | Usa heurística? | Ótima em custo? | Completa? |
|---|---|---|---|---|---|---|
| **BFS** | Fila (FIFO) | Ordem de chegada | Não | Não | Não (ótima em nº de passos) | Sim |
| **DFS** | Pilha (LIFO) | Último a chegar | Não | Não | Não | Sim (grid finito e lista de fechados) |
| **Custo Uniforme** | `MinHeap` | `g(n)` | Sim | Não | **Sim** | Sim |
| **Gulosa** | `MinHeap` | `h(n)` | Não (só usa `g` para o custo final) | Sim (Manhattan) | Não | Sim (grid finito e lista de fechados) |
| **A\*** | `MinHeap` | `g(n) + h(n)` | Sim | Sim (Manhattan) | **Sim** | Sim |

---

## 12. Do enunciado ao código

| Passo do enunciado | Implementação |
|---|---|
| 1. Mapa gerado aleatoriamente com 4 terrenos | `MapGrid.generateMap()` (`Map.js`) |
| 2. Usuário escolhe a busca | `keyPressed()` → `SEARCH_KEYS` (`Sketch.js`) |
| 3. Agente em posição aleatória, fora de obstáculo | `spawnAgent()` → `randomFreeCell()` |
| 4. Comida em posição aleatória, fora de obstáculo | `spawnFood()` → `randomFreeCell()` |
| 5. Posição da comida como estado objetivo | `goal = mapGrid.grid[food.row][food.col]` em `startSearch()` |
| 6. Posição atual como estado inicial | `start = mapGrid.grid[agent.row][agent.col]` em `startSearch()` |
| 7. Resultado da busca define o caminho | `GridSearch.buildPath()` → `search.path` |
| 8. Deslocamento com velocidade por terreno | `Agent.update()` com `TERRAIN[...].speed` |
| 9. Colisão: comida desaparece e é contabilizada | Teste de célula em `updateWorld()` → `collectFood()` |
| 10. Volta ao passo 4 | `collectFood()` → `spawnFood()` + `startSearch(selectedSearch)` |
| Mostrar visitados, fronteira e caminho | `SEARCH_MARKS` + `GridSearch.show()` |
| Animação passo a passo | `step()` expande um nó; `stepBudget` controla quantos por frame |
| Novo mapa ao reiniciar | `MapGrid` é recriado no `setup()` (F5); `ESPAÇO`/`R` chamam `generateMap()` |
| Heurística Manhattan | `manhattan()` em `Search.js` |
