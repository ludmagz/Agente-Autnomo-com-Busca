// Código responsável pelo agente, que percorre o caminho da busca com velocidade dependente do terreno

class Agent {
  constructor(col, row, cellSize) {
    this.col = col;
    this.row = row;
    this.cellSize = cellSize;
    this.x = col * cellSize + cellSize / 2;
    this.y = row * cellSize + cellSize / 2;
    this.path = [];
    this.pathIndex = 0;
  }

  get moving() {
    return this.pathIndex < this.path.length;
  }

  // path[0] é a célula atual do agente; ele parte em direção a path[1].
  followPath(path) {
    this.path = path;
    this.pathIndex = 1;
  }

  // Interrompe o movimento e volta para o centro da última célula alcançada.
  stop() {
    this.path = [];
    this.pathIndex = 0;
    this.x = this.col * this.cellSize + this.cellSize / 2;
    this.y = this.row * this.cellSize + this.cellSize / 2;
  }

  // A velocidade é a do terreno que está embaixo do agente neste frame.
  update(mapGrid) {
    if (!this.moving) return;

    let target = this.path[this.pathIndex];
    let tx = target.col * this.cellSize + this.cellSize / 2;
    let ty = target.row * this.cellSize + this.cellSize / 2;

    let under = mapGrid.grid[Math.floor(this.y / this.cellSize)][Math.floor(this.x / this.cellSize)];
    let speed = under.terrain.speed * this.cellSize;

    let dx = tx - this.x;
    let dy = ty - this.y;
    let dist = Math.hypot(dx, dy);

    if (dist <= speed) {
      this.x = tx;
      this.y = ty;
      this.col = target.col;
      this.row = target.row;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * speed;
      this.y += (dy / dist) * speed;
    }
  }

  show() {
    fill("#1F1F1F");
    stroke(255);
    strokeWeight(2);
    circle(this.x, this.y, this.cellSize * 0.7);
  }
}
