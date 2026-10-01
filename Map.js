// Código que concentra os tipos de terreno, a geração por ruído e a renderização do mapa e legenda.

// speed: fração de célula que o agente percorre por frame sobre aquele terreno.
const TERRAIN = {
  LOW:      { id: 0, name: "Custo Baixo (Areia)", cost: 1,   speed: 0.12,  color: "#E2F0D9" },
  MEDIUM:   { id: 1, name: "Custo Médio (Atoleiro)", cost: 5,  speed: 0.045, color: "#C65911" },
  HIGH:     { id: 2, name: "Custo Alto (Água)", cost: 10,  speed: 0.02,  color: "#5B9BD5" },
  OBSTACLE: { id: 3, name: "Obstáculo", cost: Infinity, speed: 0, color: "#7F7F7F" }
};

class MapGrid {
  constructor(cols, rows, cellSize) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.grid = [];
    this.generateMap();
  }

  generateMap() {
    this.grid = [];
    let total = this.cols * this.rows;
    let types = new Array(total).fill(TERRAIN.LOW);

    // Cada terreno ocupa uma fração sorteada dentro da faixa; o que sobra é custo baixo (>= 40%).
    // Obstáculo não usa ruído (escala null): fica espalhado em células soltas, sem formar ilhas.
    this.placeTerrain(types, TERRAIN.OBSTACLE, null, random(0.12, 0.20));
    this.placeTerrain(types, TERRAIN.MEDIUM, 0.15, random(0.10, 0.20));
    this.placeTerrain(types, TERRAIN.HIGH, 0.15, random(0.10, 0.20));

    for (let r = 0; r < this.rows; r++) {
      let rowArray = [];
      for (let c = 0; c < this.cols; c++) {
        rowArray.push(new Cell(c, r, types[r * this.cols + c]));
      }
      this.grid.push(rowArray);
    }
  }

  // Em vez de um limiar fixo, pega as células livres com maior ruído até atingir a fração pedida.
  // Isso garante a proporção exata e mantém as ilhas; quanto maior a escala, menores as ilhas.
  placeTerrain(types, terrain, scale, fraction) {
    let seedX = random(1000);
    let seedY = random(1000);
    let free = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let i = r * this.cols + c;
        if (types[i] === TERRAIN.LOW) {
          let n = scale === null ? random() : noise(c * scale + seedX, r * scale + seedY);
          free.push({ i: i, n: n });
        }
      }
    }

    free.sort((a, b) => b.n - a.n);
    let count = Math.ceil(fraction * this.cols * this.rows);
    for (let k = 0; k < count && k < free.length; k++) {
      types[free[k].i] = terrain;
    }
  }

  // Sorteia uma célula que não seja obstáculo.
  randomFreeCell() {
    let free = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].terrain !== TERRAIN.OBSTACLE) {
          free.push(this.grid[r][c]);
        }
      }
    }
    return random(free);
  }

  // Vizinhos em 4 direções que estão dentro do grid e não são obstáculo.
  neighbors(col, row) {
    let result = [];
    let deltas = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    for (let [dc, dr] of deltas) {
      let c = col + dc;
      let r = row + dr;
      if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) continue;
      if (this.grid[r][c].terrain === TERRAIN.OBSTACLE) continue;
      result.push(this.grid[r][c]);
    }
    return result;
  }

  show() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c].show(this.cellSize);
      }
    }
    this.drawLegend();
  }

  drawLegend() {
    let startY = this.rows * this.cellSize + 15;
    let items = [TERRAIN.LOW, TERRAIN.MEDIUM, TERRAIN.HIGH, TERRAIN.OBSTACLE];
    let spacing = width / items.length;

    textSize(11);
    textAlign(LEFT, CENTER);

    items.forEach((item, index) => {
      let x = index * spacing + 10;
      fill(item.color);
      stroke(100);
      rect(x, startY, 16, 16);

      fill(0);
      noStroke();
      let costText = item.cost === Infinity ? "Impassável" : `Custo: ${item.cost}`;
      text(`${item.name} (${costText})`, x + 24, startY + 8);
    });

    let marks = [SEARCH_MARKS.VISITED, SEARCH_MARKS.FRONTIER, SEARCH_MARKS.PATH];
    let marksY = startY + 26;

    marks.forEach((mark, index) => {
      let x = index * spacing + 10;
      fill(TERRAIN.LOW.color);
      stroke(100);
      strokeWeight(1);
      rect(x, marksY, 16, 16);
      mark.draw(x, marksY, 16);

      fill(0);
      noStroke();
      text(mark.name, x + 24, marksY + 8);
    });
  }
}