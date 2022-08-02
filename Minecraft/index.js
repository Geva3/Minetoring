import FirebaseService from './services/firebase/firebase.service.js';
import FileService from "./services/file/file.service.js";
import ServerService from "./services/server/server.service.js";

const exitHandler = async () => {
    ServerService.getInstance().killServer().then(() => {
        process.exit();
    });
}

process.on('SIGINT', exitHandler.bind(null));

process.on('SIGUSR1', exitHandler.bind(null));
process.on('SIGUSR2', exitHandler.bind(null));

process.on('uncaughtException', exitHandler.bind(null));

function main() {
    FirebaseService.getInstance().initializeApp();
    FileService.getInstance().createSchedule();

    const serverService = ServerService.getInstance();
    serverService.createSchedule();
    serverService.spawnServer();
}

main();
