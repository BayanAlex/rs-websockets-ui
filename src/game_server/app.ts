import { Controller } from "./modules/controller/controller";
import { DB } from "./modules/db";
import { WsServer } from "./modules/server";

export class App {
    constructor(port: number) {
        const db = new DB();
        const controller = new Controller(db);
        new WsServer(port, controller);
    }
}
