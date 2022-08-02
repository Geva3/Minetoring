import * as childProcess from 'child_process';
import FirestoreService from "../firebase/firestore.service.js";
import cron from "node-cron";
import FileUtils from "../../utils/file.utils.js";
import fs from "fs";
import StorageService from "../firebase/storage.service.js";

const CommandsQueueStatus = Object.freeze({
    QUEUE_RUNNING: 0,
    SERVER_NOT_STARTED: 1,
    SUCCESS: 2
})

class ServerService {
    static _instance;
    static getInstance() {
        if (!this._instance) {
            this._instance = new ServerService();
        }
        return this._instance;
    }

    static analiseMessage(data) {
        const serverService = ServerService.getInstance();

        const message = data.toString();
        serverService.messagePool.push(message);

        if (!serverService.serverStarted) {
            if (/^\[(\d{2}:\d{2}:\d{2})] \[Server thread\/INFO]: Done \(\d+\.\d+s\)! For help, type "help"\n?$/m.test(message)) {
                serverService.serverStarted = true;
                let startTime = (message.match(/^\[(\d{2}:\d{2}:\d{2})] \[Server thread\/INFO]: Done \(\d+\.\d+s\)! For help, type "help"\n?$/m)[1]).split(':');
                console.log(`Server started at: ${startTime[0]}h ${startTime[1]}min ${startTime[2]}s (${new Date().toString()})`);
                console.log(`Running startup commands`);

                serverService.updateServerStatus('ONLINE', 'Server status update on server start');

                serverService.runStartupCommands().then(() => {
                    serverService.startupCommandsExecuted = true;
                    console.log('All startup commands have been executed')
                    return serverService.runCommandQueue();
                }).then((commandsQueueStatus) => {
                    switch (commandsQueueStatus) {
                        case CommandsQueueStatus.SUCCESS:
                            console.log('Current commands queue have been cleaned');
                            break;
                        case CommandsQueueStatus.QUEUE_RUNNING:
                            console.log('Cannot run commands queue because another queue is running');
                            break;
                        case CommandsQueueStatus.SERVER_NOT_STARTED:
                            console.log('Cannot run commands queue because the server has not started yet');
                            break;
                    }
                });
                return;
            }
        }

        if (/^\[\d{2}:\d{2}:\d{2}] \[Server thread\/INFO]: (.*) logged in with entity id (.*) at \(-?\d+\.?\d+, -?\d+\.?\d+, -?\d+\.?\d+\)\n?$/m.test(message)) {
            const playerData = message.match(/^\[\d{2}:\d{2}:\d{2}] \[Server thread\/INFO]: (.*) logged in with entity id .* at \(-?\d+\.?\d+, -?\d+\.?\d+, -?\d+\.?\d+\)\n?$/m);
            serverService.players.push({
                name: playerData[1].replace('[local]', ''),
                isLocal: playerData[1].indexOf('[local]') !== -1,
            });
            serverService.writeStdin('list uuids');

            console.log('Player ' + playerData[1] + ' joined the server at: ' + new Date().toString());

            return;
        }

        if (/^\[\d{2}:\d{2}:\d{2}] \[Server thread\/INFO]: There are \d+ of a max of \d+ players online: ([a-zA-Z0-9]+ \(.*\),? ?)+\n?$/m.test(message)) {
            const players = message.replace(/^\[\d{2}:\d{2}:\d{2}] \[Server thread\/INFO]: There are \d+ of a max of \d+ players online: /, '').split(', ');
            players.map((player) => {
                const data = player.replace('(', '').replace(')', '').split(' ');
                const name = data[0];
                serverService.players.find((player) => player.name === name).id = data[1].trim();
            });
            return serverService.updateServerStatus('ONLINE', 'Server status update on player joining');
        }

        if (/^\[\d{2}:\d{2}:\d{2}] \[Server thread\/INFO]: (.*) left the game\n?$/m.test(message)) {
            const playerName = message.match(/^\[\d{2}:\d{2}:\d{2}] \[Server thread\/INFO]: (.*) left the game\n?$/m)[1];
            serverService.players.splice(serverService.players.findIndex((player) => player.name === playerName), 1);
            return serverService.updateServerStatus('ONLINE', 'Server status update on player leaving');
        }

        if (/^\[\d{2}:\d{2}:\d{2}] \[pool-\d-thread-\d\/INFO]: \[Textile Backup] Done!\n?$/m.test(message)) {
            serverService.uploadBackupFile().then(() => {
                console.log('Backup upload to cloud completed');
            });
        }
    }

    constructor() {
        this.child = null;
        this.serverStarted = false;
        this.startupCommandsExecuted = false;
        this.messagePool = [];
        this.players = [];
        this.commandsQueue = [];
        this.isScheduleRunning = false;
        this.commandQueueRunning = false;
    }

    createSchedule() {
        console.log('Starting server status schedule, running every 15 minutes')
        cron.schedule('*/15 * * * *',() => {
            console.log('Running server status schedule at ' + new Date().toString());
            console.log('Is there any other server status schedules in progress?');
            if (this.isScheduleRunning) {
                console.log('Running canceled because another server status schedule is still in progress');
                return;
            }
            this.isScheduleRunning = true;
            console.log('No other server status schedules running, starting new schedule');
            const status = this.child ? this.serverStarted ? 'ONLINE' : 'STARTING' : 'OFFLINE';
            return this.updateServerStatus(status, 'Server status schedule');
        });

        console.log('Starting server backup schedule, running every 6 hours')
        cron.schedule('0 */6 * * *',() => {
            console.log('Running server backup schedule at ' + new Date().toString());
            console.log('Is the server running already?');
            if (!this.serverStarted) {
                console.log('Running canceled because the server has not started yet');
                return;
            }
            console.log('Is there any other server backup schedules in progress?');
            if (this.currentBackupName) {
                console.log('Running canceled because another server backup schedule is still in progress');
                return;
            }
            this.currentBackupName = `${Date.now()}`;
            console.log('No other server backup schedules running, starting new schedule');
            return this.runCommand({
                command: `backup start ${this.currentBackupName}`,
                delay: 0,
            })
        });
    }

    updateServerStatus(status, message) {
        return FirestoreService.getInstance().saveServerStatus({ status, players: this.players }).then(() => {
            console.log(message + ' ended with success at ' + new Date().toString());
        }).catch((e) => {
            console.log(e);
            console.log(message + ' ended with errors at ' + new Date().toString());
        });
    }

    async uploadBackupFile() {
        if (!this.currentBackupName) {
            return;
        }

        let files = fs.readdirSync(FileUtils.baseDirectory + '/backup/world');
        let file = files.find(file => file.indexOf(this.currentBackupName) !== -1);

        console.log('Uploading backup file to storage, this may take a while');
        return StorageService.getInstance().uploadFile(file, fs.readFileSync(FileUtils.baseDirectory + '/backup/world/' + file), 'backup').then(() => {
            this.currentBackupName = undefined;
            console.log('Server backup schedule ended with success at ' + new Date().toString());
            this.deleteOldBackups();
        }).catch((e) => {
            this.currentBackupName = undefined;
            console.log(e);
            console.log('Server backup schedule ended with errors at ' + new Date().toString());
            this.deleteOldBackups();
        });
    }

    async deleteOldBackups() {
        const files = (await StorageService.getInstance().getFilesAt('backup'))
            .sort(({ metadata: { timeCreated: a } }, { metadata: { timeCreated: b } }) => new Date(b) - new Date(a));

        console.log('Deleting backups if more than 3 in storage');
        if (files.length > 3) {
            while (files.length > 3) {
                const file = files.pop();
                await file.delete();
            }
        }
        console.log('Deleted backups in storage');
    }

    spawnServer() {
        console.log('Starting server, is there another server running?');
        if (this.child) {
            console.log('Server already started, canceling startup');
            return;
        }
        console.log('No other server running, starting new server');
        this.child = childProcess.spawn(
            'java',
            ['-Xmx12288M', '-Xms1024M', '-jar', FileUtils.baseDirectory + '/fabric-server-launch.jar', 'nogui'],
            { cwd: FileUtils.baseDirectory }
        );
        this.child.unref();

        this.child.stdout.on('data', ServerService.analiseMessage);

        this.child.stdout.on('error', (data) => {
            console.error(`stderr: ${data}`);
        });

        this.child.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        this.commandsObserver = FirestoreService.getInstance().getCommandsCollection().onSnapshot(snapshot => {
            let addedDocs = false;

            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const command = change.doc.data();
                    console.log('New command added to queue: ', command.command);
                    this.commandsQueue.push({ ...command, ref: change.doc.ref });
                    addedDocs = true;
                }
            });

            if (addedDocs) {
                this.runCommandQueue().then((commandsQueueStatus) => {
                    switch (commandsQueueStatus) {
                        case CommandsQueueStatus.SUCCESS:
                            console.log('Current commands queue have been cleaned');
                            break;
                        case CommandsQueueStatus.QUEUE_RUNNING:
                            console.log('Cannot run commands queue because another queue is running');
                            break;
                        case CommandsQueueStatus.SERVER_NOT_STARTED:
                            console.log('Cannot run commands queue because the server has not started yet');
                            break;
                    }
                });
            }
        }, e => {
            console.log(e);
            console.log('Error listening for commands');
        });
    }

    killServer() {
        if (!this.child) {
            console.log('No server running, stopping');
            return Promise.resolve();
        }
        return new Promise(resolve => {
            console.log('Stopping server gracefully');

            this.writeStdin('stop');
            this.child.on('close', async () => {
                console.log('Server stopped');
                if (this.commandsObserver) {
                    this.commandsObserver();
                }
                this.serverStarted = false;
                this.startupCommandsExecuted = false;
                this.messagePool = [];
                this.players = [];
                this.child = null;

                await this.updateServerStatus('OFFLINE', 'Server status update on server stop');
                resolve();
            });
        });
    }

    runStartupCommands() {
        return new Promise(async resolve => {
            const commands = (await FirestoreService.getInstance().getStartupCommands()).sort(({position: a}, {position: b}) => a - b);
            for (const command of commands) {
                await this.runCommand(command);
            }
            resolve();
        })
    }

    async runCommandQueue() {
        if (this.commandQueueRunning) {
            return CommandsQueueStatus.QUEUE_RUNNING;
        } else if (!this.serverStarted || !this.startupCommandsExecuted) {
            return CommandsQueueStatus.SERVER_NOT_STARTED;
        }

        this.commandQueueRunning = true;
        while (this.commandsQueue.length > 0) {
            const command = this.commandsQueue.shift();
            await this.runCommand(command);
            await command.ref.set({ executedAt: new Date() }, { merge: true });
        }

        return CommandsQueueStatus.SUCCESS;
    }

    runCommand(command = { command: '', position: 0, delay: 0 }) {
        console.log('Running command: ' + command.command)
        this.writeStdin(command.command);
        return new Promise(resolve => {
            setTimeout(() => resolve(), command.delay);
        });
    }

    writeStdin(data) {
        this.child.stdin.write(data + '\n');
    }
}

export default ServerService
