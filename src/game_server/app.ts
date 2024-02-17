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
        return this.clients.find(client => client.ws === ws)?.index ?? null;
    }

    getWs(index: number) {
        return this.clients.find(client => client.index === index).ws;
    }

    delete(ws: WebSocket) {
        const i = this.clients.findIndex(client => client.ws === ws);
        this.clients.splice(i, 1);
    }

    getAllWs() {
        return this.clients.map(client => client.ws);
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
        
        const sendResponse = (socket: WebSocket, response: any) => {
            const dataStr = JSON.stringify(response.payload);
            socket.send(dataStr);
            if (!response.broadcast) {
                console.log(`<- Send to client id ${this.clients.getIndex(socket)}:`, response.payload, '\n');
            }
        };
        
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

                const id = this.clients.getIndex(ws);
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
                const userId = this.clients.getIndex(ws);
                this.clients.delete(ws);
                console.log(`Client ${userId >= 0 ? `id ${userId} ` : ''}disconnected`);
                const responses = this.controller.closeUserSessions(userId);
                for (const response of responses) {
                    response.payload.data = JSON.stringify(response.payload.data);
                    
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

        });
    }
}