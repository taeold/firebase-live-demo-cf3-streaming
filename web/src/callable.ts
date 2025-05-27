import { initializeApp } from "firebase/app";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCyMaa_ZaRGql_SDPeJAP0fIkt-u5CuPFk",
  authDomain: "danielylee-90.firebaseapp.com",
  projectId: "danielylee-90",
  storageBucket: "danielylee-90.firebasestorage.app",
  messagingSenderId: "187046504826",
  appId: "1:187046504826:web:1e1273d8052c77b4bb4ec3",
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, "localhost", 5001);
  console.log("Firebase Functions Emulator connected: localhost:5001");
}

export const generateCorpspeak = httpsCallable<
  { prompt: string },
  { completion: string },
  { partial: string }
>(functions, "generateCorpspeak");
