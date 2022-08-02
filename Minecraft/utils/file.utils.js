import Long from "long";

class FileUtils {
    static baseDirectory = 'C:/Users/guilh/Desktop/Minecraft Carpet 1.16.5';

    static makeReadable(json, isList = false) {
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
                        value = this.makeReadable(value);
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
                    json[e] = this.makeReadable(json[e].value);
                    break;
                case "list":
                    json[e] = this.makeReadable(json[e].value, true);
                    break;
            }
        }
        return json;
    }

    static getPlayerRelevantInfo(players) {
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

    static getWorldRelevantInfo(world = {
            WorldGenSettings: { seed: '' },
            Difficulty: 0,
            Time: 0,
            SpawnX: 0,
            SpawnY: 0,
            SpawnZ: 0,
            DataPacks: {
                Enabled: []
            },
            // Player parameters, to remove webstorm warnings
            Pos: [],
            SelectedItemSlot: 0,
            Health: 0,
            Dimension: '',
            XpTotal: 0,
        }) {
        return {
            seed: world.WorldGenSettings.seed,
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
}

export default FileUtils;