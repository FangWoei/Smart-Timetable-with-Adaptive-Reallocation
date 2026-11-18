import { createContext, useContext } from "react";

export const LecturerContext = createContext(null);

export function useLecturer() {
  const v = useContext(LecturerContext);
  if (!v) throw new Error("useLecturer must be used inside <LecturerShell>");
  return v;
}
