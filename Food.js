// Código responsável pela comida que ocupa uma célula do mapa

class Food {
  constructor(col, row) {
    this.col = col;
    this.row = row;
  }

  show(cellSize) {
    let x = this.col * cellSize + cellSize / 2;
    let y = this.row * cellSize + cellSize / 2;

    fill("#E00000");
    stroke(255);
    strokeWeight(2);
    circle(x, y, cellSize * 0.55);
  }
}
