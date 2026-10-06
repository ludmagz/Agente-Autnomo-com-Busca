# Relatório de Post-mortem — Agente Autônomo com Busca

**Disciplina:** Sistemas Inteligentes — 2026.2
**Projeto:** Agente coletor de comida em grid com estratégias de busca (Largura, Profundidade, Custo Uniforme, Gulosa e A*)
**Integrantes:** Fernando Anjos, Henrique Xavier, Ian Monteiro e Ludmila Magnani

---

## 1. Desafios, erros e aprendizados

### 1.1 Maiores desafios

**1. A linguagem: JavaScript com p5.js, sem experiência prévia do grupo.**
A maior dificuldade inicial foi a linguagem. Escolhemos JavaScript com a biblioteca p5.js porque ela facilita desenhar e animar no navegador, mas nenhum integrante tinha experiência com ela. Isso apareceu de várias formas:
- **Modelo de execução da p5.js.** A biblioteca chama `draw()` cerca de 60 vezes por segundo, e tudo é redesenhado do zero a cada frame. Foi preciso entender que não há "esperar" no meio de um laço. O programa precisa guardar seu estado entre frames e avançar um pouco a cada chamada.
- **Escopo global e ordem dos scripts.** Sem módulos nem etapa de build, todas as classes ficam globais e o `index.html` precisa carregá-las na ordem certa. Um arquivo carregado antes do que ele usa quebra o programa sem uma mensagem clara.
- **Particularidades da linguagem.** Classes e herança (`extends`, `super`, getters), uso de `Set` e `Map` com objetos como chave (comparação por referência, não por valor), cópia de arrays e depuração pelo console do navegador.

**2. Transformar algoritmos de busca em algoritmos animáveis.**
Nos livros e slides, as buscas são um único laço que roda até encontrar o objetivo. Para mostrar a evolução frame a frame, cada busca precisou virar uma classe com um método `step()` que expande **um nó por vez** e guarda tudo entre chamadas: fronteira, visitados, pais e custos. Também foi preciso distinguir com cuidado:
- nó **descoberto** (está na fronteira) de nó **expandido** (já visitado);
- teste de objetivo **na expansão** (necessário para o Custo Uniforme e o A* garantirem o menor custo) de teste **na geração**.

**3. Fila de prioridade.**
JavaScript não tem uma fila de prioridade nativa. Foi preciso implementar um heap binário de mínimo para Custo Uniforme, Gulosa e A*. Também decidimos como lidar com um nó que já está na fronteira quando se encontra um caminho mais barato até ele. A opção foi reinserir o nó e descartar a entrada antiga quando ela sair do heap ("remoção preguiçosa"), e definir critérios de desempate para a animação ficar estável.

**4. Escala de custos e heurística.**
A heurística precisa ser coerente com a escala de custos dos terrenos (areia 1, atoleiro 5, água 10). Se ela superestimar o custo real, o A* deixa de garantir o melhor caminho. Isso exigiu entender o conceito de heurística **admissível**, e não só copiar a fórmula de Manhattan.

**5. Comparar os algoritmos de forma justa.**
Para comparar as estratégias, elas precisam resolver **o mesmo problema**. O programa foi ajustado para que uma nova busca reinicie o agente no mesmo ponto inicial, com o mesmo mapa e a mesma comida. Assim os números do painel (nós expandidos, passos e custo) podem ser comparados diretamente.

**6. Trabalho em paralelo no mesmo código.**
Com quatro pessoas mexendo em arquivos que dependem uns dos outros (as buscas dependem do mapa, a animação depende das buscas), foi necessário combinar interfaces simples entre as partes. Por exemplo: `search.step()`, `search.done`, `search.path`, `agent.followPath(path)` e `mapGrid.neighbors()`.

### 1.2 Erros cometidos (e como foram corrigidos)

| Erro | Efeito | Correção |
|---|---|---|
| Velocidade da DFS configurada como `0.0008` nós por frame | A animação da DFS praticamente não andava (cerca de 1 nó a cada 21 s) | Velocidade revista e ajustada por algoritmo |
| Fronteira da DFS desenhada com duplicatas e nós já explorados | A pilha guardava a mesma célula várias vezes e o desenho marcava como fronteira células já visitadas | Criada a "fronteira visível": só células únicas e ainda não expandidas |
| Lógica de busca duplicada entre as classes | Cada nova busca repetiria construtor, reconstrução do caminho e desenho | Refatoração para uma classe base (`GridSearch`) e outra para as buscas com prioridade (`BestFirstSearch`) |
| Agente sem movimento e sem ciclo de coleta na primeira versão | A busca rodava uma vez e o agente ficava parado | Máquina de estados (aguardando → buscando → movendo → coleta) |
| Primeira versão da regra de aparecimento restringia demais o sorteio da comida | Escondia um caso legítimo do problema (comida inalcançável) | Sorteio voltou a ser em qualquer célula livre, com aviso quando não há caminho |

### 1.3 Aprendizados

- **Os algoritmos se comportam de forma bem diferente na prática.** Nos testes automáticos (499 mapas aleatórios), o Custo Uniforme e o A* sempre encontraram o mesmo custo mínimo. O A* expandiu, em média, cerca de **metade dos nós** do Custo Uniforme. A Gulosa encontrou um caminho mais caro que o ótimo em cerca de **68%** dos mapas, apesar de expandir pouquíssimos nós. A BFS sempre deu o menor número de passos, mas não o menor custo.
- **Visualizar ajuda a entender.** Ver a fronteira "se espalhando" deixou intuitivo o que antes era só teoria: o losango da BFS, a "cobra" da DFS, a mancha irregular do Custo Uniforme contornando a água e o A* apontado para a comida.
- **Heurística é uma decisão de projeto.** Não basta usar uma distância qualquer; ela precisa respeitar a escala de custos para manter o A* ótimo.
- **Estrutura de dados importa.** A diferença entre fila, pilha e fila de prioridade é praticamente tudo o que separa BFS, DFS e as buscas informadas. Com uma boa base, cada estratégia nova virou poucas linhas de código.
- **Ferramentas de IA aceleram, mas não substituem o entendimento.** O assistente de programação ajudou bastante (ver seção 3), mas o grupo precisou entender, revisar e ajustar o código gerado: velocidades, heurística e fluxo de comparação entre algoritmos foram alterados pelo grupo depois.

---

## 2. Divisão do trabalho

| Integrante | Responsabilidade | Principais arquivos |
|---|---|---|
| **Ludmila Magnani** | Estruturação inicial do repositório e construção do mapa: tipos de terreno e seus custos, geração aleatória com ruído de Perlin, sorteio de células livres, vizinhança e legenda | `Map.js`, `Cell.js`, `index.html`, `README.md` |
| **Henrique Xavier** | Confecção do agente (movimento contínuo pelo caminho, com velocidade dependente do terreno) e da comida, além da documentação do projeto | `Agent.js`, `Food.js`, `DOCUMENTACAO.md`, `README.md`, este relatório |
| **Ian** | Implementação da fila de prioridade (heap binário de mínimo, com critérios de desempate), base das buscas Custo Uniforme, Gulosa e A* | `PriorityQueue.js` |
| **Fernando** | Algoritmos de busca (Largura, Profundidade, Custo Uniforme, Gulosa e A*), com foco no entendimento de como cada um se aplica ao problema e na heurística | `Search.js` |

A integração entre as partes no orquestrador (`Sketch.js`), com a máquina de estados, o painel de informações e os controles de teclado, foi feita em conjunto pelo grupo.

---

## 3. Arquitetura e tecnologias

### 3.1 Tecnologias utilizadas

| Tecnologia | Uso no projeto |
|---|---|
| **JavaScript (ES6+)** | Linguagem de todo o projeto: classes, herança, `Set` e `Map` |
| **p5.js 1.9.0** (via CDN) | Desenho no canvas, laço de animação (`setup`/`draw`), teclado, `random()` e ruído de Perlin (`noise()`) |
| **HTML** | Página que carrega a biblioteca e os scripts |
| **Git e GitHub** | Versionamento e colaboração |
| **Visual Studio Code** (com Live Server ou `python -m http.server`) | Edição e execução local |
| **Node.js** | Testes automáticos da lógica das buscas fora do navegador (validação em 499 mapas aleatórios) |
| **Claude (Anthropic), via Claude Code** | Assistente de programação com IA, usado para analisar o repositório, planejar os requisitos que faltavam, gerar e refatorar código, escrever testes de validação e redigir a documentação. Todo o conteúdo gerado foi revisado e ajustado pelo grupo. |

### 3.2 Organização dos arquivos

```
index.html          → carrega p5.js e os scripts na ordem de dependência
├── Cell.js         → uma célula do grid (posição + terreno)
├── Map.js          → TERRAIN (custo, velocidade, cor), geração do mapa, vizinhança, legenda
├── Agent.js        → agente: posição lógica e em pixels, movimento pelo caminho
├── Food.js         → comida (estado objetivo)
├── PriorityQueue.js→ MinHeap (fronteira das buscas com prioridade)
├── Search.js       → estratégias de busca (passo a passo) e marcações visuais
└── Sketch.js       → orquestrador: máquina de estados, painel, teclado
```

### 3.3 Modelagem do problema de busca

| Elemento | Implementação |
|---|---|
| Estado | Uma célula `Cell` do grid de 32×20 |
| Estado inicial | Célula onde o agente aparece |
| Estado objetivo | Célula da comida |
| Ações / função sucessora | Mover nas 4 direções para células sem obstáculo (`MapGrid.neighbors`) |
| Custo de passo | Custo do terreno da célula de destino: areia 1, atoleiro 5, água 10 |
| Heurística | Baseada na distância de Manhattan (vizinhança de 4 direções) |

### 3.4 Hierarquia das buscas

```
GridSearch                      (estado comum, expansão, teste de objetivo,
│                                reconstrução do caminho, custo, desenho)
├── BreadthFirstSearch          fronteira = fila (FIFO)
├── DepthFirstSearch            fronteira = pilha (LIFO)
└── BestFirstSearch             fronteira = MinHeap, custo acumulado g(n)
    ├── UniformCostSearch       prioridade = g(n)
    ├── GreedySearch            prioridade = h(n)
    └── AStarSearch             prioridade = g(n) + h(n)
```

Cada busca expõe `step()`, que expande **um único nó**. Graças à classe base, as três buscas informadas diferem apenas na função de prioridade. É isso que permite a animação frame a frame e mantém o código de cada estratégia curto e fácil de comparar com a teoria.

A visualização usa três marcações sobrepostas ao terreno, sem esconder a cor dele:
- **círculo escuro:** nó visitado (expandido);
- **contorno amarelo:** nó na fronteira;
- **linha magenta:** caminho final.

### 3.5 Fluxo de execução (máquina de estados)

```
 [ESPAÇO/R] → novo mapa, agente e comida
                     │
                     ▼
        AGUARDANDO ESCOLHA ◄──────────────────────────┐
                     │ tecla 1–5                       │
                     ▼                                 │
        BUSCANDO: search.step() a cada frame           │
                     │                                 │
        sem caminho ─┴─► aviso "Comida inalcançável"   │
                     │ caminho encontrado              │
                     ▼                                 │
        MOVENDO: agent.update() segue o caminho,       │
                 mais lento em atoleiro e água         │
                     │ chegou à comida                 │
                     ▼                                 │
        COLETA: contador +1 e pausa ───────────────────┘
        (uma nova busca recomeça do mesmo ponto inicial,
         com o mesmo mapa e a mesma comida, para comparar)
```

A tecla `P` pausa e retoma a execução a qualquer momento. Um painel abaixo do mapa mostra:
- algoritmo ativo e estado;
- nós expandidos e tamanho da fronteira;
- passos e custo do caminho;
- comidas coletadas.

O detalhamento de cada arquivo e função está em [DOCUMENTACAO.md](DOCUMENTACAO.md).
