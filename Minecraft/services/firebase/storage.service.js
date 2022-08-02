import FirebaseService from './firebase.service.js';
//TODO add expiration date to file

class StorageService {
    static _instance;
    static getInstance() {
        if (!this._instance) {
            this._instance = new StorageService();
        }
        return this._instance;
    }

    constructor() {
        const firebase = FirebaseService.getInstance();
        this.storage = firebase.app.storage().bucket('gs://minetoring-36e02.appspot.com');
    }

    async uploadFile(fileName, data, directory = 'items') {
        const file = this.storage.file(`${directory}/${fileName}`);
        await file.save(data);
    }

    async checkFileExistence(fileName, directory = 'items') {
        const file = this.storage.file(`${directory}/${fileName}`);
        const exists = await file.exists();
        return exists[0];
    }

    async getFilesAt(folder) {
        const [files] = await this.storage.getFiles({ prefix: `${folder}/` });
        return files;
    }
}

export default StorageService;