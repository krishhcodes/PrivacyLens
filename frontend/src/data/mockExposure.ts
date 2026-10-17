import type { ExposureGraphData } from '../types';

export const MOCK_EXPOSURE_GRAPH: ExposureGraphData = {
  nodes: [
    // 1. Center Identity Node
    {
      id: "node-identity",
      label: "User Digital Identity",
      sublabel: "Core Browser & Device Profile",
      type: "identity",
      icon: "👤",
      provenance: "observed",
      riskBand: "moderate",
      details: {
        totalSitesConnected: 8,
        activeSensors: ["Location", "Camera", "Microphone"],
        riskSummary: "Moderate exposure profile across 8 active applications."
      }
    },

    // 2. Applications
    {
      id: "node-app-calc",
      label: "PocketCalc",
      sublabel: "http://localhost:5500",
      type: "app",
      icon: "🧮",
      provenance: "observed",
      riskBand: "moderate",
      details: {
        category: "Calculator Utility",
        status: "Active Mismatch Flag (Location)",
        riskScore: 58
      }
    },
    {
      id: "node-app-social",
      label: "SocialPulse Media",
      sublabel: "socialpulse.net",
      type: "app",
      icon: "🌐",
      provenance: "observed",
      riskBand: "high",
      details: {
        category: "Social Network",
        status: "Broad Sensory Access & Data Broker Syndication",
        riskScore: 86
      }
    },
    {
      id: "node-app-videomeet",
      label: "VideoMeet Pro",
      sublabel: "videomeet.pro",
      type: "app",
      icon: "📹",
      provenance: "observed",
      riskBand: "low",
      details: {
        category: "Video Conferencing",
        status: "Legitimate Camera & Mic Use",
        riskScore: 24
      }
    },
    {
      id: "node-app-geomaps",
      label: "GeoMaps Live",
      sublabel: "geomaps.app",
      type: "app",
      icon: "🗺️",
      provenance: "observed",
      riskBand: "moderate",
      details: {
        category: "Navigation",
        status: "Continuous GPS Route Tracking",
        riskScore: 42
      }
    },
    {
      id: "node-app-weather",
      label: "HyperWeather",
      sublabel: "hyperweather.io",
      type: "app",
      icon: "🌦️",
      provenance: "observed",
      riskBand: "moderate",
      details: {
        category: "Weather Radar",
        status: "Location Shared with Ad Sponsors",
        riskScore: 48
      }
    },
    {
      id: "node-app-quickshop",
      label: "QuickShop Mart",
      sublabel: "quickshop.store",
      type: "app",
      icon: "🛍️",
      provenance: "observed",
      riskBand: "moderate",
      details: {
        category: "E-Commerce",
        status: "Commercial Retargeting Active",
        riskScore: 54
      }
    },

    // 3. Permissions
    {
      id: "node-perm-location",
      label: "Geolocation Access",
      sublabel: "navigator.geolocation",
      type: "permission",
      icon: "📍",
      provenance: "observed",
      riskBand: "high",
      details: {
        activeGrantCount: 5,
        associatedSensors: "GPS, Wi-Fi BSSID Triangulation, Cell Towers"
      }
    },
    {
      id: "node-perm-camera",
      label: "Camera Stream",
      sublabel: "MediaStream Track",
      type: "permission",
      icon: "📷",
      provenance: "observed",
      riskBand: "moderate",
      details: {
        activeGrantCount: 2,
        associatedSensors: "Webcam Hardware Device"
      }
    },
    {
      id: "node-perm-mic",
      label: "Microphone Audio",
      sublabel: "AudioContext Track",
      type: "permission",
      icon: "🎙️",
      provenance: "observed",
      riskBand: "moderate",
      details: {
        activeGrantCount: 2,
        associatedSensors: "System Audio Input Device"
      }
    },
    {
      id: "node-perm-notifications",
      label: "Push Notifications",
      sublabel: "Notification API",
      type: "permission",
      icon: "🔔",
      provenance: "observed",
      riskBand: "low",
      details: {
        activeGrantCount: 5,
        associatedSensors: "OS Notification Center Dispatcher"
      }
    },

    // 4. Data Types
    {
      id: "node-data-gps",
      label: "Precise Lat/Long Coordinates",
      sublabel: "Physical Location",
      type: "data_type",
      icon: "🛰️",
      provenance: "policy_declared",
      riskBand: "high",
      details: {
        sensitivity: "High Sensitivity",
        leakRisk: "Personal Home & Workplace Routine Extraction"
      }
    },
    {
      id: "node-data-contacts",
      label: "Address Book Contacts",
      sublabel: "Social Graph",
      type: "data_type",
      icon: "👥",
      provenance: "policy_declared",
      riskBand: "high",
      details: {
        sensitivity: "High Sensitivity",
        leakRisk: "Third-party association & shadow profiling"
      }
    },
    {
      id: "node-data-biometric",
      label: "Facial / Audio Biometrics",
      sublabel: "Physical Identity",
      type: "data_type",
      icon: "🧬",
      provenance: "policy_declared",
      riskBand: "high",
      details: {
        sensitivity: "Critical Sensitivity",
        leakRisk: "Irrevocable biometric credential exposure"
      }
    },
    {
      id: "node-data-advertising-id",
      label: "Device Ad ID & Fingerprint",
      sublabel: "Canvas / WebGL Hashes",
      type: "data_type",
      icon: "🔑",
      provenance: "inferred",
      riskBand: "moderate",
      details: {
        sensitivity: "Medium Sensitivity",
        leakRisk: "Cross-site persistent user tracking"
      }
    },

    // 5. Third-Party Entities / Trackers
    {
      id: "node-tp-admob",
      label: "AdMob (Google)",
      sublabel: "Mobile Ad Network",
      type: "third_party",
      icon: "📊",
      provenance: "policy_declared",
      riskBand: "moderate",
      details: {
        entity: "Google LLC",
        purpose: "Targeted advertising and programmatic bidding"
      }
    },
    {
      id: "node-tp-acxiom",
      label: "Acxiom Data Broker",
      sublabel: "Commercial Brokerage",
      type: "third_party",
      icon: "🏢",
      provenance: "policy_declared",
      riskBand: "high",
      details: {
        entity: "Acxiom Corporation",
        purpose: "Consumer credit and demographic enrichment"
      }
    },
    {
      id: "node-tp-criteo",
      label: "Criteo Retargeting",
      sublabel: "Ad Exchange",
      type: "third_party",
      icon: "🎯",
      provenance: "policy_declared",
      riskBand: "moderate",
      details: {
        entity: "Criteo SA",
        purpose: "Cross-site commercial retargeting"
      }
    },
    {
      id: "node-tp-meta",
      label: "Meta Audience Network",
      sublabel: "Ad Tracking Pixel",
      type: "third_party",
      icon: "📘",
      provenance: "policy_declared",
      riskBand: "high",
      details: {
        entity: "Meta Platforms Inc",
        purpose: "Social graph correlation and conversion tracking"
      }
    },
    {
      id: "node-tp-aws",
      label: "Amazon Web Services (AWS)",
      sublabel: "Cloud Host",
      type: "third_party",
      icon: "☁️",
      provenance: "policy_declared",
      riskBand: "low",
      details: {
        entity: "Amazon.com Inc",
        purpose: "Encrypted infrastructure storage and relay"
      }
    }
  ],

  links: [
    // Identity -> Apps
    { source: "node-identity", target: "node-app-calc", label: "Inspects & Runs", provenance: "observed", active: true },
    { source: "node-identity", target: "node-app-social", label: "Active User Session", provenance: "observed", active: true },
    { source: "node-identity", target: "node-app-videomeet", label: "Daily Calls", provenance: "observed", active: true },
    { source: "node-identity", target: "node-app-geomaps", label: "Navigation Runs", provenance: "observed", active: true },
    { source: "node-identity", target: "node-app-weather", label: "Forecast Queries", provenance: "observed", active: true },
    { source: "node-identity", target: "node-app-quickshop", label: "Purchases", provenance: "observed", active: true },

    // Apps -> Permissions
    { source: "node-app-calc", target: "node-perm-location", label: "Requests (Mismatch)", provenance: "inferred", active: true },
    { source: "node-app-social", target: "node-perm-location", label: "Continuous Tracking", provenance: "observed", active: true },
    { source: "node-app-social", target: "node-perm-camera", label: "Photo / Video", provenance: "observed", active: true },
    { source: "node-app-social", target: "node-perm-mic", label: "Audio Posts", provenance: "observed", active: true },
    { source: "node-app-videomeet", target: "node-perm-camera", label: "Video Call", provenance: "observed", active: true },
    { source: "node-app-videomeet", target: "node-perm-mic", label: "Audio Stream", provenance: "observed", active: true },
    { source: "node-app-geomaps", target: "node-perm-location", label: "Route Compute", provenance: "observed", active: true },
    { source: "node-app-weather", target: "node-perm-location", label: "Radar Sync", provenance: "observed", active: true },
    { source: "node-app-quickshop", target: "node-perm-location", label: "Delivery Region", provenance: "observed", active: true },

    // Permissions -> Data Types
    { source: "node-perm-location", target: "node-data-gps", label: "Exposes", provenance: "observed", active: true },
    { source: "node-perm-camera", target: "node-data-biometric", label: "Captures", provenance: "observed", active: true },
    { source: "node-perm-mic", target: "node-data-biometric", label: "Captures", provenance: "observed", active: true },
    { source: "node-app-social", target: "node-data-contacts", label: "Syncs Address Book", provenance: "policy_declared", active: true },
    { source: "node-app-quickshop", target: "node-data-advertising-id", label: "Cookies & Fingerprint", provenance: "inferred", active: true },

    // Apps/Data -> Third Parties
    { source: "node-app-calc", target: "node-tp-admob", label: "Shares Location & Device ID", provenance: "policy_declared", active: true },
    { source: "node-app-social", target: "node-tp-meta", label: "Syncs Profile & Telemetry", provenance: "policy_declared", active: true },
    { source: "node-app-social", target: "node-tp-acxiom", label: "Syndicates Contact Demographics", provenance: "policy_declared", active: true },
    { source: "node-app-weather", target: "node-tp-admob", label: "Shares Location for Ad Bids", provenance: "policy_declared", active: true },
    { source: "node-app-quickshop", target: "node-tp-criteo", label: "Retargets Browsed Items", provenance: "policy_declared", active: true },
    { source: "node-app-videomeet", target: "node-tp-aws", label: "Transits Encrypted Media", provenance: "policy_declared", active: true }
  ]
};
