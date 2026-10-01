// Código responsável por criar apenas o modelo quadrado de cada matriz

class Cell {
  constructor(col, row, terrainType) {
    this.col = col;
    this.row = row;
    this.terrain = terrainType;
  }

  show(cellSize) {
    let x = this.col * cellSize;
    let y = this.row * cellSize;

    fill(this.terrain.color);
    stroke(210);
    strokeWeight(1);
    rect(x, y, cellSize, cellSize);
  }
}