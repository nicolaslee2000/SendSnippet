// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
const firebaseConfig = {
  apiKey: process.env.REACT_APP_apikey,
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

const writeFirestore = (text: string) => {
  const store = getFirestore();
  const document = doc(store, "data/1000");
  const data = { data: text, key: "1000" };
  setDoc(document, data);
};
const uploadFile = (path: string, file: File) => {
  const storage = getStorage();
  const storageRef = ref(storage);
  const dataRef = ref(storage, path);
  console.log(dataRef.fullPath);
  console.log(dataRef.name);
  console.log(dataRef.bucket);
  uploadBytes(dataRef, file).then((snapshot) => {
    console.log("uploaded!");
  });
};
export const download = async () => {
  let u = "";
  const storage = getStorage();
  await getDownloadURL(ref(storage, "ahlol")).then((url) => (u = url));
  return u;
};
export default uploadFile;
