const ROWS_COUNT = 10;
const COLUMNS_COUNT = 10;

type Field = (0 | 1)[][];

export class Game {
    private fieldsMap: Map<number, Field>;

    constructor(
        userId1: number,
        userId2: number
    ) { 
        const field1: Field = [];
        const field2: Field = [];
        this.initField(field1);
        this.initField(field2);
        this.fieldsMap = new Map();
        this.fieldsMap.set(userId1, field1);
        this.fieldsMap.set(userId2, field2);
    }

    private initField(field: Field) {
        for (let y = 0; y < ROWS_COUNT; y += 1) {
            field.push([]);
            for (let x = 0; x < COLUMNS_COUNT; x += 1) {
                field[y].push(0);
            }
        }
    }

    addShips(userIndex: number, ships: any) {
        
    }

    getPlayers() {
        return Array.from(this.fieldsMap.keys());
    }
}