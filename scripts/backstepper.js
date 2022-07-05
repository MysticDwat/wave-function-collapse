class BackStepper {
    constructor() {
        this.history = [];
    }

    saveState(grid, index, choice) {
        this.history.push({grid: grid, index: index, choice: choice});
    }

    getState() {
        return this.history.pop();
    }
}