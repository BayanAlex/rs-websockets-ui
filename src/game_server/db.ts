import { Game } from "./controller/game";
import { 
    GameData, 
    UpdateRoomResponse, 
    UserData, 
    WinnerData 
} from "./models/protocol";

class User {
    constructor(
        public name: string, 
        public password: string,
    ) {}
}

class Room {
    constructor(public userIndex: number) {}
}

export class DB {
    private users: User[] = [];
    private rooms: Room[] = [];
    public games: Game[] = [];
    private winners = new Map<number, number>();

    regUser(name: string, password: string): UserData {
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

    getUser(index: number): UserData {
        return {
            index,
            name: this.users[index].name,
        }
    }

    addWinner(index: number): void {
        this.winners.set(index, this.winners.get(index) + 1);
    }

    getWinners(): WinnerData[] {
        return Array.from(this.winners.entries())
            .map(winner => ({ name: this.users[winner[0]].name, wins: winner[1] }))
            .sort((a, b) => a.wins < b.wins ? 1 : -1);
    }

    createRoom(userIndex: number): boolean {
        if (this.rooms.find((room) => room.userIndex === userIndex)) {
            return false;
        }
        this.rooms.push(new Room(userIndex));
        return true;
    }

    deleteRoom(roomIndex: number): void {
        this.rooms.splice(roomIndex, 1);
    }

    getRooms(): UpdateRoomResponse['data'] {
        return this.rooms.map((room, index) => {
            return {
                roomId: index,
                roomUsers: [{ index: room.userIndex }]
            }
        });
    }

    createGame(userIndex: number, roomIndex?: number): GameData[] {
        let game: Game;
        const idGame = this.games.length ? this.games[this.games.length - 1].id + 1 : 0;
        if (roomIndex !== undefined) {
            game = new Game(this.rooms[roomIndex].userIndex, userIndex, idGame);
            this.deleteRoom(roomIndex);
        } else {
            game = new Game(userIndex, -1, idGame);
        }
        const userRoomIndex = this.rooms.findIndex((room) => room.userIndex === userIndex);
        if (userRoomIndex > -1) {
            this.deleteRoom(userRoomIndex);
        }
        this.games.push(game);
        
        return game.getPlayers().map((player) => ({ idGame, idPlayer: player }));
    }

    getGame(id: number): Game {
        return this.games.find((game) => game.id === id);
    }

    deleteGame(gameId: number): void {
        const index = this.games.findIndex((game) => game.id === gameId);
        this.games.splice(index, 1);
    }
}