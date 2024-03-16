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
const EXPIRY_TIME_DELAY = 600;

export const onCreatePost = onDocumentCreated(
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

export const returnKeyOnDelete = onDocumentDeleted(
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
