import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import {
  getFirestore,
  setDoc,
  doc,
  serverTimestamp,
  connectFirestoreEmulator,
  runTransaction,
  arrayRemove,
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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const firestore = getFirestore();
// DEVELOPMENT
const functions = getFunctions(app);
connectFirestoreEmulator(firestore, "127.0.0.1", 5002);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);
const keyspace = Array.from({ length: 10000 }, (_, i) => i).map((num) =>
  num.toString().padStart(4, "0")
);
export const uploadKeys = async () => {
  await setDoc(doc(firestore, "keyspace/keys"), { array: keyspace });
};
// DEVELOPMENT

/**
 * call to uploadText to database. Uses transaction for atomic upload operation
 * 1. get "keys" document from keyspace collection representing available 4 digit keys
 * 2. generate random index to get random key from available keyspace
 * 3. remove selected key from keyspace
 * 4. upload text document with id = key
 * @param text to upload
 * @returns promise of generated 4 digit key
 */
export const uploadText = async (text: string) => {
  try {
    return await runTransaction(
      firestore,
      async (transaction): Promise<string> => {
        const docRef = doc(firestore, "keyspace", "keys");
        const keys = await transaction.get(docRef);
        if (!keys.exists() || keys.get("array").length === 0) {
          throw new Error("keys document error.");
        }
        const array: string[] = await keys.get("array");
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

/**
 * Get text data from database given unique 4 digit key using transaction.
 * 1. get document by digit key
 * 2. delete document from database
 * (3.) this will trigger cloud function to automatically add removed digit key back to available keyspace
 * @param key 4 digit string key
 * @returns promise of text requested
 */
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
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error("no Document exists");
        }
        transaction.delete(docRef);
        return docSnap.data().data;
      }
    );
  } catch (e) {
    console.error(e);
  }
};

/**
 *
 * @param key 4 digit string key to identify document to subscribe to
 * @param onDelete callback function for when said document is deleted. Returns void.
 * @returns void
 */
export const unsubscribeDeleteEventListener = (
  key: string,
  onDelete: () => void
) => {
  return onSnapshot(
    doc(firestore, process.env.REACT_APP_FIRESTORE_DEFAULTCOLLECTION_URL!, key),
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
