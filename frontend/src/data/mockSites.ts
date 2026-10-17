import type { SiteDetail, SiteSummary } from '../types';

export const MOCK_SITES: SiteDetail[] = [
  {
    origin: "http://localhost:5500",
    display_name: "PocketCalc (localhost:5500)",
    purpose_profile: "calculator",
    purpose_source: "inferred",
    purpose_confidence: "medium",
    first_audited_at: "2026-10-14T06:10:00Z",
    last_audited_at: "2026-10-14T06:15:22Z",
    band: "moderate",
    score: 58,
    completeness: "full",
    icon: "🧮",
    category_label: "Utilities / Calculator",
    policy_text: `PocketCalc Privacy Policy\n\nWe collect your name, email address, and precise location. We may also collect device identifiers and usage data from time to time.\n\nWe share data with advertising partners to deliver targeted ads. We also share information with service providers who assist us in operating our platform.\n\nWe retain your information as long as necessary to provide our services.\n\nYou may request deletion of your account by contacting us at privacy@pocketcalc.example.`,
    declared_third_parties: ["AdMob Advertising Network", "Google Analytics 4", "Crashlytics SDK"],
    data_collected: ["Precise Geolocation", "Device Identifiers", "Email Address", "Session Logs"],
    observations: [
      {
        id: "obs-calc-1",
        permission: "location",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T06:12:07Z",
        source: "popup_audit",
        provenance: "observed"
      },
      {
        id: "obs-calc-2",
        permission: "camera",
        browser_setting: "ask",
        page_state: "prompt",
        observed_at: "2026-10-14T06:12:07Z",
        source: "popup_audit",
        provenance: "observed"
      },
      {
        id: "obs-calc-3",
        permission: "microphone",
        browser_setting: "ask",
        page_state: "prompt",
        observed_at: "2026-10-14T06:12:07Z",
        source: "popup_audit",
        provenance: "observed"
      },
      {
        id: "obs-calc-4",
        permission: "notifications",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T06:12:07Z",
        source: "popup_audit",
        provenance: "observed"
      }
    ],
    actions: [
      {
        id: "act-calc-1",
        permission: "notifications",
        action: "block",
        before_setting: "ask",
        after_setting: "block",
        succeeded: true,
        acted_at: "2026-10-14T06:15:22Z"
      }
    ],
    policy_findings: [
      {
        id: "f-calc-1",
        origin: "http://localhost:5500",
        excerpt: "We collect your name, email address, and precise location.",
        char_start: 27,
        char_end: 84,
        category: "collection",
        rule_id: "COL-01",
        explanation: "The policy states that precise location is collected. This is a sensitive data type for a calculator utility.",
        recommendation: "Consider whether PocketCalc genuinely requires precise GPS location.",
        evidence_type: "explicit_statement",
        provenance: "policy_declared"
      },
      {
        id: "f-calc-2",
        origin: "http://localhost:5500",
        excerpt: "We share data with advertising partners to deliver targeted ads.",
        char_start: 159,
        char_end: 222,
        category: "sharing",
        rule_id: "SHARE-01",
        explanation: "The policy explicitly states that your data is shared with advertising partners for programmatic targeting.",
        recommendation: "Check whether the application offers an opt-out from ad targeting or block network trackers.",
        evidence_type: "explicit_statement",
        provenance: "policy_declared"
      },
      {
        id: "f-calc-3",
        origin: "http://localhost:5500",
        excerpt: "We retain your information as long as necessary.",
        char_start: 318,
        char_end: 366,
        category: "retention",
        rule_id: "RET-02",
        explanation: "'As long as necessary' is vague. It gives no concrete timeframe for when data is purged.",
        recommendation: "Look for a more specific retention period or request data deletion.",
        evidence_type: "keyword_match_review",
        provenance: "inferred"
      },
      {
        id: "f-calc-4",
        origin: "http://localhost:5500",
        excerpt: "You may request deletion of your account by contacting us at privacy@pocketcalc.example.",
        char_start: 396,
        char_end: 484,
        category: "deletion",
        rule_id: "DEL-01",
        explanation: "The policy offers a deletion mechanism. This is a positive compliance indicator.",
        recommendation: "Note the contact procedure in case you wish to purge your data.",
        evidence_type: "explicit_statement",
        provenance: "policy_declared"
      }
    ],
    assessment: {
      origin: "http://localhost:5500",
      purpose_profile: "calculator",
      purpose_source: "inferred",
      mismatches: [
        {
          permission: "location",
          browser_setting: "allow",
          page_state: "granted",
          profile: "calculator",
          rule_id: "MIS-01",
          severity: "high",
          explanation: "A calculator rarely needs your geographic location. This combination poses an unnecessary tracking vector.",
          limitation_note: "Inference: based on application purpose classification, not observed execution logs.",
          provenance: "inferred"
        }
      ],
      risk: {
        score: 58,
        band: "moderate",
        completeness: "full",
        factors: [
          {
            factor_id: "MIS-01-location",
            label: "Location mismatch (calculator)",
            points: 20,
            provenance: "inferred",
            evidence_refs: ["obs-calc-1"],
            explanation: "Location is allowed for an application classified as a calculator utility."
          },
          {
            factor_id: "POLICY-SHARE",
            label: "Policy declares third-party ad sharing",
            points: 12,
            provenance: "policy_declared",
            evidence_refs: ["f-calc-2"],
            explanation: "The policy explicitly states data is shared with third-party ad networks."
          },
          {
            factor_id: "POLICY-RETAIN",
            label: "Retention vague or indefinite",
            points: 8,
            provenance: "inferred",
            evidence_refs: ["f-calc-3"],
            explanation: "'As long as necessary' provides no binding statutory timeline."
          },
          {
            factor_id: "PERM-NOTIFICATIONS",
            label: "Notifications blocked",
            points: 0,
            provenance: "observed",
            evidence_refs: ["obs-calc-4"],
            explanation: "Notifications are blocked by the user — zero risk contribution."
          }
        ],
        missing: [],
        assessed_at: "2026-10-14T06:20:00Z",
        disclaimer: "Indicative privacy-exposure assessment. Not a formal security rating or legal assertion."
      }
    }
  },
  {
    origin: "https://videomeet.pro",
    display_name: "VideoMeet Pro",
    purpose_profile: "video_meeting",
    purpose_source: "inferred",
    purpose_confidence: "high",
    first_audited_at: "2026-10-12T14:00:00Z",
    last_audited_at: "2026-10-14T08:30:00Z",
    band: "low",
    score: 24,
    completeness: "full",
    icon: "📹",
    category_label: "Communication / Video Conferencing",
    policy_text: `VideoMeet Pro Data Policy\n\nWe process audio and video streams in real-time during your meetings. We do not store unencrypted recordings unless the host explicitly toggles cloud recording.\n\nWe do not sell personal data to third parties. We use AWS hosting and Datadog for telemetry.\n\nMeeting logs are automatically purged after 30 days. You may download all account data at any time.`,
    declared_third_parties: ["Amazon Web Services (AWS)", "Datadog APM", "Twilio WebRTC Gateway"],
    data_collected: ["Audio Stream", "Video Stream", "Display Name", "Network Telemetry"],
    observations: [
      {
        id: "obs-vm-1",
        permission: "camera",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T08:30:00Z",
        provenance: "observed"
      },
      {
        id: "obs-vm-2",
        permission: "microphone",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T08:30:00Z",
        provenance: "observed"
      },
      {
        id: "obs-vm-3",
        permission: "location",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T08:30:00Z",
        provenance: "observed"
      },
      {
        id: "obs-vm-4",
        permission: "notifications",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T08:30:00Z",
        provenance: "observed"
      }
    ],
    actions: [],
    policy_findings: [
      {
        id: "f-vm-1",
        origin: "https://videomeet.pro",
        excerpt: "Meeting logs are automatically purged after 30 days.",
        char_start: 248,
        char_end: 299,
        category: "retention",
        rule_id: "RET-01",
        explanation: "Concrete 30-day retention schedule. Good privacy practice.",
        recommendation: "Verify that recorded video meetings follow organizational compliance.",
        evidence_type: "explicit_statement",
        provenance: "policy_declared"
      }
    ],
    assessment: {
      origin: "https://videomeet.pro",
      purpose_profile: "video_meeting",
      purpose_source: "inferred",
      mismatches: [],
      risk: {
        score: 24,
        band: "low",
        completeness: "full",
        factors: [
          {
            factor_id: "PERM-CAM-MIC",
            label: "Camera & Mic Active (Expected for Video)",
            points: 14,
            provenance: "observed",
            evidence_refs: ["obs-vm-1", "obs-vm-2"],
            explanation: "Camera and microphone grants are expected for video meeting tools."
          },
          {
            factor_id: "TELEMETRY-HOSTING",
            label: "Third-party cloud infrastructure",
            points: 10,
            provenance: "policy_declared",
            evidence_refs: ["f-vm-1"],
            explanation: "Datadog and AWS retain session metadata."
          }
        ],
        missing: [],
        assessed_at: "2026-10-14T08:30:00Z",
        disclaimer: "Indicative privacy-exposure assessment."
      }
    }
  },
  {
    origin: "https://socialpulse.net",
    display_name: "SocialPulse Media",
    purpose_profile: "social",
    purpose_source: "inferred",
    purpose_confidence: "high",
    first_audited_at: "2026-10-10T11:00:00Z",
    last_audited_at: "2026-10-14T09:12:00Z",
    band: "high",
    score: 86,
    completeness: "full",
    icon: "🌐",
    category_label: "Social Networking",
    policy_text: `SocialPulse Privacy Statement\n\nWe collect content you create, photos, videos, contacts list, device sensors, and continuous GPS location. We sync your contact book to recommend connections.\n\nWe share personal data with commercial advertisers, data brokers, and analytics affiliates to deliver cross-context behavioral advertising.\n\nData is stored indefinitely across our global server network to maintain account history.`,
    declared_third_parties: ["Meta Audience Network", "Google AdSense", "Acxiom Data Broker", "TradeDesk", "Segment.io"],
    data_collected: ["Address Book / Contacts", "Precise GPS", "Facial Biometrics", "Device Advertising ID", "Browsing History"],
    observations: [
      {
        id: "obs-sp-1",
        permission: "location",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T09:12:00Z",
        provenance: "observed"
      },
      {
        id: "obs-sp-2",
        permission: "camera",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T09:12:00Z",
        provenance: "observed"
      },
      {
        id: "obs-sp-3",
        permission: "microphone",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T09:12:00Z",
        provenance: "observed"
      },
      {
        id: "obs-sp-4",
        permission: "notifications",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T09:12:00Z",
        provenance: "observed"
      }
    ],
    actions: [],
    policy_findings: [
      {
        id: "f-sp-1",
        origin: "https://socialpulse.net",
        excerpt: "We share personal data with commercial advertisers, data brokers, and analytics affiliates.",
        char_start: 177,
        char_end: 268,
        category: "sale",
        rule_id: "SALE-01",
        explanation: "Explicit transmission to third-party data brokers and cross-site advertisers.",
        recommendation: "Submit CCPA / GDPR opt-out request and revoke continuous location access.",
        evidence_type: "explicit_statement",
        provenance: "policy_declared"
      },
      {
        id: "f-sp-2",
        origin: "https://socialpulse.net",
        excerpt: "Data is stored indefinitely across our global server network.",
        char_start: 337,
        char_end: 398,
        category: "retention",
        rule_id: "RET-03",
        explanation: "Indefinite data retention creates permanent profiling exposure.",
        recommendation: "Delete unused posts or delete dormant account.",
        evidence_type: "explicit_statement",
        provenance: "policy_declared"
      }
    ],
    assessment: {
      origin: "https://socialpulse.net",
      purpose_profile: "social",
      purpose_source: "inferred",
      mismatches: [
        {
          permission: "location",
          browser_setting: "allow",
          page_state: "granted",
          profile: "social",
          rule_id: "MIS-04",
          severity: "review",
          explanation: "Continuous background geolocation enables lifestyle and routine profiling.",
          limitation_note: "Social platforms often request location for geotagging, but continuous access is excessive.",
          provenance: "inferred"
        }
      ],
      risk: {
        score: 86,
        band: "high",
        completeness: "full",
        factors: [
          {
            factor_id: "DATA-BROKERS",
            label: "Data broker & advertising syndication",
            points: 30,
            provenance: "policy_declared",
            evidence_refs: ["f-sp-1"],
            explanation: "Policy confirms syndication to Acxiom and TradeDesk ad exchanges."
          },
          {
            factor_id: "ALL-PERMS-GRANTED",
            label: "Broad sensor and location footprint",
            points: 26,
            provenance: "observed",
            evidence_refs: ["obs-sp-1", "obs-sp-2", "obs-sp-3"],
            explanation: "Camera, microphone, and location all active concurrently."
          },
          {
            factor_id: "INDEFINITE-RETENTION",
            label: "Indefinite data retention",
            points: 20,
            provenance: "policy_declared",
            evidence_refs: ["f-sp-2"],
            explanation: "No automatic expiry for collected biometrics and telemetry."
          },
          {
            factor_id: "BACKGROUND-LOC",
            label: "Continuous location tracking",
            points: 10,
            provenance: "inferred",
            evidence_refs: ["obs-sp-1"],
            explanation: "Unrestricted location access creates persistent exposure."
          }
        ],
        missing: [],
        assessed_at: "2026-10-14T09:12:00Z",
        disclaimer: "Indicative privacy-exposure assessment."
      }
    }
  },
  {
    origin: "https://geomaps.app",
    display_name: "GeoMaps Live",
    purpose_profile: "maps",
    purpose_source: "inferred",
    purpose_confidence: "high",
    first_audited_at: "2026-10-11T09:00:00Z",
    last_audited_at: "2026-10-14T07:45:00Z",
    band: "moderate",
    score: 42,
    completeness: "full",
    icon: "🗺️",
    category_label: "Navigation / Mapping",
    policy_text: `GeoMaps Live Privacy Policy\n\nWe utilize your GPS coordinates to compute turn-by-turn navigation routes. Location data is anonymized into aggregate traffic speed indicators.\n\nWe retain route search history for 90 days to enhance suggestion speed. We do not sell user locations to third parties.`,
    declared_third_parties: ["Mapbox Tiles CDN", "Cloudflare Anycast DNS"],
    data_collected: ["Real-time GPS coordinates", "Navigation destination history", "Device orientation sensors"],
    observations: [
      {
        id: "obs-gm-1",
        permission: "location",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T07:45:00Z",
        provenance: "observed"
      },
      {
        id: "obs-gm-2",
        permission: "camera",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T07:45:00Z",
        provenance: "observed"
      },
      {
        id: "obs-gm-3",
        permission: "microphone",
        browser_setting: "ask",
        page_state: "prompt",
        observed_at: "2026-10-14T07:45:00Z",
        provenance: "observed"
      },
      {
        id: "obs-gm-4",
        permission: "notifications",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T07:45:00Z",
        provenance: "observed"
      }
    ],
    actions: [],
    policy_findings: [],
    assessment: {
      origin: "https://geomaps.app",
      purpose_profile: "maps",
      purpose_source: "inferred",
      mismatches: [],
      risk: {
        score: 42,
        band: "moderate",
        completeness: "full",
        factors: [
          {
            factor_id: "LOC-PRECISION",
            label: "High precision GPS streaming",
            points: 25,
            provenance: "observed",
            evidence_refs: ["obs-gm-1"],
            explanation: "Expected for mapping, yet inherently high-sensitivity coordinate data."
          },
          {
            factor_id: "ROUTE-LOGGING",
            label: "90-day search retention",
            points: 17,
            provenance: "policy_declared",
            evidence_refs: [],
            explanation: "Historical trip destinations preserved for 90 days."
          }
        ],
        missing: [],
        assessed_at: "2026-10-14T07:45:00Z",
        disclaimer: "Indicative privacy-exposure assessment."
      }
    }
  },
  {
    origin: "https://hyperweather.io",
    display_name: "HyperWeather Global",
    purpose_profile: "weather",
    purpose_source: "inferred",
    purpose_confidence: "high",
    first_audited_at: "2026-10-13T10:00:00Z",
    last_audited_at: "2026-10-14T09:00:00Z",
    band: "moderate",
    score: 48,
    completeness: "full",
    icon: "🌦️",
    category_label: "Weather Radar",
    policy_text: `HyperWeather Policy\n\nWe use your approximate or precise location to fetch radar and precipitation models. We partner with ad sponsors to subsidize free weather alerts.\n\nLocation telemetry is transmitted to meteorological research institutes and weather ad sponsors.`,
    declared_third_parties: ["AccuWeather API", "OpenWeather Syndicate", "InMobi Ad Network"],
    data_collected: ["Geographic Latitude/Longitude", "IP Address", "Device Model"],
    observations: [
      {
        id: "obs-hw-1",
        permission: "location",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T09:00:00Z",
        provenance: "observed"
      },
      {
        id: "obs-hw-2",
        permission: "camera",
        browser_setting: "ask",
        page_state: "prompt",
        observed_at: "2026-10-14T09:00:00Z",
        provenance: "observed"
      },
      {
        id: "obs-hw-3",
        permission: "microphone",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T09:00:00Z",
        provenance: "observed"
      },
      {
        id: "obs-hw-4",
        permission: "notifications",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T09:00:00Z",
        provenance: "observed"
      }
    ],
    actions: [],
    policy_findings: [
      {
        id: "f-hw-1",
        origin: "https://hyperweather.io",
        excerpt: "Location telemetry is transmitted to meteorological research institutes and weather ad sponsors.",
        char_start: 139,
        char_end: 236,
        category: "sharing",
        rule_id: "SHARE-02",
        explanation: "Location data shared with commercial ad sponsors alongside meteorological networks.",
        recommendation: "Switch location to approximate city-level coordinates if permitted.",
        evidence_type: "explicit_statement",
        provenance: "policy_declared"
      }
    ],
    assessment: {
      origin: "https://hyperweather.io",
      purpose_profile: "weather",
      purpose_source: "inferred",
      mismatches: [],
      risk: {
        score: 48,
        band: "moderate",
        completeness: "full",
        factors: [
          {
            factor_id: "AD-LOC-SHARE",
            label: "Location shared with ad networks",
            points: 28,
            provenance: "policy_declared",
            evidence_refs: ["f-hw-1"],
            explanation: "Location is monetized via ad networks while providing radar updates."
          },
          {
            factor_id: "PERM-NOTIF-LOC",
            label: "Location & Push notifications active",
            points: 20,
            provenance: "observed",
            evidence_refs: ["obs-hw-1", "obs-hw-4"],
            explanation: "Active geolocation monitoring for weather alert delivery."
          }
        ],
        missing: [],
        assessed_at: "2026-10-14T09:00:00Z",
        disclaimer: "Indicative privacy-exposure assessment."
      }
    }
  },
  {
    origin: "https://quickshop.store",
    display_name: "QuickShop Marketplace",
    purpose_profile: "ecommerce",
    purpose_source: "inferred",
    purpose_confidence: "high",
    first_audited_at: "2026-10-13T12:00:00Z",
    last_audited_at: "2026-10-14T08:15:00Z",
    band: "moderate",
    score: 54,
    completeness: "full",
    icon: "🛍️",
    category_label: "E-Commerce / Shopping",
    policy_text: `QuickShop Consumer Agreement\n\nWe track products viewed, checkout items, billing addresses, and device location for delivery estimation. We share behavioral data with ad retargeting vendors including Criteo and Google Ads.\n\nTransactions are archived for 7 years for tax and statutory auditing requirements.`,
    declared_third_parties: ["Criteo Dynamic Retargeting", "Stripe Payments", "Google Merchant Center"],
    data_collected: ["Shipping Address", "Credit Card Billing Data", "Product View History", "Device Location"],
    observations: [
      {
        id: "obs-qs-1",
        permission: "location",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T08:15:00Z",
        provenance: "observed"
      },
      {
        id: "obs-qs-2",
        permission: "camera",
        browser_setting: "ask",
        page_state: "prompt",
        observed_at: "2026-10-14T08:15:00Z",
        provenance: "observed"
      },
      {
        id: "obs-qs-3",
        permission: "microphone",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T08:15:00Z",
        provenance: "observed"
      },
      {
        id: "obs-qs-4",
        permission: "notifications",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T08:15:00Z",
        provenance: "observed"
      }
    ],
    actions: [],
    policy_findings: [],
    assessment: {
      origin: "https://quickshop.store",
      purpose_profile: "ecommerce",
      purpose_source: "inferred",
      mismatches: [],
      risk: {
        score: 54,
        band: "moderate",
        completeness: "full",
        factors: [
          {
            factor_id: "CRITEO-RETARGETING",
            label: "Commercial retargeting networks",
            points: 24,
            provenance: "policy_declared",
            evidence_refs: [],
            explanation: "Browsing behavior is broadcasted across the Criteo merchant network."
          },
          {
            factor_id: "FINANCIAL-METADATA",
            label: "Financial and address data retention",
            points: 20,
            provenance: "policy_declared",
            evidence_refs: [],
            explanation: "Billing records held for 7-year regulatory period."
          },
          {
            factor_id: "LOC-CHECKOUT",
            label: "Location tracking enabled",
            points: 10,
            provenance: "observed",
            evidence_refs: ["obs-qs-1"],
            explanation: "Location access used for automated shipping region computation."
          }
        ],
        missing: [],
        assessed_at: "2026-10-14T08:15:00Z",
        disclaimer: "Indicative privacy-exposure assessment."
      }
    }
  },
  {
    origin: "https://healthsync.io",
    display_name: "HealthSync Portal",
    purpose_profile: "health",
    purpose_source: "inferred",
    purpose_confidence: "high",
    first_audited_at: "2026-10-12T15:30:00Z",
    last_audited_at: "2026-10-14T06:40:00Z",
    band: "low",
    score: 18,
    completeness: "full",
    icon: "🩺",
    category_label: "Health & Fitness",
    policy_text: `HealthSync HIPAA & GDPR Compliance\n\nAll personal biometric data, vitals, and physician communications are encrypted end-to-end using AES-256 GCM. We never sell health telemetry or share vitals with commercial insurers or advertising exchanges.\n\nData is purged 60 days following account closure.`,
    declared_third_parties: ["HIPAA AWS GovCloud"],
    data_collected: ["Encrypted Health Vitals", "Physician Notes", "Medication Reminders"],
    observations: [
      {
        id: "obs-hs-1",
        permission: "location",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T06:40:00Z",
        provenance: "observed"
      },
      {
        id: "obs-hs-2",
        permission: "camera",
        browser_setting: "ask",
        page_state: "prompt",
        observed_at: "2026-10-14T06:40:00Z",
        provenance: "observed"
      },
      {
        id: "obs-hs-3",
        permission: "microphone",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T06:40:00Z",
        provenance: "observed"
      },
      {
        id: "obs-hs-4",
        permission: "notifications",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T06:40:00Z",
        provenance: "observed"
      }
    ],
    actions: [],
    policy_findings: [],
    assessment: {
      origin: "https://healthsync.io",
      purpose_profile: "health",
      purpose_source: "inferred",
      mismatches: [],
      risk: {
        score: 18,
        band: "low",
        completeness: "full",
        factors: [
          {
            factor_id: "MED-NOTIFICATIONS",
            label: "Push notification alert channel",
            points: 8,
            provenance: "observed",
            evidence_refs: ["obs-hs-4"],
            explanation: "Push notifications active for pill reminders."
          },
          {
            factor_id: "ENCRYPTED-HEALTH",
            label: "High sensitivity domain (Mitigated by E2EE)",
            points: 10,
            provenance: "policy_declared",
            evidence_refs: [],
            explanation: "Health data processed with certified AES-256 encryption."
          }
        ],
        missing: [],
        assessed_at: "2026-10-14T06:40:00Z",
        disclaimer: "Indicative privacy-exposure assessment."
      }
    }
  },
  {
    origin: "https://cloudvault.app",
    display_name: "CloudVault Documents",
    purpose_profile: "productivity",
    purpose_source: "inferred",
    purpose_confidence: "high",
    first_audited_at: "2026-10-14T05:00:00Z",
    last_audited_at: "2026-10-14T08:00:00Z",
    band: "low",
    score: 12,
    completeness: "full",
    icon: "📁",
    category_label: "Cloud Storage",
    policy_text: `CloudVault Privacy Commitment\n\nYour stored files are client-side encrypted before uploading. We have zero knowledge of your encryption keys. We do not access camera, microphone, or geographical coordinates.\n\nAccount data is permanently deleted within 14 days of subscription termination.`,
    declared_third_parties: ["Cloudflare R2 Storage"],
    data_collected: ["Client-Side Encrypted Blobs", "User Email"],
    observations: [
      {
        id: "obs-cv-1",
        permission: "location",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T08:00:00Z",
        provenance: "observed"
      },
      {
        id: "obs-cv-2",
        permission: "camera",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T08:00:00Z",
        provenance: "observed"
      },
      {
        id: "obs-cv-3",
        permission: "microphone",
        browser_setting: "block",
        page_state: "denied",
        observed_at: "2026-10-14T08:00:00Z",
        provenance: "observed"
      },
      {
        id: "obs-cv-4",
        permission: "notifications",
        browser_setting: "allow",
        page_state: "granted",
        observed_at: "2026-10-14T08:00:00Z",
        provenance: "observed"
      }
    ],
    actions: [],
    policy_findings: [],
    assessment: {
      origin: "https://cloudvault.app",
      purpose_profile: "productivity",
      purpose_source: "inferred",
      mismatches: [],
      risk: {
        score: 12,
        band: "low",
        completeness: "full",
        factors: [
          {
            factor_id: "MINIMAL-FOOTPRINT",
            label: "Zero sensor permissions allowed",
            points: 12,
            provenance: "observed",
            evidence_refs: ["obs-cv-1", "obs-cv-2", "obs-cv-3"],
            explanation: "All sensitive device hardware interfaces strictly blocked."
          }
        ],
        missing: [],
        assessed_at: "2026-10-14T08:00:00Z",
        disclaimer: "Indicative privacy-exposure assessment."
      }
    }
  }
];

export const MOCK_SITES_SUMMARY: SiteSummary[] = MOCK_SITES.map(s => ({
  origin: s.origin,
  display_name: s.display_name,
  purpose_profile: s.purpose_profile,
  purpose_source: s.purpose_source,
  purpose_confidence: s.purpose_confidence,
  first_audited_at: s.first_audited_at,
  last_audited_at: s.last_audited_at,
  latest_observations: s.observations,
  band: s.band,
  score: s.score,
  completeness: s.completeness,
  icon: s.icon,
  category_label: s.category_label,
}));
