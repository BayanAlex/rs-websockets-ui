import { WebSocket, WebSocketServer } from "ws";
import { delay } from "./utils";
import { Controller } from "./controller/controller";
import { RegResponseError, RegResponseData } from "./models/protocol";
import { ResponseObj } from "./models/controller";

const BOT_SHOT_DELAY = 500;

class WsClient {
    constructor(public ws: WebSocket, public index: number) {}
}

class WsClients {
    private clients: WsClient[] = [];

    add(ws: WebSocket, index: number) {
        this.clients.push(new WsClient(ws, index));
    }

    getIndex(ws: WebSocket) {
        return this.clients.find(client => client.ws === ws)?.index ?? null;
    }

    getWs(index: number) {
        return this.clients.find(client => client.index === index)?.ws;
    }

    delete(ws: WebSocket) {
        const i = this.clients.findIndex(client => client.ws === ws);
        this.clients.splice(i, 1);
    }

    getAllWs() {
        return this.clients.map(client => client.ws);
    }
}

export class WsServer {
    private wsServer: WebSocketServer;
    private clients: WsClients = new WsClients();

    constructor(port: number, private controller: Controller) {
        this.initServer(port);
    }

    private initServer(port: number): void {
        this.wsServer = new WebSocketServer({ port });
        
        const sendResponse = async (socket: WebSocket, response: ResponseObj) => {
            if (response.delay) {
                await delay(BOT_SHOT_DELAY);
            }
            const sendData = { ...response.payload };
            (sendData as any).data = JSON.stringify(sendData.data);
            const errorMsg = 'Error during sending data';
            try {
                if (socket) {
                    socket.send(JSON.stringify(sendData));
                } else {
                    console.log(errorMsg);
                }
            } catch (error) {
                console.log(errorMsg);
                return;
            }

            if (response.receivers !== 'broadcast') {
                console.log(`<- Sent to client id ${this.clients.getIndex(socket)}:`, response.payload, '\n');
            }
        };
        
        this.wsServer.on('listening', () => {
            console.log(`Started WS server on the ${port} port`);
        });

        this.wsServer.on('connection', (ws) => {
            console.log(`New client connected`);
            let mute = false;

            ws.on('error', (error) => {
                console.error(error);
                ws.close();
            });
            
            ws.on('message', async (data: string) => {
                const clientId = this.clients.getIndex(ws);
                console.log(`-> Received${clientId >= 0 ? ` from client id ${clientId}` : ''}:`, JSON.parse(data.toString()), '\n');

                if (mute) {
                    return;    
                }

                mute = true;
                const id = this.clients.getIndex(ws);
                const responses = this.controller.processRequest(id, data);
                for (let i = 0; i < responses.length; i += 1) {
                    const response = responses[i];

                    if (response.payload.type === 'reg' && !(response.payload.data as RegResponseError).error) {
                        this.clients.add(ws, (response.payload.data as RegResponseData).index);
                    }

                    if (!response.receivers.length) {
                        await sendResponse(ws, response);
                        continue;
                    }
                    
                    if (response.receivers === 'broadcast') {
                        this.clients.getAllWs().forEach(async (ws) => await sendResponse(ws, response));
                        console.log(`<- Broadcast:`, response.payload, '\n');
                    } else {
                        for (const receiverId of response.receivers) {
                            await sendResponse(this.clients.getWs(receiverId), response);
                        }
                    }
                }
                mute = false;
            });

            ws.on('close', async () => {
                const userId = this.clients.getIndex(ws);
                this.clients.delete(ws);
                console.log(`Client ${userId !== null ? `id ${userId} ` : ''}disconnected`);
                const responses = this.controller.closeUserSessions(userId);
                for (const response of responses) {
                    if (response.receivers === 'broadcast') {
                        this.clients.getAllWs().forEach(ws => sendResponse(ws, response));
                        console.log(`<- Broadcast:`, response.payload, '\n');
                    } else {
                        for (const receiverId of response.receivers) {
                            await sendResponse(this.clients.getWs(receiverId), response);
                        }
                    }
                }
            });

        });
    }
}