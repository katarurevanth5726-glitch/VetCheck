export type SeverityLevel = "Mild" | "Moderate" | "Serious" | "Emergency";
export type ConfidenceLevel = "Low" | "Medium" | "High";

export interface PossibleCondition {
  name: string;
  reason: string;
  supportingEvidence?: string[];
  missingInformation?: string[];
  confidence: ConfidenceLevel;
  requiresVeterinaryConfirmation?: boolean;
  // Backwards compatibility
  likelihood?: ConfidenceLevel;
  description?: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  category?: string;
}

export interface FollowUpAnswer {
  questionId: string;
  question: string;
  answer: "yes" | "no" | "unknown" | "skip";
}

export interface CareActionPlan {
  doNow: string[];
  watchFor: string[];
  avoidDoing?: string[];
  getHelp: string;
}

export interface ImageQualityAssessment {
  rating: "Good" | "Acceptable" | "Poor" | "Unusable" | string;
  issues: string[];
  retakeRecommended: boolean;
  scoreExplanation?: string;
}

export interface DetectedAnimalInfo {
  name: string;
  confidence: ConfidenceLevel;
  needsConfirmation?: boolean;
}

export interface EmergencyWarningInfo {
  active: boolean;
  reason?: string;
  immediateAction?: string;
}

export interface ComparisonResult {
  status: "Improved" | "Similar" | "Worsened" | "Unclear";
  visibleChanges: string[];
  limitations: string[];
  summary?: string;
}

export interface CommunitySafetyInsight {
  topic: string;
  guidance: string;
  seasonalRiskNotice?: string;
  preventativeTips: string[];
}

export interface PrescriptionMedicine {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  specialInstructions?: string;
}

export interface VeterinaryPrescription {
  id: string;
  screeningId?: string;
  animalProfileId?: string;
  animalName: string;
  date: string;
  doctorName: string;
  hospitalClinic: string;
  diagnosisCondition: string;
  medicines: PrescriptionMedicine[];
  specialInstructions?: string;
  followUpDate?: string; // YYYY-MM-DD
  followUpReason?: string;
  followUpReminderId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface AnalysisResult {
  screeningStatus?: "Completed" | "Insufficient Image" | "No Animal Detected" | string;
  validAnimalImage: boolean;
  imageQuality: ImageQualityAssessment | string;
  detectedAnimal: DetectedAnimalInfo | string;
  animalConfidence: ConfidenceLevel;
  affectedBodyArea: string;
  visibleSigns: string[];
  possibleConditions: PossibleCondition[];
  severity: SeverityLevel;
  severityReason?: string;
  noVisibleAbnormality?: boolean;
  simpleExplanation: string;
  immediateCare: string[];
  safetyPrecautions: string[];
  avoidDoing: string[];
  veterinaryHelp: string;
  recommendedNextAction: string;
  emergencyWarning: boolean | EmergencyWarningInfo;
  limitations: string[];
  disclaimer?: string;

  // Innovation & Smart India Hackathon Additions
  followUpQuestions?: FollowUpQuestion[];
  riskFactors?: string[];
  actionPlan?: CareActionPlan;
  comparison?: ComparisonResult;
  communityInsight?: CommunitySafetyInsight;

  // Optional contextual helpers
  validationIssue?: string;
  photoTips?: string[];
  safeTransportGuidance?: string[];
  isNoAbnormalityDetected?: boolean;
  breedOrCategory?: string;
  isUpdatedScreening?: boolean;
  correctionHistory?: {
    originalAnimal?: string;
    originalBodyArea?: string;
    timestamp: number;
  };

  // Backwards-compatible aliases
  validImage?: boolean;
  isAnimal?: boolean;
  isHumanOnly?: boolean;
  rejectionCode?: string;
  animalType?: string;
  confidence?: ConfidenceLevel;
  safeImmediateCareSteps?: string[];
  warningSigns?: string[];
  whatToAvoid?: string[];
  whenToSeeVet?: string;
  isEmergencyAlert?: boolean;
  unclearReason?: string;
}

export interface UserFeedback {
  id: string;
  screeningId?: string;
  timestamp: number;
  category: "helpful" | "not_helpful" | "incorrect_animal" | "difficult_to_understand" | "other";
  comment?: string;
  animalType?: string;
}

export interface MultiImageSlot {
  id: "close_up" | "full_body" | "angle";
  title: string;
  description: string;
  isOptional: boolean;
  dataUrl: string | null;
  base64: string | null;
  rotation: number;
  qualityRating?: "Good" | "Acceptable" | "Poor";
  qualityIssues?: string[];
}

export interface FollowUpLog {
  id: string;
  screeningId: string;
  animalProfileId?: string;
  scheduledFor: number;
  scheduledLabel: string;
  createdAt: number;
  completedAt?: number;
  statusCondition?: "improving" | "unchanged" | "worsening";
  isEatingDrinking?: "yes" | "no" | "partial";
  vetConsulted?: "yes" | "no" | "scheduled";
  newObservedSigns?: string;
  followUpImage?: string;
  followUpImageBase64?: string;
  comparisonResult?: ComparisonResult;
  userNotes?: string;
}

export interface ScreeningRecord {
  id: string;
  timestamp: number;
  imageThumbnail: string;
  allImages?: { type: string; url: string; base64?: string }[];
  selectedAnimal?: string;
  bodyArea?: string;
  symptomsInput?: string;
  riskFactorsSelected?: string[];
  followUpAnswers?: FollowUpAnswer[];
  completedActionSteps?: Record<string, boolean>;
  followUps?: FollowUpLog[];
  language: string;
  languageName: string;
  result: AnalysisResult;
  userNotes?: string;
  animalProfileId?: string;
  status?: "pending" | "improving" | "unchanged" | "worsening" | "vet_consulted" | "resolved";
  prescription?: VeterinaryPrescription;
  isSimulatedDemo?: boolean;
}

export interface AnimalQRPrivacySettings {
  showName: boolean; // default true
  showPhoto: boolean; // default true
  showSpecies: boolean; // default true
  showSexAge: boolean; // default true
  showVaccinationStatus: boolean; // default true
  showDetailedVaccination: boolean; // default false
  showHealthTimeline: boolean; // default false
  showPrescriptions: boolean; // default false
  showRecoveryRecords: boolean; // default false
  showEmergencyNote: boolean; // default false
  emergencyNote?: string;
  enableLostPetContact: boolean; // default false
  lostPetContactName?: string;
  lostPetContactPhone?: string;
  lostPetContactAltPhone?: string;
  lostPetContactCity?: string;
  lostPetNotes?: string;
}

export interface AnimalProfile {
  id: string;
  animalId?: string; // Persistent unique ID, e.g. "VC-RKY-1024" or "VC-GRI-4091"
  name: string;
  species: string;
  breed?: string;
  approxAge?: string;
  age?: string;
  sex?: "Male" | "Female" | "Unknown";
  weight?: string;
  tagNumber?: string;
  color?: string;
  photoUri?: string;
  notes?: string;
  vaccinationStatus?: string;
  prescriptions?: VeterinaryPrescription[];
  qrPrivacySettings?: AnimalQRPrivacySettings;
  createdAt: number;
}

export interface UserProfile {
  name?: string;
  userType?: "Pet Owner" | "Farmer" | "Animal Caregiver" | "Other" | string;
  location?: string;
  preferredLanguage?: string;
}

export interface UserSettings {
  language: string;
  isRtl?: boolean;
  ttsVoiceSpeed: number; // 0.8, 1.0, 1.2
  ttsPitch: number;
  autoSpeakResults: boolean;
  highContrastMode: boolean;
  fontSize: "normal" | "large" | "extra-large";
  simpleMode: boolean;
  presentationMode?: boolean;
  aiConsentAccepted: boolean;
  imageQuality: "standard" | "high";
  onboardingCompleted: boolean;
  emergencyLocation?: string;
  userProfile?: UserProfile;
  notificationsEnabled?: boolean;
  notificationCategories?: {
    careReminders: boolean;
    vaccination: boolean;
    deworming: boolean;
    vetFollowUp: boolean;
    recovery: boolean;
  };
  userTimezone?: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  speechLocale: string;
  script: string;
  isRtl?: boolean;
}

export type AmbulanceStatus =
  | "available"
  | "not_available"
  | "contact_hospital";

export interface VetHospital {
  name: string;
  address: string;
  phone: string | null;
  distanceKm?: number;
  ambulanceStatus?: AmbulanceStatus;
  ambulanceAvailability?: string;
  ambulancePhone?: string | null;
}

export interface FirstAidGuide {
  id: string;
  title: string;
  category?: string;
  speciesTarget: string[];
  severity: "Emergency" | "Serious" | "Moderate";
  iconName: string;
  summary: string;
  immediateActions: string[];
  whatToAvoid: string[];
  transportGuidance?: string[];
  redFlagTriggers: string[];
}

export type LearnCategory =
  | "skin_coat"
  | "eye_ear"
  | "wound_safety"
  | "food_water"
  | "hygiene_shelter"
  | "parasite_awareness"
  | "vaccination_awareness"
  | "heat_cold"
  | "pregnancy_newborn"
  | "poisoning_prevention"
  | "emergency_warning"
  | "vet_contact";

export interface LearnTopic {
  id: string;
  category: LearnCategory;
  title: string;
  animalTargets: string[]; // ["All", "Dog", "Cat", "Cattle", "Buffalo", "Goat", "Sheep", "Horse", "Poultry or bird", "Other"]
  iconName: string;
  summary: string;
  keyTips: string[];
  whatToAvoid: string[];
  whenToCallVet: string;
  readTimeMinutes?: number;
  bodyAreaKeywords?: string[];
  animalKeywords?: string[];
  severityTriggers?: string[];
  isOfflineAvailable?: boolean;
}

export interface DailyChecklistState {
  dateKey: string; // YYYY-MM-DD
  animalProfileId?: string;
  animalName?: string;
  items: Record<string, boolean>; // eating, drinking, moving, breathing, discharge, wound_swelling, skin_coat, shelter
  completedAt?: number;
  notes?: string;
}

export interface CareReminder {
  id: string;
  animalProfileId?: string;
  animalId?: string;
  animalName: string;
  species?: string;
  reminderType: "vaccination" | "deworming" | "checkup" | "follow_up" | "wound_observation" | "other";
  type?: "vaccination" | "deworming" | "checkup" | "follow_up" | "wound_observation" | "other";
  title: string;
  reason?: string;
  administeredDate?: string; // YYYY-MM-DD (when last given)
  dueDate: string; // YYYY-MM-DD (next due date)
  dueTime?: string; // HH:MM
  notifyAdvance?: "same_day" | "1_day_before" | "7_days_before";
  timezone?: string;
  notes?: string;
  veterinarian?: string;
  batchNumber?: string;
  recurrence?: "none" | "3_months" | "6_months" | "1_year";
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  prescriptionId?: string;
  screeningId?: string;
  visitId?: string;
}

export interface VetVisit {
  id: string;
  animalProfileId: string;
  animalName?: string;
  date: string; // YYYY-MM-DD
  veterinarian?: string;
  hospitalClinic?: string;
  reason: string;
  notes?: string;
  followUpDate?: string;
  followUpReason?: string;
  followUpReminderId?: string;
  createdAt: number;
}

export interface ImpactDeviceStats {
  totalScreenings: number;
  simulatedDemoCount: number;
  genuineScreeningsCount: number;
  screeningsByAnimal: Record<string, number>;
  severityDistribution: {
    Mild: number;
    Moderate: number;
    Serious: number;
    Emergency: number;
  };
  mostFrequentBodyAreas: { area: string; count: number }[];
  emergencyWarningsCount: number;
  followUpsCount: number;
  veterinarySummariesGenerated: number;
  languagesUsed: Record<string, number>;
  feedbackStats: {
    helpful: number;
    notHelpful: number;
    total: number;
  };
  imageQualityDistribution: {
    Good: number;
    Acceptable: number;
    Poor: number;
    Unusable: number;
  };
  averageImageQualityRating: "Good" | "Acceptable" | "Poor" | "Unusable" | "N/A";
  screeningsOverTime: { date: string; count: number; genuineCount: number }[];
  followUpStatusDistribution: {
    improving: number;
    unchanged: number;
    worsening: number;
    vet_consulted: number;
    resolved: number;
    pending: number;
  };
}

export type NavTab =
  | "home"
  | "scan"
  | "my-animals"
  | "history"
  | "emergency"
  | "learn"
  | "settings"
  | "profile"
  | "about";

