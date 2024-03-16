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
const expiryTimeDelay = 60;
export const onCreatePost = onDocumentCreated(
  `data/{docId}`,
  (
    event: FirestoreEvent<
      QueryDocumentSnapshot | undefined,
      ParamsOf<"data/{docId}">
    >
  ) => {
    const data = event.data!.data();
    const expiry = new Timestamp(data.created.seconds + expiryTimeDelay, 0);
    console.log(data.created.seconds);
    console.log(expiryTimeDelay);
    console.log(expiry);

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
    console.log(event.params.docId);
    firestore.doc("keyspace/keys").update({
      array: FieldValue.arrayRemove(event.params.docId),
    });
    console.log(firestore.doc("keyspace/keys"));
  }
);
