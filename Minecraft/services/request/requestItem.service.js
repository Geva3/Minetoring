import * as axiosLib from 'axios';
import html2js from 'html2json';
import sharp from 'sharp';

const axios = axiosLib.default;

import StorageService from "../firebase/storage.service.js";

export default {
    saveItemImage: async (itemName, isEnchanted) => {
        const storageService = StorageService.getInstance();

        if(itemName === 'minecraft:quartz') {
            itemName = 'minecraft:nether_quartz';
        }

        let searchName;
        if (itemName.indexOf("trapdoor") !== -1 || itemName.indexOf("carpet") !== -1 || itemName.indexOf("shulker_box") !== -1) {
            let itemNameNoMinecraft = itemName.replace('minecraft:', '');
            let newItemName = itemNameNoMinecraft.split("_").slice(1).join("_");
            searchName = newItemName.charAt(0).toUpperCase() + newItemName.substring(1);
        } else {
            searchName = itemName.replace('minecraft:', '').charAt(0).toUpperCase() + itemName.replace('minecraft:', '').substring(1);
        }

        if (isEnchanted) {
            itemName = itemName.replace('minecraft:', 'minecraft:enchanted_');
        }

        if (await storageService.checkFileExistence(itemName + (isEnchanted ? '.gif' : '.png'))) {
            return itemName + (isEnchanted ? '.gif' : '.png');
        }

        const baseUrl = 'https://minecraft.fandom.com/wiki';
        let name = itemName.replace('minecraft:', '').charAt(0).toUpperCase() + itemName.replace('minecraft:', '').substring(1);

        let beautyName = name.split('_');
        for(let e in beautyName) {
            if(['of', 'the'].indexOf(beautyName[e]) !== -1) continue;
            beautyName[e] = beautyName[e].charAt(0).toUpperCase() + beautyName[e].substring(1);
        }

        let url = baseUrl + '/' + searchName;
        const html = await axios({
            method: 'get',
            url,
            responseType: 'text'
        });

        if (isEnchanted) {
            beautyName.push("(item).gif");

            let found = findInAllChilds(html2js.html2json(html.data), {
                tag: 'img',
                'attr.data-image-name': beautyName
            });

            if (found.length === 0) {
                beautyName.pop();
                beautyName[beautyName.length - 1] = beautyName[beautyName.length - 1] + '.gif';

                found = findInAllChilds(html2js.html2json(html.data), {
                    tag: 'img',
                    'attr.alt': beautyName
                });
            }

            if (found.length > 0) {
                let url = found[0].attr["data-src"];

                let response = await axios.get(url, { responseType: "arraybuffer" });
                await storageService.uploadFile(itemName + '.gif', response.data);
                return itemName + '.gif';
            }

            beautyName[beautyName.length - 1] = beautyName[beautyName.length - 1].replace('.gif', '');
            beautyName = beautyName.slice(1);
        }

        let found = findInAllChilds(html2js.html2json(html.data), {
            tag: 'span',
            'attr.class': ['sprite', 'inv-sprite'],
            'attr.title': beautyName
        });

        if (found.length === 0) {
            found = findInAllChilds(html2js.html2json(html.data), {
                tag: 'span',
                'attr.class': ['sprite', 'inv-sprite']
            });
        }

        if(found.length > 0) {
            let url;
            let x;
            let y;

            for (let string of found[0].attr.style.join(' ').replaceAll('&amp;', '&').split(';')) {
                if (/background-image:url\((.*)\)/.test(string)) {
                    url = string.match(/background-image:url\((.*)\)/)[1];
                } else if (/background-position:-(\d+)px -(\d+)px/.test(string)) {
                    x = Number(string.match(/background-position:-(\d+)px -(\d+)px/)[1]);
                    y = Number(string.match(/background-position:-(\d+)px -(\d+)px/)[2]);
                }
            }

            let image = sharp();

            if (url) {
                axios({
                    method: 'get',
                    url: url,
                    responseType: 'stream'
                }).then((response) => response.data.pipe(image))

                return image.extract({
                    left: x,
                    top: y,
                    width: 32,
                    height: 32
                }).toBuffer().then(async (result) => {
                    await storageService.uploadFile(itemName + '.png', result);
                    return itemName + '.png';
                });
            }
        }

        found = findInAllChilds(html2js.html2json(html.data), {
            tag: 'img',
            'attr.alt': beautyName
        });

        if (found.length > 0) {
            let url = found[0].attr["data-src"];

            if (!url) {
                url = found[0].attr.src;
            }

            if (url) {
                let response = await axios.get(url, {responseType: "arraybuffer"});
                await storageService.uploadFile(itemName + '.png', response.data);
                return itemName + '.png';
            }
        }

        console.log(itemName);
    },
}

function findInAllChilds(json, where) {
    let results = [];
    if(json && json.child) {
        results = results.concat(findAllInArray(json.child, where));
        for(let child of json.child) {
            if(child.child) {
                results = results.concat(findInAllChilds(child, where));
            }
        }
    }
    return results;
}

function findEachArray(item, whereParams) {
    let found = true;
    for(let param in whereParams) {
        if(!whereParams.hasOwnProperty(param)) continue;
        let completeParams = param.split('.');
        let foundItem = item;
        for(let complete of completeParams) {
            if(foundItem) {
                foundItem = foundItem[complete];
            }
        }
        if(!foundItem) {
            return false;
        }
        if(Array.isArray(foundItem) && Array.isArray(whereParams[param])) {
            found = found && whereParams[param].every(a => foundItem.includes(a));
        } else {
            found = found && foundItem === whereParams[param];
        }
    }
    return found;
}

function findAllInArray(array, whereParams) {
    return array.filter(item => findEachArray(item, whereParams));
}
