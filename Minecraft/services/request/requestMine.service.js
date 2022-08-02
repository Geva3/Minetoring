import * as axiosLib from 'axios';
import sharp from 'sharp';
import StorageService from '../firebase/storage.service.js';

const axios = axiosLib.default;

export default {
    savePlayerFace: async (uuid) => {
        const storageService = StorageService.getInstance();

        if (await storageService.checkFileExistence(uuid + '.png', 'heads')) {
            return uuid + '.png';
        }

        let response = await axios.get('https://sessionserver.mojang.com/session/minecraft/profile/' + uuid);

        let skin;
        if (response.status === 200) {
            response = response.data.properties[0].value;

            response = JSON.parse(Buffer.from(response, 'base64').toString('ascii'));

            skin = response.textures.SKIN;
        }

        if (skin && skin.url) {
            return new Promise(resolve => {
                let image = sharp();
                image.extract({
                    left: 8,
                    top: 8,
                    width: 8,
                    height: 8
                }).toBuffer().then((result) => {
                    return storageService.uploadFile(uuid + '.png', result, 'heads');
                }).then(() => resolve(uuid + '.png'));

                axios({
                    method: 'get',
                    url: skin.url,
                    responseType: 'stream'
                }).then((response) => {
                    response.data.pipe(image)
                });
            });
        }
    },

    getPlayerBaseInfo: (uuid) => {
        return axios.get(`https://api.mojang.com/user/profiles/${uuid.replace(/-?/g, '')}/names`).then((response) => response.data);
    },
}
