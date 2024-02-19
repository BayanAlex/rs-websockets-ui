import { Controller } from './controller/controller';
import { DB } from './db';
import { WsServer } from './server';

export class App {
    constructor(port: number) {
        const db = new DB();
        const controller = new Controller(db);
        new WsServer(port, controller);
    }
}
