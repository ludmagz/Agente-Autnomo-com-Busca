// Código responsável pelas buscas em Largura e em Profundidade, executadas um passo por vez para poder ser animadas

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

class BreadthFirstSearch {
  constructor(mapGrid, start, goal) {
    this.mapGrid = mapGrid;
    this.start = start;
    this.goal = goal;

    this.frontier = [start];
    this.visited = new Set([start]);
    this.expanded = [];
    this.cameFrom = new Map();
    this.current = null;
    this.done = false;
    this.found = false;
    this.path = [];
  }

  // Velocidade da animação, em nós expandidos por frame.
  get stepsPerFrame() {
    return 1.8;
  }

  // Expande um único nó da fronteira.
  step() {
    if (this.done) return;

    if (this.frontier.length === 0) {
      this.current = null;
      this.done = true;
      return;
    }

    this.current = this.frontier.shift();
    this.expanded.push(this.current);

    if (this.current === this.goal) {
      this.path = this.buildPath();
      this.found = true;
      this.done = true;
      return;
    }

    for (let next of this.mapGrid.neighbors(this.current.col, this.current.row)) {
      if (!this.visited.has(next)) {
        this.visited.add(next);
        this.cameFrom.set(next, this.current);
        this.frontier.push(next);
      }
    }
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

  show(cellSize) {
    for (let cell of this.expanded) {
      SEARCH_MARKS.VISITED.draw(cell.col * cellSize, cell.row * cellSize, cellSize);
    }

    for (let cell of this.frontier) {
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

// Reaproveita construtor, caminho e desenho da Largura; só muda a fronteira, que vira uma pilha.
class DepthFirstSearch extends BreadthFirstSearch {
  get stepsPerFrame() {
    return 0.0008;
  }

  // Expande o nó empilhado por último.
  step() {
    if (this.done) return;

    // A mesma célula pode ter sido empilhada por mais de um vizinho; descarta as já expandidas.
    this.current = this.frontier.pop();
    while (this.current && this.visited.has(this.current) && this.current !== this.start) {
      this.current = this.frontier.pop();
    }

    if (!this.current) {
      this.current = null;
      this.done = true;
      return;
    }

    this.visited.add(this.current);
    this.expanded.push(this.current);

    if (this.current === this.goal) {
      this.path = this.buildPath();
      this.found = true;
      this.done = true;
      return;
    }

    for (let next of this.mapGrid.neighbors(this.current.col, this.current.row)) {
      if (!this.visited.has(next)) {
        this.cameFrom.set(next, this.current);
        this.frontier.push(next);
      }
    }
  }
}
