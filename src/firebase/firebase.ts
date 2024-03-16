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
  getDoc,
} from "firebase/firestore";
import { document } from "../types/document";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_APIKEY,
  authDomain: process.env.REACT_APP_AUTHDOMAIN,
  databaseURL: process.env.REACT_APP_DATABASEURL,
  projectId: process.env.REACT_APP_PROJECTID,
  storageBucket: process.env.REACT_APP_STORAGEBUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGINGSENDERID,
  appId: process.env.REACT_APP_APPID,
  measurementId: process.env.REACT_APP_MEASUREMENTID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const firestore = getFirestore();
// DEVELOPMENT
const functions = getFunctions(app);
// connectFirestoreEmulator(firestore, "127.0.0.1", 5002);
// connectFunctionsEmulator(functions, "127.0.0.1", 5001);
// DEVELOPMENT

// const keyspace = Array.from({ length: 10000 }, (_, i) => i).map((num) =>
//   num.toString().padStart(4, "0")
// );
// export const uploadKeys = async () => {
//   await setDoc(doc(firestore, "keyspace/keys"), { array: keyspace });
// };

export const uploadText = async (text: string) => {
  const tempKey = "0000";
  const docRef = doc(
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
    await setDoc(docRef, data);
  } catch (e) {
    console.log(e);
  }
};

export const readText = async (key: string) => {
  const docRef = doc(
    firestore,
    process.env.REACT_APP_FIRESTORE_DEFAULTCOLLECTION_URL!,
    key
  );
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return "";
  }
  return docSnap.data().data;
};
