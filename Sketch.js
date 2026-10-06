// Escolha -> busca -> movimento -> pausa.
// Novas buscas usam o mesmo mapa, ponto inicial e comida.

const COLS = 32;
const ROWS = 20;
const CELL_SIZE = 25;
const HUD_HEIGHT = 120;

const SEARCH_SPEED = 2;

const SEARCH_KEYS = {
  "1": BreadthFirstSearch, "b": BreadthFirstSearch,
  "2": DepthFirstSearch,   "d": DepthFirstSearch,
  "3": UniformCostSearch,  "u": UniformCostSearch,
  "4": GreedySearch,       "g": GreedySearch,
  "5": AStarSearch,        "a": AStarSearch
};

const STATE = {
  WAITING: "Aguardando escolha",
  SEARCHING: "Buscando",
  MOVING: "Indo até a comida",
  NO_PATH: "Sem caminho"
};

let mapGrid;
let agent = null;
let agentStart = null;
let food = null;
let search = null;
let selectedSearch = null;
let state = STATE.WAITING;
let foodCount = 0;
let stepBudget = 0;
let paused = false;

function setup() {
  createCanvas(COLS * CELL_SIZE, ROWS * CELL_SIZE + HUD_HEIGHT);
  mapGrid = new MapGrid(COLS, ROWS, CELL_SIZE);
  resetWorld();
}

function draw() {
  background(255);
  mapGrid.show();

  if (!paused) updateWorld();

  if (search) search.show(CELL_SIZE);
  if (food) food.show(CELL_SIZE);
  if (agent) agent.show();

  drawHud();

  if (state === STATE.WAITING) showChoicePrompt();
  if (state === STATE.NO_PATH) showNoPathWarning();
  if (paused) showPausedBadge();
}

function updateWorld() {
  if (state === STATE.SEARCHING) {
    let factor = 1;
    if(search instanceof DepthFirstSearch){
      factor = 0.4;
    }
    if(search instanceof GreedySearch){
      factor = 0.1;
    }
    

    stepBudget += SEARCH_SPEED * factor;

    while (stepBudget >= 1 && !search.done) {
      search.step();
      stepBudget--;
    }

    if (search.done) {
      if (search.found) {
        agent.followPath(search.path);
        state = STATE.MOVING;
      } else {
        state = STATE.NO_PATH;
      }
    }
  } else if (state === STATE.MOVING) {
    agent.update(mapGrid);
    if (agent.col === food.col && agent.row === food.row) {
      collectFood();
    }
  }
}

function resetWorld() {
  agent = null;
  agentStart = null;
  food = null;
  search = null;
  selectedSearch = null;
  foodCount = 0;
  stepBudget = 0;
  paused = false;
  state = STATE.WAITING;

  spawnAgent();
  spawnFood();
}

function spawnAgent() {
  let cell = mapGrid.randomFreeCell();
  agentStart = { col: cell.col, row: cell.row };
  agent = new Agent(cell.col, cell.row, CELL_SIZE);
}

function spawnFood() {
  let cell = mapGrid.randomFreeCell();
  while (cell.col === agent.col && cell.row === agent.row) {
    cell = mapGrid.randomFreeCell();
  }
  food = new Food(cell.col, cell.row);
}

function startSearch(SearchType) {
  selectedSearch = SearchType;

  if (!agent) {
    spawnAgent();
    spawnFood();
  } else {
    // Reinicia o agente no mesmo ponto inicial, mantendo mapa e comida.
    agent = new Agent(agentStart.col, agentStart.row, CELL_SIZE);
  }

  agent.stop();

  let start = mapGrid.grid[agent.row][agent.col];
  let goal = mapGrid.grid[food.row][food.col];
  search = new SearchType(mapGrid, start, goal);
  stepBudget = 0;
  paused = false;
  state = STATE.SEARCHING;
}

function collectFood() {
  foodCount++;
  paused = true;
  state = STATE.WAITING;
}

function drawHud() {
  let top = ROWS * CELL_SIZE;

  // Contador ocupa a 4ª coluna da linha das marcações da legenda.
  noStroke();
  fill(0);
  textAlign(LEFT, CENTER);
  textSize(13);
  textStyle(BOLD);
  text(`Comidas coletadas: ${foodCount}`, (width / 4) * 3 + 10, top + 49);
  textStyle(NORMAL);

  let info = [`Busca: ${search ? search.name : "—"}`, `Estado: ${paused ? `Pausado (${state})` : state}`];
  if (search) {
    info.push(`Expandidos: ${search.expanded.length}`);
    info.push(`Fronteira: ${search.visibleFrontier().length}`);
    if (search.found) {
      info.push(`Caminho: ${search.path.length - 1} passos, custo ${search.pathCost()}`);
    }
  }

  textSize(11);
  text(info.join("   |   "), 10, top + 76);

  fill(100);
  textSize(10);
  text(
    "[1/B] Largura  [2/D] Profundidade  [3/U] Custo Uniforme  [4/G] Gulosa  [5/A] A*" +
      "  |  [P] pausar  |  [ESPAÇO/R] novo mapa",
    10,
    top + 100
  );
}

function showMessageBox(title, subtitle, color) {
  let w = 560;
  let h = 70;
  let x = (width - w) / 2;
  let y = (ROWS * CELL_SIZE - h) / 2;

  fill(255, 240);
  stroke(color);
  strokeWeight(3);
  rect(x, y, w, h, 8);

  noStroke();
  textAlign(CENTER, CENTER);
  fill(color);
  textSize(18);
  text(title, width / 2, y + 24);
  fill(0);
  textSize(13);
  text(subtitle, width / 2, y + 48);
}

function showChoicePrompt() {
  showMessageBox(
    "Escolha a estratégia de busca",
    "[1] Largura   [2] Profundidade   [3] Custo Uniforme   [4] Gulosa   [5] A*",
    "#1F1F1F"
  );
}

function showNoPathWarning() {
  showMessageBox(
    "Comida inalcançável",
    "Pressione [ESPAÇO] ou [R] para gerar um novo mapa",
    "#E00000"
  );
}

function showPausedBadge() {
  let w = 150;
  let h = 32;
  let x = width - w - 10;
  let y = 10;

  fill(255, 235);
  stroke("#1F1F1F");
  strokeWeight(2);
  rect(x, y, w, h, 6);

  noStroke();
  fill("#1F1F1F");
  textAlign(CENTER, CENTER);
  textSize(14);
  textStyle(BOLD);
  text("❚❚ PAUSADO", x + w / 2, y + h / 2);
  textStyle(NORMAL);
}

function keyPressed() {
  let k = key.toLowerCase();

  // O mapa só muda quando esse comando é pressionado.
  if (k === " " || k === "r") {
    mapGrid.generateMap();
    resetWorld();
    return;
  }

  if (k === "p" && state !== STATE.WAITING) {
    paused = !paused;
    return;
  }

  if (SEARCH_KEYS[k]) {
    startSearch(SEARCH_KEYS[k]);
  }
}