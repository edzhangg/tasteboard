"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { todayISO } from "@/lib/format";
import type { PersonId, Place, Visit } from "@/lib/types";

/* ── sheet state ─────────────────────────────────────────────────────────── */

export type SheetMode = "new" | "add" | "edit";

export interface SheetState {
  mode: SheetMode;
  placeId?: string;
  visitId?: string;
  score: number;
  /** Raw typing buffer. null means "show the formatted number". */
  scoreText: string | null;
  date: string;
  note: string;
  photos: string[];
  name?: string;
  cuisine?: string;
  area?: string;
}

export interface LightboxState {
  label: string;
  photos: string[];
  index: number;
}

interface BoardContext {
  places: Place[];
  /** False when the server is running on the in-memory fallback store. */
  persistent: boolean;

  user: PersonId;
  setUser: (user: PersonId) => void;

  sheet: SheetState | null;
  openNewPlaceSheet: () => void;
  openAddVisitSheet: (placeId: string) => void;
  openEditVisitSheet: (placeId: string, visit: Visit) => void;
  patchSheet: (patch: Partial<SheetState>) => void;
  closeSheet: () => void;
  saveSheet: () => Promise<string | null>;
  deleteSheetVisit: () => Promise<void>;
  saving: boolean;

  lightbox: LightboxState | null;
  openLightbox: (state: LightboxState) => void;
  closeLightbox: () => void;
  stepLightbox: (delta: number) => void;

  toast: string | null;
  showToast: (message: string) => void;

  refresh: () => Promise<void>;
}

const Ctx = createContext<BoardContext | null>(null);

export function useBoard(): BoardContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBoard must be used inside <BoardProvider>");
  return ctx;
}

/* ── provider ────────────────────────────────────────────────────────────── */

export function BoardProvider({
  children,
  initialPlaces,
  persistent: initialPersistent,
}: {
  children: React.ReactNode;
  /** Server-rendered board, so the first paint is never empty. */
  initialPlaces: Place[];
  persistent: boolean;
}) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [persistent, setPersistent] = useState(initialPersistent);

  // The app opens with Jenn selected, every time — switching account is a
  // per-session choice, never stored, so neither phone drifts out of the rule.
  const [user, setUser] = useState<PersonId>("jenn");

  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/places", { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = await response.json();
      setPlaces(data.places);
      setPersistent(data.persistent);
    } catch {
      // Keep whatever is on screen; the next poll may succeed.
    }
  }, []);

  // Two phones, one board: pull fresh data whenever this one comes back to the
  // foreground, and poll slowly while it is visible.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const interval = setInterval(onFocus, 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(interval);
    };
  }, [refresh]);

  // While a shared take is being rewritten server-side, poll faster so the
  // bullets appear as soon as the background task lands.
  const hasPending = places.some((p) => p.takePendingHash);
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => void refresh(), 2500);
    return () => clearInterval(interval);
  }, [hasPending, refresh]);

  const mergePlace = useCallback((place: Place) => {
    setPlaces((current) => {
      const exists = current.some((p) => p.id === place.id);
      return exists
        ? current.map((p) => (p.id === place.id ? place : p))
        : [place, ...current];
    });
  }, []);

  /* ── sheet ─────────────────────────────────────────────────────────────── */

  const openNewPlaceSheet = useCallback(() => {
    setSheet({
      mode: "new",
      score: 8,
      scoreText: null,
      date: todayISO(),
      note: "",
      photos: [],
      name: "",
      cuisine: "",
      area: "",
    });
  }, []);

  const openAddVisitSheet = useCallback((placeId: string) => {
    setSheet({
      mode: "add",
      placeId,
      score: 8,
      scoreText: null,
      date: todayISO(),
      note: "",
      photos: [],
    });
  }, []);

  const openEditVisitSheet = useCallback((placeId: string, visit: Visit) => {
    setSheet({
      mode: "edit",
      placeId,
      visitId: visit.id,
      score: visit.score,
      scoreText: null,
      date: visit.date,
      note: visit.note,
      photos: [...visit.photos],
    });
  }, []);

  const patchSheet = useCallback((patch: Partial<SheetState>) => {
    setSheet((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);

  /** Saves and resolves to the place id to navigate to, or null on failure. */
  const saveSheet = useCallback(async (): Promise<string | null> => {
    if (!sheet) return null;
    setSaving(true);
    try {
      const visit = {
        by: user,
        date: sheet.date,
        score: sheet.score,
        note: sheet.note,
        photos: sheet.photos,
      };

      let response: Response;
      if (sheet.mode === "new") {
        response = await fetch("/api/places", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: sheet.name ?? "",
            cuisine: sheet.cuisine ?? "",
            area: sheet.area ?? "",
            visit,
          }),
        });
      } else if (sheet.mode === "edit") {
        response = await fetch(
          `/api/places/${sheet.placeId}/visits/${sheet.visitId}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(visit),
          },
        );
      } else {
        response = await fetch(`/api/places/${sheet.placeId}/visits`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(visit),
        });
      }

      if (!response.ok) throw new Error("save failed");
      const { place } = (await response.json()) as { place: Place };
      mergePlace(place);
      setSheet(null);
      showToast(sheet.mode === "edit" ? "Visit updated" : "Visit logged");
      return place.id;
    } catch {
      showToast("Couldn't save that visit");
      return null;
    } finally {
      setSaving(false);
    }
  }, [sheet, user, mergePlace, showToast]);

  const deleteSheetVisit = useCallback(async () => {
    if (!sheet?.placeId || !sheet.visitId) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/places/${sheet.placeId}/visits/${sheet.visitId}?by=${user}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("delete failed");
      const { place } = (await response.json()) as { place: Place };
      mergePlace(place);
      setSheet(null);
      showToast("Visit deleted");
    } catch {
      showToast("Couldn't delete that visit");
    } finally {
      setSaving(false);
    }
  }, [sheet, user, mergePlace, showToast]);

  /* ── lightbox ──────────────────────────────────────────────────────────── */

  const openLightbox = useCallback((state: LightboxState) => setLightbox(state), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const stepLightbox = useCallback((delta: number) => {
    setLightbox((current) => {
      if (!current) return current;
      const n = current.photos.length;
      return { ...current, index: (current.index + delta + n) % n };
    });
  }, []);

  const value = useMemo<BoardContext>(
    () => ({
      places,
      persistent,
      user,
      setUser,
      sheet,
      openNewPlaceSheet,
      openAddVisitSheet,
      openEditVisitSheet,
      patchSheet,
      closeSheet,
      saveSheet,
      deleteSheetVisit,
      saving,
      lightbox,
      openLightbox,
      closeLightbox,
      stepLightbox,
      toast,
      showToast,
      refresh,
    }),
    [
      places,
      persistent,
      user,
      sheet,
      openNewPlaceSheet,
      openAddVisitSheet,
      openEditVisitSheet,
      patchSheet,
      closeSheet,
      saveSheet,
      deleteSheetVisit,
      saving,
      lightbox,
      openLightbox,
      closeLightbox,
      stepLightbox,
      toast,
      showToast,
      refresh,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
