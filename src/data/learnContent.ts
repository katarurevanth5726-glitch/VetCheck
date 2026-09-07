import { LearnTopic, LearnCategory } from "../types";

export interface CategoryMetadata {
  id: LearnCategory;
  name: string;
  shortLabel: string;
  description: string;
  iconName: string;
  colorClass: string;
  badgeBg: string;
}

export const LEARN_CATEGORIES: CategoryMetadata[] = [
  {
    id: "skin_coat",
    name: "Skin & Coat Care",
    shortLabel: "Skin & Coat",
    description: "Daily hygiene, coat brushing, tick checks, and managing skin irritations.",
    iconName: "Sparkles",
    colorClass: "text-amber-600",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-200",
  },
  {
    id: "eye_ear",
    name: "Eye & Ear Care",
    shortLabel: "Eyes & Ears",
    description: "Cleaning discharge, preventing fly contamination, and ear hygiene.",
    iconName: "Eye",
    colorClass: "text-teal-600",
    badgeBg: "bg-teal-100 text-teal-900 border-teal-200",
  },
  {
    id: "wound_safety",
    name: "Wound Safety & First-Aid",
    shortLabel: "Wound Safety",
    description: "Safe basic cleaning, fly strike prevention, and non-toxic antiseptics.",
    iconName: "ShieldAlert",
    colorClass: "text-rose-600",
    badgeBg: "bg-rose-100 text-rose-900 border-rose-200",
  },
  {
    id: "food_water",
    name: "Food & Clean Water",
    shortLabel: "Food & Water",
    description: "Clean drinking water, avoiding toxic feeds, and safe storage of fodder.",
    iconName: "Utensils",
    colorClass: "text-emerald-600",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-200",
  },
  {
    id: "hygiene_shelter",
    name: "Hygiene & Shelter",
    shortLabel: "Hygiene & Shelter",
    description: "Clean bedding, ventilation, manure management, and biosecurity.",
    iconName: "Home",
    colorClass: "text-indigo-600",
    badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-200",
  },
  {
    id: "parasite_awareness",
    name: "Parasite Awareness",
    shortLabel: "Parasites",
    description: "Understanding ticks, fleas, mites, worms, and pasture rotation.",
    iconName: "Bug",
    colorClass: "text-orange-600",
    badgeBg: "bg-orange-100 text-orange-900 border-orange-200",
  },
  {
    id: "vaccination_awareness",
    name: "Vaccination Awareness",
    shortLabel: "Vaccination",
    description: "Why timely veterinary immunization protects entire herds and pets.",
    iconName: "ShieldCheck",
    colorClass: "text-teal-600",
    badgeBg: "bg-teal-100 text-teal-900 border-teal-200",
  },
  {
    id: "heat_cold",
    name: "Heat & Cold Protection",
    shortLabel: "Heat & Cold",
    description: "Preventing heat stroke in summer, frostbite, and winter drafts.",
    iconName: "Sun",
    colorClass: "text-amber-600",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-200",
  },
  {
    id: "pregnancy_newborn",
    name: "Pregnancy & Newborn Care",
    shortLabel: "Pregnancy & Newborns",
    description: "Comfortable birthing areas, colostrum timing, and newborn warmth.",
    iconName: "HeartHandshake",
    colorClass: "text-pink-600",
    badgeBg: "bg-pink-100 text-pink-900 border-pink-200",
  },
  {
    id: "poisoning_prevention",
    name: "Poisoning Prevention",
    shortLabel: "Poison Safety",
    description: "Toxic plants, pesticide runoff, rodent poison, and human food hazards.",
    iconName: "AlertTriangle",
    colorClass: "text-red-600",
    badgeBg: "bg-red-100 text-red-900 border-red-200",
  },
  {
    id: "emergency_warning",
    name: "Emergency Warning Signs",
    shortLabel: "Emergency Signs",
    description: "Critical red flags that require instant in-person veterinary intervention.",
    iconName: "AlertOctagon",
    colorClass: "text-rose-600",
    badgeBg: "bg-rose-100 text-rose-900 border-rose-200",
  },
  {
    id: "vet_contact",
    name: "When to Contact a Veterinarian",
    shortLabel: "When to Call Vet",
    description: "Clear thresholds between home observation and professional consultation.",
    iconName: "Stethoscope",
    colorClass: "text-teal-600",
    badgeBg: "bg-teal-100 text-teal-900 border-teal-200",
  },
];

export const ANIMAL_FILTER_OPTIONS = [
  "All",
  "Dog",
  "Cat",
  "Cattle",
  "Buffalo",
  "Goat",
  "Sheep",
  "Horse",
  "Poultry or bird",
  "Other",
];

export const LEARN_TOPICS: LearnTopic[] = [
  // 1. Skin & Coat Care
  {
    id: "learn-skin-1",
    category: "skin_coat",
    title: "Livestock & Pet Skin Care: Preventing Mange & Fly Irritation",
    animalTargets: ["All", "Cattle", "Buffalo", "Dog", "Cat", "Goat", "Sheep"],
    iconName: "Sparkles",
    summary: "Healthy skin protects animals from infections, insects, and environmental extremes. Regular grooming helps catch problems early.",
    keyTips: [
      "Brush and groom coats regularly to remove dried mud, burrs, and dead hair that trap moisture.",
      "Check high-risk areas daily: between hooves/paws, behind ears, under the tail, and around the groin.",
      "Provide clean dry bedding — wet, manure-soaked ground breaks down skin barrier and attracts flies.",
      "Isolate animals showing patchy hair loss, crusty scabs, or intense scratching to prevent herd spread."
    ],
    whatToAvoid: [
      "DO NOT apply used engine motor oil, diesel, or kerosene to skin lesions or mange — these cause chemical burns and toxic organ damage.",
      "DO NOT use human medicated shampoos or high-strength soaps without veterinary advice."
    ],
    whenToCallVet: "If hair loss spreads rapidly, if skin is oozing foul pus, if large raw wounds form, or if intense scratching causes self-mutilation.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["skin", "coat", "hair", "ears", "tail", "body"],
    animalKeywords: ["cattle", "cow", "buffalo", "dog", "goat", "sheep", "cat"],
    severityTriggers: ["Mild", "Moderate"],
    isOfflineAvailable: true,
  },
  {
    id: "learn-skin-dog-cat",
    category: "skin_coat",
    title: "Dog & Cat Coat Care: Managing Fleas, Ticks & Allergic Itching",
    animalTargets: ["Dog", "Cat"],
    iconName: "Sparkles",
    summary: "Routine combing and parasite prevention keep companion animals comfortable and free of secondary skin infections.",
    keyTips: [
      "Use a fine-toothed flea comb over a white cloth to check for dark flea dirt or crawling parasites.",
      "Keep sleeping mats washed in hot water and dried thoroughly in the sun every week.",
      "Dry damp coats promptly after rain or outdoor walks to prevent fungal hot-spots."
    ],
    whatToAvoid: [
      "DO NOT use dog-specific permethrin tick treatments on cats — permethrin is fatal to cats.",
      "DO NOT bathe pets in laundry detergent or harsh dishwashing soaps."
    ],
    whenToCallVet: "If the pet scratches until the skin bleeds, if circular scaly bald rings appear, or if a foul yeast smell comes from the coat.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["skin", "coat", "ears", "paws"],
    animalKeywords: ["dog", "cat", "puppy", "kitten"],
    severityTriggers: ["Mild", "Moderate"],
    isOfflineAvailable: true,
  },

  // 2. Eye & Ear Care
  {
    id: "learn-eye-ear-1",
    category: "eye_ear",
    title: "Eye Health & Cleanliness: Preventing Pinkeye & Irritation",
    animalTargets: ["All", "Cattle", "Buffalo", "Goat", "Sheep", "Dog", "Cat", "Horse"],
    iconName: "Eye",
    summary: "Eyes are sensitive to dust, fly transfer, and bright glare. Early hygiene prevents corneal scarring.",
    keyTips: [
      "If eyes tear mildly from dust, flush gently around the closed eyelid using clean sterile saline or boiled, cooled water on clean cotton.",
      "Use a separate piece of clean cotton for each eye to prevent transferring bacteria.",
      "Provide shaded resting areas away from intense direct sun and dusty feed mills.",
      "Control flies in livestock sheds using nets, proper drainage, and clean dung disposal."
    ],
    whatToAvoid: [
      "DO NOT blow dry powders, salt water, ash, or battery fluid into animal eyes.",
      "DO NOT use human corticosteroid eye drops without a vet exam — steroids can melt a scratched cornea.",
      "DO NOT touch or rub the cornea directly with rough cloths or fingers."
    ],
    whenToCallVet: "If the center of the eye turns milky white or cloudy blue, if yellow-green pus streams, or if the animal keeps the eye clamped shut in pain.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["eye", "eyelid", "face", "head"],
    animalKeywords: ["cattle", "cow", "buffalo", "dog", "goat", "horse"],
    severityTriggers: ["Moderate", "Serious"],
    isOfflineAvailable: true,
  },
  {
    id: "learn-ear-care",
    category: "eye_ear",
    title: "Ear Hygiene & Parasite Check: Preventing Ear Mites & Infections",
    animalTargets: ["Dog", "Cat", "Goat", "Sheep", "Cattle"],
    iconName: "Eye",
    summary: "Frequent head-shaking and scratching often signal ear mites, foreign grass seeds, or bacterial buildup.",
    keyTips: [
      "Inspect ear flaps for ticks, burrs, grass awns, or dark coffee-ground wax deposits.",
      "Gently wipe only the outer ear flap with a soft damp cloth. Keep the inside canal dry.",
      "Dry dog ears thoroughly after swimming or bathing."
    ],
    whatToAvoid: [
      "DO NOT push cotton swabs (Q-tips), sharp sticks, or wires into an animal's ear canal.",
      "DO NOT pour oils, garlic extracts, or alcohol into inflamed ear canals."
    ],
    whenToCallVet: "If the ear smells foul, if the ear flap is swollen like a water balloon (aural hematoma), or if the animal tilts its head constantly.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["ear", "head", "neck"],
    animalKeywords: ["dog", "cat", "goat", "sheep", "cow"],
    severityTriggers: ["Mild", "Moderate"],
    isOfflineAvailable: true,
  },

  // 3. Wound Safety
  {
    id: "learn-wound-1",
    category: "wound_safety",
    title: "Safe Wound First-Aid: Cleaning Cuts & Maggot Prevention",
    animalTargets: ["All", "Cattle", "Buffalo", "Dog", "Cat", "Goat", "Sheep", "Horse"],
    iconName: "ShieldAlert",
    summary: "Proper initial cleaning and fly protection prevent minor scrapes from turning into deep maggot-infested wounds.",
    keyTips: [
      "Restrain the animal gently and safely before examining wounds.",
      "Flush superficial scrapes with copious amounts of clean, boiled lukewarm water or sterile normal saline.",
      "Gently pat dry with a clean cloth. For livestock, apply a vet-approved veterinary antiseptic barrier spray to deter flies.",
      "Keep wounded animals in a clean, shaded, dry stall until the scab forms."
    ],
    whatToAvoid: [
      "DO NOT put unboiled cow dung, soil, battery acid, brake fluid, or used motor oil on open wounds.",
      "DO NOT apply powdered human antibiotics directly into deep puncture wounds without vet direction.",
      "DO NOT tourniquet a limb tightly unless trained, as it can cause limb death (gangrene)."
    ],
    whenToCallVet: "If blood spurts rhythmically, if deep muscle or bone is visible, if maggots are seen wriggling, or if the wound smells rotten.",
    readTimeMinutes: 3,
    bodyAreaKeywords: ["wound", "cut", "scrape", "injury", "bleeding", "leg", "skin"],
    animalKeywords: ["cattle", "cow", "buffalo", "dog", "goat", "sheep", "horse"],
    severityTriggers: ["Moderate", "Serious", "Emergency"],
    isOfflineAvailable: true,
  },

  // 4. Food & Clean Water
  {
    id: "learn-food-water-1",
    category: "food_water",
    title: "Clean Drinking Water & Feed Safety for Livestock & Pets",
    animalTargets: ["All", "Cattle", "Buffalo", "Goat", "Sheep", "Dog", "Cat", "Poultry or bird", "Horse"],
    iconName: "Utensils",
    summary: "Clean water and uncontaminated feed are the single highest return preventive investment for animal health and milk production.",
    keyTips: [
      "Ensure adult dairy cattle and buffalo have access to 60–100+ liters of fresh clean water daily.",
      "Scrub water troughs weekly with clean brushes to remove green slime, algae, and mosquito larvae.",
      "Inspect grains and dry fodder for white, grey, or black mold (mycotoxins cause organ failure and abortion).",
      "Introduce new green fodder or concentrate feeds gradually over 7–10 days to prevent fatal ruminal acidosis / bloat."
    ],
    whatToAvoid: [
      "DO NOT feed moldy bread, rotten kitchen scraps, or decaying damp hay.",
      "DO NOT allow livestock to drink stagnant puddle runoff near fertilizer or chemical storage.",
      "DO NOT feed chocolate, cooked chicken bones, onions, garlic, or raisins to dogs and cats."
    ],
    whenToCallVet: "If an animal completely stops eating for over 24 hours, if the left flank swells tight as a drum (bloat), or if severe diarrhea develops.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["abdomen", "stomach", "mouth", "general"],
    animalKeywords: ["cattle", "buffalo", "goat", "sheep", "dog", "poultry"],
    severityTriggers: ["Mild", "Moderate", "Serious"],
    isOfflineAvailable: true,
  },

  // 5. Hygiene & Shelter
  {
    id: "learn-hygiene-shelter",
    category: "hygiene_shelter",
    title: "Shed Sanitation & Biosecurity: Preventing Herd Diseases",
    animalTargets: ["All", "Cattle", "Buffalo", "Goat", "Sheep", "Poultry or bird", "Horse"],
    iconName: "Home",
    summary: "Dry, well-ventilated housing reduces mastitis, pneumonia, foot rot, and coccidiosis across livestock and poultry flocks.",
    keyTips: [
      "Clear animal manure, wet urine-soaked straw, and old feed from pens daily.",
      "Sprinkle agricultural slaked lime (chuna) on clean dry floors periodically to disinfect surfaces.",
      "Ensure good cross-ventilation near roof ridges to prevent ammonia gas buildup that damages animal lungs.",
      "Quarantine any new animal bought from cattle fairs or markets for 14–21 days before mixing with the main herd."
    ],
    whatToAvoid: [
      "DO NOT allow muddy standing water around milking stands and feeding alleys.",
      "DO NOT bring new unverified animals straight into milking stalls or poultry coops without quarantine."
    ],
    whenToCallVet: "If multiple animals in the same shed develop coughing, blisters on muzzles/feet, sudden milk drop, or rapid fever spikes.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["hoof", "feet", "udder", "lungs", "general"],
    animalKeywords: ["cattle", "cow", "buffalo", "goat", "sheep", "poultry"],
    severityTriggers: ["Mild", "Moderate"],
    isOfflineAvailable: true,
  },

  // 6. Parasite Awareness
  {
    id: "learn-parasites-1",
    category: "parasite_awareness",
    title: "Parasite Control: Managing Ticks, Mites, Worms & Pastures",
    animalTargets: ["All", "Cattle", "Buffalo", "Goat", "Sheep", "Dog", "Cat", "Horse"],
    iconName: "Bug",
    summary: "Internal and external parasites sap animal energy, drop milk yield, cause anemia, and transmit lethal tick fevers.",
    keyTips: [
      "Check animals for ticks around soft skin: under the tail, udder, brisket, inner ears, and between claws.",
      "Deworm your animals on a schedule recommended by your local veterinarian based on local monsoon patterns.",
      "Practice rotational grazing when possible so parasite eggs on pastures naturally die off.",
      "Check goat and sheep inner lower eyelids (FAMACHA method) — pale white eyelids indicate severe worm-induced anemia."
    ],
    whatToAvoid: [
      "DO NOT underdose deworming medicines (underdosing speeds up parasite drug resistance).",
      "DO NOT crush or burn ticks on the animal's skin while still attached — use tweezers or vet-approved dips."
    ],
    whenToCallVet: "If urine turns dark coffee/reddish brown (suspected tick-borne Babesiosis), or if an animal develops 'bottle jaw' (swelling under the throat).",
    readTimeMinutes: 3,
    bodyAreaKeywords: ["skin", "coat", "mouth", "general", "tail"],
    animalKeywords: ["cattle", "cow", "buffalo", "goat", "sheep", "dog"],
    severityTriggers: ["Moderate", "Serious"],
    isOfflineAvailable: true,
  },

  // 7. Vaccination Awareness
  {
    id: "learn-vaccine-1",
    category: "vaccination_awareness",
    title: "Vaccination Awareness: Timing & Cold-Chain Importance",
    animalTargets: ["All", "Cattle", "Buffalo", "Dog", "Cat", "Goat", "Sheep", "Poultry or bird"],
    iconName: "ShieldCheck",
    summary: "Vaccines stimulate immunity before infection strikes. Timely immunization protects entire communities from catastrophic epidemics.",
    keyTips: [
      "Consult your local government veterinary dispensary or doctor for the exact vaccination calendar in your district.",
      "Common critical livestock vaccines in India: FMD (Foot & Mouth Disease), HS (Hemorrhagic Septicemia), BQ (Black Quarter), Brucellosis, and Anthrax.",
      "Key pet vaccines: Anti-Rabies Vaccine (ARV) and Core Combination (DHPPiL for dogs, Tricat for cats).",
      "Ensure vaccines are stored in a strict cold-chain icebox until the moment of administration.",
      "Always vaccinate only healthy, dewormed, non-feverish animals."
    ],
    whatToAvoid: [
      "DO NOT administer expired vaccines or vaccines that were allowed to warm up in the sun.",
      "DO NOT skip annual rabies boosters for dogs and cats — Rabies is 100% fatal and transmissible to humans."
    ],
    whenToCallVet: "Contact your veterinarian ahead of seasonal monsoon and winter disease outbreaks to schedule your herd's annual booster shots.",
    readTimeMinutes: 3,
    bodyAreaKeywords: ["general"],
    animalKeywords: ["cattle", "cow", "buffalo", "dog", "cat", "goat", "sheep", "poultry"],
    severityTriggers: ["Mild"],
    isOfflineAvailable: true,
  },

  // 8. Heat & Cold Protection
  {
    id: "learn-heat-cold-1",
    category: "heat_cold",
    title: "Protecting Animals from Heat Stroke & Winter Cold Stress",
    animalTargets: ["All", "Cattle", "Buffalo", "Dog", "Cat", "Goat", "Sheep", "Poultry or bird", "Horse"],
    iconName: "Sun",
    summary: "Extreme weather causes severe physiological stress, dramatic drops in milk/egg yields, and fatal heat stroke.",
    keyTips: [
      "Summer: Provide deep shade, cool fresh drinking water 24/7, and splash buffaloes with cool water during peak afternoon hours.",
      "Summer: Never leave dogs or cats trapped inside parked vehicles or unventilated metal sheds even for a few minutes.",
      "Winter: Protect newborn calves, lambs, kids, and poultry chicks from cold night winds using dry straw bedding and jute curtains.",
      "Winter: Ensure calves receive warm colostrum within the first 2 hours of birth."
    ],
    whatToAvoid: [
      "DO NOT force heavy draft animals or dogs to work or run during the hottest mid-day hours (12 PM – 4 PM).",
      "DO NOT pour freezing ice water abruptly over a heat-stroked animal — use room-temperature tap water gently on paws and neck."
    ],
    whenToCallVet: "If an animal collapses from heat, pants with tongue hanging out and foaming saliva, or if body temperature spikes uncontrollably.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["mouth", "breathing", "general"],
    animalKeywords: ["cattle", "cow", "buffalo", "dog", "cat", "goat", "poultry"],
    severityTriggers: ["Moderate", "Serious", "Emergency"],
    isOfflineAvailable: true,
  },

  // 9. Pregnancy & Newborn Care
  {
    id: "learn-pregnancy-newborn",
    category: "pregnancy_newborn",
    title: "Livestock Maternity & Newborn Calf/Puppy Care",
    animalTargets: ["All", "Cattle", "Buffalo", "Dog", "Cat", "Goat", "Sheep"],
    iconName: "HeartHandshake",
    summary: "Proper maternal nutrition and hygienic birthing prevent dystocia, retained placenta, and newborn umbilical infections.",
    keyTips: [
      "Prepare a clean, quiet, heavily bedded maternity pen with fresh dry straw 1–2 weeks before the expected due date.",
      "Ensure the newborn calf drinks fresh, rich colostrum (first mother's milk) within 1 to 2 hours of birth for life-saving immunity.",
      "Dip the newborn's severed umbilical cord stump immediately in 7% tincture of iodine to prevent fatal 'navel ill' / joint infections.",
      "Keep mother and newborn in a draft-free, clean area with easy access to warm water."
    ],
    whatToAvoid: [
      "DO NOT yank aggressively on a calf's legs during delivery without proper positioning and lubrication.",
      "DO NOT pull violently on a retained afterbirth (placenta) — forceful manual pulling causes fatal uterine hemorrhage."
    ],
    whenToCallVet: "If hard labor contractions continue for over 2 hours with no progress, if the placenta is retained past 8–12 hours, or if newborn cannot suckle.",
    readTimeMinutes: 3,
    bodyAreaKeywords: ["abdomen", "udder", "reproductive", "general"],
    animalKeywords: ["cattle", "cow", "buffalo", "goat", "sheep", "dog", "cat"],
    severityTriggers: ["Serious", "Emergency"],
    isOfflineAvailable: true,
  },

  // 10. Poisoning Prevention
  {
    id: "learn-poison-1",
    category: "poisoning_prevention",
    title: "Poisoning Prevention: Common Farm & Household Hazards",
    animalTargets: ["All", "Cattle", "Buffalo", "Dog", "Cat", "Goat", "Sheep", "Poultry or bird"],
    iconName: "AlertTriangle",
    summary: "Animals are curious and will chew on toxic agricultural chemicals, poisonous weeds, or dangerous human foods.",
    keyTips: [
      "Lock away all agricultural pesticides, rodent poisons, fertilizers, paints, and engine fluids in high, locked cupboards.",
      "Inspect grazing pastures and fencelines for toxic plants (e.g. Lantana camara, Datura, sprouted green sorghum / cyanide poisoning).",
      "Keep household medications (Paracetamol, NSAIDs), chocolate, rodenticides, and cleaners strictly out of reach of pets.",
      "If chemical poisoning is suspected, bring the packaging or label along to the veterinarian."
    ],
    whatToAvoid: [
      "DO NOT induce vomiting in an unconscious, convulsing, or acid/petroleum-poisoned animal.",
      "DO NOT force-feed large amounts of milk or oil without vet direction (risk of lung aspiration)."
    ],
    whenToCallVet: "IMMEDIATELY if you observe sudden tremors, drooling, seizures, severe vomiting, staggering, or blue/pale gums.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["mouth", "stomach", "general"],
    animalKeywords: ["cattle", "cow", "buffalo", "dog", "cat", "goat", "sheep"],
    severityTriggers: ["Emergency"],
    isOfflineAvailable: true,
  },

  // 11. Emergency Warning Signs
  {
    id: "learn-emergency-signs",
    category: "emergency_warning",
    title: "11 Critical Emergency Warning Signs That Require Immediate Vet Help",
    animalTargets: ["All", "Cattle", "Buffalo", "Dog", "Cat", "Goat", "Sheep", "Horse", "Poultry or bird"],
    iconName: "AlertOctagon",
    summary: "Certain clinical signs indicate life-threatening conditions where every minute matters. Never delay in-person care for an AI scan.",
    keyTips: [
      "1. Severe Uncontrolled Bleeding (spurting or pooling blood).",
      "2. Severe Breathing Distress (gasping, open-mouth neck stretching, purple/blue tongue).",
      "3. Inability to Stand ('Downer' cow or collapsed pet unable to rise).",
      "4. Acute Abdominal Bloat (left side swollen tight with kicking at belly).",
      "5. Continuous Seizures or Complete Unconsciousness.",
      "6. Suspected Snakebite (sudden swelling, puncture marks, bleeding from gums/mouth).",
      "7. Difficult Delivery / Labor exceeding 2 hours with severe distress.",
      "8. Major Trauma / Road Accidents / Deep Bone Fractures.",
      "9. Severe Heat Stroke (rectal temp > 105°F / 40.5°C, dark gums, collapse).",
      "10. Poisoning / Chemical Ingestion with trembling or frothing.",
      "11. Severe Eye Prolapse or Eyeball Puncture."
    ],
    whatToAvoid: [
      "DO NOT delay seeking transport or calling your local vet / 1962 helpline during these crises.",
      "DO NOT attempt risky amateur surgeries or deep cuts."
    ],
    whenToCallVet: "CALL 1962 OR YOUR LOCAL VETERINARIAN IMMEDIATELY. Seek nearest emergency clinic right away.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["general", "breathing", "wound", "leg", "abdomen", "head"],
    animalKeywords: ["cattle", "cow", "buffalo", "dog", "cat", "goat", "sheep", "horse"],
    severityTriggers: ["Emergency", "Serious"],
    isOfflineAvailable: true,
  },

  // 12. When to Contact a Veterinarian
  {
    id: "learn-when-to-call-vet",
    category: "vet_contact",
    title: "Veterinary Consultation Threshold: Home Observation vs. Clinical Visit",
    animalTargets: ["All", "Cattle", "Buffalo", "Dog", "Cat", "Goat", "Sheep", "Poultry or bird"],
    iconName: "Stethoscope",
    summary: "Knowing when a condition exceeds safe home first-aid prevents preventable complications and saves lives.",
    keyTips: [
      "Schedule routine preventive visits for annual vaccinations, pregnancy checks, deworming calendars, and herd health reviews.",
      "Call for an appointment within 24 hours if: mild fever, animal refuses 1–2 meals, persistent diarrhea, mild limping, or cloudy eyes.",
      "Seek immediate emergency care for any red-flag symptom listed in the Emergency Guide.",
      "Keep a small diary or record in VetCheck with the animal's symptoms, temperature (if measured), and duration to show your doctor."
    ],
    whatToAvoid: [
      "DO NOT purchase prescription veterinary drugs over the counter based on non-professional recommendations.",
      "DO NOT wait multiple days hoping an acutely sick or downer animal will self-heal."
    ],
    whenToCallVet: "Whenever you feel uncertain about an animal's condition or when symptoms fail to improve after 24 hours of safe first-aid.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["general"],
    animalKeywords: ["cattle", "cow", "buffalo", "dog", "cat", "goat", "sheep"],
    severityTriggers: ["Mild", "Moderate", "Serious"],
    isOfflineAvailable: true,
  },

  // Extra Species-Specific Highlights
  {
    id: "learn-goat-sheep-care",
    category: "hygiene_shelter",
    title: "Goat & Sheep Care: Preventing Foot Rot & Enterotoxemia",
    animalTargets: ["Goat", "Sheep"],
    iconName: "Home",
    summary: "Small ruminants are sensitive to damp wet soils, sudden rich feeding, and internal roundworms.",
    keyTips: [
      "Keep goat sheds elevated with slatted wooden bamboo floors so dung and urine drop through cleanly.",
      "Trim hooves regularly every 6–8 weeks to prevent painful overgrown foot rot.",
      "Vaccinate against Enterotoxemia (Pulpy Kidney) before lush green pastures sprout.",
      "Provide clean mineral lick salt blocks inside pens for essential trace minerals."
    ],
    whatToAvoid: [
      "DO NOT keep sheep or goats enclosed in damp, stagnant mud yards.",
      "DO NOT let hungry goats gorge suddenly on spilled grain sacks."
    ],
    whenToCallVet: "If a goat grinds its teeth in pain, develops watery greenish diarrhea with bloat, or is unable to bear weight on hooves.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["hoof", "feet", "abdomen"],
    animalKeywords: ["goat", "sheep", "lamb", "kid"],
    severityTriggers: ["Moderate", "Serious"],
    isOfflineAvailable: true,
  },
  {
    id: "learn-poultry-backyard",
    category: "hygiene_shelter",
    title: "Backyard Poultry & Bird Health: Biosecurity & Clean Water",
    animalTargets: ["Poultry or bird"],
    iconName: "Sparkles",
    summary: "Backyard chickens and birds need clean feeders, dry bedding to stop coccidiosis, and protection from wild birds.",
    keyTips: [
      "Elevate water and food containers off the coop floor so birds do not defecate into their drinking water.",
      "Change damp coop litter frequently to keep ammonia levels low and prevent respiratory wheezing.",
      "Ensure timely vaccination against Ranikhet (Newcastle Disease) and Fowl Pox.",
      "Fence off feed areas to minimize mingling with wild migratory birds."
    ],
    whatToAvoid: [
      "DO NOT allow poultry to drink stagnant ditch water or feed on moldy damp grain.",
      "DO NOT handle sick or dead birds with bare hands without gloves/plastic covers."
    ],
    whenToCallVet: "If multiple birds die suddenly, exhibit twisted necks, swollen heads with purplish combs, or severe breathing gasps.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["general", "breathing", "face"],
    animalKeywords: ["poultry", "chicken", "hen", "cock", "bird", "duck"],
    severityTriggers: ["Serious", "Emergency"],
    isOfflineAvailable: true,
  },
  {
    id: "learn-horse-colic",
    category: "food_water",
    title: "Horse & Donkey Care: Preventing Fatal Colic & Hoof Thrush",
    animalTargets: ["Horse"],
    iconName: "Utensils",
    summary: "Equines have sensitive digestive tracts and hooves requiring consistent feeding schedules and daily pick cleaning.",
    keyTips: [
      "Pick and clean the bottom of hooves daily to remove packed stones and moist dung that cause foul-smelling thrush.",
      "Feed small, frequent high-fiber forage meals rather than large sugary grain dumps.",
      "Ensure constant access to clean water; never give ice-cold water immediately after heavy sweating.",
      "Schedule annual dental rasping (floating) with a vet so the horse can chew roughage properly."
    ],
    whatToAvoid: [
      "DO NOT change feed types or grain amounts suddenly.",
      "DO NOT let a horse roll violently if showing signs of colic — keep walking gently while waiting for the vet."
    ],
    whenToCallVet: "If the horse paws the ground, looks at its flanks repeatedly, rolls continuously, or fails to pass manure.",
    readTimeMinutes: 2,
    bodyAreaKeywords: ["abdomen", "hoof", "mouth"],
    animalKeywords: ["horse", "donkey", "mule", "pony"],
    severityTriggers: ["Serious", "Emergency"],
    isOfflineAvailable: true,
  },
];

// Avoid Harmful Actions / Myths dataset (Calm, non-graphic)
export interface HarmfulActionItem {
  id: string;
  title: string;
  rule: string;
  explanation: string;
  safeAlternative: string;
  iconName: string;
}

export const AVOID_HARMFUL_ACTIONS: HarmfulActionItem[] = [
  {
    id: "harm-1",
    title: "Human Medications & Painkillers",
    rule: "Do not give human medicines without veterinary advice",
    explanation: "Common human pain medications (such as Paracetamol/Acetaminophen and Ibuprofen) are highly toxic or fatal to cats and dogs, causing rapid liver failure and red blood cell destruction.",
    safeAlternative: "Consult a qualified veterinarian for animal-specific, weight-dosed analgesics.",
    iconName: "Ban",
  },
  {
    id: "harm-2",
    title: "Unprescribed Antibiotics",
    rule: "Do not use antibiotics without veterinary direction",
    explanation: "Giving random antibiotics or incorrect doses leads to aggressive antimicrobial resistance (AMR), stomach flora collapse, and fails to treat viral or fungal infections.",
    safeAlternative: "Only administer antibiotics prescribed by a licensed veterinarian for the exact full duration instructed.",
    iconName: "Pill",
  },
  {
    id: "harm-3",
    title: "Industrial Chemicals on Wounds",
    rule: "Do not apply motor oil, kerosene, or battery water to wounds or skin",
    explanation: "Traditional folk remedies using used engine oil, diesel, or battery acid cause severe chemical burns, tissue necrosis, and systemic poisoning through skin absorption.",
    safeAlternative: "Clean gently with boiled, cooled water or sterile saline, and use vet-approved antiseptic sprays.",
    iconName: "ShieldAlert",
  },
  {
    id: "harm-4",
    title: "Force-Feeding Unconscious Animals",
    rule: "Do not force-feed an unconscious, choking, or convulsing animal",
    explanation: "Forcing liquids, milk, or oil into the throat of an animal that cannot swallow sends fluids directly into the lungs (aspiration pneumonia), leading to fatal suffocation.",
    safeAlternative: "Keep airway clear, turn the animal gently onto its side with head slightly lower than body, and seek urgent vet care.",
    iconName: "AlertTriangle",
  },
  {
    id: "harm-5",
    title: "Delaying Emergency Veterinary Care",
    rule: "Do not delay veterinary care during acute medical emergencies",
    explanation: "Conditions like severe bleeding, acute bloat, difficult delivery, and snakebite worsen within hours. Waiting days for home remedies frequently leads to preventable loss of life.",
    safeAlternative: "Contact the nearest veterinary dispensary, call the 1962 national toll-free helpline, or transport the animal safely.",
    iconName: "PhoneCall",
  },
  {
    id: "harm-6",
    title: "Unsafe Handling of Frightened Animals",
    rule: "Do not handle an aggressive or frightened animal unsafely",
    explanation: "Pain and fear trigger defensive biting, kicking, or horn goring. Caregiver injuries prevent the animal from getting help.",
    safeAlternative: "Use soft halters, towels, or a cattle crush with a calm, quiet demeanor. Ask experienced helpers for assistance.",
    iconName: "ShieldCheck",
  },
];

// Daily Care Checklist Standard Definitions
export interface ChecklistItemDef {
  id: string;
  label: string;
  subtext: string;
  iconName: string;
}

export const DAILY_CHECKLIST_ITEMS: ChecklistItemDef[] = [
  {
    id: "eating",
    label: "Eating Normally",
    subtext: "Eats customary feed/fodder with steady appetite and normal chewing.",
    iconName: "Utensils",
  },
  {
    id: "drinking",
    label: "Drinking Clean Water",
    subtext: "Drinks fresh water without excessive thirst or reluctance.",
    iconName: "Droplets",
  },
  {
    id: "moving",
    label: "Moving Normally",
    subtext: "Walks, stands, and rests comfortably without limping, stiffness, or weakness.",
    iconName: "Activity",
  },
  {
    id: "breathing",
    label: "No Breathing Difficulty",
    subtext: "Normal, easy chest movements; no heavy wheezing, gasping, or open-mouth panting.",
    iconName: "Wind",
  },
  {
    id: "discharge",
    label: "No Unusual Discharge",
    subtext: "Eyes, nose, mouth, and reproductive tract are clean without thick foul pus or blood.",
    iconName: "Eye",
  },
  {
    id: "wound_swelling",
    label: "No New Wound or Swelling",
    subtext: "No fresh bleeding, cuts, lumps, abscesses, or inflamed hot swollen areas.",
    iconName: "ShieldAlert",
  },
  {
    id: "skin_coat",
    label: "Skin and Coat Appear Normal",
    subtext: "Coat is smooth without sudden bald patches, heavy tick clusters, or intense scratching.",
    iconName: "Sparkles",
  },
  {
    id: "shelter",
    label: "Shelter is Clean and Safe",
    subtext: "Bedding is dry, dung is cleared, and resting area is well-ventilated.",
    iconName: "Home",
  },
];

// Helper to find contextual cards for ResultsScreen
export function getContextualLearnCards(
  animalType?: string,
  bodyArea?: string,
  visibleSigns?: string[],
  severity?: string
): LearnTopic[] {
  const normalizedAnimal = (animalType || "").toLowerCase();
  const normalizedArea = (bodyArea || "").toLowerCase();
  const signsText = (visibleSigns || []).join(" ").toLowerCase();

  const scored = LEARN_TOPICS.map((topic) => {
    let score = 0;

    // Animal match
    if (
      topic.animalTargets.includes("All") ||
      topic.animalTargets.some((t) => normalizedAnimal.includes(t.toLowerCase())) ||
      (topic.animalKeywords && topic.animalKeywords.some((k) => normalizedAnimal.includes(k)))
    ) {
      score += 3;
    }

    // Body Area match
    if (
      topic.bodyAreaKeywords &&
      topic.bodyAreaKeywords.some((k) => normalizedArea.includes(k) || signsText.includes(k))
    ) {
      score += 4;
    }

    // Severity trigger match
    if (severity && topic.severityTriggers && topic.severityTriggers.includes(severity)) {
      score += 2;
    }

    return { topic, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top 3 unique topics
  return scored.slice(0, 3).map((item) => item.topic);
}
