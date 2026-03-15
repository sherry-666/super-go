const fs = require('fs');
const BOARD_SIZE = 5;
const EMPTY = 0, BLACK = 1, WHITE = 2;

eval(fs.readFileSync('goscorer.js', 'utf8'));

let board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
let markedDead = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));

// Create a living black group with 2 eyes
board[0][1] = BLACK; board[1][1] = BLACK; board[2][1] = BLACK;
board[2][0] = BLACK; 
board[1][0] = BLACK; 

board[0][3] = BLACK; board[1][3] = BLACK; board[2][3] = BLACK;
board[2][4] = BLACK; 

board[3][1] = BLACK; board[3][2] = BLACK; board[3][3] = BLACK;
board[4][2] = BLACK; 

board[1][2] = WHITE; // isolated white stone
markedDead[1][2] = true; // explicitly mark it dead

try {
    const finalScores = finalTerritoryScore(board, markedDead, 0, 0, 6.5, false);
    console.log("FINAL SCORES", finalScores);
} catch (e) {
    console.log("ERROR", e.stack);
}
