// Código que concentra os tipos de terreno, a geração por ruído e a renderização do mapa e legenda.

const TERRAIN = {
  LOW:      { id: 0, name: "Custo Baixo (Areia)", cost: 1,   color: "#E2F0D9" },
  MEDIUM:   { id: 1, name: "Custo Médio (Atoleiro)", cost: 5,  color: "#C65911" },
  HIGH:     { id: 2, name: "Custo Alto (Água)", cost: 10,  color: "#5B9BD5" },
  OBSTACLE: { id: 3, name: "Obstáculo", cost: Infinity, color: "#7F7F7F" }
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
    let seedMud = random(1000);
    let seedWater = random(1000);
    let seedObs = random(1000);

    for (let r = 0; r < this.rows; r++) {
      let rowArray = [];
      for (let c = 0; c < this.cols; c++) {
        let nMud = noise(c * 0.08 + seedMud, r * 0.08 + seedMud);
        let nWater = noise(c * 0.08 + seedWater, r * 0.08 + seedWater);
        let nObs = noise(c * 0.2 + seedObs, r * 0.2 + seedObs);

        let type = TERRAIN.LOW;

        if (nMud > 0.62) {
          type = TERRAIN.MEDIUM;
        } else if (nWater > 0.62) {
          type = TERRAIN.HIGH;
        }

        if (nObs > 0.73) {
          type = TERRAIN.OBSTACLE;
        }

        rowArray.push(new Cell(c, r, type));
      }
      this.grid.push(rowArray);
    }
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

    fill(100);
    textSize(10);
    textAlign(RIGHT, CENTER);
    text("Pressione [ESPAÇO] ou [R] para reiniciar o mapa", width - 10, startY + 32);
  }
}