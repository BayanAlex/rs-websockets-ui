import { Game } from "./controller/game";
import { 
    GameData, 
    UpdateRoomResponse, 
    UserData, 
    WinnerData 
} from "../models/protocol";

class User {
    constructor(
        public name: string, 
        public password: string,
    ) {}
}

class Room {
    constructor(public userId: number) {}
}

export class DB {
    private users: User[] = [];
    private rooms: Room[] = [];
    public games: Game[] = [];
    private winners = new Map<number, number>();

    regUser(name: string, password: string): UserData {
        const existingUserId = this.users.findIndex(user => user.name === name);
        if (existingUserId > -1) {
            const user = this.users[existingUserId];
            if (password === user.password) {
                return this.getUser(existingUserId);
            }
            return null;
        }

        const id = this.users.length;
        const user = new User(name, password);
        this.users.push(user);
        this.winners.set(id, 0);

        return this.getUser(id);
    }

    getUser(id: number): UserData {
        return {
            index: id,
            name: this.users[id].name,
        }
    }

    addWinner(id: number): void {
        this.winners.set(id, this.winners.get(id) + 1);
    }

    getWinners(): WinnerData[] {
        return Array.from(this.winners.entries())
            .map(winner => ({ name: this.users[winner[0]].name, wins: winner[1] }))
            .sort((a, b) => a.wins < b.wins ? 1 : -1);
    }

    createRoom(userId: number): boolean {
        if (this.rooms.find((room) => room.userId === userId)) {
            return false;
        }
        this.rooms.push(new Room(userId));
        return true;
    }

    deleteRoom(index: number): void {
        this.rooms.splice(index, 1);
    }

    getRooms(): UpdateRoomResponse['data'] {
        return this.rooms.map((room, index) => {
            return {
                roomId: index,
                roomUsers: [{ index: room.userId }]
            }
        });
    }

    createGame(userId: number, roomId?: number): GameData[] {
        let game: Game;
        const idGame = this.games.length ? this.games[this.games.length - 1].id + 1 : 0;
        if (roomId !== undefined) {
            game = new Game(this.rooms[roomId].userId, userId, idGame);
            this.deleteRoom(roomId);
        } else {
            game = new Game(userId, -1, idGame);
        }
        const userRoomId = this.rooms.findIndex((room) => room.userId === userId);
        if (userRoomId > -1) {
            this.deleteRoom(userRoomId);
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