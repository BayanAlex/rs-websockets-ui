import { random } from "../utils";
import { Bot } from "./bot";

export const ROWS_COUNT = 10;
export const COLUMNS_COUNT = 10;

export interface Cell {
    x: number;
    y: number;
}

interface ShipCell extends Cell {
    shot?: boolean;
}

class Ship {
    cells: ShipCell[] = [];
    killed = false;

    constructor(x: number, y: number, private length: number, vertical: boolean) {
        for (let i = 0; i < length; i += 1) {
            this.cells.push(vertical ? { x, y: y + i } : { x: x + i, y });
        }
    }

    attack(x: number, y: number) {
        const cell = this.cells.find(cell => cell.x === x && cell.y === y);
        if (cell) {
            cell.shot = true;
            this.killed = this.cells.every(cell => cell.shot);
            return this.killed ? 'killed' : 'shot';
        }

        return 'miss';
    }

    getNearCells() {
        const startCell = this.cells[0];
        const endCell = this.cells[this.length - 1];
        const xStart = startCell.x > 0 ? startCell.x - 1 : 0;
        const yStart = startCell.y > 0 ? startCell.y - 1 : 0;
        const xEnd = endCell.x < COLUMNS_COUNT - 1 ? endCell.x + 1 : COLUMNS_COUNT - 1;
        const yEnd = endCell.y < ROWS_COUNT - 1 ? endCell.y + 1 : ROWS_COUNT - 1;
        const nearCells: Cell[] = [];
        for (let y = yStart; y <= yEnd; y += 1) {
            for (let x = xStart; x <= xEnd; x += 1) {
                if (!this.cells.find(cell => cell.x === x && cell.y === y)) {
                    nearCells.push({ x, y });
                }
            }
        }

        return nearCells;
    }
}

class Field {
    ships: Ship[] = [];
    shots: Cell[] = [];

    attack(x: number, y: number) {
        const resultCells: {
            position: {
                x: number,
                y: number
            },
            status?: 'miss' | 'killed' | 'shot'
        }[] = [{ position: { x, y } }];

        this.shots.push({ x, y });
        for (const ship of this.ships) {
            const status = ship.attack(x, y);
            if (status === 'shot' || status === 'killed') {
                resultCells[0].status = status;
                if (status === 'killed') {
                    const nearCells = ship.getNearCells()
                        .filter((cell) => !this.shots.find((shot) => cell.x === shot.x && cell.y === shot.y))

                    const nearCellsResponse = nearCells
                        .map((cell) => ({ 
                            position: { 
                                x: cell.x, 
                                y: cell.y 
                            }, 
                            status: 'miss' as 'miss'
                        }));
                    
                    this.shots.push(...nearCells);
                    resultCells.push(...nearCellsResponse);
                }
                return resultCells;
            }
        }

        resultCells[0].status = 'miss';
        return resultCells;
    }

    allKilled() {
        return this.ships.every((ship) => ship.killed);
    }
}

class Player {
    field = new Field();
    shipsRawData?: any;
}

export class Game {
    private players: Map<number, Player>;
    playerTurn: number;
    gameWithBot: boolean;

    constructor(
        playerIndex1: number,
        playerIndex2: number,
        public id: number
    ) { 
        this.players = new Map();
        this.players.set(playerIndex1, new Player());
        this.players.set(playerIndex2, new Player());
        this.playerTurn = playerIndex1;
        this.gameWithBot = playerIndex2 === Bot.id;
    }

    addShips(playerIndex: number, ships: any) {
        const shipsOnField = this.players.get(playerIndex).field.ships;
        for (const ship of ships) {
            const x = ship.position.x;
            const y = ship.position.y;
            const vertical = ship.direction;
            const length = ship.length;
            shipsOnField.push(new Ship(x, y, length, vertical));
        }

        this.players.get(playerIndex).shipsRawData = ships;
        const allPlayersReady = Array.from(this.players.values()).every((player) => !!player.shipsRawData);
        if (!allPlayersReady) {
            return null;
        }

        const playersData = this.getPlayers()
            .map(currentPlayerIndex => ({ 
                    currentPlayerIndex, 
                    ships: this.players.get(currentPlayerIndex).shipsRawData 
                })
            );

        return {
            turn: { currentPlayer: this.playerTurn },
            playersData
        }
    }

    getPlayers() {
        return Array.from(this.players.keys());
    }

    getShots(index: number) {
        return this.players.get(index).field.shots;
    }

    getOpponent(playerIndex: number) {
        return this.getPlayers().find((index) => index !== playerIndex);
    }

    private changeTurn() {
        this.playerTurn = this.getOpponent(this.playerTurn);
    }

    attack(playerIndex: number, x: number, y: number) {
        if (playerIndex !== this.playerTurn) {
            return null;
        }

        const field = this.players.get(this.getOpponent(playerIndex)).field;
        if (field.shots.find((shot) => shot.x === x && shot.y === y)) {
            return null;
        }
        const response = field.attack(x, y);
        const status = response[0].status;
        let win = false;
        if (status === 'miss') {
            this.changeTurn();
        } else if (status === 'killed') {
            win = field.allKilled();
        }

        return {
            win: win? { winPlayer: playerIndex } : null,
            turn: { currentPlayer: this.playerTurn },
            cells: response.map(v => ({ ...v, currentPlayer: playerIndex }))
        };
    }

    randomAttack(playerIndex: number) {
        const allCells: Cell[] = [];
        let freeCells: Cell[];
        for (let y = 0; y < ROWS_COUNT; y += 1) {
            for (let x = 0; x < COLUMNS_COUNT; x += 1) {
                allCells.push({ x, y });
            }
        }
        const field = this.players.get(this.getOpponent(playerIndex)).field;
        freeCells = allCells.filter((cell) => !field.shots.find((shot) => cell.x === shot.x && cell.y === shot.y ));
        const cell = freeCells[random(0, freeCells.length - 1)];

        return this.attack(playerIndex, cell.x, cell.y);
    }
}