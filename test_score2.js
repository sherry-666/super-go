const fs = require('fs');

const BOARD_SIZE = 5;
const EMPTY = 0, BLACK = 1, WHITE = 2;

eval(fs.readFileSync('goscorer.js', 'utf8'));

let board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
let markedDead = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));

board[0][2] = BLACK;
board[1][2] = BLACK;
board[2][2] = BLACK;
board[2][1] = BLACK;
board[2][0] = BLACK;

board[4][4] = WHITE;

try {
    const scoring = territoryScoring(board, markedDead, false);
    
    console.log("SCORING isTerritoryFor:");
    for(let i=0; i<BOARD_SIZE; i++) {
        let row = [];
        for(let j=0; j<BOARD_SIZE; j++) {
            row.push(scoring[i][j].isTerritoryFor || EMPTY); // map undefined to EMPTY
        }
        console.log(row.join(' '));
    }
} catch (e) {
    console.log("ERROR", e.stack);
}
