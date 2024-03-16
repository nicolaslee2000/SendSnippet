import { FieldValue } from "firebase/firestore";

export interface document {
  data_type: "file" | "text";
  data: string;
  created: FieldValue;
}
