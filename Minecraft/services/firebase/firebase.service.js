import serviceAccount from '../../minetoring-36e02-firebase-adminsdk-wj5id-9b1692ad91.json' assert { type: 'json' };
import admin from 'firebase-admin';

class FirebaseService {

    static _instance;
    static getInstance() {
        if (!this._instance) {
            this._instance = new FirebaseService();
        }
        return this._instance;
    }

    initializeApp() {
        this.app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
}

export default FirebaseService