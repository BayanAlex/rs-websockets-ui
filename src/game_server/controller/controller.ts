import { DB } from "../db";
import { Game } from "./game";

export class Controller {
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
                responses.push(this.makeResponse('reg', user));
                responses.push(this.makeResponse('update_room', this.db.getRooms(), 'broadcast'));
                responses.push(this.makeResponse('update_winners', this.db.getWinners(), 'broadcast'));
                break;

            case 'create_room':
                this.db.createRoom(userIndex);
                responses.push(this.makeResponse('update_room', this.db.getRooms(), 'broadcast'));
                break;

            case 'add_user_to_room':
                players = this.db.createGame(userIndex, dataObj.data.indexRoom);
                if (!players) {
                    break;
                }

                responses.push(this.makeResponse('update_room', this.db.getRooms(), 'broadcast'));
                player1 = players[0].idPlayer;
                player2 = players[1].idPlayer;
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
                player1 = players[0].currentPlayerIndex;
                player2 = players[1].currentPlayerIndex;
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
                    this.db.addWinner(userIndex);
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
        const roomId = this.db.getRooms().find((room) => room.roomUsers.find((user) => user.index === userIndex))?.roomId;
        if (roomId !== undefined) {
            this.db.deleteRoom(roomId);
            return [this.makeResponse('update_room', this.db.getRooms(), 'broadcast')];
        }

        const game = this.db.games.find((game) => game.getPlayers().find((player) => player === userIndex));
        if (game !== undefined) {
            const responses: any[] = [];
            const opponent = game.getOpponent(userIndex);
            this.db.addWinner(opponent);
            responses.push(this.makeResponse('update_winners', this.db.getWinners(), 'broadcast'));
            responses.push(this.makeResponse('finish', { winPlayer: opponent }, [opponent]));
            this.db.deleteGame(game.id);
            return responses;
        }

        return [];
    }
}