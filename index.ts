import { httpServer } from "./src/http_server/index";
import { App } from './src/game_server/app'

const HTTP_PORT = 8181;
const GAME_PORT = 3000;

new App(GAME_PORT);
httpServer.listen(HTTP_PORT, () => {
    console.log(`Started static HTTP server on the ${HTTP_PORT} port`);
});
