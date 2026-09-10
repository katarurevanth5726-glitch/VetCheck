import {
  ScreeningRecord,
  UserSettings,
  AnimalProfile,
  AnimalQRPrivacySettings,
  FollowUpLog,
  UserFeedback,
  DailyChecklistState,
  CareReminder,
  ImpactDeviceStats,
  VeterinaryPrescription,
  PrescriptionMedicine,
  VetVisit,
} from "../types";
import {
  syncAnimalToBackend,
  syncScanToBackend,
  syncReminderToBackend,
  syncPrescriptionToBackend,
  syncVetVisitToBackend,
  recordDeletedAnimalId,
  removePendingQueueActionsForAnimal,
} from "./backendSync";
import {
  saveScanImagesToIndexedDB,
  deleteScanImagesFromIndexedDB,
} from "./offlineStorage";

const HISTORY_STORAGE_KEY = "vetcheck_screening_history_v1";
const SETTINGS_STORAGE_KEY = "vetcheck_user_settings_v1";
const PROFILES_STORAGE_KEY = "vetcheck_animal_profiles_v1";
const FEEDBACK_STORAGE_KEY = "vetcheck_user_feedback_v1";
const BOOKMARKS_STORAGE_KEY = "vetcheck_learn_bookmarks_v1";
const CHECKLIST_STORAGE_KEY = "vetcheck_daily_checklists_v1";
const REMINDERS_STORAGE_KEY = "vetcheck_care_reminders_v1";
const PRESCRIPTIONS_STORAGE_KEY = "vetcheck_veterinary_prescriptions_v1";
const VET_VISITS_STORAGE_KEY = "vetcheck_vet_visits_v1";

export const DEFAULT_SETTINGS: UserSettings = {
  language: "en",
  ttsVoiceSpeed: 1.0,
  ttsPitch: 1.0,
  autoSpeakResults: false,
  highContrastMode: false,
  fontSize: "normal",
  simpleMode: false,
  aiConsentAccepted: false,
  imageQuality: "standard",
  onboardingCompleted: false,
};

// Initial realistic demonstration records for Smart India Hackathon HealthTech demo
export const SIMULATED_DEMO_RECORDS: ScreeningRecord[] = [
  {
    id: "demo-cow-1",
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
    imageThumbnail: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=400&q=80",
    selectedAnimal: "Cattle / Cow",
    bodyArea: "Eyes",
    symptomsInput: "Watery discharge in left eye, redness around eyelid, animal keeping eye partially closed.",
    animalProfileId: "profile-1",
    language: "en",
    languageName: "English",
    status: "improving",
    isSimulatedDemo: true,
    completedActionSteps: { "step-0": true, "step-1": true },
    followUps: [
      {
        id: "fl-1",
        screeningId: "demo-cow-1",
        scheduledFor: Date.now() - 1000 * 60 * 60 * 12,
        scheduledLabel: "Day 2 Checkup",
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
        completedAt: Date.now() - 1000 * 60 * 60 * 12,
        statusCondition: "improving",
        isEatingDrinking: "yes",
        vetConsulted: "scheduled",
        newObservedSigns: "Eye is staying open more, redness slightly subsided after saline clean.",
        comparisonResult: {
          status: "Improved",
          summary: "Surface redness appears reduced and eyelid margins are cleaner.",
          visibleChanges: [
            "Reduced tearing / crusting at medial canthus",
            "Cow holding eyelid more open compared to baseline",
          ],
          limitations: [
            "Fluorescein dye check still recommended to ensure no micro-ulceration.",
          ],
        },
      },
    ],
    result: {
      validAnimalImage: true,
      imageQuality: {
        rating: "Good",
        issues: [],
        retakeRecommended: false,
        scoreExplanation: "Clear focus on eye area with adequate natural daylight.",
      },
      detectedAnimal: "Indigenous Cattle (Cow)",
      animalConfidence: "High",
      isAnimal: true,
      animalType: "Indigenous Cattle (Cow)",
      breedOrCategory: "Gir / Desi Cow",
      affectedBodyArea: "Left Eye & Eyelid Margins",
      visibleSigns: [
        "Conjunctival redness and mild swelling around lower eyelid",
        "Clear to mucoid watery ocular discharge",
        "Squinting / photophobia (keeping eye half shut)",
        "No deep corneal ulcer or clouded white opacity visible currently",
      ],
      possibleConditions: [
        {
          name: "Infectious Bovine Keratoconjunctivitis (Pinkeye) - Early Stage",
          reason: "A common bacterial or irritant eye infection in cattle spread by flies and dust.",
          confidence: "High",
          likelihood: "High",
          description: "A common bacterial or irritant eye infection in cattle spread by flies and dust.",
        },
        {
          name: "Foreign Body Irritation (Dust / Fodder seed)",
          reason: "Mechanical irritation from grain dust or grass seed trapped in the eyelid fold.",
          confidence: "Medium",
          likelihood: "Medium",
          description: "Mechanical irritation from grain dust or grass seed trapped in the eyelid fold.",
        },
      ],
      confidence: "High",
      severity: "Moderate",
      simpleExplanation:
        "The left eye shows early signs of conjunctival inflammation with discharge, consistent with mild pinkeye or dust irritation.",
      actionPlan: {
        doNow: [
          "Gently flush the outer eye area with clean, lukewarm boiled water or sterile normal saline using sterile cotton.",
          "Provide shady shelter away from direct glaring sunlight and strong winds.",
          "Keep flies away using insect netting or clean surroundings.",
        ],
        watchFor: [
          "Center of cornea turning milky white or bluish cloudy",
          "Thick yellow-green purulent pus",
          "Cow rubbing face vigorously against posts or fencing",
        ],
        getHelp:
          "Consult your local veterinarian within 24–48 hours if tearing increases or cloudiness appears in the cornea.",
      },
      communityInsight: {
        topic: "Seasonal Eye Irritation in Livestock",
        guidance: "During dry, windy threshing months and fly season, eye irritation is common across herds. Keeping sheds clean and using fly barriers protects the whole herd.",
        preventativeTips: [
          "Minimize dust around feeding troughs",
          "Isolate affected cows early to stop fly transfer",
          "Clean water troughs daily",
        ],
      },
      immediateCare: [
        "Gently flush the outer eye area with clean, lukewarm boiled water or sterile normal saline using clean sterile cotton.",
        "Provide shady shelter away from direct glaring sunlight and strong winds.",
        "Keep flies away from the eyes using clean insect netting or fly repellent on the body (away from eyes).",
        "Isolate from other cows if possible to prevent fly transmission.",
      ],
      safeImmediateCareSteps: [
        "Gently flush the outer eye area with clean, lukewarm boiled water or sterile normal saline using clean sterile cotton.",
        "Provide shady shelter away from direct glaring sunlight and strong winds.",
        "Keep flies away from the eyes using clean insect netting or fly repellent on the body (away from eyes).",
        "Isolate from other cows if possible to prevent fly transmission.",
      ],
      safetyPrecautions: [
        "Restrain the cow gently in a crush or halter; avoid pressing on the sore eye.",
        "Wash your hands thoroughly before and after touching the eye area.",
        "Never use harsh soaps, unboiled water, or dirty towels.",
      ],
      avoidDoing: [
        "DO NOT use irritating home substances like salt water, kerosene, or battery water.",
        "DO NOT give human steroid eye drops without veterinary prescription.",
        "DO NOT rub or scrape the eyeball.",
      ],
      whatToAvoid: [
        "DO NOT use irritating home substances like salt water, kerosene, or battery water.",
        "DO NOT give human steroid eye drops without veterinary prescription.",
        "DO NOT rub or scrape the eyeball.",
      ],
      veterinaryHelp:
        "If the center of the eye turns milky white/blue, if thick yellow-green pus develops, or if no improvement occurs within 48 hours.",
      whenToSeeVet:
        "If the center of the eye turns milky white/blue, if thick yellow-green pus develops, or if no improvement occurs within 48 hours.",
      recommendedNextAction:
        "Clean outer eyelid with warm saline, move cow to shaded stall, and arrange a routine veterinary visit if redness increases.",
      emergencyWarning: false,
      isEmergencyAlert: false,
      limitations: [
        "Internal eye pressures and deep corneal abrasions require fluorescein dye staining by a vet.",
        "Bacterial vs viral vs allergic etiology cannot be conclusively differentiated solely from a photo.",
      ],
      disclaimer:
        "This application provides preliminary AI-based screening from visible signs and is not a confirmed medical diagnosis. Consult a qualified veterinarian for diagnosis and treatment.",
    },
  },
  {
    id: "demo-dog-2",
    timestamp: Date.now() - 1000 * 60 * 60 * 20, // 20 hours ago
    imageThumbnail: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80",
    selectedAnimal: "Dog",
    bodyArea: "Skin or coat",
    symptomsInput: "Scratching ears constantly, hair thinning on muzzle and flank.",
    animalProfileId: "profile-2",
    language: "en",
    languageName: "English",
    status: "improving",
    isSimulatedDemo: true,
    completedActionSteps: { "step-0": true, "step-1": true },
    result: {
      validAnimalImage: true,
      imageQuality: {
        rating: "Good",
        issues: [],
        retakeRecommended: false,
      },
      detectedAnimal: "Canine (Indie / Mixed Dog)",
      animalConfidence: "High",
      isAnimal: true,
      animalType: "Canine (Indie / Mixed Dog)",
      breedOrCategory: "Companion Dog",
      affectedBodyArea: "Muzzle, Ear Flaps & Flank Skin",
      visibleSigns: [
        "Patchy alopecia (hair loss) around muzzle and base of ears",
        "Erythema (redness) and crusty flakes on skin surface",
        "Mild excoriations from scratch trauma",
      ],
      possibleConditions: [
        {
          name: "Sarcoptic / Demodectic Mange (Mites)",
          reason: "Microscopic skin mites causing intense itching, scabs, and localized hair loss.",
          confidence: "High",
          likelihood: "High",
          description: "Microscopic skin mites causing intense itching, scabs, and localized hair loss.",
        },
        {
          name: "Flea Allergy Dermatitis / Fungal Ringworm",
          reason: "Hypersensitivity to ectoparasites or superficial fungal infection.",
          confidence: "Medium",
          likelihood: "Medium",
          description: "Hypersensitivity to ectoparasites or superficial fungal infection.",
        },
      ],
      confidence: "High",
      severity: "Moderate",
      simpleExplanation:
        "Skin shows classic patterns of localized parasitic or fungal dermatosis with hair thinning and crusting.",
      actionPlan: {
        doNow: [
          "Wash dog bedding in hot soapy water and sun dry thoroughly.",
          "Prevent dog from scratching raw with an Elizabethan collar or soft wrap.",
          "Ensure fresh water and nutritious balanced meal.",
        ],
        watchFor: [
          "Bleeding wounds from continuous scratching",
          "Foul smell from ears or skin folds",
          "Lethargy or refusal to eat",
        ],
        getHelp:
          "Take the dog to a veterinary clinic for a skin scraping test to get the specific antiparasitic / antifungal prescription.",
      },
      communityInsight: {
        topic: "Canine Skin Parasite Prevention",
        guidance: "Mange and fleas are easily transmitted between community dogs. Regular grooming, dry bedding, and timely vet checkups keep pets healthy.",
        preventativeTips: [
          "Keep dog away from stray dogs showing severe hair loss",
          "Wash hands after grooming",
          "Use vet-approved preventive tick collars or spot-ons",
        ],
      },
      immediateCare: [
        "Wash bedding and sleeping areas in hot water with pet-safe detergent.",
        "Use an Elizabethan cone collar if the dog is chewing skin raw to prevent self-mutilation.",
        "Ensure nutritious food and clean fresh drinking water at all times.",
      ],
      safeImmediateCareSteps: [
        "Wash bedding and sleeping areas in hot water with pet-safe detergent.",
        "Use an Elizabethan cone collar if the dog is chewing skin raw to prevent self-mutilation.",
        "Ensure nutritious food and clean fresh drinking water at all times.",
      ],
      safetyPrecautions: [
        "Wear gloves when handling scabby skin as some mites and ringworm can transmit to humans (zoonotic).",
        "Wash hands and arms with soap after applying any care.",
      ],
      avoidDoing: [
        "DO NOT use human paracetamol or ibuprofen for pain (they are fatal to dogs).",
        "DO NOT apply motor oil, battery fluid, or harsh agricultural pesticide dips.",
      ],
      whatToAvoid: [
        "DO NOT use human paracetamol or ibuprofen for pain (they are fatal to dogs).",
        "DO NOT apply motor oil, battery fluid, or harsh agricultural pesticide dips.",
      ],
      veterinaryHelp:
        "Consult a veterinarian for a skin scraping test to identify the exact mite/fungus and get proper medicated topical or oral antiparasitic treatment.",
      whenToSeeVet:
        "Consult a veterinarian for a skin scraping test to identify the exact mite/fungus and get proper medicated topical or oral antiparasitic treatment.",
      recommendedNextAction: "Book a clinic appointment for skin scraping test; keep dog bedding isolated.",
      emergencyWarning: false,
      isEmergencyAlert: false,
      limitations: [
        "Microscopic examination of skin scrapings is mandatory to distinguish Sarcoptes from Demodex mites.",
        "Fungal cultures or Wood's lamp tests are necessary to confirm dermatophytosis.",
      ],
      disclaimer:
        "This application provides preliminary AI-based screening from visible signs and is not a confirmed medical diagnosis. Consult a qualified veterinarian for diagnosis and treatment.",
    },
  },
  {
    id: "demo-buffalo-3",
    timestamp: Date.now() - 1000 * 60 * 60 * 10, // 10 hours ago
    imageThumbnail: "https://images.unsplash.com/photo-1596733430284-f7437764b1a9?auto=format&fit=crop&w=400&q=80",
    selectedAnimal: "Buffalo",
    bodyArea: "Stomach or digestion",
    symptomsInput: "Left flank distended like a drum, shallow rapid breathing, animal grunting and kicking at belly.",
    language: "hi",
    languageName: "Hindi",
    status: "vet_consulted",
    isSimulatedDemo: true,
    completedActionSteps: { "step-0": true, "step-1": true },
    followUps: [
      {
        id: "fl-3",
        screeningId: "demo-buffalo-3",
        scheduledFor: Date.now() - 1000 * 60 * 60 * 4,
        scheduledLabel: "Emergency Vet Follow-Up",
        createdAt: Date.now() - 1000 * 60 * 60 * 10,
        completedAt: Date.now() - 1000 * 60 * 60 * 4,
        statusCondition: "improving",
        isEatingDrinking: "partial",
        vetConsulted: "yes",
        newObservedSigns: "Emergency 1962 mobile vet arrived, stomach tube passed and anti-bloat drench administered. Distension reduced.",
      },
    ],
    result: {
      validAnimalImage: true,
      imageQuality: {
        rating: "Acceptable",
        issues: [],
        retakeRecommended: false,
      },
      detectedAnimal: "Water Buffalo (Murrah)",
      animalConfidence: "High",
      isAnimal: true,
      animalType: "Water Buffalo",
      breedOrCategory: "Dairy Buffalo",
      affectedBodyArea: "Left Paralumbar Fossa & Abdomen",
      visibleSigns: [
        "Marked asymmetry with severe bulge on left abdominal flank",
        "Taut, drum-like skin distension",
        "Extended neck posture indicating respiratory distress",
      ],
      possibleConditions: [
        {
          name: "Acute Ruminal Tympany (Frothy or Free-Gas Bloat)",
          reason: "Rapid accumulation of fermentation gas in the rumen obstructing diaphragm movement.",
          confidence: "High",
          likelihood: "High",
          description: "Rapid accumulation of fermentation gas in the rumen obstructing diaphragm movement.",
        },
      ],
      confidence: "High",
      severity: "Emergency",
      severityReason: "Severe ruminal distension risks suffocation and cardiovascular collapse.",
      simpleExplanation:
        "EMERGENCY: Left flank is severely distended, consistent with acute bloat. The animal is in distress and needs immediate veterinary intervention.",
      emergencyWarning: {
        active: true,
        reason: "Severe left flank distension indicates acute bloat causing dangerous pressure on the lungs.",
        immediateAction: "Keep buffalo standing upright with front legs elevated; call emergency veterinary helpline 1962 immediately.",
      },
      actionPlan: {
        doNow: [
          "Call 1962 or your emergency veterinarian immediately.",
          "Keep the buffalo standing and walk it gently on an incline (front legs uphill).",
          "Place a round wooden bit or rope in mouth crosswise to stimulate chewing and gas release (eructation).",
        ],
        watchFor: [
          "Animal collapsing on its side",
          "Tongue protruding with open-mouth panting",
          "Blue-tinted gums from oxygen lack",
        ],
        getHelp: "URGENT: Emergency veterinary assistance is mandatory within the hour.",
      },
      immediateCare: [
        "Call veterinary emergency service 1962 immediately.",
        "Keep the animal standing on an upward slope (forequarters elevated) to reduce pressure on the diaphragm.",
        "Gently massage the left flank upward.",
      ],
      safeImmediateCareSteps: [
        "Call veterinary emergency service 1962 immediately.",
        "Keep the animal standing on an upward slope (forequarters elevated) to reduce pressure on the diaphragm.",
        "Gently massage the left flank upward.",
      ],
      safetyPrecautions: [
        "Do not force-feed liquids into a struggling or choking animal (risk of aspiration pneumonia).",
        "Keep other herd members separate.",
      ],
      avoidDoing: [
        "DO NOT puncture the flank with a kitchen knife or unsterile nail (causes fatal peritonitis).",
        "DO NOT allow the animal to lie down flat.",
      ],
      whatToAvoid: [
        "DO NOT puncture the flank with a kitchen knife or unsterile nail (causes fatal peritonitis).",
        "DO NOT allow the animal to lie down flat.",
      ],
      veterinaryHelp: "Immediate veterinary trocharization or stomach tube decompression required.",
      whenToSeeVet: "Immediate emergency — call 1962 immediately.",
      recommendedNextAction: "Dial 1962 Veterinary Helpline immediately and keep animal standing.",
      limitations: [
        "Differentiating frothy bloat from free-gas or esophageal choke requires physical veterinary palpation.",
      ],
    },
  },
  {
    id: "demo-goat-4",
    timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    imageThumbnail: "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=400&q=80",
    selectedAnimal: "Goat",
    bodyArea: "Mouth or teeth",
    symptomsInput: "Crusty thick scabs around corner of lips and nostrils. Goat reluctant to browse dry shrubs.",
    language: "mr",
    languageName: "Marathi",
    status: "improving",
    isSimulatedDemo: true,
    completedActionSteps: { "step-0": true },
    result: {
      validAnimalImage: true,
      imageQuality: {
        rating: "Good",
        issues: [],
        retakeRecommended: false,
      },
      detectedAnimal: "Caprine (Goat)",
      animalConfidence: "High",
      isAnimal: true,
      animalType: "Goat",
      breedOrCategory: "Osmanabadi Goat",
      affectedBodyArea: "Lips, Commissures & Anterior Muzzle",
      visibleSigns: [
        "Proliferative raised warty scabs around mucocutaneous junction of lips",
        "Mild fissuring and crusting without deep purulent cellulitis",
      ],
      possibleConditions: [
        {
          name: "Contagious Ecthyma (Orf / Sore Mouth)",
          reason: "Parapoxvirus infection common in small ruminants producing characteristic crusty oral lesions.",
          confidence: "High",
          likelihood: "High",
        },
      ],
      confidence: "High",
      severity: "Serious",
      simpleExplanation:
        "Thick crusted lesions around lip corners match contagious ecthyma (sore mouth). The virus can spread quickly to kids and other goats.",
      actionPlan: {
        doNow: [
          "Isolate the goat from the main herd and nursing kids immediately.",
          "Provide soft, fresh green fodder and lukewarm water with electrolytes.",
          "Wear gloves when handling (Orf can infect human skin).",
        ],
        watchFor: [
          "Severe weight loss from inability to eat",
          "Secondary bacterial maggot infestation in scabs",
        ],
        getHelp: "Consult livestock development officer / veterinarian for supportive care drench.",
      },
      immediateCare: [
        "Isolate from other goats to contain viral spread.",
        "Provide soft, non-abrasive nutritious feed (chopped green lucerne/grass).",
      ],
      safeImmediateCareSteps: [
        "Isolate from other goats to contain viral spread.",
        "Provide soft, non-abrasive nutritious feed (chopped green lucerne/grass).",
      ],
      safetyPrecautions: [
        "Wear disposable or washable rubber gloves. Humans can develop painful Orf skin nodules.",
      ],
      avoidDoing: [
        "DO NOT forcibly pull or peel off hard crusts (causes bleeding and spreading).",
        "DO NOT use toxic chemical paints or engine oil on muzzle.",
      ],
      whatToAvoid: [
        "DO NOT forcibly pull or peel off hard crusts (causes bleeding and spreading).",
        "DO NOT use toxic chemical paints or engine oil on muzzle.",
      ],
      veterinaryHelp: "Consult vet for secondary antibacterial topical ointment and herd vaccination advice.",
      recommendedNextAction: "Isolate goat in a clean dry pen with soft feed and arrange veterinary guidance.",
      emergencyWarning: false,
      limitations: [
        "Differential diagnosis with sheep/goat pox or Bluetongue requires clinical oral exam by vet.",
      ],
    },
  },
  {
    id: "demo-poultry-5",
    timestamp: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
    imageThumbnail: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=400&q=80",
    selectedAnimal: "Poultry or bird",
    bodyArea: "Breathing or chest",
    symptomsInput: "Facial swelling below eye, bubbling clear discharge from nostrils, sneezing sounds in coop.",
    language: "te",
    languageName: "Telugu",
    status: "pending",
    isSimulatedDemo: true,
    result: {
      validAnimalImage: true,
      imageQuality: {
        rating: "Good",
        issues: [],
        retakeRecommended: false,
      },
      detectedAnimal: "Poultry (Backyard Chicken / Hen)",
      animalConfidence: "High",
      isAnimal: true,
      animalType: "Poultry",
      affectedBodyArea: "Infraorbital Sinus, Nostrils & Eye Area",
      visibleSigns: [
        "Unilateral facial sinus distension with periocular puffiness",
        "Clear to frothy nasal exudate",
        "Comb slightly pale with feathers ruffled",
      ],
      possibleConditions: [
        {
          name: "Infectious Coryza (Avibacterium paragallinarum)",
          reason: "Acute respiratory bacterial disease of chickens causing facial edema and foul-smelling nasal discharge.",
          confidence: "High",
          likelihood: "High",
        },
        {
          name: "Mycoplasmosis (Chronic Respiratory Disease - CRD)",
          reason: "Common flock respiratory pathogen causing sinus swelling and coughing.",
          confidence: "Medium",
          likelihood: "Medium",
        },
      ],
      confidence: "High",
      severity: "Serious",
      simpleExplanation:
        "Facial swelling and nasal exudate indicate an upper respiratory bacterial infection. Quick flock isolation is needed to prevent pen-wide spread.",
      actionPlan: {
        doNow: [
          "Quarantine affected birds in a warm, dry, well-ventilated recovery crate.",
          "Clean coop drinking waterers with potassium permanganate or mild sanitizer.",
          "Improve coop air ventilation and change wet litter bedding.",
        ],
        watchFor: [
          "Multiple birds in flock developing swollen heads",
          "Sudden drop in egg production or high mortality",
        ],
        getHelp: "Consult poultry veterinarian for antibiotic water medication for the flock.",
      },
      immediateCare: [
        "Quarantine symptomatic birds immediately.",
        "Ensure drinking water is clean and fresh; disinfect drinkers daily.",
      ],
      safeImmediateCareSteps: [
        "Quarantine symptomatic birds immediately.",
        "Ensure drinking water is clean and fresh; disinfect drinkers daily.",
      ],
      safetyPrecautions: [
        "Wash hands and dip footwear in disinfectant before entering other poultry pens.",
      ],
      avoidDoing: [
        "DO NOT mix newly bought birds with existing flock without 2-week quarantine.",
        "DO NOT keep coop completely sealed without airflow.",
      ],
      whatToAvoid: [
        "DO NOT mix newly bought birds with existing flock without 2-week quarantine.",
        "DO NOT keep coop completely sealed without airflow.",
      ],
      veterinaryHelp: "Vet guidance required for specific water-soluble antimicrobial therapy.",
      recommendedNextAction: "Isolate sick birds, disinfect drinkers, and call poultry veterinarian.",
      emergencyWarning: false,
      limitations: [
        "Laboratory serology or PCR is needed to differentiate Avian Influenza from Coryza/CRD.",
      ],
    },
  },
  {
    id: "demo-cat-6",
    timestamp: Date.now() - 1000 * 60 * 60 * 96, // 4 days ago
    imageThumbnail: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80",
    selectedAnimal: "Cat",
    bodyArea: "Ears",
    symptomsInput: "Shaking head occasionally, slight scratching behind left ear, small superficial nick on ear tip.",
    language: "en",
    languageName: "English",
    status: "resolved",
    isSimulatedDemo: true,
    result: {
      validAnimalImage: true,
      imageQuality: {
        rating: "Good",
        issues: [],
        retakeRecommended: false,
      },
      detectedAnimal: "Feline (Domestic Cat)",
      animalConfidence: "High",
      isAnimal: true,
      animalType: "Cat",
      affectedBodyArea: "Pinna (Left Ear Tip)",
      visibleSigns: [
        "Minor superficial skin excoriation at margin of ear flap",
        "Dry scab forming with no active bleeding or purulent discharge",
        "Ear canal opening appears pink and clean",
      ],
      possibleConditions: [
        {
          name: "Superficial Scratch Trauma / Flea Bite Itch",
          reason: "Minor self-inflicted scratch or minor territorial brush.",
          confidence: "High",
          likelihood: "High",
        },
      ],
      confidence: "High",
      severity: "Mild",
      simpleExplanation:
        "The ear tip has a small, clean, superficial healing scratch with no signs of deep hematoma or infection.",
      actionPlan: {
        doNow: [
          "Keep the ear clean and dry.",
          "Inspect coat for fleas or ear mite debris (coffee ground-like discharge).",
        ],
        watchFor: [
          "Swelling of the ear flap like a soft cushion (aural hematoma)",
          "Foul odor or dark brown wax inside the canal",
        ],
        getHelp: "Routine checkup if head-shaking persists past 3 days.",
      },
      immediateCare: [
        "Leave scab undisturbed to heal naturally.",
        "Ensure cat is kept indoors in a clean environment.",
      ],
      safeImmediateCareSteps: [
        "Leave scab undisturbed to heal naturally.",
        "Ensure cat is kept indoors in a clean environment.",
      ],
      safetyPrecautions: [
        "Do not insert cotton swabs (Q-tips) deep inside the feline ear canal.",
      ],
      avoidDoing: [
        "DO NOT use human rubbing alcohol or hydrogen peroxide on cat ear (causes intense burning and tissue damage).",
        "DO NOT give human pain medications (paracetamol is fatal to cats).",
      ],
      whatToAvoid: [
        "DO NOT use human rubbing alcohol or hydrogen peroxide on cat ear (causes intense burning and tissue damage).",
        "DO NOT give human pain medications (paracetamol is fatal to cats).",
      ],
      veterinaryHelp: "Consult vet if cat keeps tilting head or ear flap balloons with blood.",
      recommendedNextAction: "Monitor healing for 48 hours and check for ear mites at next vet visit.",
      emergencyWarning: false,
      limitations: [
        "Deep otoscopic exam needed to evaluate the tympanic membrane.",
      ],
    },
  },
];

export const INITIAL_DEMO_RECORDS = SIMULATED_DEMO_RECORDS.slice(0, 2);

export const DEFAULT_QR_PRIVACY: AnimalQRPrivacySettings = {
  showName: true,
  showPhoto: true,
  showSpecies: true,
  showSexAge: true,
  showVaccinationStatus: true,
  showDetailedVaccination: false,
  showHealthTimeline: false,
  showPrescriptions: false,
  showRecoveryRecords: false,
  showEmergencyNote: false,
  enableLostPetContact: false,
};

export function generatePermanentAnimalId(name: string, id: string): string {
  const cleanName = (name || "VET").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const prefix = cleanName.length >= 3 ? cleanName.slice(0, 3) : (cleanName + "XXX").slice(0, 3);
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const numericPart = Math.abs(hash % 9000) + 1000;
  return `VC-${prefix}-${numericPart}`;
}

const INITIAL_PROFILES: AnimalProfile[] = [
  {
    id: "profile-1",
    animalId: "VC-GRI-4091",
    name: "Gauri",
    species: "Cattle / Cow",
    breed: "Gir Indigenous",
    approxAge: "4 Years",
    age: "4 Years",
    sex: "Female",
    tagNumber: "MH-VET-4091",
    color: "Reddish Brown",
    notes: "High milk yield. Vaccinated for FMD last season.",
    vaccinationStatus: "Up to date (FMD)",
    qrPrivacySettings: { ...DEFAULT_QR_PRIVACY },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  },
  {
    id: "profile-2",
    animalId: "VC-SHR-8120",
    name: "Sheru",
    species: "Dog",
    breed: "Indie / Desi Dog",
    approxAge: "2 Years",
    age: "2 Years",
    sex: "Male",
    color: "Golden Tan",
    notes: "Rescued puppy. Friendly with livestock.",
    vaccinationStatus: "Anti-Rabies done (April)",
    qrPrivacySettings: {
      ...DEFAULT_QR_PRIVACY,
      enableLostPetContact: false,
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
  },
];

// --- Storage Helper Methods ---

// Safe LocalStorage setter with automatic quota exhaustion guard
function safeSetLocalStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === "QuotaExceededError" || /quota/i.test(e?.message || "")) {
      console.warn("[VetCheck Storage] LocalStorage quota reached. Pruning older history entries to free space...");
      try {
        if (key === HISTORY_STORAGE_KEY) {
          const current: any[] = JSON.parse(value);
          const pruned = current.slice(0, Math.max(5, Math.floor(current.length / 2)));
          localStorage.setItem(key, JSON.stringify(pruned));
          return;
        }
      } catch {
        // Fall through
      }
    }
    console.error(`[VetCheck Storage] Failed to write key ${key}:`, e);
  }
}

export function getStoredHistory(): ScreeningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_RECORDS));
      return INITIAL_DEMO_RECORDS;
    }
    const parsed: ScreeningRecord[] = JSON.parse(raw);
    return parsed;
  } catch (e) {
    console.error("Failed to read history from localStorage:", e);
    return [];
  }
}

export function saveScreeningToHistory(record: ScreeningRecord): ScreeningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    // 1. Save full-res images to IndexedDB
    saveScanImagesToIndexedDB({
      id: record.id,
      imageThumbnail: record.imageThumbnail,
      allImages: record.allImages,
      timestamp: record.timestamp,
    }).catch(() => {});

    // 2. Prepare lightweight record for localStorage
    const lightweightRecord: ScreeningRecord = {
      ...record,
      allImages: record.allImages?.map((img) => ({
        type: img.type,
        url: img.url,
      })),
    };

    const history = getStoredHistory();
    const updated = [lightweightRecord, ...history.filter((item) => item.id !== record.id)].slice(0, 30);
    safeSetLocalStorageItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    syncScanToBackend(record, "save");
    return updated;
  } catch (e) {
    console.error("Failed to save screening to history:", e);
    return [];
  }
}

export function updateScreeningRecord(record: ScreeningRecord): ScreeningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    saveScanImagesToIndexedDB({
      id: record.id,
      imageThumbnail: record.imageThumbnail,
      allImages: record.allImages,
      timestamp: record.timestamp,
    }).catch(() => {});

    const lightweightRecord: ScreeningRecord = {
      ...record,
      allImages: record.allImages?.map((img) => ({
        type: img.type,
        url: img.url,
      })),
    };

    const history = getStoredHistory();
    const idx = history.findIndex((r) => r.id === record.id);
    let updated: ScreeningRecord[];
    if (idx >= 0) {
      updated = [...history];
      updated[idx] = lightweightRecord;
    } else {
      updated = [lightweightRecord, ...history];
    }
    safeSetLocalStorageItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    syncScanToBackend(record, "save");
    return updated;
  } catch (e) {
    console.error("Failed to update record:", e);
    return [];
  }
}

export function deleteScreeningRecord(id: string): ScreeningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    deleteScanImagesFromIndexedDB(id).catch(() => {});
    const history = getStoredHistory();
    const updated = history.filter((r) => r.id !== id);
    safeSetLocalStorageItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    syncScanToBackend({ id } as any, "delete");
    return updated;
  } catch (e) {
    console.error("Failed to delete record:", e);
    return [];
  }
}

export function clearAllScreeningHistory(): void {
  if (typeof window === "undefined") return;
  try {
    safeSetLocalStorageItem(HISTORY_STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error("Failed to clear history:", e);
  }
}

export function getStoredSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error("Failed to read settings from localStorage:", e);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: Partial<UserSettings>): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const current = getStoredSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to save settings to localStorage:", e);
    return DEFAULT_SETTINGS;
  }
}

export function getStoredAnimalProfiles(): AnimalProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(INITIAL_PROFILES));
      return INITIAL_PROFILES;
    }
    const parsed: AnimalProfile[] = JSON.parse(raw);
    let needsResave = false;
    const normalized = parsed.map((p) => {
      let updated = p;
      if (!p.animalId) {
        updated = { ...updated, animalId: generatePermanentAnimalId(p.name, p.id) };
        needsResave = true;
      }
      if (!p.qrPrivacySettings) {
        updated = { ...updated, qrPrivacySettings: { ...DEFAULT_QR_PRIVACY } };
        needsResave = true;
      }
      return updated;
    });

    if (needsResave) {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch (e) {
    console.error("Failed to read animal profiles:", e);
    return [];
  }
}

export function saveAnimalProfile(profile: AnimalProfile): AnimalProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const profiles = getStoredAnimalProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === profile.id);
    const guaranteedProfile: AnimalProfile = {
      ...profile,
      animalId: profile.animalId || generatePermanentAnimalId(profile.name, profile.id),
      qrPrivacySettings: profile.qrPrivacySettings || { ...DEFAULT_QR_PRIVACY },
    };

    let updated: AnimalProfile[];
    if (existingIndex >= 0) {
      updated = [...profiles];
      updated[existingIndex] = guaranteedProfile;
    } else {
      updated = [guaranteedProfile, ...profiles];
    }
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
    syncAnimalToBackend(guaranteedProfile, "save");
    return updated;
  } catch (e) {
    console.error("Failed to save animal profile:", e);
    return [];
  }
}

export function saveAnimalQRPrivacySettings(
  profileId: string,
  settings: Partial<AnimalQRPrivacySettings>
): AnimalProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const profiles = getStoredAnimalProfiles();
    const idx = profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) return null;

    const currentSettings = profiles[idx].qrPrivacySettings || { ...DEFAULT_QR_PRIVACY };
    const updatedProfile: AnimalProfile = {
      ...profiles[idx],
      qrPrivacySettings: {
        ...currentSettings,
        ...settings,
      },
    };

    profiles[idx] = updatedProfile;
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    return updatedProfile;
  } catch (e) {
    console.error("Failed to save QR privacy settings:", e);
    return null;
  }
}

export function getAnimalCalculatedVaccinationStatus(profileId: string): {
  statusText: string;
  statusType: "up_to_date" | "due_soon" | "overdue" | "not_recorded";
  nextCareDate?: string;
  nextCareTitle?: string;
} {
  const reminders = getRemindersForAnimal(profileId);
  const profiles = getStoredAnimalProfiles();
  const profile = profiles.find((p) => p.id === profileId);

  const vaccineReminders = reminders.filter((r) => r.reminderType === "vaccination" || r.type === "vaccination");
  const upcomingCareList = reminders
    .filter((r) => !r.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const upcomingCare = upcomingCareList[0];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const overdue = vaccineReminders.some((r) => !r.completed && new Date(r.dueDate) < now);
  const dueSoon = vaccineReminders.some((r) => {
    if (r.completed) return false;
    const due = new Date(r.dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  });

  let statusText = "Not Recorded";
  let statusType: "up_to_date" | "due_soon" | "overdue" | "not_recorded" = "not_recorded";

  if (overdue) {
    statusText = "Overdue Vaccine";
    statusType = "overdue";
  } else if (dueSoon) {
    statusText = "Booster Due Soon";
    statusType = "due_soon";
  } else if (
    vaccineReminders.some((r) => r.completed) ||
    (profile?.vaccinationStatus &&
      (profile.vaccinationStatus.toLowerCase().includes("up to date") ||
        profile.vaccinationStatus.toLowerCase().includes("done") ||
        profile.vaccinationStatus.toLowerCase().includes("completed")))
  ) {
    statusText = "Up to Date";
    statusType = "up_to_date";
  } else if (profile?.vaccinationStatus && profile.vaccinationStatus.trim()) {
    statusText = profile.vaccinationStatus;
    statusType = "up_to_date";
  }

  return {
    statusText,
    statusType,
    nextCareDate: upcomingCare?.dueDate,
    nextCareTitle: upcomingCare?.title || upcomingCare?.reason,
  };
}

export function deleteAnimalProfile(id: string): AnimalProfile[] {
  if (typeof window === "undefined") return [];
  try {
    // 1. Record tombstone to prevent resurrection from background sync
    recordDeletedAnimalId(id);
    removePendingQueueActionsForAnimal(id);

    // 2. Remove animal from profiles
    const profiles = getStoredAnimalProfiles();
    const updated = profiles.filter((p) => p.id !== id);
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));

    // 3. Remove linked care reminders & notifications
    try {
      const existingReminders = getStoredReminders();
      const updatedReminders = existingReminders.filter(
        (r) => r.animalProfileId !== id && r.animalId !== id
      );
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updatedReminders));
    } catch (remErr) {
      console.warn("Error cleaning up reminders during animal deletion:", remErr);
    }

    // 4. Remove linked prescriptions
    try {
      const existingPrescriptions = getStoredPrescriptions();
      const updatedPrescriptions = existingPrescriptions.filter(
        (p) => p.animalProfileId !== id
      );
      localStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(updatedPrescriptions));
    } catch (prescErr) {
      console.warn("Error cleaning up prescriptions during animal deletion:", prescErr);
    }

    // 5. Remove linked vet visits
    try {
      const existingVisits = getStoredVetVisits();
      const updatedVisits = existingVisits.filter(
        (v) => v.animalProfileId !== id
      );
      localStorage.setItem(VET_VISITS_STORAGE_KEY, JSON.stringify(updatedVisits));
    } catch (visitErr) {
      console.warn("Error cleaning up vet visits during animal deletion:", visitErr);
    }

    // 6. Remove linked checklists
    try {
      const rawChecklists = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (rawChecklists) {
        const checklists = JSON.parse(rawChecklists);
        if (Array.isArray(checklists)) {
          const updatedChecklists = checklists.filter((c: any) => c.animalProfileId !== id);
          localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(updatedChecklists));
        }
      }
    } catch (checkErr) {
      console.warn("Error cleaning up checklists during animal deletion:", checkErr);
    }

    // 7. Sync deletion to backend / Firestore
    syncAnimalToBackend({ id } as any, "delete");

    return updated;
  } catch (e) {
    console.error("Failed to delete animal profile:", e);
    return [];
  }
}

export function deleteAnimalProfileAndData(
  profileId: string,
  deleteLinkedRecords: boolean = true
): { profiles: AnimalProfile[]; history: ScreeningRecord[] } {
  if (typeof window === "undefined") return { profiles: [], history: [] };
  try {
    const updatedProfiles = deleteAnimalProfile(profileId);
    let updatedHistory = getStoredHistory();

    if (deleteLinkedRecords) {
      updatedHistory = updatedHistory.filter((r) => r.animalProfileId !== profileId && (r as any).animalId !== profileId);
    } else {
      // Unlink profile from records rather than deleting history
      updatedHistory = updatedHistory.map((r) =>
        r.animalProfileId === profileId ? { ...r, animalProfileId: undefined } : r
      );
    }
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    return { profiles: updatedProfiles, history: updatedHistory };
  } catch (e) {
    console.error("Failed to delete profile and associated records:", e);
    return { profiles: getStoredAnimalProfiles(), history: getStoredHistory() };
  }
}

// Add follow up to a screening record
export function addFollowUpToRecord(screeningId: string, followUp: FollowUpLog): ScreeningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const history = getStoredHistory();
    let updatedRecord: ScreeningRecord | null = null;
    const updated = history.map((record) => {
      if (record.id === screeningId) {
        const followUps = record.followUps ? [followUp, ...record.followUps] : [followUp];
        updatedRecord = {
          ...record,
          followUps,
          status: followUp.statusCondition || record.status,
        };
        return updatedRecord;
      }
      return record;
    });
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    if (updatedRecord) {
      syncScanToBackend(updatedRecord, "save");
    }
    return updated;
  } catch (e) {
    console.error("Failed to add follow-up log:", e);
    return getStoredHistory();
  }
}

// Toggle an action plan checkbox
export function toggleActionPlanStep(
  screeningId: string,
  stepKey: string,
  completed: boolean
): ScreeningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const history = getStoredHistory();
    const updated = history.map((record) => {
      if (record.id === screeningId) {
        const completedActionSteps = {
          ...(record.completedActionSteps || {}),
          [stepKey]: completed,
        };
        return { ...record, completedActionSteps };
      }
      return record;
    });
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to toggle action step:", e);
    return getStoredHistory();
  }
}

// Local User Feedback (Stored strictly in LocalStorage only)
export function getStoredFeedback(): UserFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load feedback:", e);
    return [];
  }
}

export function saveUserFeedback(
  feedbackData: Omit<UserFeedback, "id" | "timestamp">
): UserFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getStoredFeedback();
    const newFeedback: UserFeedback = {
      id: "fb-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      ...feedbackData,
    };
    const updated = [newFeedback, ...existing];
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to save local feedback:", e);
    return getStoredFeedback();
  }
}

// ----------------------------------------------------
// 1. Learn & Prevent Bookmarks Storage
// ----------------------------------------------------
export function getStoredBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load bookmarks:", e);
    return [];
  }
}

export function toggleLearnBookmark(topicId: string): { bookmarks: string[]; isBookmarked: boolean } {
  if (typeof window === "undefined") return { bookmarks: [], isBookmarked: false };
  try {
    const current = getStoredBookmarks();
    let updated: string[];
    let isBookmarked = false;
    if (current.includes(topicId)) {
      updated = current.filter((id) => id !== topicId);
      isBookmarked = false;
    } else {
      updated = [topicId, ...current];
      isBookmarked = true;
    }
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updated));
    return { bookmarks: updated, isBookmarked };
  } catch (e) {
    console.error("Failed to toggle bookmark:", e);
    return { bookmarks: getStoredBookmarks(), isBookmarked: false };
  }
}

export function isTopicBookmarked(topicId: string): boolean {
  return getStoredBookmarks().includes(topicId);
}

// ----------------------------------------------------
// 2. Daily Care Checklist Storage
// ----------------------------------------------------
export function getStoredDailyChecklists(): Record<string, DailyChecklistState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    console.error("Failed to load daily checklists:", e);
    return {};
  }
}

export function getDailyChecklistForAnimal(dateKey: string, animalIdOrName: string = "default"): DailyChecklistState {
  const all = getStoredDailyChecklists();
  const compositeKey = `${dateKey}_${animalIdOrName}`;
  if (all[compositeKey]) {
    return all[compositeKey];
  }
  return {
    dateKey,
    animalName: animalIdOrName,
    items: {},
  };
}

export function saveDailyChecklist(state: DailyChecklistState): Record<string, DailyChecklistState> {
  if (typeof window === "undefined") return {};
  try {
    const all = getStoredDailyChecklists();
    const compositeKey = `${state.dateKey}_${state.animalProfileId || state.animalName || "default"}`;
    all[compositeKey] = state;
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(all));
    return all;
  } catch (e) {
    console.error("Failed to save daily checklist:", e);
    return getStoredDailyChecklists();
  }
}

// ----------------------------------------------------
// 3. Vaccination & Care Reminders Storage
// ----------------------------------------------------
export function getStoredReminders(): CareReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) {
      // Default sample reminders for demonstration
      const initialDemo: CareReminder[] = [
        {
          id: "rem-demo-1",
          animalProfileId: "profile-1",
          animalName: "Gauri (Cow)",
          species: "Cattle / Cow",
          reminderType: "vaccination",
          title: "FMD (Foot & Mouth) Bi-Annual Booster",
          administeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 160).toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString().split("T")[0],
          dueTime: "09:00",
          notes: "Essential pre-monsoon bi-annual booster recommended by Veterinary Dispensary.",
          veterinarian: "Dr. K. Patel (Govt Veterinary Hospital)",
          recurrence: "6_months",
          completed: false,
          createdAt: Date.now(),
        },
        {
          id: "rem-demo-2",
          animalProfileId: "profile-2",
          animalName: "Sheru (Dog)",
          species: "Dog",
          reminderType: "vaccination",
          title: "Anti-Rabies Annual Booster",
          administeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 350).toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split("T")[0],
          dueTime: "10:00",
          notes: "Mandatory annual rabies protection.",
          veterinarian: "Dr. Sharma",
          recurrence: "1_year",
          completed: false,
          createdAt: Date.now(),
        },
        {
          id: "rem-demo-3",
          animalProfileId: "profile-2",
          animalName: "Sheru (Dog)",
          species: "Dog",
          reminderType: "deworming",
          title: "Broad-Spectrum Deworming Tablet",
          administeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 85).toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().split("T")[0],
          dueTime: "08:30",
          notes: "Quarterly deworming tablet given with morning meal.",
          recurrence: "3_months",
          completed: false,
          createdAt: Date.now(),
        },
      ];
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(initialDemo));
      return initialDemo;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load reminders:", e);
    return [];
  }
}

export function saveReminder(reminder: Omit<CareReminder, "id" | "createdAt"> & { id?: string }): CareReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getStoredReminders();
    const isMedicine = reminder.reminderType === "medicine" || reminder.type === "medicine";
    
    let nextTrigger = reminder.nextTriggerTimestamp;
    if (isMedicine && !nextTrigger && !reminder.completed) {
      const dates = calculateNextMedicineDates(
        reminder.startDate || reminder.dueDate || new Date().toISOString().split("T")[0],
        reminder.startTime || reminder.dueTime || "08:00",
        reminder.intervalValue || 4,
        reminder.intervalUnit || "hours",
        1
      );
      nextTrigger = dates[0]?.getTime();
    }

    const payload: Partial<CareReminder> = {
      ...reminder,
      status: reminder.status || (reminder.completed ? "completed" : "active"),
      active: reminder.active !== undefined ? reminder.active : !reminder.completed,
      nextTriggerTimestamp: nextTrigger,
      startDate: reminder.startDate || reminder.dueDate,
      startTime: reminder.startTime || reminder.dueTime || "08:00",
    };

    if (reminder.id) {
      const updated = existing.map((r) =>
        r.id === reminder.id ? { ...r, ...payload } : r
      );
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
      const target = updated.find((r) => r.id === reminder.id);
      if (target) syncReminderToBackend(target, "save");
      return updated;
    } else {
      const newReminder: CareReminder = {
        ...payload,
        id: "rem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        createdAt: Date.now(),
        completed: reminder.completed || false,
      } as CareReminder;
      const updated = [newReminder, ...existing];
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
      syncReminderToBackend(newReminder, "save");
      return updated;
    }
  } catch (e) {
    console.error("Failed to save reminder:", e);
    return getStoredReminders();
  }
}

export function deleteReminder(reminderId: string): CareReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getStoredReminders();
    const updated = existing.filter((r) => r.id !== reminderId);
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
    syncReminderToBackend({ id: reminderId } as any, "delete");
    return updated;
  } catch (e) {
    console.error("Failed to delete reminder:", e);
    return getStoredReminders();
  }
}

export function formatIntervalDisplay(intervalValue?: number, intervalUnit?: string): string {
  const val = intervalValue || 1;
  const unit = (intervalUnit || "hours").toLowerCase();
  if (unit === "minutes") {
    return `Every ${val} ${val === 1 ? "Minute" : "Minutes"}`;
  }
  if (unit === "days") {
    return `Every ${val} ${val === 1 ? "Day" : "Days"}`;
  }
  if (val === 24) {
    return "Every 24 Hours (Once Daily)";
  }
  return `Every ${val} ${val === 1 ? "Hour" : "Hours"}`;
}

export function calculateNextMedicineDates(
  startDateStr: string,
  startTimeStr: string = "08:00",
  intervalValue: number = 4,
  intervalUnit: "minutes" | "hours" | "days" = "hours",
  count: number = 3,
  fromTimestamp?: number
): Date[] {
  try {
    const [year, month, day] = (startDateStr || new Date().toISOString().split("T")[0]).split("-").map(Number);
    const [hour, minute] = (startTimeStr || "08:00").split(":").map(Number);

    const baseDate = new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
    const now = fromTimestamp !== undefined ? fromTimestamp : Date.now();

    let stepMs = intervalValue * 60 * 60 * 1000;
    if (intervalUnit === "minutes") stepMs = intervalValue * 60 * 1000;
    else if (intervalUnit === "days") stepMs = intervalValue * 24 * 60 * 60 * 1000;
    if (stepMs <= 0) stepMs = 60 * 60 * 1000;

    let current = baseDate.getTime();
    if (current < now) {
      const elapsed = now - current;
      const stepsToSkip = Math.floor(elapsed / stepMs) + 1;
      current += stepsToSkip * stepMs;
    }

    const results: Date[] = [];
    for (let i = 0; i < count; i++) {
      results.push(new Date(current + i * stepMs));
    }
    return results;
  } catch (err) {
    console.warn("Error calculating next medicine dates:", err);
    return [new Date(), new Date(Date.now() + 3600000), new Date(Date.now() + 7200000)];
  }
}

export function pauseMedicineReminder(reminderId: string): CareReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getStoredReminders();
    const updated = existing.map((r) => {
      if (r.id === reminderId) {
        return {
          ...r,
          status: "paused" as const,
          active: false,
        };
      }
      return r;
    });
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
    const target = updated.find((r) => r.id === reminderId);
    if (target) syncReminderToBackend(target, "save");
    return updated;
  } catch (e) {
    console.error("Failed to pause medicine reminder:", e);
    return getStoredReminders();
  }
}

export function resumeMedicineReminder(reminderId: string): CareReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getStoredReminders();
    const updated = existing.map((r) => {
      if (r.id === reminderId) {
        const nextDates = calculateNextMedicineDates(
          r.startDate || r.dueDate || new Date().toISOString().split("T")[0],
          r.startTime || r.dueTime || "08:00",
          r.intervalValue || 4,
          r.intervalUnit || "hours",
          1
        );
        const nextEpoch = nextDates[0]?.getTime() || Date.now() + 60000;
        return {
          ...r,
          status: "active" as const,
          active: true,
          completed: false,
          nextTriggerTimestamp: nextEpoch,
        };
      }
      return r;
    });
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
    const target = updated.find((r) => r.id === reminderId);
    if (target) syncReminderToBackend(target, "save");
    return updated;
  } catch (e) {
    console.error("Failed to resume medicine reminder:", e);
    return getStoredReminders();
  }
}

export function toggleReminderCompleted(
  reminderId: string,
  scheduleNextRecurrence: boolean = false
): { reminders: CareReminder[]; nextReminder?: CareReminder } {
  if (typeof window === "undefined") return { reminders: [] };
  try {
    const existing = getStoredReminders();
    let nextCreatedReminder: CareReminder | undefined;

    const updated = existing.map((r) => {
      if (r.id === reminderId) {
        const completed = !r.completed;
        const isMedicine = r.reminderType === "medicine" || r.type === "medicine";
        const updatedItem: CareReminder = {
          ...r,
          completed,
          completedAt: completed ? Date.now() : undefined,
          status: isMedicine ? (completed ? "completed" : "active") : (completed ? "completed" : "active"),
          active: isMedicine ? !completed : !completed,
        };

        if (completed && scheduleNextRecurrence && r.recurrence && r.recurrence !== "none") {
          let monthsToAdd = 3;
          if (r.recurrence === "6_months") monthsToAdd = 6;
          if (r.recurrence === "1_year") monthsToAdd = 12;

          const baseDate = r.dueDate ? new Date(r.dueDate) : new Date();
          baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
          const nextDueDateStr = baseDate.toISOString().split("T")[0];

          nextCreatedReminder = {
            id: "rem-" + Date.now() + "-next",
            animalProfileId: r.animalProfileId,
            animalName: r.animalName,
            species: r.species,
            reminderType: r.reminderType,
            title: r.title,
            administeredDate: new Date().toISOString().split("T")[0],
            dueDate: nextDueDateStr,
            dueTime: r.dueTime,
            notes: r.notes,
            veterinarian: r.veterinarian,
            batchNumber: r.batchNumber,
            recurrence: r.recurrence,
            completed: false,
            createdAt: Date.now(),
          };
        }

        return updatedItem;
      }
      return r;
    });

    const finalList = nextCreatedReminder ? [nextCreatedReminder, ...updated] : updated;
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(finalList));
    const modified = finalList.find((r) => r.id === reminderId);
    if (modified) syncReminderToBackend(modified, "save");
    if (nextCreatedReminder) syncReminderToBackend(nextCreatedReminder, "save");
    return { reminders: finalList, nextReminder: nextCreatedReminder };
  } catch (e) {
    console.error("Failed to toggle reminder:", e);
    return { reminders: getStoredReminders() };
  }
}

export function getRemindersForAnimal(animalProfileIdOrName: string): CareReminder[] {
  if (!animalProfileIdOrName) return [];
  const all = getStoredReminders();
  const lower = animalProfileIdOrName.toLowerCase();
  return all.filter(
    (r) =>
      r.animalProfileId === animalProfileIdOrName ||
      r.animalName.toLowerCase() === lower ||
      r.animalName.toLowerCase().includes(lower)
  );
}

export function getUpcomingAndOverdueReminders(): {
  overdue: CareReminder[];
  dueToday: CareReminder[];
  upcoming: CareReminder[];
  allActive: CareReminder[];
} {
  const all = getStoredReminders();
  const todayStr = new Date().toISOString().split("T")[0];
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().split("T")[0];

  const active = all.filter((r) => !r.completed && r.status !== "paused");

  const overdue = active.filter((r) => r.dueDate < todayStr && r.reminderType !== "medicine").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const dueToday = active.filter((r) => r.dueDate === todayStr || (r.reminderType === "medicine" && r.dueDate <= todayStr));
  const upcoming = active
    .filter((r) => r.dueDate > todayStr && r.dueDate <= in7DaysStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    overdue,
    dueToday,
    upcoming,
    allActive: all.filter((r) => !r.completed),
  };
}

export interface CareTemplateItem {
  title: string;
  type: "vaccination" | "deworming";
  recurrence: "none" | "3_months" | "6_months" | "1_year";
  description: string;
}

export function getSpeciesCareTemplates(species: string = ""): CareTemplateItem[] {
  const s = species.toLowerCase();

  if (s.includes("dog") || s.includes("canine") || s.includes("puppy")) {
    return [
      {
        title: "Anti-Rabies Vaccine (Annual Booster)",
        type: "vaccination",
        recurrence: "1_year",
        description: "Mandatory annual rabies vaccine recommended for all dogs from 3 months of age.",
      },
      {
        title: "DHPPiL / 7-in-1 Combination Vaccine",
        type: "vaccination",
        recurrence: "1_year",
        description: "Protects against Distemper, Hepatitis, Parvovirus, Parainfluenza & Leptospirosis.",
      },
      {
        title: "Quarterly Broad-Spectrum Deworming",
        type: "deworming",
        recurrence: "3_months",
        description: "Deworming tablet (Praziquantel + Pyrantel + Febantel) every 3 months based on body weight.",
      },
      {
        title: "Kennel Cough (Bordetella)",
        type: "vaccination",
        recurrence: "1_year",
        description: "Recommended for dogs in social or boarding environments.",
      },
    ];
  }

  if (s.includes("cat") || s.includes("feline") || s.includes("kitten")) {
    return [
      {
        title: "Tricat / FVRCP Combination Vaccine",
        type: "vaccination",
        recurrence: "1_year",
        description: "Protects against Feline Viral Rhinotracheitis, Calicivirus & Panleukopenia.",
      },
      {
        title: "Anti-Rabies Vaccine (Feline)",
        type: "vaccination",
        recurrence: "1_year",
        description: "Essential annual protection against Rabies.",
      },
      {
        title: "Quarterly Deworming (Feline)",
        type: "deworming",
        recurrence: "3_months",
        description: "Gentle cat-specific dewormer paste or tablet every 3 months.",
      },
    ];
  }

  if (s.includes("cow") || s.includes("cattle") || s.includes("calf") || s.includes("buffalo") || s.includes("dairy")) {
    return [
      {
        title: "FMD (Foot & Mouth Disease) Vaccine",
        type: "vaccination",
        recurrence: "6_months",
        description: "Administered bi-annually (pre-monsoon and post-monsoon) under National Animal Disease Control Programme (NADCP).",
      },
      {
        title: "HS (Haemorrhagic Septicaemia) Vaccine",
        type: "vaccination",
        recurrence: "1_year",
        description: "Annual pre-monsoon vaccination (May/June) to prevent deadly galghontu / shipping fever.",
      },
      {
        title: "BQ (Black Quarter) Vaccine",
        type: "vaccination",
        recurrence: "1_year",
        description: "Annual pre-monsoon immunization against Clostridium chauvoei.",
      },
      {
        title: "Bovine Deworming (Pre & Post Monsoon)",
        type: "deworming",
        recurrence: "6_months",
        description: "Broad-spectrum albendazole / fenbendazole / ivermectin drench or bolus.",
      },
      {
        title: "Brucellosis S19 (Female Calves 4–8 mo)",
        type: "vaccination",
        recurrence: "none",
        description: "One-time lifetime vaccination in heifer calves to prevent reproductive loss.",
      },
      {
        title: "Lumpy Skin Disease (LSD) Goat Pox Vaccine",
        type: "vaccination",
        recurrence: "1_year",
        description: "Annual booster with heterologous Goat Pox vaccine (10x dose for cattle).",
      },
    ];
  }

  if (s.includes("goat") || s.includes("sheep") || s.includes("lamb") || s.includes("kid")) {
    return [
      {
        title: "PPR (Peste des Petits Ruminants / Goat Plague)",
        type: "vaccination",
        recurrence: "1_year",
        description: "Crucial annual or triennial immunization under National Eradication Mission.",
      },
      {
        title: "Enterotoxaemia (ET / Pulpy Kidney)",
        type: "vaccination",
        recurrence: "1_year",
        description: "Annual vaccination prior to onset of new monsoon flush grazing.",
      },
      {
        title: "Goat Pox / Sheep Pox Vaccine",
        type: "vaccination",
        recurrence: "1_year",
        description: "Annual protection in endemic tracts.",
      },
      {
        title: "Small Ruminant Deworming",
        type: "deworming",
        recurrence: "3_months",
        description: "Strategic rotational anthelmintic drench every 3-4 months.",
      },
    ];
  }

  if (s.includes("poultry") || s.includes("chicken") || s.includes("bird") || s.includes("hen")) {
    return [
      {
        title: "Ranikhet / Newcastle Disease (Lasota/F1/R2B)",
        type: "vaccination",
        recurrence: "3_months",
        description: "Drinking water or eye-drop booster to prevent flock respiratory paralysis.",
      },
      {
        title: "Gumboro / IBD Vaccine",
        type: "vaccination",
        recurrence: "none",
        description: "Administered in chick drinking water at 14–21 days of age.",
      },
      {
        title: "Flock Deworming (Piperazine/Levamisole)",
        type: "deworming",
        recurrence: "3_months",
        description: "Water medication every 8–12 weeks to control roundworms.",
      },
    ];
  }

  // Generic fallback templates
  return [
    {
      title: "Annual Preventative Vaccination Booster",
      type: "vaccination",
      recurrence: "1_year",
      description: "Routine annual booster immunization recommended by local veterinarian.",
    },
    {
      title: "Quarterly Deworming Treatment",
      type: "deworming",
      recurrence: "3_months",
      description: "Anthelmintic treatment to eliminate internal gastrointestinal parasites.",
    },
    {
      title: "Bi-Annual Veterinary Health Checkup",
      type: "vaccination",
      recurrence: "6_months",
      description: "Comprehensive physical exam and health check.",
    },
  ];
}

// ----------------------------------------------------
// 4. Browser Notification Helper (Safe and Explicit)
// ----------------------------------------------------
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error("Notification permission request failed:", e);
    return "denied";
  }
}

export function triggerCareNotification(title: string, body: string): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
      return true;
    } catch (e) {
      console.warn("Could not display notification:", e);
      return false;
    }
  }
  return false;
}

export function clearAllLearnStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    localStorage.removeItem(REMINDERS_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear learn storage:", e);
  }
}

// ----------------------------------------------------
// 4b. Veterinary Prescriptions Storage
// ----------------------------------------------------
export function getStoredPrescriptions(): VeterinaryPrescription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESCRIPTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load veterinary prescriptions:", e);
    return [];
  }
}

export function saveVeterinaryPrescription(
  prescription: VeterinaryPrescription,
  screeningId?: string
): { prescriptions: VeterinaryPrescription[]; history: ScreeningRecord[] } {
  if (typeof window === "undefined") return { prescriptions: [], history: [] };
  try {
    const existing = getStoredPrescriptions();
    const idx = existing.findIndex((p) => p.id === prescription.id);
    let updatedPrescriptions: VeterinaryPrescription[];
    if (idx >= 0) {
      updatedPrescriptions = [...existing];
      updatedPrescriptions[idx] = { ...prescription, updatedAt: Date.now() };
    } else {
      updatedPrescriptions = [{ ...prescription, createdAt: prescription.createdAt || Date.now() }, ...existing];
    }
    localStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(updatedPrescriptions));

    // Also link to ScreeningRecord in history if screeningId or prescription.screeningId provided
    const targetScreeningId = screeningId || prescription.screeningId;
    let updatedHistory = getStoredHistory();
    if (targetScreeningId) {
      updatedHistory = updatedHistory.map((record) => {
        if (record.id === targetScreeningId) {
          return {
            ...record,
            prescription,
            status: record.status === "pending" ? "vet_consulted" : record.status,
          };
        }
        return record;
      });
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    }

    return { prescriptions: updatedPrescriptions, history: updatedHistory };
  } catch (e) {
    console.error("Failed to save veterinary prescription:", e);
    return { prescriptions: getStoredPrescriptions(), history: getStoredHistory() };
  } finally {
    syncPrescriptionToBackend(prescription, "save");
  }
}

export function deleteVeterinaryPrescription(
  prescriptionId: string
): { prescriptions: VeterinaryPrescription[]; history: ScreeningRecord[] } {
  if (typeof window === "undefined") return { prescriptions: [], history: [] };
  try {
    const existing = getStoredPrescriptions();
    const updatedPrescriptions = existing.filter((p) => p.id !== prescriptionId);
    localStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(updatedPrescriptions));

    let updatedHistory = getStoredHistory();
    updatedHistory = updatedHistory.map((record) => {
      if (record.prescription?.id === prescriptionId) {
        const { prescription, ...rest } = record;
        return rest as ScreeningRecord;
      }
      return record;
    });
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

    return { prescriptions: updatedPrescriptions, history: updatedHistory };
  } catch (e) {
    console.error("Failed to delete veterinary prescription:", e);
    return { prescriptions: getStoredPrescriptions(), history: getStoredHistory() };
  } finally {
    syncPrescriptionToBackend({ id: prescriptionId } as any, "delete");
  }
}

export function getPrescriptionForScreening(screeningId: string): VeterinaryPrescription | undefined {
  if (!screeningId) return undefined;
  const history = getStoredHistory();
  const foundInHistory = history.find((r) => r.id === screeningId)?.prescription;
  if (foundInHistory) return foundInHistory;
  const prescriptions = getStoredPrescriptions();
  return prescriptions.find((p) => p.screeningId === screeningId);
}

export function getPrescriptionsForAnimal(animalProfileIdOrName: string): VeterinaryPrescription[] {
  if (!animalProfileIdOrName) return [];
  const prescriptions = getStoredPrescriptions();
  const lower = animalProfileIdOrName.toLowerCase();
  return prescriptions.filter(
    (p) =>
      p.animalProfileId === animalProfileIdOrName ||
      p.animalName.toLowerCase() === lower ||
      p.animalName.toLowerCase().includes(lower)
  );
}

// ----------------------------------------------------
// 4c. Veterinary Clinic Visits Storage
// ----------------------------------------------------
export function getStoredVetVisits(): VetVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VET_VISITS_STORAGE_KEY);
    if (!raw) {
      const initialDemo: VetVisit[] = [
        {
          id: "visit-demo-1",
          animalProfileId: "profile-1",
          animalName: "Gauri",
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString().split("T")[0],
          veterinarian: "Dr. K. Patel",
          hospitalClinic: "Taluka Govt Veterinary Dispensary",
          reason: "Routine Wellness & Lactation Evaluation",
          notes: "Rumen motility normal, healthy udders, advised pre-monsoon mineral mix.",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
        },
      ];
      localStorage.setItem(VET_VISITS_STORAGE_KEY, JSON.stringify(initialDemo));
      return initialDemo;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load vet visits:", e);
    return [];
  }
}

export function getVetVisitsForAnimal(animalProfileId: string): VetVisit[] {
  if (!animalProfileId) return [];
  const all = getStoredVetVisits();
  return all
    .filter((v) => v.animalProfileId === animalProfileId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function saveVetVisit(
  visit: Omit<VetVisit, "id" | "createdAt"> & { id?: string }
): VetVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getStoredVetVisits();
    let updated: VetVisit[];
    if (visit.id) {
      updated = existing.map((v) =>
        v.id === visit.id ? { ...v, ...visit } : v
      );
    } else {
      const newVisit: VetVisit = {
        ...visit,
        id: "visit-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        createdAt: Date.now(),
      };
      updated = [newVisit, ...existing];
    }
    localStorage.setItem(VET_VISITS_STORAGE_KEY, JSON.stringify(updated));
    const targetVisit = updated.find((v) => v.id === (visit.id || (updated[0]?.id)));
    if (targetVisit) syncVetVisitToBackend(targetVisit, "save");
    return updated;
  } catch (e) {
    console.error("Failed to save vet visit:", e);
    return getStoredVetVisits();
  }
}

export function deleteVetVisit(visitId: string): VetVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getStoredVetVisits();
    const updated = existing.filter((v) => v.id !== visitId);
    localStorage.setItem(VET_VISITS_STORAGE_KEY, JSON.stringify(updated));
    syncVetVisitToBackend({ id: visitId } as any, "delete");
    return updated;
  } catch (e) {
    console.error("Failed to delete vet visit:", e);
    return getStoredVetVisits();
  }
}

// ----------------------------------------------------
// 5. SIH Demo & Impact Device Analytics Engine
// ----------------------------------------------------

/**
 * Loads the full set of curated, realistic demonstration cases for Smart India Hackathon jury review.
 * Safely merges without overwriting genuine user data.
 */
export function loadSimulatedDemoData(): ScreeningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getStoredHistory();
    // Keep genuine user records (not demo)
    const genuineRecords = existing.filter(
      (r) => !r.isSimulatedDemo && !r.id.startsWith("demo-")
    );
    // Combine full simulated demo set with genuine records
    const updated = [...SIMULATED_DEMO_RECORDS, ...genuineRecords];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to load simulated demo data:", e);
    return getStoredHistory();
  }
}

/**
 * Removes all simulated demo records while strictly preserving genuine user screenings.
 */
export function clearSimulatedDemoData(): ScreeningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getStoredHistory();
    const genuineRecords = existing.filter(
      (r) => !r.isSimulatedDemo && !r.id.startsWith("demo-")
    );
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(genuineRecords));
    return genuineRecords;
  } catch (e) {
    console.error("Failed to clear simulated demo data:", e);
    return getStoredHistory();
  }
}

/**
 * Calculates privacy-safe, on-device statistics derived strictly from localStorage on this device.
 * No data is transmitted to or retrieved from any remote tracking servers.
 */
export function calculateDeviceAnalytics(
  history: ScreeningRecord[],
  feedbackList?: UserFeedback[]
): ImpactDeviceStats {
  const feedbacks = feedbackList || getStoredFeedback();
  const total = history.length;

  let demoCount = 0;
  let genuineCount = 0;
  let emergencyCount = 0;
  let totalFollowUps = 0;
  let vetSummariesCount = 0;

  const byAnimal: Record<string, number> = {};
  const bySeverity: {
    Mild: number;
    Moderate: number;
    Serious: number;
    Emergency: number;
  } = {
    Mild: 0,
    Moderate: 0,
    Serious: 0,
    Emergency: 0,
  };
  const byBodyArea: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const byImageQuality: {
    Good: number;
    Acceptable: number;
    Poor: number;
    Unusable: number;
  } = {
    Good: 0,
    Acceptable: 0,
    Poor: 0,
    Unusable: 0,
  };
  const byFollowUpStatus: {
    improving: number;
    unchanged: number;
    worsening: number;
    vet_consulted: number;
    resolved: number;
    pending: number;
  } = {
    improving: 0,
    unchanged: 0,
    worsening: 0,
    vet_consulted: 0,
    resolved: 0,
    pending: 0,
  };
  const datesMap: Record<string, { count: number; genuineCount: number }> = {};

  history.forEach((record) => {
    const isDemo = record.isSimulatedDemo || record.id.startsWith("demo-");
    if (isDemo) {
      demoCount++;
    } else {
      genuineCount++;
    }

    // Extract animal string safely
    let rawAnimal = "Other";
    if (record.selectedAnimal) {
      rawAnimal = typeof record.selectedAnimal === "string" ? record.selectedAnimal : (record.selectedAnimal as any).commonName || "Other";
    } else if (record.result?.detectedAnimal) {
      rawAnimal = typeof record.result.detectedAnimal === "string" ? record.result.detectedAnimal : (record.result.detectedAnimal as any).commonName || "Other";
    }
    const animalLower = rawAnimal.toLowerCase();
    let normalizedAnimal = rawAnimal;

    if (animalLower.includes("cattle") || animalLower.includes("cow")) {
      normalizedAnimal = "Cattle / Cow";
    } else if (animalLower.includes("buffalo")) {
      normalizedAnimal = "Buffalo";
    } else if (animalLower.includes("dog") || animalLower.includes("canine")) {
      normalizedAnimal = "Dog";
    } else if (animalLower.includes("cat") || animalLower.includes("feline")) {
      normalizedAnimal = "Cat";
    } else if (animalLower.includes("goat") || animalLower.includes("caprine")) {
      normalizedAnimal = "Goat";
    } else if (animalLower.includes("poultry") || animalLower.includes("bird") || animalLower.includes("chicken")) {
      normalizedAnimal = "Poultry / Bird";
    } else if (animalLower.includes("sheep")) {
      normalizedAnimal = "Sheep";
    } else if (animalLower.includes("horse")) {
      normalizedAnimal = "Horse";
    }
    byAnimal[normalizedAnimal] = (byAnimal[normalizedAnimal] || 0) + 1;

    // Severity tally
    const sev = (record.result?.severity || "Moderate") as "Mild" | "Moderate" | "Serious" | "Emergency";
    if (sev in bySeverity) {
      bySeverity[sev]++;
    } else {
      bySeverity.Moderate++;
    }

    // Emergency check
    const isEmergency =
      sev === "Emergency" ||
      record.result?.isEmergencyAlert ||
      (record.result?.emergencyWarning &&
        (typeof record.result.emergencyWarning === "object"
          ? record.result.emergencyWarning.active !== false
          : !!record.result.emergencyWarning));
    if (isEmergency) {
      emergencyCount++;
    }

    // Body area tally
    const area = record.bodyArea || record.result?.affectedBodyArea || "Unspecified";
    const cleanArea = area.split(",")[0].split("&")[0].trim();
    byBodyArea[cleanArea] = (byBodyArea[cleanArea] || 0) + 1;

    // Language tally
    const lang = record.languageName || record.language || "English";
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;

    // Image quality
    const rawQuality = record.result?.imageQuality;
    const qRating: "Good" | "Acceptable" | "Poor" | "Unusable" =
      typeof rawQuality === "object" && rawQuality !== null && "rating" in rawQuality
        ? ((rawQuality as any).rating as "Good" | "Acceptable" | "Poor" | "Unusable")
        : typeof rawQuality === "string" && (rawQuality === "Good" || rawQuality === "Acceptable" || rawQuality === "Poor" || rawQuality === "Unusable")
        ? rawQuality
        : "Good";

    if (qRating in byImageQuality) {
      byImageQuality[qRating]++;
    } else {
      byImageQuality.Good++;
    }

    // Follow-ups & summaries
    const flCount = record.followUps ? record.followUps.length : 0;
    totalFollowUps += flCount;

    const hasCompletedSteps =
      record.completedActionSteps &&
      Object.values(record.completedActionSteps).some((v) => v === true);
    if (hasCompletedSteps || flCount > 0 || record.status === "vet_consulted") {
      vetSummariesCount++;
    }

    // Status
    const st = (record.status || "pending") as "improving" | "unchanged" | "worsening" | "vet_consulted" | "resolved" | "pending";
    if (st in byFollowUpStatus) {
      byFollowUpStatus[st]++;
    } else {
      byFollowUpStatus.pending++;
    }

    // Date aggregation
    const d = new Date(record.timestamp);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!datesMap[dateKey]) {
      datesMap[dateKey] = { count: 0, genuineCount: 0 };
    }
    datesMap[dateKey].count++;
    if (!isDemo) {
      datesMap[dateKey].genuineCount++;
    }
  });

  // Sort body areas descending
  const mostFrequentBodyAreas = Object.entries(byBodyArea)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Dominant image quality
  const dominantQuality = (Object.entries(byImageQuality).reduce(
    (max, curr) => (curr[1] > max[1] ? curr : max),
    ["Good", 0] as [string, number]
  )[0] || "Good") as "Good" | "Acceptable" | "Poor" | "Unusable" | "N/A";

  // Feedback tally
  let helpfulFb = 0;
  let notHelpfulFb = 0;
  feedbacks.forEach((f) => {
    if (f.category === "helpful") helpfulFb++;
    else notHelpfulFb++;
  });

  // Timeline sorted chronologically
  const screeningsOverTime = Object.entries(datesMap)
    .map(([date, val]) => ({
      date,
      count: val.count,
      genuineCount: val.genuineCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalScreenings: total,
    simulatedDemoCount: demoCount,
    genuineScreeningsCount: genuineCount,
    screeningsByAnimal: byAnimal,
    severityDistribution: bySeverity,
    mostFrequentBodyAreas,
    emergencyWarningsCount: emergencyCount,
    followUpsCount: totalFollowUps,
    veterinarySummariesGenerated: vetSummariesCount,
    languagesUsed: byLanguage,
    feedbackStats: {
      helpful: helpfulFb,
      notHelpful: notHelpfulFb,
      total: feedbacks.length,
    },
    imageQualityDistribution: byImageQuality,
    averageImageQualityRating: dominantQuality,
    screeningsOverTime,
    followUpStatusDistribution: byFollowUpStatus,
  };
}

