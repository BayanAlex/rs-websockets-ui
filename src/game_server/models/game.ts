import { ShipData } from "./protocol";
export { ShipStatus } from "./protocol";
export { ShipData } from "./protocol";

export interface AttackStatus {
    position: {
        x: number;
        y: number;
    };
    status?: 'killed' | 'shot' | 'miss';
    currentPlayer: number;
}

export interface AttackResult {
    win: { 
        winPlayer: number 
    } | null;
    turn: { 
        currentPlayer: number 
    };
    cells: AttackStatus[]
}

export interface AddShipsResult {
    turn: {
        currentPlayer: number;
    };
    playersData: {
        currentPlayerIndex: number;
        ships: ShipData[];
    }[];
}
