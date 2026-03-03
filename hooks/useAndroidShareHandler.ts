import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";
import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";

// Only import ShareMenu in development builds (not Expo Go)
let ShareMenu: any = null;
const isExpoGo = Constants.appOwnership === "expo";
if (Platform.OS === "android" && !isExpoGo) {
  ShareMenu = require("react-native-share-menu").default;
}

const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE ?? "http://10.0.2.2:8000";
console.log("Tentative de connexion sur :", API_BASE);
const SUPPORTED_HOSTS = [
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "instagram.com",
  "vimeo.com",
];

function isSupportedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return SUPPORTED_HOSTS.some((h) => hostname.includes(h));
  } catch {
    return false;
  }
}

type SharedItem = { mimeType: string; data: string } | null;

export function useAndroidShareHandler() {
  useEffect(() => {
    if (Platform.OS !== "android" || !ShareMenu) return;

    const handleShare = async (item: SharedItem) => {
      if (!item || item.mimeType !== "text/plain") return;

      const url = item.data;
      if (!url || !isSupportedUrl(url)) {
        BackHandler.exitApp();
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;

        console.log("Share received URL:", url);
        console.log("Session exists:", !!session);
        console.log("User ID:", userId);

        const response = await fetch(`${API_BASE}/analyze/url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ url, user_id: userId }),
        });

        console.log("API response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", response.status, errorText);
          throw new Error(`API error: ${response.status}`);
        }

        const { job_id } = await response.json();
        console.log("Analysis job started:", job_id);
      } catch (e) {
        console.error("Share handler error:", e);
      } finally {
        BackHandler.exitApp();
      }
    };

    // Cold start (app was closed when share was triggered)
    ShareMenu.getInitialShare(handleShare);

    // Warm start (app was in background)
    const listener = ShareMenu.addNewShareListener(handleShare);

    return () => listener.remove();
  }, []);
}
