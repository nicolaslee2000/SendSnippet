// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent, setUserId } from "firebase/analytics";
// import { getFirestore, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { document } from "./types/document";
const firebaseConfig = {
  apiKey: process.env.REACT_APP_apikey,
  authDomain: process.env.REACT_APP_authDomain,
  databaseURL: process.env.REACT_APP_databaseURL,
  projectId: process.env.REACT_APP_databaseURL,
  storageBucket: process.env.REACT_APP_storageBucket,
  messagingSenderId: process.env.REACT_APP_messagingSenderId,
  appId: process.env.REACT_APP_appId,
  measurementId: process.env.REACT_APP_measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// const firestore = getFirestore();

// export const uploadText = async (text: string) => {
//   const tempKey = "4321";
//   const document = doc(
//     firestore,
//     process.env.REACT_APP_FIRESTORE_DEFAULTCOLLECTION_URL!,
//     tempKey
//   );
//   const data: document = {
//     data: text,
//     data_type: "text",
//     created: serverTimestamp(),
//   };
//   try {
//     await setDoc(document, data);
//   } catch (err) {
//     console.log(err);
//   }
// };

export const downloadText = async (key: string) => {};

export const logUser = () => {
  console.log("eee");
  setUserId(analytics, "12345");
  logEvent(analytics, "goal_completion", { name: "lever_puzzle" });
  logEvent(analytics, "user details");
};
