//arrays to store tiles and tile images
let tiles = [];
const tileImages = [];
const baseTileData = [];
const numBaseTiles = 2;

//array to store grid and var to store dimensions
let grid = [];
let DIM = 20;

//back stepper to handle contradictions
let backStepper = new BackStepper();

//debug states
const DEBUG_MODE = true;
let seed = -1;

function preload() {
    //get base tile data
    const path = "../files/tiles/demo";
    for(let i = 0; i < numBaseTiles; i++){
        baseTileData[i] = loadJSON(`${path}/metadata/${i}.json`, () => loadTileImage(path, i));
    }
}

function loadTileImage(path, i) {
    tileImages[i] = loadImage(`${path}/images/${i}.png`);
}

function setup() {
    //create a canvas with a black background
    createCanvas(windowHeight - 16,windowHeight - 16);
    background(0);

    //create base tiles
    for(let i = 0; i < numBaseTiles; i++){
        tiles[i] = new Tile(tileImages[i], baseTileData[i].edges);
    }

    //create rotated tiles
    let len = tiles.length;
    for(let i = 0; i < len; i++){
        //get base tile data
        let tileData = baseTileData[i];

        //if tile is perfectly symmetrical, continue
        if (tileData.type === "s") continue;

        //if tile is symmetrical on one axis, get one rotation.
        //else get three rotations.
        let curLen = tiles.length;
        for(let j = 1; j < (2 + (2 * (tileData.type !== "f"))); j++){
            tiles[curLen - 1 + j] = tiles[i].rotate(j);
        }
    }

    //index tiles
    for(let i = 0; i < tiles.length; i++){
        tiles[i].index = i;
    }

    //for each tile, get possible connections
    for(let tile of tiles){
        tile.getConnections(tiles);
    }

    //initialize the grid with empty cells
    resetGrid();

    //stop looping
    if(!DEBUG_MODE) noLoop();
}

function draw() {
    if(!isLooping()){
        return;
    }

    //copy grid, remove collapsed, and sort
    let sortedGrid = [...grid].filter((cell) => !cell.collapsed);
    sortedGrid.sort((a, b) => {
        return a.options.length - b.options.length;
    });

    //while there are non collapsed cells.
    if(sortedGrid.length > 0){
        //filter sorted grid by least entropy
        const leastEntropy = sortedGrid[0].options.length
        sortedGrid = sortedGrid.filter((cell) => cell.options.length === leastEntropy);

        //get cell to collapse
        let cell = random(sortedGrid);

        //get row and column
        const gridIndex = grid.indexOf(cell);

        //check for contradiction. if contradiction, return
        if(checkContradiction(cell)) return;

        //collapse cell and store state
        collapseCell(cell, gridIndex);

        //propagate changes
        propagateChanges(cell);

    //if entire grid has collapsed, complete algorithm
    } else {
        console.log("COMPLETE");

        if(!DEBUG_MODE){
            noLoop();
        } else {
            resetGrid();
        }
    }

    //draw grid
    drawGrid();
}

//function to reset the grid with empty cells
function resetGrid() {
    //if seed is -1, set seed to random
    if(seed < 0) seed = random(10000);

    //sets random seed
    randomSeed(seed);

    //generate new seed
    seed = random(10000);

    //empty the grid
    grid = [];

    //create initial options
    let options = new Array(tiles.length).fill(0).map((x, i) => i);

    //for each cell, create empty cell
    for(let i = 0; i < DIM * DIM; i++){
        grid[i] = new Cell(false, [...options]);
    }
}

//function for drawing grid
function drawGrid() {
    //draw background
    background(0);

    //set grid color
    stroke(125);

    //for each interval
    for(let i = 0; i <= DIM; i++) {
        //draw horizontal and vertical divider
        line(i * width / DIM, 0, i * width / DIM, height);
        line(0, i * height / DIM, width, i * height / DIM);
    }

    //for each row
    for(let i = 0; i < DIM; i++){
        //for each column
        for(let j = 0; j < DIM; j++){
            //if cell collapsed
            if(grid[i * DIM + j].collapsed){
                //draw tile
                image(tiles[grid[i * DIM + j].options[0]].img, j * width / DIM, i * height / DIM, width / DIM, height / DIM);
            }
        }
    }
}

//function to check for contradiction
function checkContradiction(cell) {
    //if no contradiction return false
    if(cell.options.length !== 0) return false;

    //reset state and remove picked option
    let lastState = backStepper.getState();
    grid = lastState.grid;
    cell = grid[lastState.index];
    cell.options.splice(cell.options.indexOf(lastState.index),1);

    //collapse cell
    collapseCell(cell, lastState.index);

    //back step and propagate
    console.log("BACK STEP");
    propagateChanges(cell);

    return true;
}

//function to collapse cell
function collapseCell(cell, gridIndex) {
    //pick option from options
    let pick = [random(cell.options)];

    //store state if multiple options
    if(cell.options.length > 1)
        backStepper.saveState(
        [...grid].map((cell) => new Cell(cell.collapsed, [...cell.options])),
        gridIndex,
        pick);

    //collapse
    cell.options = pick;
    cell.collapsed = true;
}

//function that propagates changes to options
function propagateChanges(cell) {
    //create queue and visited
    let queue = [cell]
    let visited = []

    while(queue.length > 0) {
        //get next cell
        cell = queue.shift();

        //get grid index of cell
        const gridIndex = grid.indexOf(cell);

        //get column and row of the cell
        const column = gridIndex % DIM;
        const row = (gridIndex - (column)) / DIM;

        //check if cell above exists and is not collapsed
        if(row !== 0 && !grid[gridIndex - DIM].collapsed && !visited.includes(grid[gridIndex - DIM])){
            //get up options length and cell to visited
            const len = grid[gridIndex - DIM].options;
            visited.push(grid[gridIndex - DIM]);

            //create list of valid options
            let validOptions = [];
            for(let option of cell.options){
                validOptions = [... new Set([...validOptions, ...tiles[option].up])]
            }

            //filter options
            grid[gridIndex - DIM].options = grid[gridIndex - DIM].options.filter((value) => validOptions.includes(value));

            //check if options were changed
            if(grid[gridIndex - DIM].options.length !== len){
                queue.push(grid[gridIndex - DIM]);
            }
        }

        //check if cell to the right exists and is not collapsed
        if(column !== DIM - 1 && !grid[gridIndex + 1].collapsed && !visited.includes(grid[gridIndex + 1])){
            //get right options length and cell to visited
            const len = grid[gridIndex + 1].options.length;
            visited.push(grid[gridIndex + 1]);

            //create list of valid options
            let validOptions = [];
            for(let option of cell.options){
                validOptions = [... new Set([...validOptions, ...tiles[option].right])]
            }

            //filter options
            grid[gridIndex + 1].options = grid[gridIndex + 1].options.filter((value) => validOptions.includes(value));

            //check if options were changed
            if(grid[gridIndex + 1].options.length !== len){
                queue.push(grid[gridIndex + 1]);
            }
        }

        //check if cell below exists and is not collapsed
        if(row !== DIM - 1 && !grid[gridIndex + DIM].collapsed && !visited.includes(grid[gridIndex + DIM])){
            //get down options length and cell to visited
            const len = grid[gridIndex + DIM].options.length;
            visited.push(grid[gridIndex + DIM]);

            //create list of valid options
            let validOptions = [];
            for(let option of cell.options){
                validOptions = [... new Set([...validOptions, ...tiles[option].down])]
            }

            //then filter options
            grid[gridIndex + DIM].options = grid[gridIndex + DIM].options.filter((value) => validOptions.includes(value));

            //check if options were changed
            if(grid[gridIndex + DIM].options.length !== len){
                queue.push(grid[gridIndex + DIM]);
            }
        }

        //check if cell to the left exists and is not collapsed
        if(column !== 0 && !grid[gridIndex - 1].collapsed && !visited.includes(grid[gridIndex - 1])){
            //get left options length and cell to visited
            const len = grid[gridIndex - 1].options.length;
            visited.push(grid[gridIndex - 1]);

            //create list of valid options
            let validOptions = [];
            for(let option of cell.options){
                validOptions = [... new Set([...validOptions, ...tiles[option].left])]
            }

            //then filter options
            grid[gridIndex - 1].options = grid[gridIndex - 1].options.filter((value) => validOptions.includes(value));

            //check if options were changed
            if(grid[gridIndex - 1].options.length !== len){
                queue.push(grid[gridIndex - 1]);
            }
        }
    }
}

//function to start WFC on a new grid
function startNewGrid() {
    //only run if wfc is not running
    if(!isLooping()){
        //set new dimensions and reset grid
        DIM = Number(document.getElementById("dim").value);
        resetGrid();

        //activate loop
        loop();
    }
}