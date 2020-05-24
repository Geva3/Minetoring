const request = require('request-promise');
const html2js = require('html2json');
const moment = require('moment');
const sharp = require('sharp');

let items = {};

exports.getItemBase64 = async (itemName) => {
    if(itemName === 'minecraft:redstone') {
        itemName += '_dust';
    } else if(itemName === 'minecraft:clay_ball') {
        itemName = 'minecraft:clay';
    } else if(itemName === 'minecraft:clay') {
        itemName += '_block';
    } else if(itemName === 'minecraft:comparator') {
        itemName = 'minecraft:redstone_comparator';
    } else if(itemName === 'minecraft:quartz') {
        itemName = 'minecraft:nether_quartz';
    } else if(itemName === 'minecraft:repeater') {
        itemName = 'minecraft:redstone_repeater';
    }

    if (items[itemName] && moment().isBefore(items[itemName].end)) {
        return Promise.resolve(items[itemName].base64);
    }

    const baseUrl = 'https://minecraft.gamepedia.com';
    let name = itemName.replace('minecraft:', '').charAt(0).toUpperCase() + itemName.replace('minecraft:', '').substring(1);

    let beautyName = name.split('_');
    for(let e in beautyName) {
        if(['of', 'the'].indexOf(beautyName[e]) !== -1) continue;
        beautyName[e] = beautyName[e].charAt(0).toUpperCase() + beautyName[e].substring(1);
    }
    if(beautyName.indexOf('Clay') !== -1 && beautyName.indexOf('Block') !== -1) {
        beautyName = ['Clay'];
    }

    let url = baseUrl + '/' + name;
    return request(url).then(async html => {
        let found = findInObject(html2js.html2json(html), {
            child: {
                tag: 'html',
                child: {
                    tag: 'body',
                    child: {
                        tag: 'div',
                        'attr.id': 'global-wrapper',
                        child: {
                            tag:'div',
                            'attr.id': 'pageWrapper',
                            child: {
                                tag: 'div',
                                'attr.id': 'content',
                                child: {
                                    tag: 'div',
                                    'attr.id': 'bodyContent',
                                    child: {
                                        tag: 'div',
                                        'attr.id': 'mw-content-text',
                                        child: {
                                            tag: 'div',
                                            'attr.class': 'mw-parser-output',
                                            child: {
                                                tag: 'div',
                                                'attr.class': 'notaninfobox',
                                                child: {
                                                    tag: 'div',
                                                    'attr.class': ['infobox-imagearea', 'animated-container'],
                                                    child: {
                                                        tag: 'div',
                                                        'attr.class': 'infobox-invimages'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        let faunde = findInAllChilds(found, {
            tag: 'span',
            'attr.class': 'invslot-item',
            'attr.data-minetip-title': beautyName.length === 1 ? beautyName[0] : beautyName
        });
        if(faunde.length === 0) {
            faunde = findInAllChilds(found, {
                tag: 'span',
                'attr.class': ['sprite', 'inv-sprite'],
                'attr.title': beautyName.length === 1 ? beautyName[0] : beautyName
            });
            let url;
            let x;
            let y;
            if(!faunde || !faunde.length) {
                console.log(itemName);
                return undefined;
            }
            for (let string of faunde[0].attr.style.join(' ').split(';')) {
                if (/background-image:url\((.*)\)/.test(string)) {
                    url = string.match(/background-image:url\((.*)\)/)[1];
                } else if (/background-position:-(\d+)px -(\d+)px/.test(string)) {
                    x = Number(string.match(/background-position:-(\d+)px -(\d+)px/)[1]);
                    y = Number(string.match(/background-position:-(\d+)px -(\d+)px/)[2]);
                }
            }

            let image = sharp();

            request(baseUrl + url).pipe(image);

            return image.extract({
                left: x,
                top: y,
                width: 32,
                height: 32
            }).toBuffer().then((result) => {
                let base64 = result.toString('base64');
                items[itemName] = {
                    end: moment().add('1', 'days'),
                    base64
                };
                return base64;
            });
        } else {
            console.log(faunde);
        }
        console.log(itemName);
        return undefined;
    }).catch(err => {
        console.log(err);
        console.log(itemName);
        return undefined;
    });
};

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

function findInObject(json, where) {
    let result;
    if(typeof where.child === 'object') {
        let whereParams = Object.assign({}, where.child);
        delete whereParams.child;
        result = findInArray(json.child, whereParams);
    }
    if(where.child && where.child.child && result) {
        return findInObject(result, where.child);
    }
    return result;
}

function findInArray(array, whereParams) {
    return array.find(item => findEachArray(item, whereParams));
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
