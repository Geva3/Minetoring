import FirebaseService from './firebase.service.js';

class FirestoreService {
    static _instance;
    static getInstance() {
        if (!this._instance) {
            this._instance = new FirestoreService();
        }
        return this._instance;
    }

    constructor() {
        this.db = FirebaseService.getInstance().app.firestore();
    }

    async getCollection(collectionName) {
        const documentList = await this.db.collection(collectionName).listDocuments()
        const documents = await Promise.all(documentList.map((document) => document.get()));
        return documents.map((document) => document.data());
    }

    getStartupCommands() {
        return this.getCollection('startup-commands');
    }

    async saveServerStatus({ status, players }) {
        return this.db.collection('server-check').doc('server-status').update({ checkTime: new Date(), status, players });
    }

    async saveWorldData(worldData) {
        return this.db.collection('world').doc('world-data').update(worldData);
    }

    async savePlayersData(players) {
        const collection = this.db.collection('player');
        for (let player of players) {
            const doc = collection.doc(player.uuid);
            await doc.update(player).catch(e => {
                console.log(e);
                return doc.create(player);
            });
        }
    }

    getCommandsCollection() {
        return this.db.collection('commands').where('executedAt', '==', null);
    }
}

export default FirestoreService;