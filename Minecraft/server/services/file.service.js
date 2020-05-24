const fs = require('fs');
const path = require('path');
const nbt = require('nbt');
const Long = require('long');

const itemService = require('./requestItem.service');
const mineService = require('./requestMine.service');

async function getPlayerData() {
    let players = {};
    let files = await new Promise((resolve, reject) => {
        fs.readdir(path.join(__dirname, '..', '..', 'world', 'playerdata/'), (err, files) => {
            if (err) return reject(err);
            resolve(files);
        });
    });

    files = files.filter(file => file.endsWith('.dat'));

    let promises = [];

    for (let file of files) {
        let uuid = file.replace(/\.dat/g, '');
        let player = fs.readFileSync(path.join(__dirname, '..', '..', 'world', 'playerdata/', file));
        let stats = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'world', 'stats', uuid + '.json')).toString());

        let littlePromises = [];

        littlePromises.push(new Promise((resolve, reject) => {
            nbt.parse(player, function (error, data) {
                if (error) return reject(error);
                resolve(data);
            });
        }));

        littlePromises.push(mineService.getPlayerBaseInfo(uuid));

        littlePromises.push(mineService.getPlayerFace(uuid.replace(/-?/g, '')));

        promises.push(Promise.all(littlePromises).then((playerInfo) => {
            let playerData = playerInfo[0];
            let playerName = playerInfo[1];
            playerData.value.name = playerName[1] ? playerName[1].name : playerName[0].name;
            players[uuid] = makeReadable(playerData.value);
            players[uuid].face = playerInfo[2];
            players[uuid].stats = stats.stats;
            let inventoryPromises = [];
            for(let item of players[uuid].Inventory) {
                inventoryPromises.push(itemService.getItemBase64(item.id).then((result) => {
                    item.id = result || item.id;
                }));
            }
            return Promise.all(inventoryPromises);
        }));
    }

    await Promise.all(promises);

    players = getPlayerRelevantInfo(players);

    return players;
}

async function getWorldData() {
    let files = await new Promise((resolve, reject) => {
        fs.readdir(path.join(__dirname, '..', '..', 'world/'), (err, files) => {
            if (err) return reject(err);
            resolve(files);
        });
    });

    let file = files.find(file => file === 'level.dat');

    let world = await new Promise((resolve, reject) => {
        nbt.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'world/', file)), function (error, data) {
            if (error) return reject(error);
            resolve(data);
        });
    });

    return getWorldRelevantInfo(makeReadable(world.value.Data.value));
}

function makeReadable(json, isList = false) {
    if (isList) {
        switch (json.type) {
            case "double":
            case "byte":
            case "int":
            case "short":
            case "float":
            case "end":
            case "string":
                json = json.value;
                break;
            case "long":
                for (let value of json.value) {
                    let long = new Long(value[1], value[0]);
                    value = long.greaterThan(Number.MAX_VALUE) || long.lessThan(Number.MIN_VALUE) ? long.toString() : long.toNumber();
                }
                json = json.value;
                break;
            case "compound":
                for (let value of json.value) {
                    value = makeReadable(value);
                }
                json = json.value;
                break;
        }
        return json;
    }
    for (let e in json) {
        if (!json.hasOwnProperty(e)) {
            continue;
        }
        switch (json[e].type) {
            case "double":
            case "byte":
            case "int":
            case "short":
            case "end":
            case "float":
                json[e] = json[e].value;
                break;
            case "string":
                json[e] = ['false', 'true'].indexOf(json[e].value) !== -1 ? json[e].value === 'true' : json[e].value;
                break;
            case "long":
                let long = new Long(json[e].value[1], json[e].value[0]);
                json[e] = long.greaterThan(Number.MAX_VALUE) || long.lessThan(Number.MIN_VALUE) ? long.toString() : long.toNumber();
                break;
            case "compound":
                json[e] = makeReadable(json[e].value);
                break;
            case "list":
                json[e] = makeReadable(json[e].value, true);
                break;
        }
    }
    return json;
}

function getPlayerRelevantInfo(players) {
    let responseObj = [];
    for (let e in players) {
        if (!players.hasOwnProperty(e)) {
            continue;
        }
        responseObj.push({
            uuid: e,
            name: players[e].name,
            face: players[e].face,
            spawn: players[e].SpawnX && players[e].SpawnY && players[e].SpawnZ ? {
                x: players[e].SpawnX,
                y: players[e].SpawnY,
                z: players[e].SpawnZ
            } : null,
            pos: {
                x: players[e].Pos[0],
                y: players[e].Pos[1],
                z: players[e].Pos[2]
            },
            inventory: players[e].Inventory,
            selectedSlot: players[e].SelectedItemSlot,
            endChest: players[e].EnderItems,
            health: players[e].Health,
            dimension: players[e].Dimension,
            xp: players[e].XpTotal,
            stats: players[e].stats
        })
    }
    return responseObj;
}

function getWorldRelevantInfo(world) {
    return {
        seed: world.RandomSeed,
        difficulty: world.Difficulty,
        time: world.Time,
        version: world.Version.Name,
        spawn: {
            x: world.SpawnX,
            y: world.SpawnY,
            z: world.SpawnZ
        },
        datapacks: world.DataPacks.Enabled
    }
}

exports.getServerFileInfo = async () => {
    let world = await getWorldData();
    let players = await getPlayerData();

    for (let player of players) {
        player.spawn = player.spawn || world.spawn
    }

    return {
        world: world,
        players
    };
};
