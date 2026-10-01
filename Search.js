// Código responsável pelas estratégias de busca, executadas um passo por vez para poderem ser animadas

// Marcações desenhadas por cima da célula sem cobrir o terreno: cada uma sabe se desenhar em (x, y, size).
const SEARCH_MARKS = {
  VISITED: {
    name: "Explorada",
    draw(x, y, size) {
      fill(30);
      stroke(255);
      strokeWeight(1.5);
      circle(x + size / 2, y + size / 2, size * 0.32);
    }
  },
  FRONTIER: {
    name: "Fronteira",
    draw(x, y, size) {
      noFill();
      stroke(30);
      strokeWeight(5);
      rect(x + 2.5, y + 2.5, size - 5, size - 5);
      stroke(255, 190, 0);
      strokeWeight(3);
      rect(x + 2.5, y + 2.5, size - 5, size - 5);
    }
  },
  PATH: {
    name: "Caminho final",
    color: [200, 0, 120],
    draw(x, y, size) {
      stroke(this.color);
      strokeWeight(5);
      line(x, y + size / 2, x + size, y + size / 2);
    }
  }
};

// Distância de Manhattan escalada pelo menor custo de terreno, o que a mantém admissível e consistente.
function manhattan(a, b) {
  return (Math.abs(a.col - b.col) + Math.abs(a.row - b.row)) * TERRAIN.LOW.cost;
}

// Base comum: guarda o estado da busca, reconstrói o caminho e desenha as marcações.
class GridSearch {
  constructor(mapGrid, start, goal) {
    this.mapGrid = mapGrid;
    this.start = start;
    this.goal = goal;

    this.closed = new Set();
    this.expanded = [];
    this.cameFrom = new Map();
    this.current = null;
    this.done = false;
    this.found = false;
    this.path = [];
  }

  get name() {
    return "";
  }

  // Células guardadas na estrutura da fronteira (podem ter repetidas ou já expandidas).
  frontierCells() {
    return [];
  }

  // Fronteira real: células únicas ainda não expandidas.
  visibleFrontier() {
    let seen = new Set();
    for (let cell of this.frontierCells()) {
      if (!this.closed.has(cell)) seen.add(cell);
    }
    return [...seen];
  }

  expand(cell) {
    this.current = cell;
    this.closed.add(cell);
    this.expanded.push(cell);

    if (cell === this.goal) {
      this.path = this.buildPath();
      this.found = true;
      this.done = true;
      return true;
    }
    return false;
  }

  fail() {
    this.current = null;
    this.done = true;
  }

  buildPath() {
    let path = [];
    let cell = this.goal;
    while (cell !== this.start) {
      path.push(cell);
      cell = this.cameFrom.get(cell);
    }
    path.push(this.start);
    return path.reverse();
  }

  // Custo de entrar em cada célula do caminho (a célula inicial não é paga).
  pathCost() {
    let cost = 0;
    for (let i = 1; i < this.path.length; i++) {
      cost += this.path[i].terrain.cost;
    }
    return cost;
  }

  show(cellSize) {
    for (let cell of this.expanded) {
      SEARCH_MARKS.VISITED.draw(cell.col * cellSize, cell.row * cellSize, cellSize);
    }

    for (let cell of this.visibleFrontier()) {
      SEARCH_MARKS.FRONTIER.draw(cell.col * cellSize, cell.row * cellSize, cellSize);
    }

    if (this.found) {
      noFill();
      stroke(SEARCH_MARKS.PATH.color);
      strokeWeight(5);
      beginShape();
      for (let cell of this.path) {
        vertex(cell.col * cellSize + cellSize / 2, cell.row * cellSize + cellSize / 2);
      }
      endShape();
    }
  }
}

class BreadthFirstSearch extends GridSearch {
  constructor(mapGrid, start, goal) {
    super(mapGrid, start, goal);
    this.frontier = [start];
    this.discovered = new Set([start]);
  }

  get name() {
    return "Largura (BFS)";
  }

  frontierCells() {
    return this.frontier;
  }

  // Expande o nó mais antigo da fila.
  step() {
    if (this.done) return;
    if (this.frontier.length === 0) return this.fail();

    if (this.expand(this.frontier.shift())) return;

    for (let next of this.mapGrid.neighbors(this.current.col, this.current.row)) {
      if (!this.discovered.has(next)) {
        this.discovered.add(next);
        this.cameFrom.set(next, this.current);
        this.frontier.push(next);
      }
    }
  }
}

class DepthFirstSearch extends GridSearch {
  constructor(mapGrid, start, goal) {
    super(mapGrid, start, goal);
    this.frontier = [start];
  }

  get name() {
    return "Profundidade (DFS)";
  }

  frontierCells() {
    return this.frontier;
  }

  // Expande o nó empilhado por último.
  step() {
    if (this.done) return;

    // A mesma célula pode ter sido empilhada por mais de um vizinho; descarta as já expandidas.
    let cell = this.frontier.pop();
    while (cell && this.closed.has(cell)) {
      cell = this.frontier.pop();
    }
    if (!cell) return this.fail();

    if (this.expand(cell)) return;

    for (let next of this.mapGrid.neighbors(this.current.col, this.current.row)) {
      if (!this.closed.has(next)) {
        this.cameFrom.set(next, this.current);
        this.frontier.push(next);
      }
    }
  }
}

// Base das buscas com fila de prioridade; as subclasses só mudam a prioridade de cada nó.
class BestFirstSearch extends GridSearch {
  constructor(mapGrid, start, goal) {
    super(mapGrid, start, goal);
    this.costSoFar = new Map([[start, 0]]);
    this.frontier = new MinHeap();
    this.push(start, 0);
  }

  // Se false, um nó já descoberto não é reinserido mesmo que se ache um caminho mais barato até ele.
  get updatesCost() {
    return true;
  }

  priority(cell, g) {
    return g;
  }

  heuristic(cell) {
    return manhattan(cell, this.goal);
  }

  push(cell, g) {
    this.frontier.push(cell, this.priority(cell, g), this.heuristic(cell));
  }

  frontierCells() {
    return this.frontier.values();
  }

  // Expande o nó de menor prioridade; entradas antigas de nós já expandidos são descartadas.
  step() {
    if (this.done) return;

    let cell = this.frontier.pop();
    while (cell && this.closed.has(cell)) {
      cell = this.frontier.pop();
    }
    if (!cell) return this.fail();

    if (this.expand(cell)) return;

    let g = this.costSoFar.get(this.current);
    for (let next of this.mapGrid.neighbors(this.current.col, this.current.row)) {
      if (this.closed.has(next)) continue;

      let newG = g + next.terrain.cost;
      let known = this.costSoFar.has(next);
      if (!known || (this.updatesCost && newG < this.costSoFar.get(next))) {
        this.costSoFar.set(next, newG);
        this.cameFrom.set(next, this.current);
        this.push(next, newG);
      }
    }
  }
}

class UniformCostSearch extends BestFirstSearch {
  get name() {
    return "Custo Uniforme";
  }
}

class GreedySearch extends BestFirstSearch {
  get name() {
    return "Gulosa";
  }

  get updatesCost() {
    return false;
  }

  priority(cell, g) {
    return this.heuristic(cell);
  }
}

class AStarSearch extends BestFirstSearch {
  get name() {
    return "A*";
  }

  priority(cell, g) {
    return g + this.heuristic(cell);
  }
}
