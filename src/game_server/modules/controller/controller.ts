import { DB } from "../db";
import { ResponseObj } from "../../models/controller";
import { AddShipsResult, AttackResult } from "../../models/game";
import { 
    CreateGameResponse, 
    FeReponseData, 
    FeReponseType, 
    FeRequest, 
    FeResponse, 
    UpdateRoomResponse 
} from "../../models/protocol";
import { Bot } from "./bot";
import { Game } from "./game";

class Session {
    constructor(public id: number, public userId: number) {}
}

class Sessions {
    sessions: Session[] = [];

    addSession(userId: number) {
        const lastId = this.sessions[this.sessions.length - 1]?.id;
        const id = lastId !== undefined ? lastId + 1 : 0;
        this.sessions.push(new Session(id, userId));

        return id;
    }

    deleteSession(id: number) {
        this.sessions.splice(this.sessions.findIndex((session) => session.id === id), 1);
    }

    getUserId(id: number) {
        return this.sessions.find((session) => session.id === id).userId;
    }
}

export class Controller {
    sessions = new Sessions();
    bots = new Map<number, Bot>();

    constructor(private db: DB) {}

    public processRequest(userId: number | null, request: FeRequest): ResponseObj[] {
        const responses: ResponseObj[] = [];
        let players: number[] | AddShipsResult['playersData'] | CreateGameResponse['data'][];
        let player1: number;
        let player2: number;
        let result: AddShipsResult | AttackResult;
        let game: Game;
        switch (request.type) {
            case 'reg':
                const user = this.db.regUser(request.data.name, request.data.password);
                if (!user) {
                    const data = {
                        error: true,
                        errorText: 'Wrong name and password for existing user',
                    };
                    responses.push(this.makeResponse('reg', data, []));
                    break;
                }

                const sessionId = this.sessions.addSession(user.index);
                user.index = sessionId;
                responses.push(this.makeResponse('reg', user, []));
                responses.push(this.makeResponse('update_room', this.getRooms(), 'broadcast'));
                responses.push(this.makeResponse('update_winners', this.db.getWinners(), 'broadcast'));
                break;

            case 'create_room':
                if (this.db.createRoom(userId)) {
                    responses.push(this.makeResponse('update_room', this.getRooms(), 'broadcast'));
                }
                break;

            case 'add_user_to_room':
                const userInDb = this.sessions.getUserId(userId);
                const roomUsers = this.getRooms()[request.data.indexRoom].roomUsers;
                const sameUser = this.sessions.getUserId(roomUsers[0].index) === userInDb;
                if (sameUser) {
                    break;
                }
                players = this.db.createGame(userId, request.data.indexRoom);

                responses.push(this.makeResponse('update_room', this.getRooms(), 'broadcast'));
                [ player1, player2 ] = players.map((player) => player.idPlayer);
                responses.push(this.makeResponse('create_game', players[0], [player1]));
                responses.push(this.makeResponse('create_game', players[1], [player2]));
                break;

            case 'add_ships':
                game = this.db.games[request.data.gameId];
                if (!game) {
                    break;
                }
                result = game.addShips(request.data.indexPlayer, request.data.ships);
                if (!result) {
                    break;
                }

                players = result.playersData;
                [ player1, player2 ] = players.map((player: any) => player.currentPlayerIndex);
                responses.push(this.makeResponse('start_game', players[0], [player1]));
                if (player2 !== Bot.id) {
                    responses.push(this.makeResponse('start_game', players[1], [player2]));
                }
                responses.push(this.makeResponse('turn', result.turn, [player1, player2]));
                break;

            case 'attack':
            case 'randomAttack':
                const { gameId, indexPlayer } = request.data;
                game = this.db.games[gameId];
                if (!game) {
                    break;
                }

                result = request.type === 'attack' ? game.attack(indexPlayer, request.data.x, request.data.y) : game.randomAttack(indexPlayer);
                if (!result) {
                    break;
                }

                players = game.getPlayers();
                for (const cell of result.cells) {
                    responses.push(this.makeResponse('attack', cell, players));
                    responses.push(this.makeResponse('turn', result.turn, players));
                }

                if (result.win) {
                    const winPlayer = result.win.winPlayer;
                    this.db.addWinner(this.sessions.getUserId(winPlayer));
                    responses.push(this.makeResponse('update_winners', this.db.getWinners(), 'broadcast'));
                    responses.push(this.makeResponse('finish', result.win, players));
                    if (game.gameWithBot) {
                        this.bots.delete(game.id);
                    }
                    this.db.deleteGame(game.id);
                } else {
                    if (result.turn.currentPlayer === Bot.id) {
                        const bot = this.bots.get(game.id);
                        result = bot.attack();
                        for (let i = 0; i < result.cells.length; i += 1) {
                            const cell = result.cells[i];
                            const turn = i === result.cells.length - 1 ? userId : Bot.id;

                            const status = cell.status;
                            let delay = false;
                            if (status === 'shot' || status === 'killed' || (status ==='miss' && i === result.cells.length - 1)) {
                                delay = true;
                            }
                    
                            responses.push(this.makeResponse('attack', cell, players, delay));
                            responses.push(this.makeResponse('turn', { currentPlayer: turn }, players));
                        }
                        if (result.win) {
                            responses.push(this.makeResponse('finish', result.win, players));
                            this.bots.delete(game.id);
                            this.db.deleteGame(game.id);
                        }
                    }
                }
                break;

            case 'single_play':
                const gameData = this.db.createGame(userId);
                game = this.db.getGame(gameData[0].idGame);
                const bot = new Bot(game);
                this.bots.set(game.id, bot);
                responses.push(this.makeResponse('create_game', gameData[0], [userId]));
                responses.push(this.makeResponse('update_room', this.getRooms(), 'broadcast'));
                break;
        }

        return responses;
    }

    private getRooms(): UpdateRoomResponse['data'] {
        const rooms = this.db.getRooms();
        for (const room of rooms) {
            room.roomUsers[0].name = this.db.getUser(this.sessions.getUserId(room.roomUsers[0].index)).name;
        }

        return rooms;
    }

    private makeResponse(type: FeReponseType, data: FeReponseData, receivers: number[] | 'broadcast', delay?: boolean): ResponseObj {
        if (Array.isArray(receivers) && receivers.includes(Bot.id)) {
            receivers.splice(receivers.indexOf(Bot.id), 1);
        }

        return {
            delay: !!delay,
            receivers,
            payload: {
                type,
                data,
                id: 0
            } as FeResponse
        };
    }

    closeUserSessions(userId: number): ResponseObj[] {
        const roomId = this.getRooms().find((room) => room.roomUsers[0].index === userId)?.roomId;
        if (roomId !== undefined) {
            this.db.deleteRoom(roomId);
            return [this.makeResponse('update_room', this.getRooms(), 'broadcast')];
        }

        const game = this.db.games.find((game) => game.getPlayers().includes(userId));
        if (game !== undefined) {
            if (game.gameWithBot) {
                this.db.deleteGame(game.id);
                this.bots.delete(game.id);
                return [];
            }

            const responses: ResponseObj[] = [];
            const opponent = game.getOpponent(userId);
            this.db.addWinner(this.sessions.getUserId(opponent));
            responses.push(this.makeResponse('update_winners', this.db.getWinners(), 'broadcast'));
            responses.push(this.makeResponse('finish', { winPlayer: opponent }, [opponent]));
            this.db.deleteGame(game.id);
            return responses;
        }

        return [];
    }
}