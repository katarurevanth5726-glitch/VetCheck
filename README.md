# VetCheck

> **See the signs. Support them sooner.**

VetCheck is a multilingual, image-based animal health screening web application that helps farmers, pet owners and animal caregivers recognise visible warning signs, receive safe preliminary guidance and understand when veterinary care may be urgent.

---

## 📌 Problem Statement

In rural and peri-urban regions across India and developing economies, access to qualified veterinary care is severely constrained. Livestock farmers and pet caregivers often face:

- **Severe Veterinary Shortages**: High animal-to-veterinarian ratios leading to multi-day delays for medical advice.
- **Harmful Folklore Practices**: Widespread use of toxic home chemicals (engine oil, battery acid, caustic salt, kerosene) or human analgesics (paracetamol, ibuprofen) that cause acute animal poisoning.
- **Language & Literacy Barriers**: Absence of localized, regional vernacular guidance with audio narration for low-literacy farmers.
- **Delayed Emergency Escalation**: Inability to identify early red flags (severe respiratory distress, bloat, hemorrhagic enteritis, neurological signs) before conditions become irreversible.

---

## 💡 Proposed Solution

VetCheck provides an on-demand, mobile-first preliminary triage platform. By uploading or capturing photos of an affected animal, caregivers receive instant, explainable visual triage, actionable safe non-medicinal immediate care steps, emergency warnings, and direct connection to government veterinary helplines (1962).

> **⚠️ Veterinary Safety Disclaimer**:
> This application provides preliminary AI-based screening from visible signs and is not a confirmed medical diagnosis. Consult a qualified veterinarian for diagnosis and treatment.

---

## 👥 Target Users

- **Smallholder Dairy & Livestock Farmers**: Cattle, buffalo, goat, sheep, and swine rearers managing livestock health.
- **Poultry & Backyard Bird Keepers**: Flock owners seeking early quarantine and respiratory outbreak guidance.
- **Companion Animal Owners**: Dog and cat owners seeking rapid triage for dermatological, ocular, or minor wound symptoms.
- **Community Animal Volunteers & Rescuers**: Street dog and stray animal welfare volunteers assessing urgent trauma cases.

---

## ✨ Key Features

- 📸 **Camera & Multi-Angle Photo Capture**: Live camera capture with front/rear flip, multi-view uploads (close-up, full body, alternate angles), canvas compression, and client-side validation.
- 🔬 **Two-Stage Visual AI Triage**:
  - **Stage 1 (Visual Assessment)**: Image lighting and focus verification, animal species detection, affected body region mapping, and observable physical signs.
  - **Stage 2 (Clinical Screening)**: Up to 3 differential conditions with supporting evidence, missing clinical tests, and severity grading.
- 🚨 **Emergency Warning & 1962 Helpline**: Immediate escalation for critical symptoms, safe transport instructions, and 1-tap dialer for India's 24x7 **1962 Pashu Sanjeevani** Mobile Veterinary Helpline.
- 🛡️ **Safe Immediate Care & Harmful Folklore Firewall**: Non-medicinal step-by-step checklist with strict "What NOT to do" warnings blocking human medications and corrosive chemicals.
- 🌐 **10+ Indian Regional Languages**: Seamless switching between English, Hindi (हिन्दी), Bengali (বাংলা), Telugu (తెలుగు), Marathi (मराठी), Tamil (தமிழ்), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ), and Odia (ଓଡ଼ିଆ).
- 🗣️ **Vernacular Voice Input & Text-to-Speech (TTS)**: Hands-free voice symptom dictation and spoken audio guidance for low-literacy rural users.
- 🏥 **Nearby Veterinary Clinic Finder**: Integrated Google Maps search for nearby veterinary hospitals with optional GPS location or manual search.
- 📋 **Veterinary Clinical Handover Report**: Generates copyable, printable, and shareable clinical notes formatted for consulting veterinarians.
- 🐾 **My Animals & Longitudinal Health Tracking**: Manage profiles for dairy herds, pets, or community animals and track condition progress across time.
- 📊 **Impact & Usage Analytics Dashboard**: Transparent on-device statistics measuring screenings conducted, emergency cases caught, and regional language usage.
- ⚡ **Offline-Ready First Aid Directory**: Essential emergency first-aid protocols, snakebite management, and heatstroke care accessible even without internet connectivity.

---

## 🚀 Innovation & Differentiators

1. **Strict Non-Prescription Safety**: Unlike generic AI chatbots, VetCheck enforces strict medical firewalls — it never prescribes prescription antibiotics or specific drug dosages, preventing antimicrobial resistance (AMR) and accidental toxicity.
2. **Harmful Practice Interception**: Explicitly detects and warns against harmful regional home remedies (e.g., motor oil on mange, hot iron branding).
3. **Bandwidth-Optimized Edge Compression**: Client-side canvas compression ensures fast uploads and reliable analysis even over 2G/3G rural cellular networks.
4. **Transparent Uncertainty Handling**: Outlines "What this photo cannot see" and lists required lab tests (e.g., skin scrapings, fluorescein eye stains, blood smears).

---

## 🔄 System Architecture & Application Workflow

```text
[User Camera / Gallery]
          │
          ▼
[Client-Side Image Validation & Canvas Compression]
          │
          ▼
[Optional Animal Species & Symptom Context]
          │
          ▼
[Secure Backend Server Proxy (server.ts)]
          │ (Uses GEMINI_API_KEY via @google/genai SDK)
          ▼
[Google Gemini Multimodal Analysis]
          │ (Two-Stage JSON Schema Enforcement)
          ▼
[Structured Response & Safety Validation]
          │
          ▼
[Explainable Results UI: Severity, Visible Signs, Safe Care, Avoidances]
          │
          ▼
[Local Persistence (localStorage): History, Animal Profiles & Follow-ups]
```

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Motion (Framer Motion)
- **Backend / Proxy**: Node.js, Express, `tsx` (Dev), `esbuild` (Production bundling)
- **AI Engine**: Google Gemini API (`@google/genai` SDK) running server-side
- **Audio & Accessibility**: Web Speech API (SpeechRecognition + SpeechSynthesis) with multi-dialect support
- **Build Tooling**: Vite 6, TypeScript Compiler (`tsc`)
- **Storage**: Browser LocalStorage & Local Indexed State (Client-Side Privacy)

---

## 📁 Project Folder Structure

```text
├── src/
│   ├── components/            # UI Screen components and modals
│   │   ├── ui/                # Base design system components (buttons, badges, audio controls)
│   │   ├── AboutProjectScreen.tsx
│   │   ├── AnalysisLoading.tsx
│   │   ├── BottomNav.tsx
│   │   ├── EmergencyScreen.tsx
│   │   ├── FollowUpModal.tsx
│   │   ├── GuidedDemoModal.tsx
│   │   ├── HistoryScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ImpactDashboard.tsx
│   │   ├── LanguageSelectorModal.tsx
│   │   ├── LearnScreen.tsx
│   │   ├── MoreMenuModal.tsx
│   │   ├── Navbar.tsx
│   │   ├── NearbyVetModal.tsx
│   │   ├── OnboardingModal.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── ResultsScreen.tsx
│   │   ├── ScanScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── SplashScreen.tsx
│   │   ├── SubmissionChecklistModal.tsx
│   │   └── VeterinaryReportModal.tsx
│   ├── data/                  # Static guides, emergency hotlines & translations
│   │   ├── emergencyData.ts   # 1962 hotline and first-aid protocols
│   │   ├── learnContent.ts    # Preventive care articles and seasonal health guides
│   │   └── translations.ts   # 10+ Indian regional language dictionaries
│   ├── utils/                 # Utility helpers and managers
│   │   ├── imageCompressor.ts # Client-side image compression
│   │   ├── imageQuality.ts    # Heuristic image check utilities
│   │   ├── shareHelper.ts     # Clinical report formatting and WhatsApp sharing
│   │   ├── speechHelper.ts    # Web Speech recognition and TTS narration engine
│   │   └── storage.ts         # LocalStorage persistence, profiles, and demo datasets
│   ├── types.ts               # Global TypeScript definitions and schemas
│   ├── App.tsx                # Main application orchestrator and state router
│   ├── main.tsx               # Client entry point
│   └── index.css              # Tailwind CSS directives
├── server.ts                  # Secure Express backend and Gemini proxy server
├── package.json               # Project manifest and scripts
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript configuration
├── metadata.json              # Platform metadata and frame permissions
└── .env.example               # Example environment variable declarations
```

---

## 💻 Installation & Local Development

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- A Google Gemini API Key (obtain from [Google AI Studio](https://aistudio.google.com/))

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/VetCheck.git
   cd VetCheck
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a local `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and insert your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   PORT=3000
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

5. **Build for production**:
   ```bash
   npm run build
   ```

6. **Start production server**:
   ```bash
   npm start
   ```

---

## 🔐 Privacy & Security Practices

- **Zero Client-Side Secret Exposure**: `GEMINI_API_KEY` is exclusively consumed by the server-side Node runtime (`server.ts`). It is never passed to the browser, stored in `localStorage`, or exposed in network bundles.
- **Local-Only Health Records**: Screening histories, animal profiles, and follow-ups are stored in the user's browser `localStorage`. No private animal photos or owner details are sent to external databases.
- **Consent-Driven AI**: Image analysis is triggered only when the user explicitly taps "Analyze Animal".
- **Coarse Location Only**: Location coordinates requested for nearby veterinary search are used solely for open Google Maps search queries and are never persisted or tracked.

---

## 📷 Screenshots

| Home & Quick Actions | Camera & Multi-Angle Scan | Structured AI Triage | Emergency Alert & 1962 SOS |
| :---: | :---: | :---: | :---: |
| *[Add Screenshot: Home]* | *[Add Screenshot: Scan]* | *[Add Screenshot: Results]* | *[Add Screenshot: SOS]* |

| Vernacular Language Selector | Veterinary Report Generator | Animal Profiles & History | Impact & Usage Analytics |
| :---: | :---: | :---: | :---: |
| *[Add Screenshot: Languages]* | *[Add Screenshot: Report]* | *[Add Screenshot: Profiles]* | *[Add Screenshot: Impact]* |

---

## 🏆 Smart India Hackathon (SIH) Details

- **Problem Statement Title**: `[DEVELOPER TO FILL: e.g., AI-based Animal Health Triage]`
- **Problem Statement ID**: `[DEVELOPER TO FILL: e.g., SIH-1234]`
- **Theme**: HealthTech / Agriculture & Rural Development
- **Live Working Prototype URL**: `[DEVELOPER TO FILL: Live Deployed Prototype URL]`
- **Video Demonstration Link**: `[DEVELOPER TO FILL: YouTube / Drive Demo Video Link]`

### Team Details
- **Team Name**: `[DEVELOPER TO FILL]`
- **Team Leader**: `[DEVELOPER TO FILL]`
- **Team Members**:
  - `[Member 1 Name - Role]`
  - `[Member 2 Name - Role]`
  - `[Member 3 Name - Role]`
  - `[Member 4 Name - Role]`
  - `[Member 5 Name - Role]`
  - `[Member 6 Name - Role]`
- **College / Institute**: `[DEVELOPER TO FILL]`

---

## ⚠️ Limitations

- **Superficial Sign Constraint**: Visual analysis is strictly limited to external, observable physical signs. Internal pathologies (fevers, organ failure, systemic blood parasites) cannot be detected from photos.
- **Image Quality Dependence**: Blurry, distant, or dimly lit images reduce screening confidence and trigger retake recommendations.
- **Non-Prescription Boundary**: The application deliberately does not prescribe prescription pharmaceuticals, antibiotics, or exact chemical dosages.

---

## 🔮 Future Scope

- **Edge On-Device ML Models**: Integration of lightweight TensorFlow Lite / ONNX models for offline visual feature extraction in zero-connectivity remote pastures.
- **IoT Collar & Ear-Tag Telemetry**: Integration with low-cost rumination and body temperature sensors for automated dairy herd vitals monitoring.
- **Tele-Veterinary Video Triage**: Direct WebRTC video call bridge connecting rural farmers with registered veterinary doctors from the Indian Veterinary Council.

---

## 📄 Licence

`[DEVELOPER TO FILL: Specify licence upon repository publication, e.g., MIT License, Apache 2.0, or All Rights Reserved.]`
