# Contributing to VetCheck

Thank you for your interest in contributing to **VetCheck**! We welcome contributions aimed at expanding veterinary safety, improving multilingual localization, and optimizing accessibility for rural farmers and animal caregivers.

---

## 🛠️ Development Setup

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/VetCheck.git
   cd VetCheck
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` from Google AI Studio.

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Verify Types and Build**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 🌿 Branch Naming Guidelines

Please use clean, descriptive branch names:
- `feature/vernacular-voice-audio`
- `fix/camera-aspect-ratio-mobile`
- `docs/update-sih-architecture`
- `refactor/image-compressor-canvas`

---

## 💬 Commit Message Conventions

We recommend following the Conventional Commits format:
- `feat: add Kannada speech synthesis fallbacks`
- `fix: prevent duplicate submission on rapid taps`
- `docs: update deployment and environment setup instructions`
- `refactor: optimize multi-image canvas compression`

---

## 🛡️ Security & Privacy Rules

1. **NO SECRETS IN COMMITS**:
   - Never commit `.env` files, actual API keys, private tokens, or credentials.
   - All external AI API keys must be loaded via `process.env` on the backend server (`server.ts`).

2. **NO PRIVATE ANIMAL OR USER DATA**:
   - Never commit real private animal records, owner phone numbers, or private medical documents.
   - All sample demonstration cases must be placed in `src/utils/storage.ts` or `src/data/` and explicitly marked with `isSimulatedDemo: true`.

3. **CLINICAL & MEDICAL SAFETY**:
   - Any modifications to the AI prompt or triage engine must strictly uphold the non-prescription rule: **never output drug dosages or unverified pharmaceutical prescriptions**.
   - Always maintain the mandatory veterinary disclaimer across all result screens.

---

## 🚀 Pull Request Process

1. Ensure `npm run lint` passes with 0 TypeScript/ESLint errors.
2. Verify that `npm run build` succeeds without warnings.
3. Test the core scanning flow, language switching, and local storage persistence.
4. Submit your pull request with a concise description of changes and screenshot/video evidence where applicable.
