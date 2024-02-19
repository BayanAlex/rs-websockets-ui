import { random } from "../utils";
import { COLUMNS_COUNT, Cell, Game, ROWS_COUNT } from "./game";

export class Bot {
    static id = -1;
    nextAttack: Cell | null = null;
    startShot: Cell | null = null;

    constructor(private game: Game) {
        this.generateShips();
    }

    private generateShips() {
        const ships: any[] = [];
        const busyCells: Cell[] = [];

        const generateShip = (length: 1 | 2 | 3 | 4) => {
            const vertical = !!random(0, 1);
            let x: number;
            let y: number;
            let shipCells: Cell[];
            do {
                shipCells = [];
                x = random(0, COLUMNS_COUNT - (vertical ? 1 : length));
                y = random(0, ROWS_COUNT -  (vertical ? length : 1));
                for (let i = 0; i < length; i += 1) {
                    shipCells.push(vertical ? { x, y: y + i } : { x: x + i, y });
                }
            } while (busyCells.some((busyCell) => shipCells.find((shipCell) => busyCell.x === shipCell.x && busyCell.y === shipCell.y)));
            
            ships.push({ position: { x, y }, direction: vertical, length });
            const startCell = { x, y };
            const endCell = vertical ? { x, y: y + length - 1 } : { x: x + length - 1, y };
            const xStart = startCell.x > 0 ? startCell.x - 1 : 0;
            const yStart = startCell.y > 0 ? startCell.y - 1 : 0;
            const xEnd = endCell.x < COLUMNS_COUNT - 1 ? endCell.x + 1 : COLUMNS_COUNT - 1;
            const yEnd = endCell.y < ROWS_COUNT - 1 ? endCell.y + 1 : ROWS_COUNT - 1;
            for (let y = yStart; y <= yEnd; y += 1) {
                for (let x = xStart; x <= xEnd; x += 1) {
                    busyCells.push({ x, y });
                }
            }
        }

        [ 4, 3, 3, 2, 2, 2, 1, 1, 1, 1 ].forEach(generateShip);
        this.game.addShips(Bot.id, ships);
    }

    attack() {
        const resultCells: any[] = [];
        let result: any;
        const checkShots = (cell: Cell) => {
            return !this.game.getShots(this.game.getOpponent(Bot.id)).find(((shot) => shot.x === cell.x && shot.y === cell.y));
        }

        do {
            result = this.nextAttack ? this.game.attack(Bot.id, this.nextAttack.x, this.nextAttack.y) : this.game.randomAttack(Bot.id);
            resultCells.push(...result.cells);
            if (result.win) {
                break;
            }

            const attackResult = result.cells[0];
            if (attackResult.status === 'killed') {
                this.startShot = null;
                this.nextAttack = null;

            } else if (attackResult.status === 'shot' || this.startShot) {
                const shotCell = attackResult.position;
                if (!this.startShot) {
                    this.startShot = shotCell;
                } else {
                    const vertical = this.startShot.x === shotCell.x;
                    if (attackResult.status === 'shot') {

                        const axis = vertical ? 'y' : 'x';
                        const axisMax = (axis === 'x' ? COLUMNS_COUNT : ROWS_COUNT) - 1;
                        const nextToCheck = { ...this.nextAttack };
                        if (shotCell[axis] > this.startShot[axis]) {
                            nextToCheck[axis] += 1;
                            if (this.nextAttack[axis] < axisMax && checkShots(nextToCheck)) {
                                this.nextAttack[axis] += 1;
                            } else {
                                this.nextAttack[axis] = this.startShot[axis] - 1;
                            }
                        } else {
                            nextToCheck[axis] -= 1;
                            if (this.nextAttack[axis] > 0 && checkShots(nextToCheck)) {
                                this.nextAttack[axis] -= 1;
                            } else {
                                this.nextAttack[axis] = this.startShot[axis] + 1;
                            }
                        }
                        continue;

                    } else if (vertical && Math.abs(shotCell.y - this.startShot.y) > 1 || !vertical && Math.abs(shotCell.x - this.startShot.x) > 1) {
                        const axis = vertical ? 'y' : 'x';
                        this.nextAttack[axis] = shotCell[axis] > this.startShot[axis] ? this.startShot[axis] - 1 : this.startShot[axis] + 1;
                        continue;
                        
                    }
                }

                const potentialTargets = [

                    { x: this.startShot.x - 1, y: this.startShot.y },
                    { x: this.startShot.x + 1, y: this.startShot.y },
                    { x: this.startShot.x, y: this.startShot.y - 1 },
                    { x: this.startShot.x, y: this.startShot.y + 1 },

                ].filter((cell) => cell.x >= 0 && cell.x < COLUMNS_COUNT && cell.y >=0 && cell.y < ROWS_COUNT);
                for (let i = 0; i < potentialTargets.length; i += 1) {
                    const potentialTarget = potentialTargets[i];
                    if (checkShots(potentialTarget)) {
                        this.nextAttack = potentialTarget;
                        break;
                    }
                }
            }
        } while (result.turn.currentPlayer === Bot.id);
        result.cells = resultCells;

        return result;
    }
}