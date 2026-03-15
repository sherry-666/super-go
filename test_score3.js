const fs = require('fs');

const BOARD_SIZE = 5;
const EMPTY = 0, BLACK = 1, WHITE = 2;

eval(fs.readFileSync('goscorer.js', 'utf8'));

let board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
let markedDead = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));

// Create a living black group with 2 eyes on a 5x5 board
board[0][1] = BLACK; board[1][1] = BLACK; board[2][1] = BLACK;
board[2][0] = BLACK; // Eye at 0,0 and 1,0
board[1][0] = BLACK; 

board[0][3] = BLACK; board[1][3] = BLACK; board[2][3] = BLACK;
board[2][4] = BLACK; // Eye at 0,4 and 1,4

board[3][1] = BLACK; board[3][2] = BLACK; board[3][3] = BLACK;
board[4][2] = BLACK; // Bottom connection

board[1][2] = WHITE; // some white stone in the middle

try {
    function printMap(matrix, name) {
        console.log("=== " + name + " ===");
        for(let i=0; i<BOARD_SIZE; i++) {
            let row = [];
            for(let j=0; j<BOARD_SIZE; j++) {
                row.push(matrix[i][j] !== undefined ? matrix[i][j] : 'X');
            }
            console.log(row.join('\t'));
        }
        console.log("");
    }

    // Invoke exact same internals as territoryScoring
    const ysize = BOARD_SIZE;
    const xsize = BOARD_SIZE;
    const stones = board;
    const scoreFalseEyes = false;
    
    const connectionBlocks = makeArray(ysize, xsize, EMPTY);
    markConnectionBlocks(ysize, xsize, stones, markedDead, connectionBlocks);

    const strictReachesBlack = makeArray(ysize, xsize, false);
    const strictReachesWhite = makeArray(ysize, xsize, false);
    markReachability(ysize, xsize, stones, markedDead, null, strictReachesBlack, strictReachesWhite);

    const reachesBlack = makeArray(ysize, xsize, false);
    const reachesWhite = makeArray(ysize, xsize, false);
    markReachability(ysize, xsize, stones, markedDead, connectionBlocks, reachesBlack, reachesWhite);

    const regionIds = makeArray(ysize, xsize, -1);
    const regionInfosById = {};
    markRegions(ysize, xsize, stones, markedDead, connectionBlocks, reachesBlack, reachesWhite, regionIds, regionInfosById);

    const chainIds = makeArray(ysize, xsize, -1);
    const chainInfosById = {};
    markChains(ysize, xsize, stones, markedDead, regionIds, chainIds, chainInfosById);

    const macrochainIds = makeArray(ysize, xsize, -1);
    const macrochainInfosById = {};
    markMacrochains(ysize, xsize, stones, markedDead, connectionBlocks, regionIds, regionInfosById, chainIds, chainInfosById, macrochainIds, macrochainInfosById);

    const eyeIds = makeArray(ysize, xsize, -1);
    const eyeInfosById = {};
    markPotentialEyes(ysize, xsize, stones, markedDead, strictReachesBlack, strictReachesWhite, regionIds, regionInfosById, macrochainIds, macrochainInfosById, eyeIds, eyeInfosById);

    const isFalseEyePoint = makeArray(ysize, xsize, false);
    markFalseEyePoints(ysize, xsize, regionIds, macrochainIds, macrochainInfosById, eyeInfosById, isFalseEyePoint);

    markEyeValues(ysize, xsize, stones, markedDead, regionIds, regionInfosById, chainIds, chainInfosById, isFalseEyePoint, eyeIds, eyeInfosById);
    
    const isUnscorableFalseEyePoint = makeArray(ysize, xsize, false);

    const scoring = makeArray(ysize, xsize, null);
    for(let y = 0; y < ysize; y++) {
        for(let x = 0; x < xsize; x++) {
            scoring[y][x] = {
                isDame: false,
                isFalseEye: false,
                isUnscorableFalseEye: false,
                isTerritoryFor: 0,
                belongsToSekiGroup: 0,
                eyeValue: 0
            };
        }
    }

    markScoring(ysize, xsize, stones, markedDead, scoreFalseEyes, strictReachesBlack, strictReachesWhite, regionIds, regionInfosById, chainIds, chainInfosById, isFalseEyePoint, eyeIds, eyeInfosById, isUnscorableFalseEyePoint, scoring);

    printMap(scoring.map(r => r.map(c => c.isTerritoryFor)), "isTerritoryFor");
    printMap(scoring.map(r => r.map(c => c.eyeValue)), "eyeValue");
    printMap(chainIds, "chainIds");

} catch (e) {
    console.log("ERROR", e.stack);
}
