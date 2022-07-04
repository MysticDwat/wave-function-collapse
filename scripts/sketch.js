//arrays to store tiles and tile images
let tiles = [];
const tileImages = [];

//array to store grid and var to store dimensions
let grid = [];
const DIM = 50;

//vars to store last state for backtracking
let lastGrid = [];
let lastCoors = [];
let lastIndex = -1;
let lastOptions = [];
let lastPick = -1;
let lastSeed = -1;

//debug states
const DEBUG_MODE = false;
let seed = -1;

/*
known emergency exit seeds:
> 373.85106552392244
*/

function preload() {
    //get tile images
    const path = "../files/tiles/demo";
    for(let i = 0; i < 2; i++){
        tileImages[i] = loadImage(`${path}/${i}.png`);
    }
}

function setup() {
    //create a canvas with a black background
    createCanvas(windowHeight - 16,windowHeight - 16);
    background(0);

    //create base tiles
    tiles[0] = new Tile(tileImages[0], ["a", "a", "a", "a"]);
    tiles[1] = new Tile(tileImages[1], ["b", "b", "a", "b"]);

    //create rotated tiles
    let len = tiles.length;
    for(let i = 0; i < len; i++) {
        for(let j = 1; j < 4; j++){
            tiles[i * 3 + len - 1 + j] = tiles[i].rotate(j);
        }
    }

    //remove duplicate tiles
    removeDuplicateTiles();

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

}

function draw() {
    //copy grid, remove collapsed, and sort
    let sortedGrid = [...grid].filter((cell) => !cell.collapsed);
    sortedGrid.sort((a, b) => {
        return a.options.length - b.options.length;
    });

    if(sortedGrid.length > 0){
        //filter sorted grid by least entropy
        const leastEntropy = sortedGrid[0].options.length
        sortedGrid = sortedGrid.filter((cell) => cell.options.length === leastEntropy);

        //get cell to collapse
        let cell = random(sortedGrid);

        //get row and column
        const gridIndex = grid.indexOf(cell);
        const column = gridIndex % DIM;
        const row = (gridIndex - (column)) / DIM;

        //if contradiction
        if(cell.options.length === 0) {
            //reset state and remove picked option
            grid = [...lastGrid];
            cell = grid[lastIndex];
            cell.options.splice(cell.options.indexOf(lastPick),1);

            //if still contradiction, exit
            if(cell.options.length === 0){
                console.log("EMERGENCY EXIT! SEED:", lastSeed, "LAST STEP:", lastCoors, lastIndex, lastOptions, lastPick, "CURRENT STEP:", row, column);
                resetGrid();
                return;
            }

            //store state
            lastGrid = [...grid].map((cell) => new Cell(cell.collapsed, [...cell.options]));
            lastCoors = [lastCoors[0]]
            lastOptions = cell.options;

            //collapse and store pick
            cell.options = [random(cell.options)];
            cell.collapsed = true;
            lastPick = cell.options[0];

            //back step
            console.log("BACK STEP");
            propagateChanges(cell);
            return;
        }

        //store state if multiple options
        if(cell.options.length > 1){
            lastGrid = [...grid].map((cell) => new Cell(cell.collapsed, [...cell.options]));
            lastCoors = [`Row: ${row} Column: ${column}`];
            lastIndex = gridIndex;
            lastOptions = [...cell.options];

        //else store coordinates
        }else {
            lastCoors.push(`Row: ${row} Column: ${column}`);
        }

        //collapse
        cell.options = [random(cell.options)];
        cell.collapsed = true;

        //store pick if multiple options
        if(lastIndex === gridIndex){
            lastPick = cell.options[0];
        }

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

    drawGrid();
}

//function to reset the grid with empty cells
function resetGrid() {
    //if seed is -1, set seed to random
    if(seed < 0) seed = random(10000);

    //sets random seed
    randomSeed(seed);

    //store last seed and generate new seed
    lastSeed = seed;
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

//function to remove duplicate tiles
function removeDuplicateTiles() {
    //for each tile
    for(let i = 0; i < tiles.length; i++){
        //get next tile
        let tile = tiles[i];

        //for rest of tiles
        for(let j = i + 1; j < tiles.length; j++){
            //if tiles are the same
            if(tile.equals(tiles[j])){
                //remove duplicate and adjust j
                tiles.splice(j, 1);
                j--;
            }
        }
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

        //check if cell above exists and is not collapsed
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

        //check if cell above exists and is not collapsed
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

        //check if cell above exists and is not collapsed
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