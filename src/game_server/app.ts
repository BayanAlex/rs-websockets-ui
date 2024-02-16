import { WebSocket, WebSocketServer } from 'ws';
import { Controller } from './controller/controller';
import { DB } from './db';

interface WsClient {
    ws: WebSocket,
    index: number
}

class WsClients {
    private clients: WsClient[] = [];

    add(ws: WebSocket, index: number) {
        this.clients.push({ ws, index });
    }

    getIndex(ws: WebSocket) {
        return this.clients.findIndex(v => v.ws === ws);
    }

    getWs(index: number) {
        return this.clients.find(v => v.index === index).ws;
    }

    delete(ws: WebSocket) {
        const i = this.clients.findIndex(v => v.ws === ws);
        this.clients.splice(i, 1);
    }

    getAllWs() {
        return this.clients.map(v => v.ws);
    }
}

export class App {
    private wsServer: WebSocketServer;
    private controller: Controller;
    private clients: WsClients;
    private db: DB;

    constructor(port: number) {
        this.db = new DB();
        this.controller = new Controller(this.db);
        this.clients = new WsClients();
        this.initServer(port);
    }
    
    private initServer(port: number) {
        this.wsServer = new WebSocketServer({ port });
        
        this.wsServer.on('listening', () => {
            console.log(`Started WS server on the ${port} port`);
        });

        this.wsServer.on('connection', (ws) => {
            console.log(`New client connected`);

            ws.on('error', (error) => {
                ws.close();
                console.error(error);
            });
            
            ws.on('message',(data) => {
                const clientId = this.clients.getIndex(ws);
                console.log(`-> Received${clientId >= 0 ? ` from client id ${clientId}` : ''}:`, JSON.parse(data.toString()), '\n');

                const sendResponse = (socket: WebSocket, response: any) => {
                    const dataStr = JSON.stringify(response.payload);
                    socket.send(dataStr);
                    if (!response.broadcast) {
                        console.log(`<- Send to client id ${this.clients.getIndex(ws)}:`, response.payload, '\n');
                    }
                };
                const id = this.clients.getIndex(ws) ?? null;
                const responses = this.controller.processRequest(id, data);
                for (const response of responses) {
                    if (response.payload.type === 'reg' && !response.payload.data.error) {
                        this.clients.add(ws, response.payload.data.index);
                    }
                    response.payload.data = JSON.stringify(response.payload.data);

                    if (!response.receivers) {
                        sendResponse(ws, response);
                        continue;
                    }
                    
                    if (response.receivers === 'broadcast') {
                        this.clients.getAllWs().forEach(ws => sendResponse(ws, response));
                        console.log(`<- Broadcast:`, response.payload, '\n');
                    } else {
                        for (const receiverId of response.receivers) {
                            sendResponse(this.clients.getWs(receiverId), response);
                        }
                    }
                }
            });

            ws.on('close', () => {
                const id = this.clients.getIndex(ws);
                console.log(`Client ${id >= 0 ? `id ${id} ` : ''}disconnected`);
                this.clients.delete(ws);
            });
        });
    }
}