// Código responsável pelo agente que ocupa uma célula do mapa

class Agent {
  constructor(col, row) {
    this.col = col;
    this.row = row;
  }

  show(cellSize) {
    let x = this.col * cellSize + cellSize / 2;
    let y = this.row * cellSize + cellSize / 2;

    fill("#1F1F1F");
    stroke(255);
    strokeWeight(2);
    circle(x, y, cellSize * 0.7);
  }
}
