import { Game } from "./controller/game";

class User {
    constructor(
        public name: string, 
        public password: string,
    ) { }
}

class Room {
    constructor(public userIndex: number) {}
}

export class DB {
    users: User[] = [];
    rooms: Room[] = [];
    games: Game[] = [];
    winners = new Map<number, number>();

    regUser(name: string, password: string) {
        const existingUserIndex = this.users.findIndex(user => user.name === name);
        if (existingUserIndex > -1) {
            const user = this.users[existingUserIndex];
            if (password === user.password) {
                return this.getUser(existingUserIndex);
            }
            return null;
        }

        const index = this.users.length;
        const user = new User(name, password);
        this.users.push(user);
        this.winners.set(index, 0);

        return this.getUser(index);
    }

    getUser(index: number) {
        return {
            index,
            name: this.users[index].name,
        }
    }

    addWinner(name: string) {
        const index = this.users.findIndex(user => user.name === name);
        this.winners.set(index, this.winners.get(index) + 1);
    }

    getWinners() {
        return Array.from(this.winners.entries())
            .map(winner => ({ name: this.users[winner[0]].name, wins: winner[1] }))
            .sort((a, b) => a.wins > b.wins ? 1 : -1);
    }

    createRoom(userIndex: number) {
        this.rooms.push(new Room(userIndex));
    }

    deleteRoom(roomIndex: number) {
        this.rooms.splice(roomIndex, 1);
    }

    getRooms() {
        return this.rooms.map((room, index) => {
            const user = this.getUser(room.userIndex);
            return {
                roomId: index,
                roomUsers: [{ name: user.name, index: user.index }]
            }
        });
    }

    createGame(userIndex: number, roomIndex: number) {
        const game = new Game(this.rooms[roomIndex].userIndex, userIndex);
        this.games.push(game);
        this.deleteRoom(roomIndex);
        return {
            idGame: this.games.length - 1,
            idPlayer: userIndex
        }
    }

    getGamePlayers(gameId: number) {
        return this.games[gameId].getPlayers();
    }

    addShips(gameId: number, userIndex: number, ships: any) {
        return this.games[gameId].addShips(userIndex, ships);
    }
}