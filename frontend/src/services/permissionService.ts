import type { 
  PurposeProfile, 
  MismatchFinding, 
  PermissionObservation 
} from '../types';

export const EXPECTED_PURPOSE_PERMISSIONS: Record<string, { expected: string[]; anomalous: string[] }> = {
  calculator: {
    expected: ["storage"],
    anomalous: ["location", "camera", "microphone"]
  },
  utility: {
    expected: ["storage"],
    anomalous: ["location", "camera", "microphone"]
  },
  video_meeting: {
    expected: ["camera", "microphone", "notifications"],
    anomalous: ["location"]
  },
  communication: {
    expected: ["camera", "microphone", "notifications"],
    anomalous: ["location"]
  },
  maps: {
    expected: ["location", "storage"],
    anomalous: ["camera", "microphone"]
  },
  navigation: {
    expected: ["location", "storage"],
    anomalous: ["camera", "microphone"]
  },
  weather: {
    expected: ["location", "notifications"],
    anomalous: ["camera", "microphone"]
  },
  social: {
    expected: ["camera", "notifications", "storage"],
    anomalous: ["location"]
  },
  productivity: {
    expected: ["storage", "notifications"],
    anomalous: ["location", "camera"]
  },
  ecommerce: {
    expected: ["storage", "notifications"],
    anomalous: ["camera", "microphone"]
  },
  health: {
    expected: ["storage", "notifications"],
    anomalous: ["location", "camera"]
  }
};

export function detectMismatches(
  purpose: PurposeProfile,
  observations: PermissionObservation[]
): MismatchFinding[] {
  const mismatches: MismatchFinding[] = [];

  observations.forEach((obs) => {
    // Only flag if permission is allowed or granted
    if (obs.browser_setting === "allow" || obs.page_state === "granted") {
      if (purpose === "calculator" || purpose === "utility") {
        if (obs.permission === "location" || obs.permission === "geolocation") {
          mismatches.push({
            permission: obs.permission,
            browser_setting: obs.browser_setting,
            page_state: obs.page_state,
            profile: purpose,
            rule_id: "MIS-01",
            severity: "high",
            explanation: "A calculator utility rarely needs your physical geographic location. This combination introduces an unnecessary tracking vector.",
            limitation_note: "Inference: based on application purpose classification, not observed execution logs.",
            provenance: "inferred"
          });
        } else if (obs.permission === "camera") {
          mismatches.push({
            permission: "camera",
            browser_setting: obs.browser_setting,
            page_state: obs.page_state,
            profile: purpose,
            rule_id: "MIS-02",
            severity: "high",
            explanation: "An arithmetic utility has no functional requirement for webcam optical access.",
            limitation_note: "Inference: unless OCR equation scanning is declared.",
            provenance: "inferred"
          });
        }
      } else if (purpose === "weather") {
        if (obs.permission === "microphone") {
          mismatches.push({
            permission: "microphone",
            browser_setting: obs.browser_setting,
            page_state: obs.page_state,
            profile: "weather",
            rule_id: "MIS-W01",
            severity: "high",
            explanation: "A weather radar utility does not require persistent audio capture sensors.",
            limitation_note: "Inference: voice search could be a non-essential optional feature.",
            provenance: "inferred"
          });
        }
      } else if (purpose === "productivity") {
        if (obs.permission === "location" || obs.permission === "geolocation") {
          mismatches.push({
            permission: obs.permission,
            browser_setting: obs.browser_setting,
            page_state: obs.page_state,
            profile: "productivity",
            rule_id: "MIS-P01",
            severity: "review",
            explanation: "Document cloud storage rarely requires precise geographic positioning telemetry.",
            limitation_note: "Inference: unless document access geotagging is required by enterprise DLP.",
            provenance: "inferred"
          });
        }
      }
    }
  });

  return mismatches;
}

export function normalizeOrigin(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Non-http(s) URL: ${url}`);
  }
  const defaultPort = parsed.protocol === "http:" ? "80" : "443";
  const host = parsed.hostname.toLowerCase();
  const port = parsed.port && parsed.port !== defaultPort ? `:${parsed.port}` : "";
  return `${parsed.protocol}//${host}${port}`;
}
