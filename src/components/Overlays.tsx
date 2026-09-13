"use client";

import { Lightbox } from "./Lightbox";
import { LogSheet } from "./LogSheet";
import { Toast } from "./Toast";

/** The three surfaces that sit above whichever screen is routed. */
export function Overlays() {
  return (
    <>
      <LogSheet />
      <Lightbox />
      <Toast />
    </>
  );
}
