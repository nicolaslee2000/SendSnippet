import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import {
  connectStorageEmulator,
  getDownloadURL,
  getMetadata,
  getStorage,
  list,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from "firebase/storage";
import {
  getFirestore,
  setDoc,
  doc,
  serverTimestamp,
  connectFirestoreEmulator,
  runTransaction,
  arrayRemove,
  onSnapshot,
  deleteDoc,
  Transaction,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { Document } from "../types/Document";
import JSZip from "jszip";

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
const storage = getStorage();
const functions = getFunctions();
// DEVELOPMENT
if (window.location.hostname === "localhost") {
  // Point to the Storage emulator running on localhost.
  connectStorageEmulator(storage, "127.0.0.1", 5004);
  connectFirestoreEmulator(firestore, "127.0.0.1", 5002);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

const keyspace = Array.from({ length: 10000 }, (_, i) => i).map((num) =>
  num.toString().padStart(4, "0")
);
export const uploadKeys = async () => {
  await setDoc(doc(firestore, "keyspace/keys"), { array: keyspace });
};
// DEVELOPMENT END

/**
 * private function to generate random key from available keyspace in database
 * (optional) pass transaction as param to continue with existing transaction.
 * Otherwise, a new transaction will be started
 * 1. get "keys" document from keyspace collection representing available 4 digit keys
 * 2. generate random index to get random key from available keyspace
 * 3. remove selected key from keyspace
 * @param receivedTransaction
 * @returns 4 digit key
 */
const generateKey = async (receivedTransaction: Transaction | null = null) => {
  try {
    return await runTransaction(
      firestore,
      async (transaction): Promise<string> => {
        transaction = receivedTransaction ? receivedTransaction : transaction;
        const keysDocRef = doc(firestore, "keyspace", "keys");
        const keys = await transaction.get(keysDocRef);
        if (!keys.exists() || keys.get("array").length === 0) {
          throw new Error("keys document error.");
        }
        const array: string[] = await keys.get("array");
        const randomIndex = Math.floor(Math.random() * array.length);
        const generatedDigitKey = array[randomIndex];
        transaction.update(keysDocRef, {
          array: arrayRemove(generatedDigitKey),
        });
        return generatedDigitKey;
      }
    );
  } catch (e) {
    throw new Error("key generation error");
  }
};

/**
 * call to uploadText to database. Uses transaction for atomic upload operation
 * 1. generate key from generateKey()
 * 2. upload text document with id = key
 * @param text to upload
 * @returns promise of generated 4 digit key
 */
export const uploadText = async (text: string) => {
  try {
    return await runTransaction(
      firestore,
      async (transaction): Promise<string> => {
        const generatedDigitKey = await generateKey(transaction);
        const docToUploadRef = doc(firestore, "data", generatedDigitKey);
        const data: Document = {
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
    return;
  }
};
export const keytest = async () => {
  try {
    for (let i = 0; i < 5; i++) {
      try {
        setDoc(doc(firestore, "data/0000"), {
          data: "aa",
          data_type: "dd",
          created: serverTimestamp(),
        })
          .then(() => {
            console.log("resolved");
          })
          .catch((a: Error) => {
            console.log(a);
            console.log(typeof a);
            console.log("error");
          });
        break;
      } catch (e) {
        console.log("second error");
      }
      console.log(i);
    }
  } catch (e) {
    console.log("first error");
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
    throw new Error("no document exists");
  }
};

export const deleteDocument = async (key: string | undefined) => {
  try {
    if (key === undefined) {
      throw new Error("key not defined");
    }
    deleteDoc(
      doc(
        firestore,
        process.env.REACT_APP_FIRESTORE_DEFAULTCOLLECTION_URL!,
        key
      )
    );
  } catch (e) {
    throw new Error("document deletion error");
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

/**
 * upload files to cloud storage.
 * 1. generateKey()
 * 2. upload files to files/{key}
 * 3. returns key
 * @param generated 4 digit key
 */
export const uploadFiles = async (files: File[]) => {
  let key: string;
  try {
    key = await generateKey();
    files.forEach((f) => {
      const fileRef = ref(storage, `files/${key}/${f.name}`);
      const uploadTask = uploadBytesResumable(fileRef, f);
    });
    return key;
  } catch (e) {
    // add key back to keyspace if error occured
    updateDoc(doc(firestore, "keyspace", "keys"), {
      array: arrayUnion(key!),
    });
  }
};

/**
 * if one file is sent, the file is downloaded
 * if multiple files are sent, a zip file containing said files are created and downloaded
 *
 * download using fetch api or jszip to get blob, then add it to a tag and auto click to download
 * @param key
 * @returns downloaded files
 */
export const downloadFiles = async (key: string) => {
  try {
    const dirRef = ref(storage, `files/${key}`);
    const files = (await list(dirRef, { maxResults: 20 })).items;
    // download if there are only one file
    if (files.length === 1) {
      fetch(await getDownloadURL(files[0]))
        .then((response) => response.blob())
        .then((blob) => {
          downloadFromBlob(blob, files[0].name);
        });
      return;
    }
    const jszip = new JSZip();
    await files
      .map(async (item) => {
        const file = await getMetadata(item);
        const fileRef = ref(storage, item.fullPath);
        const fileBlob = await getDownloadURL(fileRef).then((url) => {
          return fetch(url).then((response) => response.blob());
        });
        jszip.file(file.name, fileBlob);
      })
      .reduce((acc, curr) => acc.then(() => curr), Promise.resolve());
    const blob = await jszip.generateAsync({ type: "blob" });
    downloadFromBlob(blob, "sendSnippet.zip");
  } catch (e) {
    console.error(e);
    return;
  }
};

// private helper function to download to local machine using fetch api
const downloadFromBlob = async (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
};
