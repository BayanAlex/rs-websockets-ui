import { DB } from "../db";
import { Bot } from "./bot";
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
    bots = new Map<number, Bot>();

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
                if (!game) {
                    break;
                }
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
                if (!game) {
                    break;
                }

                result = dataObj.type === 'attack' ? game.attack(indexPlayer, x, y) : game.randomAttack(indexPlayer);
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
                    // if (winPlayer !== Bot.id) {
                        this.db.addWinner(this.sessions.getUserIndex(winPlayer));
                        responses.push(this.makeResponse('update_winners', this.db.getWinners(), 'broadcast'));
                    // }
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
                            const turn = i === result.cells.length - 1 ? userIndex : Bot.id;

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
                const gameData = this.db.createGame(userIndex);
                game = this.db.getGame(gameData[0].idGame);
                const bot = new Bot(game);
                this.bots.set(game.id, bot);
                responses.push(this.makeResponse('create_game', gameData[0], [userIndex]));
                responses.push(this.makeResponse('update_room', this.getRooms(), 'broadcast'));
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

    private makeResponse(type: string, data: any, receivers: number[] | 'broadcast', delay?: boolean) {
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
            }
        };
    }

    closeUserSessions(userIndex: number) {
        const roomId = this.getRooms().find((room) => room.roomUsers[0].index === userIndex)?.roomId;
        if (roomId !== undefined) {
            this.db.deleteRoom(roomId);
            return [this.makeResponse('update_room', this.getRooms(), 'broadcast')];
        }

        const game = this.db.games.find((game) => game.getPlayers().includes(userIndex));
        if (game !== undefined) {
            if (game.gameWithBot) {
                this.db.deleteGame(game.id);
                this.bots.delete(game.id);
                return [];
            }

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