import { DB } from "../db";

export class Controller {
    constructor(private db: DB) { }

    public processRequest(userIndex: number | null, request: any) {
        const dataObj = JSON.parse(request.toString());
        if (dataObj.data) {
            dataObj.data = JSON.parse(dataObj.data);
        }

        const responses: any[] = [];
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
                const game = this.db.createGame(userIndex, dataObj.data.indexRoom);
                responses.push(this.makeResponse('update_room', this.db.getRooms(), 'broadcast'));
                responses.push(this.makeResponse('create_game', game, this.db.getGamePlayers(game.idGame)));
                break;

            case 'add_ships':
                this.db.addShips(dataObj.data.gameId, dataObj.data.indexPlayer, dataObj.data.ships);

                break;
        }

        return responses;
    }

    private makeResponse(type: string, data: any, receivers?: number[] | 'broadcast') {
        return {
            receivers,
            payload: {
                type: type,
                data,
                id: 0
            }
        };
    }
}