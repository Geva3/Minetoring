import * as fs from 'fs';
import nbt from 'prismarine-nbt';
import cron from 'node-cron';

import itemService from '../request/requestItem.service.js';
import mineService from '../request/requestMine.service.js';
import FirestoreService from "../firebase/firestore.service.js";
import FileUtils from "../../utils/file.utils.js";

class FileService {
    static baseDirectory = FileUtils.baseDirectory + '/world';

    static _instance;
    static getInstance() {
        if (!this._instance) {
            this._instance = new FileService();
        }
        return this._instance;
    }

    constructor() {
        this.isScheduleRunning = false;
    }

    createSchedule() {
        console.log('Creating file schedule, running every 15 minutes')
        cron.schedule('*/15 * * * *',() => {
            console.log('Running file schedule at ' + new Date().toString());
            console.log('Is there any other file schedules in progress?');
            if (this.isScheduleRunning) {
                console.log('Running canceled because another file schedule is still in progress');
                return;
            }
            this.isScheduleRunning = true;
            console.log('No other file schedules running, starting new schedule');
            return this.saveServerInfo().then(() => {
                this.isScheduleRunning = false;
                console.log('File schedule ended with success at ' + new Date().toString());
            }).catch((e) => {
                this.isScheduleRunning = false;
                console.log(e);
                console.log('File schedule ended with errors at ' + new Date().toString());
            });
        });
    }

    async getWorldData() {
        let files = await new Promise((resolve, reject) => {
            fs.readdir(FileService.baseDirectory, (err, files) => {
                if (err) return reject(err);
                resolve(files);
            });
        });

        let file = files.find(file => file === 'level.dat');

        let world = await new Promise((resolve, reject) => {
            nbt.parse(fs.readFileSync(FileService.baseDirectory + '\\' + file), function (error, data) {
                if (error) return reject(error);
                resolve(data);
            });
        });

        return FileUtils.getWorldRelevantInfo(FileUtils.makeReadable(world.value.Data.value));
    }

    async getPlayerData() {
        let players = {};
        let files = fs.readdirSync(FileService.baseDirectory + '\\playerdata');

        files = files.filter(file => file.endsWith('.dat') && file.length === 40);

        for (let file of files) {
            let uuid = file.replace(/\.dat/g, '');

            let player = fs.readFileSync(FileService.baseDirectory + '\\playerdata\\' + file);

            let stats = {};
            if (fs.existsSync(FileService.baseDirectory + '\\stats\\' + uuid + '.json')) {
                stats = JSON.parse(fs.readFileSync(FileService.baseDirectory + '\\stats\\' + uuid + '.json').toString());
            }

            let littlePromises = [];

            littlePromises.push(new Promise((resolve, reject) => {
                nbt.parse(player, function (error, data) {
                    if (error) return reject();
                    resolve(data);
                });
            }));

            littlePromises.push(mineService.getPlayerBaseInfo(uuid));

            littlePromises.push(mineService.savePlayerFace(uuid.replace(/-?/g, '')));

            await Promise.all(littlePromises).then(async (playerInfo) => {
                let playerData = playerInfo[0];
                let playerName = playerInfo[1];
                playerData.value.name = playerName.length > 0 ? playerName[playerName.length - 1].name : playerData.name;

                if (playerData.value.name === undefined || playerData.value.name === null || playerData.value.name === "") {
                    return;
                }

                players[uuid] = { Inventory: [{}], EnderItems: [{}] };
                players[uuid] = FileUtils.makeReadable(playerData.value);
                players[uuid].face = playerInfo[2];
                players[uuid].stats = stats.stats;

                console.log('Getting inventory and ender chest items for player: ' + playerData.value.name);
                const inventoryPromises = [];
                for(let item of players[uuid].Inventory) {
                    const itemCopy = { Enchantments: item.tag?.Enchantments };
                    let isEnchanted = !!(item.tag && itemCopy.Enchantments && itemCopy.Enchantments.length);

                    inventoryPromises.push(itemService.saveItemImage(item.id, isEnchanted).then((result) => {
                        item.image = result;
                        return this._getShulkerItems(item);
                    }));
                }
                await Promise.all(inventoryPromises);

                const enderChestPromises = [];
                for(let item of players[uuid].EnderItems) {
                    enderChestPromises.push(itemService.saveItemImage(item.id).then((result) => {
                        item.image = result;
                        return this._getShulkerItems(item);
                    }));
                }
                await Promise.all(enderChestPromises);
            });
        }

        players = FileUtils.getPlayerRelevantInfo(players);

        return players;
    }

    _getShulkerItems(item= {tag: { BlockEntityTag: {}, Items: [{}] }}) {
        if (!item.tag || !item.tag.BlockEntityTag) {
            return;
        }

        item.tag = { ...item.tag, ...item.tag.BlockEntityTag };
        delete item.tag.BlockEntityTag;

        let shulkerItemPromises = [];

        for(let shulkerItem of item.tag.Items ?? []) {
            shulkerItemPromises.push(itemService.saveItemImage(shulkerItem.id).then((result) => {
                shulkerItem.image = result;

                if (shulkerItem.tag && shulkerItem.tag.BlockEntityTag) {
                    shulkerItem.tag = { ...shulkerItem.tag, ...shulkerItem.tag.BlockEntityTag };
                    delete shulkerItem.tag.BlockEntityTag;
                }
            }));
        }

        return Promise.all(shulkerItemPromises);
    }

    async saveServerInfo() {
        let world = await this.getWorldData();
        let players = await this.getPlayerData();

        for (let player of players) {
            player.spawn = player.spawn || world.spawn
        }

        const firestore = FirestoreService.getInstance();
        await firestore.saveWorldData(world);
        await firestore.savePlayersData(players);

        return {
            world: world,
            players
        };
    }
}

export default FileService
