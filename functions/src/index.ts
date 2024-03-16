import { initializeApp } from "firebase-admin/app";
import { Timestamp } from "firebase-admin/firestore";
import { ParamsOf } from "firebase-functions/v2/core";
import {
  FirestoreEvent,
  onDocumentCreated,
  QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore";

initializeApp();

export const onCreatePost = onDocumentCreated(
  "data/{docId}",
  (
    event: FirestoreEvent<
      QueryDocumentSnapshot | undefined,
      ParamsOf<"data/{docId}">
    >
  ) => {
    const data = event.data!.data();
    const expiry = new Timestamp(
      data.created.seconds + Number(process.env.EXPIRYTIME_SECONDS),
      0
    );
    console.log(data.created.seconds);
    console.log(process.env.EXPIRYTIME_SECONDS);
    console.log(expiry);

    return event.data!.ref.set({ expiry: expiry }, { merge: true });
  }
);
