"use client";

import { EditPlaceSheet } from "./EditPlaceSheet";
import { Lightbox } from "./Lightbox";
import { LogSheet } from "./LogSheet";
import { Toast } from "./Toast";

/** The surfaces that sit above whichever screen is routed. */
export function Overlays() {
  return (
    <>
      <LogSheet />
      <EditPlaceSheet />
      <Lightbox />
      <Toast />
    </>
  );
}
