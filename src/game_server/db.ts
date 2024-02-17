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
    private users: User[] = [];
    private rooms: Room[] = [];
    public games: Game[] = [];
    private winners = new Map<number, number>();

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

    addWinner(index: number) {
        this.winners.set(index, this.winners.get(index) + 1);
    }

    getWinners() {
        return Array.from(this.winners.entries())
            .map(winner => ({ name: this.users[winner[0]].name, wins: winner[1] }))
            .sort((a, b) => a.wins < b.wins ? 1 : -1);
    }

    createRoom(userIndex: number) {
        if (this.rooms.find((room) => room.userIndex === userIndex)) {
            return false;
        }
        this.rooms.push(new Room(userIndex));
        return true;
    }

    deleteRoom(roomIndex: number) {
        this.rooms.splice(roomIndex, 1);
    }

    getRooms() {
        return this.rooms.map((room, index) => {
            return {
                roomId: index,
                roomUsers: [{ index: room.userIndex }]
            }
        });
    }

    createGame(userIndex: number, roomIndex: number) {
        const idGame = this.games.length ? this.games[this.games.length - 1].id + 1 : 0;
        const game = new Game(this.rooms[roomIndex].userIndex, userIndex, idGame);
        this.games.push(game);
        this.deleteRoom(roomIndex);
        const [player1, player2] = game.getPlayers();
        
        return [
            {
                idGame: idGame,
                idPlayer: player1
            },
            {
                idGame: idGame,
                idPlayer: player2
            }
        ];
    }

    deleteGame(gameId: number) {
        const index = this.games.findIndex((game) => game.id === gameId);
        this.games.splice(index, 1);
    }
}