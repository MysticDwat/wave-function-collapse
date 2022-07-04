//class to store tile information
class Tile {
    //constructor
    constructor(img, edges, index) {
        this.img = img;
        this.edges = edges;

        this.up = [];
        this.right = [];
        this.down = [];
        this.left = [];

        //if index is given, set index
        if(index !== undefined) {
            this.index = index;
        }
    }

    //function to give rotated tile
    rotate(n) {
        //get image width and height
        const w = this.img.width;
        const h = this.img.height

        //create new image rotated 90 degrees n times
        let newImg = createGraphics(w, h);
        newImg.imageMode(CENTER);
        newImg.translate(w / 2, h / 2);
        newImg.rotate(HALF_PI * n);
        newImg.image(this.img, 0, 0);

        //rotate edges 90 degrees n times
        let newEdges = [];
        let len = this.edges.length;
        for(let i = 0; i < len; i++) {
            newEdges[i] = this.edges[(i - n + len) % len];
        }

        //return new tile
        return new Tile(newImg, newEdges);
    }

    //function to see if two tiles are the same
    equals(tile) {
        //store edges
        let a = this.edges;
        let b = tile.edges;

        //compare each edge
        for(let i = 0; i < a.length; i++){
            //if an edge is not equal return false
            if(a[i] !== b[i]) return false;
        }

        //else return true
        return true;
    }

    //function to get every possible connection by comparing edges
    getConnections(tiles) {
        //for each tile check if any edges match
        //if so, add index to possible connections
        for(let tile of tiles){
            if(tile.edges[2] === this.edges[0]){
                this.up.push(tile.index);
            }

            if(tile.edges[3] === this.edges[1]){
                this.right.push(tile.index);
            }

            if(tile.edges[0] === this.edges[2]){
                this.down.push(tile.index);
            }

            if(tile.edges[1] === this.edges[3]){
                this.left.push(tile.index);
            }
        }
    }
}