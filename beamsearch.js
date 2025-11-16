// duplicate board state
function copyBlocks(blocks) {
    let result = [];
    for (let x = 0; x < nx; x++) {
        result[x] = [];
        for (let y = 0; y < ny; y++) {
            result[x][y] = blocks[x][y];
        }
    }
    return result;
}

// check collision at position
function occupiedOnBoard(type, x, y, dir, board) {
    let hit = false;
    eachblock(type, x, y, dir, function(bx, by) {
        if (bx < 0 || bx >= nx || by < 0 || by >= ny || board[bx][by]) {
            hit = true;
        }
    });
    return hit;
}

// find where piece lands
function getDropPositionForBoard(piece, x, dir, board) {
    let y = -1;
    while (!occupiedOnBoard(piece.type, x, y + 1, dir, board)) {
        y++;
        if (y >= ny) break;
    }
    return y;
}

// score board state
function evaluateBoard(board) {
    let heights = [];
    let totalHeight = 0;
    let lines = 0;
    let holes = 0;
    let bump = 0;

    // get column heights
    for (let x = 0; x < nx; x++) {
        heights[x] = 0;
        for (let y = 0; y < ny; y++) {
            if (board[x][y] !== 0 && board[x][y] !== null && board[x][y] !== undefined) {
                heights[x] = ny - y;
                totalHeight += heights[x];
                break;
            }
        }
    }

    // count full lines
    for (let y = 0; y < ny; y++) {
        let full = true;
        for (let x = 0; x < nx; x++) {
            if (board[x][y] === 0) {
                full = false;
                break;
            }
        }
        if (full) lines++;
    }

    // count holes (empty cells below blocks)
    for (let x = 0; x < nx; x++) {
        let seenBlock = false;
        for (let y = 0; y < ny; y++) {
            if (board[x][y] !== 0) {
                seenBlock = true;
            } else if (seenBlock) {
                holes++;
            }
        }
    }

    // measure surface roughness
    for (let x = 0; x < nx - 1; x++) {
        bump += Math.abs(heights[x] - heights[x + 1]);
    }

    // weighted sum
    return -0.5 * totalHeight + 10 * Math.pow(2, lines - 1) - 20 * holes - 0.2 * bump;
}

// try all possible placements for piece
function getPossibleMovesForBoard(pieceType, board) {
    let moves = [];

    for (let dir = 0; dir < 4; dir++) {
        for (let x = -3; x < nx; x++) {
            let pc = { type: pieceType, dir: dir, x: x, y: 0 };
            let y = getDropPositionForBoard(pc, x, dir, board);
            
            if (y === -1 || occupiedOnBoard(pieceType, x, y, dir, board)) {
                continue;
            }

            let newBoard = copyBlocks(board);
            eachblock(pieceType, x, y, dir, function(bx, by) {
                if (bx >= 0 && bx < nx && by >= 0 && by < ny) {
                    newBoard[bx][by] = pieceType;
                }
            });
            
            moves.push({ piece: pc, x: x, y: y, dir: dir, board: newBoard });
        }
    }
    return moves;
}

// look ahead 2 moves and pick best
function selectBestMoveBeamSearch(currentPiece, nextPiece, beamWidth) {
    let firstMoves = getPossibleMovesForBoard(currentPiece.type, blocks);
    
    if (!firstMoves.length) return null;

    let scored = [];

    // for each first move, check all followup moves
    for (let i = 0; i < firstMoves.length; i++) {
        let m1 = firstMoves[i];
        let secondMoves = getPossibleMovesForBoard(nextPiece.type, m1.board);

        if (!secondMoves.length) {
            // no followups possible, just score this
            scored.push({ firstMove: m1, score: evaluateBoard(m1.board) });
        } else {
            // find best followup
            let best = -Infinity;
            for (let j = 0; j < secondMoves.length; j++) {
                let s = evaluateBoard(secondMoves[j].board);
                if (s > best) best = s;
            }
            scored.push({ firstMove: m1, score: best });
        }
    }

    // fallback if nothing scored
    if (!scored.length) {
        firstMoves.sort(function(a, b) {
            return evaluateBoard(b.board) - evaluateBoard(a.board);
        });
        return firstMoves[0];
    }

    // pick highest scorer
    scored.sort(function(a, b) { return b.score - a.score; });
    let top = scored.slice(0, Math.min(beamWidth, scored.length));
    return top[0].firstMove;
}

// execute AI move
function agentBeam() {
    let move = selectBestMoveBeamSearch(current, next, 5);
    if (move) {
        current.x = move.x;
        current.y = move.y;
        current.dir = move.dir;
        drop();
    }
}