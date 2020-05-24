const childProcess = require('child_process');
const moment = require('moment');
let child;

let messagePool = [];

exports.spawnServer = () => {
    if(child) {
        return Promise.reject({message: 'Server already started'});
    }
    child = childProcess.spawn('java', ['-jar', './server.jar', 'nogui'], {
        detached: true
    });
    child.unref();

    child.stdout.on('data', readStdout);

    child.stdout.on("error", err => console.log(err));

    return awaitStart();
};

function awaitStart() {
    return new Promise(resolve => {
        let interval = setInterval(() => {
            let message = messagePool.find((message) => /^\[(\d{2}:\d{2}:\d{2})] \[Server thread\/INFO]: Done \(\d+\.\d+s\)! For help, type "help"\n?$/.test(message));
            if (message) {
                clearInterval(interval);
                let startTime = (message.match(/^\[(\d{2}:\d{2}:\d{2})] \[Server thread\/INFO]: Done \(\d+\.\d+s\)! For help, type "help"\n?$/)[1]).split(':');
                resolve(`Server started at: ${startTime[0]}h ${startTime[1]}min ${startTime[2]}s`);
            }
        }, 500);
    });
}

function readStdout(data) {
    messagePool.push(data.toString());
}

function writeStdin(data) {
    child.stdin.write(data);
}

exports.killServer = () => {
    if(!child) {
        return Promise.resolve();
    }
    return new Promise(resolve => {
        console.log('Stopping server gracefully');

        writeStdin("stop\n");
        child.on('close', () => {
            child = null;
            resolve();
        });
    });
};
