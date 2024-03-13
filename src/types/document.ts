import { FieldValue } from "firebase/firestore";

export type DigitStringOfLengthFour = `${number}${number}${number}${number}`;
export interface document {
  data_type: "file" | "text";
  data: string;
  created: FieldValue;
}
