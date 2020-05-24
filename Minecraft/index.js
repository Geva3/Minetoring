const express = require('express');
const server = express();

const serverData = require('./server/services/file.service');
const childService = require('./server/services/child.service');

process.on('SIGINT', async () => {
    childService.killServer().then(() => {
        process.exit(0);
    })
});

server.get('/:command', async (req, res) => {
    res.status(200).send(await awaitData(start));
});

server.get('/server/info', async (req, res) => {
    console.log('chegou');
    let serverDado = await serverData.getServerFileInfo();
    console.log('finalmente carai');
    res.status(200).send(serverDado);
});

server.get('/server/start', (req, res) => {
    childService.spawnServer().then((response) => {
        res.status(200).send({message: response});
    }).catch(err => {
        res.status(500).send({message: err.message});
    });
});

server.get('/server/stop', (req, res) => {
    childService.killServer().then(() => {
        res.status(200).send({message: 'Server stopped successfully'});
    }).catch((err) => {
        res.status(500).send({message: err.message});
    })
});

server.listen(7001);

function awaitData() {
    //todo get server message correctly
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(message.trim());
        }, 500)
    });
}
