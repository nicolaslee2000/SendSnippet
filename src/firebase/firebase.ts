// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

import {
  getFirestore,
  setDoc,
  doc,
  serverTimestamp,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { document } from "../types/document";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_apiKey,
  authDomain: process.env.REACT_APP_authDomain,
  databaseURL: process.env.REACT_APP_databaseURL,
  projectId: process.env.REACT_APP_projectId,
  storageBucket: process.env.REACT_APP_storageBucket,
  messagingSenderId: process.env.REACT_APP_messagingSenderId,
  appId: process.env.REACT_APP_appId,
  measurementId: process.env.REACT_APP_measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const firestore = getFirestore();
// DEVELOPMENT
const functions = getFunctions(app);
connectFirestoreEmulator(firestore, "127.0.0.1", 5002);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);
// DEVELOPMENT

//initialise firestore with shuffled keys

export const uploadText = async (text: string) => {
  const tempKey = "5555";
  const document = doc(
    firestore,
    process.env.REACT_APP_FIRESTORE_DEFAULTCOLLECTION_URL!,
    tempKey
  );
  const data: document = {
    data: text,
    data_type: "text",
    created: serverTimestamp(),
  };
  try {
    await setDoc(document, data);
  } catch (e) {
    console.log(e);
  }
};
