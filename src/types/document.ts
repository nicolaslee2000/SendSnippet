import { FieldValue } from "firebase/firestore";
/**
 * interface for document type uploaded and received from firestore database
 */
export interface document {
  data_type: "file" | "text";
  data: string;
  created: FieldValue;
}
