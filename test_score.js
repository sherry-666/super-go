const BOARD_SIZE = 5;
const EMPTY = 0, BLACK = 1, WHITE = 2;
let board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
let territoryMap = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

function getNeighbors(x, y) {
    const n = [];
    if (x > 0) n.push([x-1, y]);
    if (x < BOARD_SIZE-1) n.push([x+1, y]);
    if (y > 0) n.push([x, y-1]);
    if (y < BOARD_SIZE-1) n.push([x, y+1]);
    return n;
}

function assessEmptyRegion(startX, startY, visited) {
    const queue = [[startX, startY]];
    visited.add(`${startX},${startY}`);
    let size = 0; let tB = false; let tW = false;
    while(queue.length > 0) {
        const [cx, cy] = queue.shift();
        size++;
        for (const [nx, ny] of getNeighbors(cx, cy)) {
            const color = board[nx][ny];
            if (color === BLACK) tB = true;
            else if (color === WHITE) tW = true;
            else if (color === EMPTY && !visited.has(`${nx},${ny}`)) {
                visited.add(`${nx},${ny}`);
                queue.push([nx, ny]);
            }
        }
    }
    let owner = null;
    if (tB && !tW) owner = BLACK;
    if (tW && !tB) owner = WHITE;
    return { groupSize: size, owner };
}

function markTerritory(startX, startY, owner) {
    const visited = new Set();
    const queue = [[startX, startY]];
    visited.add(`${startX},${startY}`);
    while(queue.length > 0) {
        const [cx, cy] = queue.shift();
        territoryMap[cx][cy] = owner;
        for (const [nx, ny] of getNeighbors(cx,cy)) {
            if (board[nx][ny] === EMPTY && !visited.has(`${nx},${ny}`)) {
                visited.add(`${nx},${ny}`);
                queue.push([nx, ny]);
            }
        }
    }
}

function calc() {
    territoryMap = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    const visited = new Set();
    for(let i=0; i<BOARD_SIZE; i++) {
        for(let j=0; j<BOARD_SIZE; j++) {
            if (board[i][j] === EMPTY && !visited.has(`${i},${j}`)) {
                const {groupSize, owner} = assessEmptyRegion(i, j, visited);
                if (owner === BLACK) markTerritory(i, j, BLACK);
                else if (owner === WHITE) markTerritory(i, j, WHITE);
            }
        }
    }
}

// Make a small 3x3 box in top left of BLACK
board[0][2] = BLACK;
board[1][2] = BLACK;
board[2][2] = BLACK;
board[2][1] = BLACK;
board[2][0] = BLACK;
// And a WHITE stone somewhere
board[4][4] = WHITE;

calc();

console.log(territoryMap.map(row => row.map(v => v===null?'.':v).join(' ')).join('\n'));

