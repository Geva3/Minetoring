const request = require('request-promise');
const moment = require('moment');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

let playerHeads = {};

exports.getPlayerFace = async (uuid) => {
    if (playerHeads[uuid] && moment().isBefore(playerHeads[uuid].end)) {
        return playerHeads[uuid].face;
    }

    let options = {
        url: 'https://sessionserver.mojang.com/session/minecraft/profile/' + uuid,
        method: 'GET',
        json: true
    };

    let response = await request(options);
    response = response.properties[0].value;

    response = JSON.parse(Buffer.from(response, 'base64').toString('ascii'));

    let skin = response.textures.SKIN;
    if (skin && skin.url) {
        return new Promise(resolve => {
            let image = sharp();
            image.extract({
                left: 8,
                top: 8,
                width: 8,
                height: 8
            }).toBuffer().then((result) => {
                let coco = result.toString('base64');
                playerHeads[uuid] = {
                    face: coco,
                    end: moment().add(1, 'days')
                };
                resolve(coco);
            });

            request(skin.url).pipe(image);
        });
    } else {
        let image = fs.readFileSync(path.join(__dirname, '..', 'default', 'steve.png')).toString('base64');
        playerHeads[uuid] = {
            face: image,
            end: moment().add(1, 'days')
        };
        return image;
    }
};

exports.getPlayerBaseInfo = (uuid) => {
    return request({
        url: `https://api.mojang.com/user/profiles/${uuid.replace(/-?/g, '')}/names`,
        json: true
    });
};
