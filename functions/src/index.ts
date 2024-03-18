import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { ParamsOf } from "firebase-functions/v2/core";
import {
  FirestoreEvent,
  onDocumentCreated,
  onDocumentDeleted,
  QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore";

initializeApp();
const firestore = getFirestore();
// Document TTL. Default: 10 minutes
const EXPIRY_TIME_DELAY = 600;

/**
 * cloud function to add expiry field all documents created
 */
export const addExpiry = onDocumentCreated(
  `data/{docId}`,
  (
    event: FirestoreEvent<
      QueryDocumentSnapshot | undefined,
      ParamsOf<"data/{docId}">
    >
  ) => {
    const data = event.data!.data();
    const expiry = new Timestamp(data.created.seconds + EXPIRY_TIME_DELAY, 0);
    return event.data!.ref.set({ expiry: expiry }, { merge: true });
  }
);

/**
 * cloud function to add removed unique 4 digit key back to available key space on document deletion
 */
export const addKeyBackToKeyspaceOnDelete = onDocumentDeleted(
  `data/{docId}`,
  (
    event: FirestoreEvent<
      QueryDocumentSnapshot | undefined,
      ParamsOf<"data/{docId}">
    >
  ) => {
    firestore.doc("keyspace/keys").update({
      array: FieldValue.arrayUnion(event.params.docId),
    });
  }
);
