// Código do orquestrador principal

const COLS = 32;
const ROWS = 20;
const CELL_SIZE = 25;

let mapGrid;
let agent;
let food;
let search;
let stepBudget = 0;

function setup() {
  createCanvas(COLS * CELL_SIZE, ROWS * CELL_SIZE + 70);
  mapGrid = new MapGrid(COLS, ROWS, CELL_SIZE);
  spawnAgent();
  spawnFood();
}

function draw() {
  background(255);
  mapGrid.show();

  // A busca só existe depois que o usuário aperta [B] ou [D].
  if (search) {
    // Velocidades fracionárias: acumula a cada frame e executa só os passos inteiros.
    stepBudget += search.stepsPerFrame;
    while (stepBudget >= 1 && !search.done) {
      search.step();
      stepBudget--;
    }
    search.show(CELL_SIZE);
  }

  food.show(CELL_SIZE);
  agent.show(CELL_SIZE);

  if (search && search.done && !search.found) {
    showNoPathWarning();
  }
}

function spawnAgent() {
  let cell = mapGrid.randomFreeCell();
  agent = new Agent(cell.col, cell.row);
}

function spawnFood() {
  let cell = mapGrid.randomFreeCell();
  while (cell.col === agent.col && cell.row === agent.row) {
    cell = mapGrid.randomFreeCell();
  }
  food = new Food(cell.col, cell.row);
}

function startSearch(SearchType) {
  let start = mapGrid.grid[agent.row][agent.col];
  let goal = mapGrid.grid[food.row][food.col];
  search = new SearchType(mapGrid, start, goal);
  stepBudget = 0;
}

function showNoPathWarning() {
  let w = 520;
  let h = 70;
  let x = (width - w) / 2;
  let y = (ROWS * CELL_SIZE - h) / 2;

  fill(255, 240);
  stroke("#E00000");
  strokeWeight(3);
  rect(x, y, w, h, 8);

  noStroke();
  textAlign(CENTER, CENTER);
  fill("#E00000");
  textSize(18);
  text("Comida inalcançável", width / 2, y + 24);
  fill(0);
  textSize(13);
  text("Pressione [ESPAÇO] ou [R] para gerar um novo mapa", width / 2, y + 48);
}

function keyPressed() {
  if (key === ' ' || key === 'r' || key === 'R') {
    mapGrid.generateMap();
    spawnAgent();
    spawnFood();
    search = null;
  }

  if (key === 'b' || key === 'B') {
    startSearch(BreadthFirstSearch);
  }

  if (key === 'd' || key === 'D') {
    startSearch(DepthFirstSearch);
  }
}
