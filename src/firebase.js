import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBdV68XGr99Enzze-SZVtIj-2YBa7_1gGk",
    authDomain: "billing-control-3a426.firebaseapp.com",
    projectId: "billing-control-3a426",
    storageBucket: "billing-control-3a426.firebasestorage.app",
    messagingSenderId: "496986380061",
    appId: "1:496986380061:web:c7b684935883213a3273f4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
