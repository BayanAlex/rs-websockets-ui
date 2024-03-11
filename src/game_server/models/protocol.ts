export type FeRequest = RegRequest | CreateRoomRequest | AddUserToRoomRequest | AddUserToRoomRequest | AddShipsRequest | AttackRequest | RandomAttackRequest | SinglePlayRequest;
export type FeResponse = RegResponse | UpdateWinnersResponse | CreateGameResponse | UpdateRoomResponse | StartGameResponse | AttackResponse | TurnResponse | WinResponse;
export type FeRequestData = FeRequest['data'];
export type FeReponseType = FeResponse['type'];
export type FeReponseData = FeResponse['data'];
export type ShipStatus = 'miss' | 'killed' | 'shot';

export interface RegRequest {
    type: 'reg';
    data: {
        name: string;
        password: string;
    };
    id: 0;
}

export interface UserData {
    name: string;
    index: number;
}

export type RegResponseData = UserData;

export interface RegResponseError {
    error: boolean;
    errorText: string;
}

export interface RegResponse {
    type: 'reg';
    data: RegResponseData | RegResponseError;
    id: 0;
}

export interface WinnerData {
    name: string;
    wins: number;
}

export interface UpdateWinnersResponse {
    type: 'update_winners';
    data: WinnerData[];
    id: 0;
}

export interface CreateRoomRequest {
    type: 'create_room';
    data: '';
    id: 0;
}

export interface AddUserToRoomRequest {
    type: 'add_user_to_room';
    data: {
        indexRoom: number;
    };
    id: 0;
}

export interface GameData {
    idGame: number;  
    idPlayer: number;
}

export interface CreateGameResponse {
    type: 'create_game';
    data: GameData;
    id: 0;
}

export interface UpdateRoomResponse {
    type: 'update_room';
    data: {
        roomId: number;
        roomUsers: {
            name?: string;
            index: number;
        }[];
    }[];
    id: 0;
}

export interface ShipData {
    position: {
        x: number;
        y: number;
    };
    direction: boolean;
    length: number;
    type?: 'small' | 'medium' | 'large' | 'huge';
}

export interface AddShipsRequestData {
    gameId: number;
    ships: ShipData[];
    indexPlayer: number;
}

export interface AddShipsRequest {
    type: 'add_ships';
    data: AddShipsRequestData;
}

export interface StartGameResponse {
    type: 'start_game';
    data: {
        ships: ShipData[];
        currentPlayerIndex: number;
    };
    id: 0;
}

export interface AttackRequest {
    type: 'attack';
    data: {
        gameId: number;
        x: number;
        y: number;
        indexPlayer: number;
    };
    id: 0;
}

export interface AttackResponse {
    type: 'attack';
    data: {
        position: {
            x: number;
            y: number;
        };
        currentPlayer: number;
        status: ShipStatus;
    };
    id: 0;
}

export interface RandomAttackRequest {
    type: 'randomAttack';
    data: {
        gameId: number;
        indexPlayer: number;
    };
    id: 0;
}

export interface TurnResponse {
    type: 'turn';
    data: {
        currentPlayer: number;
    };
    id: 0;
}

export interface WinResponse {
    type: 'finish';
    data: {
        winPlayer: number;
    };
    id: 0;
}

export interface SinglePlayRequest {
    type: 'single_play';
    data: '';
    id: 0;
}

