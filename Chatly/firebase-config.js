import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getStorage } from "firebase/storage"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
    "apiKey": "AIzaSyAFjhGgSY1yox4T6_nC9fOtw8L88jAcmoM",
    "authDomain": "chatly-id.firebaseapp.com",
    "projectId": "chatly-id",
    "storageBucket": "chatly-id.appspot.com",
    "messagingSenderId": "297811099151",
    "appId": "1:297811099151:web:1a1a733ec934eb257b2d7a",
    "measurementId": "G-X2H317CK2M"
}


export const app = initializeApp(firebaseConfig)
export const auth = getAuth()
export const storage = getStorage()
export const db = getFirestore()