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
  runTransaction,
  arrayRemove,
  deleteDoc,
  onSnapshot,
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
connectFirestoreEmulator(firestore, "127.0.0.1", 5002);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);
// DEVELOPMENT

const keyspace = Array.from({ length: 15 }, (_, i) => i).map((num) =>
  num.toString().padStart(4, "0")
);
export const uploadKeys = async () => {
  await setDoc(doc(firestore, "keyspace/keys"), { array: keyspace });
};

export const uploadText = async (text: string) => {
  try {
    return await runTransaction(
      firestore,
      async (transaction): Promise<string> => {
        const docRef = doc(firestore, "keyspace", "keys");
        const keys = await transaction.get(docRef);
        const array: string[] = await keys.get("array");
        if (array.length === 0) {
          throw new Error("keys document does not exist.");
        }
        const randomIndex = Math.floor(Math.random() * array.length);
        const generatedDigitKey = array[randomIndex];
        transaction.update(docRef, {
          array: arrayRemove(generatedDigitKey),
        });
        const docToUploadRef = doc(firestore, "data", generatedDigitKey);
        const data: document = {
          data: text,
          data_type: "text",
          created: serverTimestamp(),
        };
        transaction.set(docToUploadRef, data);
        return generatedDigitKey;
      }
    );
  } catch (e) {
    console.error(e);
  }
};

export const readText = async (key: string) => {
  try {
    return await runTransaction(
      firestore,
      async (transaction): Promise<string> => {
        const docRef = doc(
          firestore,
          process.env.REACT_APP_FIRESTORE_DEFAULTCOLLECTION_URL!,
          key
        );
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          throw new Error("no Document exists");
        }
        deleteDoc(docRef);
        return docSnap.data().data;
      }
    );
  } catch (e) {
    console.error(e);
  }
};

export const unsubscribeDeleteEventListener = (
  key: string,
  onDelete: () => void
) => {
  return onSnapshot(
    doc(firestore, "data", key),
    (doc) => {
      if (!doc.exists()) {
        onDelete();
      }
    },
    (err): void => {
      console.error(err);
    }
  );
};
