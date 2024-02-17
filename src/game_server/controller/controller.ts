import { DB } from "../db";
import { Game } from "./game";

class Session {
    constructor(public id: number, public userIndex: number) { }
}

class Sessions {
    sessions: Session[] = [];

    addSession(userIndex: number) {
        const lastId = this.sessions[this.sessions.length - 1]?.id;
        const id = lastId !== undefined ? lastId + 1 : 0;
        this.sessions.push(new Session(id, userIndex));
        return id;
    }

    deleteSession(id: number) {
        this.sessions.splice(this.sessions.findIndex((session) => session.id === id), 1);
    }

    getUserIndex(id: number) {
        return this.sessions.find((session) => session.id === id).userIndex;
    }
}

export class Controller {
    sessions = new Sessions();

    constructor(private db: DB) { }

    public processRequest(userIndex: number | null, request: any) {
        const dataObj = JSON.parse(request.toString());
        if (dataObj.data) {
            dataObj.data = JSON.parse(dataObj.data);
        }

        const responses: any[] = [];
        let players;
        let player1: number;
        let player2: number;
        let result: any;
        let game: Game;
        switch (dataObj.type) {
            case 'reg':
                const user = this.db.regUser(dataObj.data.name, dataObj.data.password);
                if (!user) {
                    const data = {
                        error: true,
                        errorText: 'Wrong name and password for existing user',
                    };
                    responses.push(this.makeResponse('reg', data));
                    break;
                }
                const sessionId = this.sessions.addSession(user.index);
                user.index = sessionId;
                responses.push(this.makeResponse('reg', user));
                responses.push(this.makeResponse('update_room', this.getRooms(), 'broadcast'));
                responses.push(this.makeResponse('update_winners', this.db.getWinners(), 'broadcast'));
                break;

            case 'create_room':
                if (this.db.createRoom(userIndex)) {
                    responses.push(this.makeResponse('update_room', this.getRooms(), 'broadcast'));
                }
                break;

            case 'add_user_to_room':
                const userInDb = this.sessions.getUserIndex(userIndex);
                const roomUsers = this.getRooms()[dataObj.data.indexRoom].roomUsers;
                const sameUser = this.sessions.getUserIndex(roomUsers[0].index) === userInDb;
                if (sameUser) {
                    break;
                }
                players = this.db.createGame(userIndex, dataObj.data.indexRoom);

                responses.push(this.makeResponse('update_room', this.getRooms(), 'broadcast'));
                [ player1, player2 ] = players.map((player) => player.idPlayer);
                responses.push(this.makeResponse('create_game', players[0], [player1]));
                responses.push(this.makeResponse('create_game', players[1], [player2]));
                break;

            case 'add_ships':
                game = this.db.games[dataObj.data.gameId];
                result = game.addShips(dataObj.data.indexPlayer, dataObj.data.ships);
                if (!result) {
                    break;
                }

                players = result.playersData;
                [ player1, player2 ] = players.map((player: any) => player.currentPlayerIndex);
                responses.push(this.makeResponse('start_game', players[0], [player1]));
                responses.push(this.makeResponse('start_game', players[1], [player2]));
                responses.push(this.makeResponse('turn', result.turn, [player1, player2]));
                break;

            case 'attack':
            case 'randomAttack':
                const { gameId, x, y, indexPlayer } = dataObj.data;
                game = this.db.games[gameId];
                result = dataObj.type === 'attack' ?  game.attack(indexPlayer, x, y) : game.randomAttack(indexPlayer);
                if (!result) {
                    break;
                }

                players = game.getPlayers();
                for (const cell of result.cells) {
                    responses.push(this.makeResponse('attack', cell, players));
                }
                
                if (result.win) {
                    this.db.addWinner(this.sessions.getUserIndex(userIndex));
                    responses.push(this.makeResponse('update_winners', this.db.getWinners(), 'broadcast'));
                    responses.push(this.makeResponse('finish', result.win, players));
                    this.db.deleteGame(game.id);
                } else {
                    responses.push(this.makeResponse('turn', result.turn, players));
                }
                break;
        }

        return responses;
    }

    private getRooms() {
        const rooms = this.db.getRooms();
        for (const room of rooms) {
            (room as any).roomUsers[0].name = this.db.getUser(this.sessions.getUserIndex(room.roomUsers[0].index)).name;
        }
        return rooms;
    }

    private makeResponse(type: string, data: any, receivers?: number[] | 'broadcast') {
        return {
            receivers,
            payload: {
                type,
                data,
                id: 0
            }
        };
    }

    closeUserSessions(userIndex: number) {
        const roomId = this.getRooms().find((room) => room.roomUsers[0].index === userIndex)?.roomId;
        if (roomId !== undefined) {
            this.db.deleteRoom(roomId);
            return [this.makeResponse('update_room', this.getRooms(), 'broadcast')];
        }

        const game = this.db.games.find((game) => game.getPlayers().find((player) => player === userIndex));
        if (game !== undefined) {
            const responses: any[] = [];
            const opponent = game.getOpponent(userIndex);
            this.db.addWinner(this.sessions.getUserIndex(opponent));
            responses.push(this.makeResponse('update_winners', this.db.getWinners(), 'broadcast'));
            responses.push(this.makeResponse('finish', { winPlayer: opponent }, [opponent]));
            this.db.deleteGame(game.id);
            return responses;
        }

        return [];
    }
}