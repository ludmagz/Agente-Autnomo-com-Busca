// Código do orquestrador principal: ciclo escolha -> busca -> movimento -> coleta -> nova comida

const COLS = 32;
const ROWS = 20;
const CELL_SIZE = 25;
const HUD_HEIGHT = 120;

// Nós expandidos por frame; [+]/[-] trocam o nível.
const SEARCH_SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16];

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
let food = null;
let search = null;
let selectedSearch = null;
let state = STATE.WAITING;
let foodCount = 0;
let stepBudget = 0;
let speedIndex = 3;
let paused = false;

function setup() {
  createCanvas(COLS * CELL_SIZE, ROWS * CELL_SIZE + HUD_HEIGHT);
  mapGrid = new MapGrid(COLS, ROWS, CELL_SIZE);
  resetWorld();
}

function draw() {
  background(255);
  mapGrid.show();

  // Pausado, nada avança: a busca e o agente ficam congelados no frame atual.
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
    // Velocidades fracionárias: acumula a cada frame e executa só os passos inteiros.
    stepBudget += SEARCH_SPEEDS[speedIndex];
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

// Passo 1: mapa novo e nada sobre ele até o usuário escolher a busca.
function resetWorld() {
  agent = null;
  food = null;
  search = null;
  selectedSearch = null;
  foodCount = 0;
  paused = false;
  state = STATE.WAITING;
}

function spawnAgent() {
  let cell = mapGrid.randomFreeCell();
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
  }
  agent.stop();

  let start = mapGrid.grid[agent.row][agent.col];
  let goal = mapGrid.grid[food.row][food.col];
  search = new SearchType(mapGrid, start, goal);
  stepBudget = 0;
  paused = false;
  state = STATE.SEARCHING;
}

// Passos 9 e 10: contabiliza, gera outra comida e busca de novo a partir da posição atual.
function collectFood() {
  foodCount++;
  spawnFood();
  startSearch(selectedSearch);
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
  info.push(`Velocidade: ${SEARCH_SPEEDS[speedIndex]} nós/frame`);

  textSize(11);
  text(info.join("   |   "), 10, top + 76);

  fill(100);
  textSize(10);
  text(
    "[1/B] Largura  [2/D] Profundidade  [3/U] Custo Uniforme  [4/G] Gulosa  [5/A] A*" +
      "  |  [P] pausar  |  [+/-] velocidade  |  [ESPAÇO/R] novo mapa",
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
  showMessageBox("Comida inalcançável", "Pressione [ESPAÇO] ou [R] para gerar um novo mapa", "#E00000");
}

// Selo no canto superior direito do mapa enquanto a execução está parada.
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

  if (k === " " || k === "r") {
    mapGrid.generateMap();
    resetWorld();
    return;
  }

  // Só faz sentido pausar depois que a execução começou.
  if (k === "p" && state !== STATE.WAITING) {
    paused = !paused;
    return;
  }

  if (k === "+" || k === "=") {
    speedIndex = Math.min(speedIndex + 1, SEARCH_SPEEDS.length - 1);
  }

  if (k === "-" || k === "_") {
    speedIndex = Math.max(speedIndex - 1, 0);
  }

  if (SEARCH_KEYS[k]) {
    startSearch(SEARCH_KEYS[k]);
  }
}
