// Código do orquestrador principal

const COLS = 32;
const ROWS = 20;
const CELL_SIZE = 25;

let mapGrid;

function setup() {
  createCanvas(COLS * CELL_SIZE, ROWS * CELL_SIZE + 60);
  mapGrid = new MapGrid(COLS, ROWS, CELL_SIZE);
}

function draw() {
  background(255);
  mapGrid.show();
}

function keyPressed() {
  if (key === ' ' || key === 'r' || key === 'R') {
    mapGrid.generateMap();
  }
}