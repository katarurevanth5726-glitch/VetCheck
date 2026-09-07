import React, { useState, useEffect, useCallback } from "react";
import {
  PhoneCall,
  MapPin,
  Search,
  AlertOctagon,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Clock,
  ShieldCheck,
  Flame,
  Activity,
  HeartPulse,
  AlertTriangle,
  Zap,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { VetHospital, AmbulanceStatus } from "../types";
import { AudioPlayerButton } from "./AudioPlayerButton";
import { FIRST_AID_GUIDES } from "../data/emergencyData";
import { apiUrl } from "../config/api";

interface EmergencyScreenProps {
  language: string;
  onOpenNearbyVet?: () => void;
  initialSelectedCategory?: string | null;
}

// Comprehensive translations for 14+ Indian languages
const EMERGENCY_I18N: Record<
  string,
  {
    title: string;
    subtitle: string;
    findingHelp: string;
    locationPrompt: string;
    detectLocationBtn: string;
    manualLocationTitle: string;
    manualLocationPlaceholder: string;
    findEmergencyVetBtn: string;
    nearestHospitalsTitle: string;
    selectHospitalBtn: string;
    chooseAnotherBtn: string;
    addressLabel: string;
    phoneLabel: string;
    noPhone: string;
    ambulanceLabel: string;
    ambulanceAvailable: string;
    ambulanceNotAvailable: string;
    ambulanceContactHospital: string;
    callHospitalBtn: string;
    callAmbulanceBtn: string;
    call1962Btn: string;
    govHelpTitle: string;
    govHelpDesc: string;
    noHospitalsFound: string;
    unableToSearch: string;
    retryBtn: string;
    changeLocationBtn: string;
    guidanceTitle: string;
    guidanceSubtitle: string;
    avoidNotice: string;
  }
> = {
  en: {
    title: "Emergency Veterinary Help",
    subtitle: "Quick access to nearest veterinary facilities, hospital phone numbers, and 24x7 emergency helpline.",
    findingHelp: "Finding veterinary help near you...",
    locationPrompt: "Allow location access to find the nearest veterinary hospital instantly.",
    detectLocationBtn: "Use My Current Location",
    manualLocationTitle: "Enter your location",
    manualLocationPlaceholder: "Village / Town / City (e.g. Ongole)",
    findEmergencyVetBtn: "Find Emergency Vet",
    nearestHospitalsTitle: "Nearest Veterinary Facilities",
    selectHospitalBtn: "Select Hospital",
    chooseAnotherBtn: "Choose Another Hospital",
    addressLabel: "Address",
    phoneLabel: "Phone",
    noPhone: "Hospital phone number not available.",
    ambulanceLabel: "Animal Ambulance",
    ambulanceAvailable: "Ambulance Available",
    ambulanceNotAvailable: "Ambulance Not Available",
    ambulanceContactHospital: "Contact Hospital for Ambulance Availability",
    callHospitalBtn: "Call Hospital",
    callAmbulanceBtn: "Call Ambulance",
    call1962Btn: "Call 1962 (Toll-Free SOS)",
    govHelpTitle: "Need Government Veterinary Help?",
    govHelpDesc: "Pashu Sanjeevani 24x7 National Animal Emergency & Mobile Veterinary Services.",
    noHospitalsFound: "No veterinary hospitals found nearby. Please try entering a nearby town or district.",
    unableToSearch: "Unable to search veterinary hospitals right now. Please call 1962 or try searching your town.",
    retryBtn: "Retry Search",
    changeLocationBtn: "Change Location",
    guidanceTitle: "Emergency First-Aid Guidance",
    guidanceSubtitle: "Immediate conservative stabilization while waiting for veterinary help.",
    avoidNotice: "Never administer human painkillers (paracetamol, ibuprofen) or force liquids if the animal is unconscious.",
  },
  hi: {
    title: "आपातकालीन पशु चिकित्सा सहायता",
    subtitle: "निकटतम पशु चिकित्सालय, फ़ोन नंबर और 24x7 हेल्पलाइन की त्वरित सुविधा।",
    findingHelp: "आपके निकट पशु चिकित्सालय खोज रहे हैं...",
    locationPrompt: "निकटतम पशु चिकित्सालय खोजने के लिए लोकेशन की अनुमति दें।",
    detectLocationBtn: "मेरे वर्तमान स्थान का उपयोग करें",
    manualLocationTitle: "अपना स्थान दर्ज करें",
    manualLocationPlaceholder: "गाँव / कस्बा / शहर (उदा. ओंगोल)",
    findEmergencyVetBtn: "आपातकालीन अस्पताल खोजें",
    nearestHospitalsTitle: "निकटतम पशु चिकित्सालय",
    selectHospitalBtn: "अस्पताल चुनें",
    chooseAnotherBtn: "दूसरा अस्पताल चुनें",
    addressLabel: "पता",
    phoneLabel: "फ़ोन",
    noPhone: "अस्पताल का फ़ोन नंबर उपलब्ध नहीं है।",
    ambulanceLabel: "पशु एम्बुलेंस",
    ambulanceAvailable: "एम्बुलेंस उपलब्ध है",
    ambulanceNotAvailable: "एम्बुलेंस उपलब्ध नहीं है",
    ambulanceContactHospital: "एम्बुलेंस उपलब्धता के लिए अस्पताल से संपर्क करें",
    callHospitalBtn: "अस्पताल को कॉल करें",
    callAmbulanceBtn: "एम्बुलेंस को कॉल करें",
    call1962Btn: "1962 पर कॉल करें (टोल-फ्री)",
    govHelpTitle: "क्या आपको सरकारी पशु चिकित्सा सहायता चाहिए?",
    govHelpDesc: "पशु संजीवनी 24x7 राष्ट्रीय पशु आपातकालीन एवं सचल पशु चिकित्सा सेवा।",
    noHospitalsFound: "निकट कोई पशु चिकित्सालय नहीं मिला। कृपया निकटतम शहर या जिला दर्ज करें।",
    unableToSearch: "वर्तमान में पशु चिकित्सालय खोजना संभव नहीं है। कृपया 1962 पर कॉल करें या शहर का नाम खोजें।",
    retryBtn: "पुनः प्रयास करें",
    changeLocationBtn: "स्थान बदलें",
    guidanceTitle: "आपातकालीन प्राथमिक उपचार निर्देश",
    guidanceSubtitle: "पशु चिकित्सक के आने तक तात्कालिक प्राथमिक देखभाल।",
    avoidNotice: "पशु को कभी भी इंसानी दर्द निवारक दवाइयाँ न दें और बेहोशी की हालत में पानी न पिलाएं।",
  },
  te: {
    title: "అత్యవసర పశువైద్య సహాయం",
    subtitle: "సమీప పశువైద్యశాలలు, ఫోన్ నంబర్లు మరియు 24x7 హెల్ప్‌లైన్ తక్షణ సమాచారం.",
    findingHelp: "మీ సమీపంలోని పశువైద్యశాలలను వెతుకుతున్నాము...",
    locationPrompt: "సమీప పశువైద్యశాలను కనుగొనడానికి లొకేషన్ అనుమతించండి.",
    detectLocationBtn: "నా ప్రస్తుత లొకేషన్ ఉపయోగించండి",
    manualLocationTitle: "మీ లొకేషన్‌ను నమోదు చేయండి",
    manualLocationPlaceholder: "గ్రామం / పట్టణం / నగరం (ఉదా: ఒంగోలు)",
    findEmergencyVetBtn: "పశువైద్యశాలను వెతకండి",
    nearestHospitalsTitle: "సమీప పశువైద్యశాలలు",
    selectHospitalBtn: "ఆసుపత్రిని ఎంచుకోండి",
    chooseAnotherBtn: "మరో ఆసుపత్రిని ఎంచుకోండి",
    addressLabel: "చిరునామా",
    phoneLabel: "ఫోన్",
    noPhone: "ఆసుపత్రి ఫోన్ నంబర్ అందుబాటులో లేదు.",
    ambulanceLabel: "పశు అంబులెన్స్",
    ambulanceAvailable: "అంబులెన్స్ అందుబాటులో ఉంది",
    ambulanceNotAvailable: "అంబులెన్స్ అందుబాటులో లేదు",
    ambulanceContactHospital: "అంబులెన్స్ లభ్యత కోసం ఆసుపత్రిని సంప్రదించండి",
    callHospitalBtn: "ఆసుపత్రికి కాల్ చేయండి",
    callAmbulanceBtn: "అంబులెన్స్‌కు కాల్ చేయండి",
    call1962Btn: "1962 కి కాల్ చేయండి (టోల్ ఫ్రీ)",
    govHelpTitle: "ప్రభుత్వ పశువైద్య సహాయం కావాలా?",
    govHelpDesc: "పశు సంజీవని 24x7 జాతీయ పశు అత్యవసర మరియు మొబైల్ అంబులెన్స్ సేవలు.",
    noHospitalsFound: "సమీపంలో ఎలాంటి పశువైద్యశాలలు కనుగొనబడలేదు. దయచేసి సమీప పట్టణం లేదా జిల్లా పేరు నమోదు చేయండి.",
    unableToSearch: "ప్రస్తుతం పశువైద్యశాలలను శోధించడం సాధ్యపడలేదు. దయచేసి 1962 కి కాల్ చేయండి లేదా నగరాన్ని శోధించండి.",
    retryBtn: "మళ్లీ ప్రయత్నించండి",
    changeLocationBtn: "లొకేషన్ మార్చండి",
    guidanceTitle: "అత్యవసర ప్రథమ చికిత్స మార్గదర్శకాలు",
    guidanceSubtitle: "వైద్యులు వచ్చే వరకు తక్షణ జాగ్రత్తలు.",
    avoidNotice: "మానవుల పెయిన్ కిల్లర్ మందులను జంతువులకు ఎప్పుడూ ఇవ్వవద్దు మరియు స్పృహ లేనప్పుడు నీరు తాగించవద్దు.",
  },
  ta: {
    title: "அவசர கால்நடை மருத்துவ உதவி",
    subtitle: "அருகிலுள்ள கால்நடை மருத்துவமனைகள், தொலைபேசி எண்கள் மற்றும் 24x7 உதவி எண்.",
    findingHelp: "உங்கள் அருகிலுள்ள மருத்துவமனைகளைத் தேடுகிறது...",
    locationPrompt: "அருகிலுள்ள மருத்துவமனையைக் கண்டறிய இருப்பிடத்தை அனுமதிக்கவும்.",
    detectLocationBtn: "என் தற்போதைய இருப்பிடம்",
    manualLocationTitle: "உங்கள் இருப்பிடத்தை உள்ளிடவும்",
    manualLocationPlaceholder: "கிராமம் / நகரம் / மாவட்டம் (எ.கா. ஒங்கோல்)",
    findEmergencyVetBtn: "மருத்துவமனையைத் தேடு",
    nearestHospitalsTitle: "அருகிலுள்ள கால்நடை மருத்துவமனைகள்",
    selectHospitalBtn: "மருத்துவமனையைத் தேர்வுசெய்",
    chooseAnotherBtn: "வேறு மருத்துவமனையைத் தேர்வுசெய்",
    addressLabel: "முகவரி",
    phoneLabel: "தொலைபேசி",
    noPhone: "மருத்துவமனை தொலைபேசி எண் கிடைக்கவில்லை.",
    ambulanceLabel: "கால்நடை ஆம்புலன்ஸ்",
    ambulanceAvailable: "ஆம்புலன்ஸ் உள்ளது",
    ambulanceNotAvailable: "ஆம்புலன்ஸ் இல்லை",
    ambulanceContactHospital: "ஆம்புலன்ஸ் வசதிக்கு மருத்துவமனையைத் தொடர்பு கொள்ளவும்",
    callHospitalBtn: "மருத்துவமனைக்கு அழைக்கவும்",
    callAmbulanceBtn: "ஆம்புலன்ஸை அழைக்கவும்",
    call1962Btn: "1962 ஐ அழைக்கவும் (இலவசம்)",
    govHelpTitle: "அரசு கால்நடை உதவி வேண்டுமா?",
    govHelpDesc: "பசு சஞ்சீவனி 24x7 தேசிய அவசர கால்நடை சேவை.",
    noHospitalsFound: "அருகில் கால்நடை மருத்துவமனைகள் எதுவும் கிடைக்கவில்லை. அருகிலுள்ள நகரம் அல்லது மாவட்டத்தை உள்ளிடவும்.",
    unableToSearch: "தற்போது கால்நடை மருத்துவமனைகளைத் தேட முடியவில்லை. 1962 ஐ அழைக்கவும்.",
    retryBtn: "மீண்டும் முயற்சிக்கவும்",
    changeLocationBtn: "இருப்பிடத்தை மாற்றவும்",
    guidanceTitle: "அவசர முதலுதவி வழிகாட்டுதல்",
    guidanceSubtitle: "கால்நடை மருத்துவர் வரும் வரை உடனடி பாதுகாப்பு நடவடிக்கைகள்.",
    avoidNotice: "மனிதர்களின் வலி நிவாரணி மருந்துகளை ஒருபோதும் வழங்காதீர்கள்.",
  },
  kn: {
    title: "ತುರ್ತು ಪಶುವೈದ್ಯಕೀಯ ಸಹಾಯ",
    subtitle: "ಹತ್ತಿರದ ಪಶು ಆಸ್ಪತ್ರೆಗಳು, ಫೋನ್ ಸಂಖ್ಯೆಗಳು ಮತ್ತು 24x7 ಸಹಾಯವಾಣಿ.",
    findingHelp: "ನಿಮ್ಮ ಹತ್ತಿರದ ಪಶು ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    locationPrompt: "ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಹುಡುಕಲು ಲೊಕೇಶನ್ ಅನುಮತಿ ನೀಡಿ.",
    detectLocationBtn: "ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಳಸಿ",
    manualLocationTitle: "ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ನಮೂದಿಸಿ",
    manualLocationPlaceholder: "ಗ್ರಾಮ / ಪಟ್ಟಣ / ನಗರ (ಉದಾ: ಓಂಗೋಲ್)",
    findEmergencyVetBtn: "ಆಸ್ಪತ್ರೆ ಹುಡುಕಿ",
    nearestHospitalsTitle: "ಹತ್ತಿರದ ಪಶುವೈದ್ಯಕೀಯ ಆಸ್ಪತ್ರೆಗಳು",
    selectHospitalBtn: "ಆಸ್ಪತ್ರೆ ಆಯ್ಕೆಮಾಡಿ",
    chooseAnotherBtn: "ಬೇರೆ ಆಸ್ಪತ್ರೆ ಆಯ್ಕೆಮಾಡಿ",
    addressLabel: "ವಿಳಾಸ",
    phoneLabel: "ಫೋನ್",
    noPhone: "ಆಸ್ಪತ್ರೆಯ ಫೋನ್ ಸಂಖ್ಯೆ ಲಭ್ಯವಿಲ್ಲ.",
    ambulanceLabel: "ಪಶು ಆಂಬ್ಯುಲೆನ್ಸ್",
    ambulanceAvailable: "ಆಂಬ್ಯುಲೆನ್ಸ್ ಲಭ್ಯವಿದೆ",
    ambulanceNotAvailable: "ಆಂಬ್ಯುಲೆನ್ಸ್ ಲಭ್ಯವಿಲ್ಲ",
    ambulanceContactHospital: "ಆಂಬ್ಯುಲೆನ್ಸ್ ಲಭ್ಯತೆಗಾಗಿ ಆಸ್ಪತ್ರೆಯನ್ನು ಸಂಪರ್ಕಿಸಿ",
    callHospitalBtn: "ಆಸ್ಪತ್ರೆಗೆ ಕರೆ ಮಾಡಿ",
    callAmbulanceBtn: "ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗೆ ಕರೆ ಮಾಡಿ",
    call1962Btn: "1962 ಕರೆ ಮಾಡಿ (ಉಚಿತ)",
    govHelpTitle: "ಸರ್ಕಾರಿ ಪಶುವೈದ್ಯಕೀಯ ಸಹಾಯ ಬೇಕೆ?",
    govHelpDesc: "ಪಶು ಸಂಜೀವಿನಿ 24x7 ರಾಷ್ಟ್ರೀಯ ತುರ್ತು ಮತ್ತು ಮೊಬೈಲ್ ಆಂಬ್ಯುಲೆನ್ಸ್ ಸೇವೆ.",
    noHospitalsFound: "ಹತ್ತಿರದಲ್ಲಿ ಯಾವುದೇ ಪಶು ಆಸ್ಪತ್ರೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಪಟ್ಟಣದ ಹೆಸರು ನಮೂದಿಸಿ.",
    unableToSearch: "ಪ್ರಸ್ತುತ ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಲು ಸಾಧ್ಯವಾಗಿಲ್ಲ. 1962 ಗೆ ಕರೆ ಮಾಡಿ.",
    retryBtn: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    changeLocationBtn: "ಸ್ಥಳ ಬದಲಿಸಿ",
    guidanceTitle: "ತುರ್ತು ಪ್ರಥಮ ಚಿಕಿತ್ಸಾ ಮಾರ್ಗದರ್ಶಿ",
    guidanceSubtitle: "ವೈದ್ಯರು ಬರುವವರೆಗೆ ತಕ್ಷಣದ ರಕ್ಷಣಾ ಕ್ರಮಗಳು.",
    avoidNotice: "ಮಾನವರ ನೋವು ನಿವಾರಕ ಮಾತ್ರೆಗಳನ್ನು ಎಂದಿಗೂ ನೀಡಬೇಡಿ.",
  },
  ml: {
    title: "അടിയന്തര മൃഗചികിത്സാ സഹായം",
    subtitle: "ഏറ്റവും അടുത്തുള്ള മൃഗാശുപത്രികൾ, ഫോൺ നമ്പറുകൾ, 24x7 ഹെൽപ്പ്‌ലൈൻ.",
    findingHelp: "അടുത്തുള്ള മൃഗാശുപത്രികൾ തിരയുന്നു...",
    locationPrompt: "ലൊക്കേഷൻ അനുമതി നൽകുക.",
    detectLocationBtn: "എന്റെ ലൊക്കേഷൻ ഉപയോഗിക്കുക",
    manualLocationTitle: "നിങ്ങളുടെ സ്ഥലം നൽകുക",
    manualLocationPlaceholder: "ഗ്രാമം / പട്ടണം / നഗരം",
    findEmergencyVetBtn: "ആശുപത്രി കണ്ടെത്തുക",
    nearestHospitalsTitle: "അടുത്തുള്ള മൃഗാശുപത്രികൾ",
    selectHospitalBtn: "ആശുപത്രി തിരഞ്ഞെടുക്കുക",
    chooseAnotherBtn: "മറ്റൊരു ആശുപത്രി തിരഞ്ഞെടുക്കുക",
    addressLabel: "വിലാസം",
    phoneLabel: "ഫോൺ",
    noPhone: "ഫോൺ നമ്പർ ലഭ്യമല്ല.",
    ambulanceLabel: "ആനിമൽ ആംബുലൻസ്",
    ambulanceAvailable: "ആംബുലൻസ് ലഭ്യമാണ്",
    ambulanceNotAvailable: "ആംബുലൻസ് ലഭ്യമല്ല",
    ambulanceContactHospital: "ആംബുലൻസ് ലഭ്യതക്കായി ആശുപത്രിയുമായി ബന്ധപ്പെടുക",
    callHospitalBtn: "ആശുപത്രിയിലേക്ക് വിളിക്കുക",
    callAmbulanceBtn: "ആംബുലൻസ് വിളിക്കുക",
    call1962Btn: "1962 വിളിക്കുക (ടോൾ ഫ്രീ)",
    govHelpTitle: "സർക്കാർ മൃഗചികിത്സാ സഹായം വേണമോ?",
    govHelpDesc: "പശു സഞ്ജീവനി 24x7 ദേശീയ അടിയന്തര ആംബുലൻസ് സേവനം.",
    noHospitalsFound: "അടുത്ത മൃഗാശുപത്രികൾ കണ്ടെത്തിയില്ല. ദയവായി പട്ടണം നൽകുക.",
    unableToSearch: "ആശുപത്രികൾ തിരയാൻ കഴിഞ്ഞില്ല. 1962 ലേക്ക് വിളിക്കുക.",
    retryBtn: "വീണ്ടും ശ്രമിക്കുക",
    changeLocationBtn: "സ്ഥലം മാറ്റുക",
    guidanceTitle: "അടിയന്തര പ്രഥമശുശ്രൂഷാ നിർദ്ദേശങ്ങൾ",
    guidanceSubtitle: "ഡോക്ടർ എത്തുന്നതുവരെയുള്ള സുരക്ഷാ മുൻകരുതലുകൾ.",
    avoidNotice: "മനുഷ്യരുടെ വേദനസംഹാരികൾ മൃഗങ്ങൾക്ക് നൽകരുത്.",
  },
  mr: {
    title: "तात्काळ पशुवैद्यकीय मदत",
    subtitle: "जवळचे पशु रुग्णालय, फोन नंबर आणि 24x7 हेल्पलाईन.",
    findingHelp: "जवळचे पशु रुग्णालय शोधत आहोत...",
    locationPrompt: "जवळचे रुग्णालय शोधण्यासाठी लोकेशन परवानगी द्या.",
    detectLocationBtn: "माझे सध्याचे लोकेशन वापरा",
    manualLocationTitle: "आपले ठिकाण टाका",
    manualLocationPlaceholder: "गाव / शहर / जिल्हा (उदा. ओंगोल)",
    findEmergencyVetBtn: "रुग्णालय शोधा",
    nearestHospitalsTitle: "जवळचे पशु रुग्णालय",
    selectHospitalBtn: "रुग्णालय निवडा",
    chooseAnotherBtn: "दुसरे रुग्णालय निवडा",
    addressLabel: "पत्ता",
    phoneLabel: "फोन",
    noPhone: "रुग्णालयाचा फोन नंबर उपलब्ध नाही.",
    ambulanceLabel: "पशु रुग्णवाहिका",
    ambulanceAvailable: "रुग्णवाहिका उपलब्ध आहे",
    ambulanceNotAvailable: "रुग्णवाहिका उपलब्ध नाही",
    ambulanceContactHospital: "रुग्णवाहिकेसाठी रुग्णालयाशी संपर्क साधा",
    callHospitalBtn: "रुग्णालयाला कॉल करा",
    callAmbulanceBtn: "रुग्णवाहिकेला कॉल करा",
    call1962Btn: "1962 वर कॉल करा (टोल-फ्री)",
    govHelpTitle: "शासकीय पशुवैद्यकीय मदत हवी आहे का?",
    govHelpDesc: "पशु संजीवनी 24x7 राष्ट्रीय पशु आपत्कालीन आणि फिरती रुग्णवाहिका सेवा.",
    noHospitalsFound: "जवळ कोणतेही पशु रुग्णालय आढळले नाही. जवळचे शहर टाका.",
    unableToSearch: "सध्या शोधणे शक्य नाही. कृपया 1962 वर कॉल करा.",
    retryBtn: "पुन्हा प्रयत्न करा",
    changeLocationBtn: "ठिकाण बदला",
    guidanceTitle: "तात्काळ प्रथमोपचार मार्गदर्शन",
    guidanceSubtitle: "डॉक्टर येईपर्यंत त्वरित प्राथमिक काळजी.",
    avoidNotice: "मानवी पेनकिलर औषधे जनावरांना कधीही देऊ नका.",
  },
  bn: {
    title: "জরুরি পশু চিকিৎসা সহায়তা",
    subtitle: "নিকটস্থ পশু হাসপাতাল, ফোন নম্বর এবং ২৪x৭ হেল্পলাইন।",
    findingHelp: "নিকটবর্তী পশু হাসপাতাল খোঁজা হচ্ছে...",
    locationPrompt: "নিকটস্থ হাসপাতাল খুঁজে পেতে লোকেশন অনুমতি দিন।",
    detectLocationBtn: "আমার বর্তমান অবস্থান ব্যবহার করুন",
    manualLocationTitle: "আপনার অবস্থান লিখুন",
    manualLocationPlaceholder: "গ্রাম / শহর / জেলা (যেমন ওঙ্গোল)",
    findEmergencyVetBtn: "হাসপাতাল খুঁজুন",
    nearestHospitalsTitle: "নিকটবর্তী পশু হাসপাতাল",
    selectHospitalBtn: "হাসপাতাল নির্বাচন করুন",
    chooseAnotherBtn: "অন্য হাসপাতাল নির্বাচন করুন",
    addressLabel: "ঠিকানা",
    phoneLabel: "ফোন",
    noPhone: "হাসপাতালের ফোন নম্বর উপলব্ধ নেই।",
    ambulanceLabel: "পশু অ্যাম্বুলেন্স",
    ambulanceAvailable: "অ্যাম্বুলেন্স উপলব্ধ",
    ambulanceNotAvailable: "অ্যাম্বুলেন্স উপলব্ধ নেই",
    ambulanceContactHospital: "অ্যাম্বুলেন্সের জন্য হাসপাতালের সাথে যোগাযোগ করুন",
    callHospitalBtn: "হাসপাতালে কল করুন",
    callAmbulanceBtn: "অ্যাম্বুলেন্সে কল করুন",
    call1962Btn: "১৯৬২ তে কল করুন (টোল-ফ্রি)",
    govHelpTitle: "সরকারি পশু চিকিৎসা সহায়তা প্রয়োজন?",
    govHelpDesc: "পশু সঞ্জীবনী ২৪x৭ জাতীয় জরুরি মোবাইল পশু চিকিৎসা পরিষেবা।",
    noHospitalsFound: "কাছাকাছি কোনো পশু হাসপাতাল পাওয়া যায়নি। শহরের নাম লিখুন।",
    unableToSearch: "বর্তমানে হাসপাতাল অনুসন্ধান সম্ভব হচ্ছে না। ১৯৬২ তে কল করুন।",
    retryBtn: "পুনরায় চেষ্টা করুন",
    changeLocationBtn: "অবস্থান পরিবর্তন করুন",
    guidanceTitle: "জরুরি প্রাথমিক চিকিৎসা নির্দেশিকা",
    guidanceSubtitle: "চিকিৎসক আসার আগ পর্যন্ত প্রাথমিক যত্ন।",
    avoidNotice: "মানুষের ব্যথানাশক ওষুধ পশুদের দেবেন না।",
  },
  gu: {
    title: "ઇમરજન્સી પશુ ચિકિત્સા સહાય",
    subtitle: "નજીકના પશુ દવાખાના, ફોન નંબર અને ૨૪x૭ હેલ્પલાઇન.",
    findingHelp: "નજીકનું પશુ દવાખાનું શોધી રહ્યા છીએ...",
    locationPrompt: "નજીકના દવાખાના માટે લોકેશનની પરવાનગી આપો.",
    detectLocationBtn: "મારું વર્તમાન લોકેશન વાપરો",
    manualLocationTitle: "તમારું સ્થળ દાખલ કરો",
    manualLocationPlaceholder: "ગામ / નગર / શહેર",
    findEmergencyVetBtn: "દવાખાનું શોધો",
    nearestHospitalsTitle: "નજીકના પશુ દવાખાના",
    selectHospitalBtn: "દવાખાનું પસંદ કરો",
    chooseAnotherBtn: "બીજું દવાખાનું પસંદ કરો",
    addressLabel: "સરનામું",
    phoneLabel: "ફોન",
    noPhone: "દવાખાનાનો ફોન નંબર ઉપલબ્ધ નથી.",
    ambulanceLabel: "પશુ એમ્બ્યુલન્સ",
    ambulanceAvailable: "એમ્બ્યુલન્સ ઉપલબ્ધ છે",
    ambulanceNotAvailable: "એમ્બ્યુલન્સ ઉપલબ્ધ નથી",
    ambulanceContactHospital: "એમ્બ્યુલન્સ માટે દવાખાનાનો સંપર્ક કરો",
    callHospitalBtn: "દવાખાને કોલ કરો",
    callAmbulanceBtn: "એમ્બ્યુલન્સ કોલ કરો",
    call1962Btn: "1962 પર કોલ કરો (ટોલ-ફ્રી)",
    govHelpTitle: "સરકારી પશુ ચિકિત્સા સહાય જોઈએ છે?",
    govHelpDesc: "પશુ સંજીવની 24x7 રાષ્ટ્રીય ઇમરજન્સી સેવા.",
    noHospitalsFound: "નજીકમાં કોઈ પશુ દવાખાનું મળ્યું નથી.",
    unableToSearch: "દવાખાના શોધવામાં અસમર્થ. 1962 પર કોલ કરો.",
    retryBtn: "ફરી પ્રયાસ કરો",
    changeLocationBtn: "સ્થળ બદલો",
    guidanceTitle: "ઇમરજન્સી પ્રાથમિક સારવાર",
    guidanceSubtitle: "ડૉક્ટર આવે ત્યાં સુધી ત્વરિત પગલાં.",
    avoidNotice: "માનવીય પેઇનકિલર દવાઓ પશુઓને ક્યારેય ન આપો.",
  },
  pa: {
    title: "ਐਮਰਜੈਂਸੀ ਪਸ਼ੂ ਹਸਪਤਾਲ ਸਹਾਇਤਾ",
    subtitle: "ਨੇੜਲੇ ਪਸ਼ੂ ਹਸਪਤਾਲ, ਫੋਨ ਨੰਬਰ ਅਤੇ 24x7 ਹੈਲਪਲਾਈਨ।",
    findingHelp: "ਨੇੜਲੇ ਪਸ਼ੂ ਹਸਪਤਾਲਾਂ ਦੀ ਭਾਲ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...",
    locationPrompt: "ਨੇੜਲਾ ਹਸਪਤਾਲ ਲੱਭਣ ਲਈ ਲੋਕੇਸ਼ਨ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ।",
    detectLocationBtn: "ਮੇਰੀ ਮੌਜੂਦਾ ਲੋਕੇਸ਼ਨ ਵਰਤੋ",
    manualLocationTitle: "ਆਪਣੀ ਲੋਕੇਸ਼ਨ ਦਰਜ ਕਰੋ",
    manualLocationPlaceholder: "ਪਿੰਡ / ਕਸਬਾ / ਸ਼ਹਿਰ",
    findEmergencyVetBtn: "ਹਸਪਤਾਲ ਲੱਭੋ",
    nearestHospitalsTitle: "ਨੇੜਲੇ ਪਸ਼ੂ ਹਸਪਤਾਲ",
    selectHospitalBtn: "ਹਸਪਤਾਲ ਚੁਣੋ",
    chooseAnotherBtn: "ਦੂਜਾ ਹਸਪਤਾਲ ਚੁਣੋ",
    addressLabel: "ਪਤਾ",
    phoneLabel: "ਫੋਨ",
    noPhone: "ਹਸਪਤਾਲ ਦਾ ਫੋਨ ਨੰਬਰ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
    ambulanceLabel: "ਪਸ਼ੂ ਐਂਬੂਲੈਂਸ",
    ambulanceAvailable: "ਐਂਬੂਲੈਂਸ ਉਪਲਬਧ ਹੈ",
    ambulanceNotAvailable: "ਐਂਬੂਲੈਂਸ ਉਪਲਬਧ ਨਹੀਂ ਹੈ",
    ambulanceContactHospital: "ਐਂਬੂਲੈਂਸ ਲਈ ਹਸਪਤਾਲ ਨਾਲ ਸੰਪਰਕ ਕਰੋ",
    callHospitalBtn: "ਹਸਪਤਾਲ ਨੂੰ ਕਾਲ ਕਰੋ",
    callAmbulanceBtn: "ਐਂਬੂਲੈਂਸ ਨੂੰ ਕਾਲ ਕਰੋ",
    call1962Btn: "1962 'ਤੇ ਕਾਲ ਕਰੋ (ਟੋਲ-ਫ੍ਰੀ)",
    govHelpTitle: "ਸਰਕਾਰੀ ਪਸ਼ੂ ਚਿਕਿਤਸਾ ਸਹਾਇਤਾ ਚਾਹੀਦੀ ਹੈ?",
    govHelpDesc: "ਪਸ਼ੂ ਸੰਜੀਵਨੀ 24x7 ਕੌਮੀ ਐਮਰਜੈਂਸੀ ਪਸ਼ੂ ਸੇਵਾ।",
    noHospitalsFound: "ਨੇੜੇ ਕੋਈ ਪਸ਼ੂ ਹਸਪਤਾਲ ਨਹੀਂ ਮਿਲਿਆ।",
    unableToSearch: "ਹਸਪਤਾਲ ਲੱਭਣ ਵਿੱਚ ਅਸਮਰੱਥ। 1962 'ਤੇ ਕਾਲ ਕਰੋ।",
    retryBtn: "ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    changeLocationBtn: "ਲੋਕੇਸ਼ਨ ਬਦਲੋ",
    guidanceTitle: "ਐਮਰਜੈਂਸੀ ਮੁਢਲੀ ਸਹਾਇਤਾ",
    guidanceSubtitle: "ਡਾਕਟਰ ਦੇ ਆਉਣ ਤੱਕ ਜ਼ਰੂਰੀ ਦੇਖਭਾਲ।",
    avoidNotice: "ਇਨਸਾਨੀ ਦਰਦ ਨਿਵਾਰਕ ਦਵਾਈਆਂ ਜਾਨਵਰਾਂ ਨੂੰ ਕਦੇ ਨਾ ਦਿਓ।",
  },
  or: {
    title: "ଜରୁରୀକାଳୀନ ପ୍ରାଣୀ ଚିକିତ୍ସା ସହାୟତା",
    subtitle: "ନିକଟସ୍ଥ ପ୍ରାଣୀ ଚିକିତ୍ସାଳୟ, ଫୋନ୍ ନମ୍ବର ଏବଂ 24x7 ହେଲ୍ପଲାଇନ୍।",
    findingHelp: "ନିକଟସ୍ଥ ପ୍ରାଣୀ ଚିକିତ୍ସାଳୟ ଖୋଜା ଚାଲିଛି...",
    locationPrompt: "ନିକଟସ୍ଥ ଚିକିତ୍ସାଳୟ ଖୋଜିବା ପାଇଁ ଲୋକେସନ୍ ଅନୁମତି ଦିଅନ୍ତୁ।",
    detectLocationBtn: "ମୋର ବର୍ତ୍ତମାନର ଲୋକେସନ୍ ବ୍ୟବହାର କରନ୍ତୁ",
    manualLocationTitle: "ଆପଣଙ୍କ ସ୍ଥାନ ଲେଖନ୍ତୁ",
    manualLocationPlaceholder: "ଗ୍ରାମ / ସହର / ଜିଲ୍ଲା",
    findEmergencyVetBtn: "ଚିକିତ୍ସାଳୟ ଖୋଜନ୍ତୁ",
    nearestHospitalsTitle: "ନିକଟସ୍ଥ ପ୍ରାଣୀ ଚିକିତ୍ସାଳୟ",
    selectHospitalBtn: "ଚିକିତ୍ସାଳୟ ଚୟନ କରନ୍ତୁ",
    chooseAnotherBtn: "ଅନ୍ୟ ଚିକିତ୍ସାଳୟ ଚୟନ କରନ୍ତୁ",
    addressLabel: "ଠିକଣା",
    phoneLabel: "ଫୋନ୍",
    noPhone: "ଫୋନ୍ ନମ୍ବର ଉପଲବ୍ଧ ନାହିଁ।",
    ambulanceLabel: "ପ୍ରାଣୀ ଆମ୍ବୁଲାନ୍ସ",
    ambulanceAvailable: "ଆମ୍ବୁଲାନ୍ସ ଉପଲବ୍ଧ ଅଛି",
    ambulanceNotAvailable: "ଆମ୍ବୁଲାନ୍ସ ଉପଲବ୍ଧ ନାହିଁ",
    ambulanceContactHospital: "ଆମ୍ବୁଲାନ୍ସ ପାଇଁ ଡାକ୍ତରଖାନା ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ",
    callHospitalBtn: "ଡାକ୍ତରଖାନାକୁ କଲ୍ କରନ୍ତୁ",
    callAmbulanceBtn: "ଆମ୍ବୁଲାନ୍ସକୁ କଲ୍ କରନ୍ତୁ",
    call1962Btn: "1962 କୁ କଲ୍ କରନ୍ତୁ (ଟୋଲ୍-ଫ୍ରି)",
    govHelpTitle: "ସରକାରୀ ପ୍ରାଣୀ ଚିକିତ୍ସା ସହାୟତା ଆବଶ୍ୟକ କି?",
    govHelpDesc: "ପଶୁ ସଞ୍ଜୀବନୀ 24x7 ଜାତୀୟ ଜରୁରୀକାଳୀନ ପ୍ରାଣୀ ସେବା।",
    noHospitalsFound: "ନିକଟରେ କୌଣସି ପ୍ରାଣୀ ଚିକିତ୍ସାଳୟ ମିଳିଲା ନାହିଁ।",
    unableToSearch: "ଚିକିତ୍ସାଳୟ ଖୋଜିବା ସମ୍ଭବ ହେଲା ନାହିଁ। 1962 କୁ କଲ୍ କରନ୍ତୁ।",
    retryBtn: "ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ",
    changeLocationBtn: "ସ୍ଥାନ ପରିବର୍ତ୍ତନ କରନ୍ତୁ",
    guidanceTitle: "ଜରୁରୀକାଳୀନ ପ୍ରାଥମିକ ଚିକିତ୍ସା",
    guidanceSubtitle: "ଡାକ୍ତର ଆସିବା ପର୍ଯ୍ୟନ୍ତ ପ୍ରାଥମିକ ଯତ୍ନ।",
    avoidNotice: "ମଣିଷର ଯନ୍ତ୍ରଣା ନିବାରକ ଔଷଧ ପ୍ରାଣୀମାନଙ୍କୁ କେବେ ଦିଅନ୍ତୁ ନାହିଁ।",
  },
  as: {
    title: "জৰুৰীকালীন পশু চিকিৎসা সাহায্য",
    subtitle: "নিকটতম পশু চিকিৎসালয়, ফোন নম্বৰ আৰু ২৪x৭ হেল্পলাইন।",
    findingHelp: "নিকটতম পশু চিকিৎসালয় বিচাৰি থকা হৈছে...",
    locationPrompt: "চিকিৎসালয় বিচাৰিবলৈ লোকেচনৰ অনুমতি দিয়ক।",
    detectLocationBtn: "মোৰ বৰ্তমান স্থান ব্যৱহাৰ কৰক",
    manualLocationTitle: "আপোনাৰ স্থান লিখক",
    manualLocationPlaceholder: "গাঁও / নগৰ / চহৰ",
    findEmergencyVetBtn: "চিকিৎসালয় সন্ধান কৰক",
    nearestHospitalsTitle: "নিকটতম পশু চিকিৎসালয়",
    selectHospitalBtn: "চিকিৎসালয় বাছনি কৰক",
    chooseAnotherBtn: "অন্য চিকিৎসালয় বাছনি কৰক",
    addressLabel: "ঠিকনা",
    phoneLabel: "ফোন",
    noPhone: "ফোন নম্বৰ উপলব্ধ নহয়।",
    ambulanceLabel: "পশু এম্বুলেন্স",
    ambulanceAvailable: "এম্বুলেন্স উপলব্ধ",
    ambulanceNotAvailable: "এম্বুলেন্স উপলব্ধ নহয়",
    ambulanceContactHospital: "এম্বুলেন্সৰ বাবে চিকিৎসালয়ৰ সৈতে যোগাযোগ কৰক",
    callHospitalBtn: "চিকিৎসালয়লৈ কল কৰক",
    callAmbulanceBtn: "এম্বুলেন্সলৈ কল কৰক",
    call1962Btn: "১৯৬২ ত কল কৰক (টোল-ফ্ৰী)",
    govHelpTitle: "চৰকাৰী পশু চিকিৎসা সহায়ৰ প্ৰয়োজন নেকি?",
    govHelpDesc: "পশু সঞ্জীৱনী ২৪x৭ ৰাষ্ট্ৰীয় জৰুৰীকালীন পশু সেৱা।",
    noHospitalsFound: "ওচৰত কোনো পশু চিকিৎসালয় পোৱা নগ'ল।",
    unableToSearch: "চিকিৎসালয় বিচৰাত ব্যৰ্থ। ১৯৬২ ত কল কৰক।",
    retryBtn: "পুনৰ চেষ্টা কৰক",
    changeLocationBtn: "স্থান সলনি কৰক",
    guidanceTitle: "জৰুৰীকালীন প্ৰাথমিক চিকিৎসা",
    guidanceSubtitle: "চিকিৎসক অহালৈকে প্ৰাথমিক যত্ন।",
    avoidNotice: "মানুহৰ বিষৰ ঔষধ কেতিয়াও জীৱ-জন্তুক নিদিব।",
  },
  ur: {
    title: "ہنگامی ویٹرنری مدد",
    subtitle: "قریبی ویٹرنری ہسپتال، فون نمبر اور 24x7 ہیلپ لائن۔",
    findingHelp: "قریبی ویٹرنری ہسپتال تلاش کیے جا رہے ہیں...",
    locationPrompt: "قریبی ہسپتال تلاش کرنے کے لیے لوکیشن کی اجازت دیں۔",
    detectLocationBtn: "میری موجودہ لوکیشن استعمال کریں",
    manualLocationTitle: "اپنا مقام درج کریں",
    manualLocationPlaceholder: "گاؤں / قصبہ / شہر",
    findEmergencyVetBtn: "ہسپتال تلاش کریں",
    nearestHospitalsTitle: "قریبی ویٹرنری ہسپتال",
    selectHospitalBtn: "ہسپتال منتخب کریں",
    chooseAnotherBtn: "دوسرا ہسپتال منتخب کریں",
    addressLabel: "پتہ",
    phoneLabel: "فون",
    noPhone: "ہسپتال کا فون نمبر دستیاب نہیں ہے۔",
    ambulanceLabel: "اینیمل ایمبولینس",
    ambulanceAvailable: "ایمبولینس دستیاب ہے",
    ambulanceNotAvailable: "ایمبولینس دستیاب نہیں ہے",
    ambulanceContactHospital: "ایمبولینس کی دستیابی کے لیے ہسپتال سے رابطہ کریں",
    callHospitalBtn: "ہسپتال کو کال کریں",
    callAmbulanceBtn: "ایمبولینس کو کال کریں",
    call1962Btn: "1962 پر کال کریں (ٹول فری)",
    govHelpTitle: "کیا آپ کو سرکاری ویٹرنری مدد درکار ہے؟",
    govHelpDesc: "پشو سنجیوانی 24x7 قومی ایمرجنسی سروس۔",
    noHospitalsFound: "قریب کوئی ویٹرنری ہسپتال نہیں ملا۔",
    unableToSearch: "ہسپتال تلاش کرنا ممکن نہیں۔ 1962 پر کال کریں۔",
    retryBtn: "دوبارہ کوشش کریں",
    changeLocationBtn: "مقام تبدیل کریں",
    guidanceTitle: "ہنگامی ابتدائی طبی امداد",
    guidanceSubtitle: "ڈاکٹر کی آمد تک فوری دیکھ بھال۔",
    avoidNotice: "انسانوں کے درد کش ادویات جانوروں کو ہرگز نہ دیں۔",
  },
  sa: {
    title: "आपत्कालीन पशुचिकित्सा सहायता",
    subtitle: "समीपस्थ पशुचिकित्सालयः, दूरभाषसङ्ख्या तथा 24x7 सहायतावाहिनी।",
    findingHelp: "समीपस्थं पशुचिकित्सालयं अन्विष्यते...",
    locationPrompt: "स्थानस्य अनुमतिं प्रयच्छन्तु।",
    detectLocationBtn: "वर्तमानस्थानस्य उपयोगं कुर्वन्तु",
    manualLocationTitle: "स्वस्थानं लिखन्तु",
    manualLocationPlaceholder: "ग्रामः / नगरम् / मण्डलम्",
    findEmergencyVetBtn: "चिकित्सालयं अन्विषतु",
    nearestHospitalsTitle: "समीपस्थाः पशुचिकित्सालयाः",
    selectHospitalBtn: "चिकित्सालयं चिनोतु",
    chooseAnotherBtn: "अन्यं चिकित्सालयं चिनोतु",
    addressLabel: "सङ्केतः",
    phoneLabel: "दूरभाषः",
    noPhone: "दूरभाषसङ्ख्या न प्राप्यते।",
    ambulanceLabel: "पशु-रुग्णवाहनम्",
    ambulanceAvailable: "रुग्णवाहनं उपलब्धम् अस्ति",
    ambulanceNotAvailable: "रुग्णवाहनं न उपलब्धम्",
    ambulanceContactHospital: "रुग्णवाहनार्थं चिकित्सालयं सम्पर्कं कुर्वन्तु",
    callHospitalBtn: "चिकित्सालयं आह्वयतु",
    callAmbulanceBtn: "रुग्णवाहनं आह्वयतु",
    call1962Btn: "1962 आह्वयतु (निःशुल्कम्)",
    govHelpTitle: "सर्वकारीय पशुचिकित्सा सहायता आवश्यकी वा?",
    govHelpDesc: "पशु सञ्जीवनी 24x7 राष्ट्रिया आपत्कालीन सेवा।",
    noHospitalsFound: "समीपे चिकित्सालयः न लब्धः।",
    unableToSearch: "अन्वेषणं न सम्पन्नम्। 1962 आह्वयतु।",
    retryBtn: "पुनः प्रयतताम्",
    changeLocationBtn: "स्थानं परिवर्तयतु",
    guidanceTitle: "आपत्कालीन प्राथमिकोपचारः",
    guidanceSubtitle: "चिकित्सकस्य आगमनात् पूर्वं रक्षणोपायः।",
    avoidNotice: "मानववेदनानाशकौषधं पशुभ्यः कदापि मा ददातु।",
  },
};

export const EmergencyScreen: React.FC<EmergencyScreenProps> = ({
  language,
  initialSelectedCategory,
}) => {
  const t = EMERGENCY_I18N[language] || EMERGENCY_I18N.en;

  // State Management
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hospitals, setHospitals] = useState<VetHospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<VetHospital | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [locationStatus, setLocationStatus] = useState<"detecting" | "granted" | "denied" | "error" | "manual">("detecting");
  const [manualQuery, setManualQuery] = useState<string>("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isManualInputOpen, setIsManualInputOpen] = useState<boolean>(false);

  // Guidance Accordion State
  const [isGuidanceOpen, setIsGuidanceOpen] = useState<boolean>(false);
  const [openGuideId, setOpenGuideId] = useState<string | null>(
    initialSelectedCategory || "severe_bleeding"
  );

  // Search function with progressive radii
  const searchHospitals = useCallback(
    async (lat: number | null, lng: number | null, queryText: string) => {
      setIsLoading(true);
      setSearchError(null);
      setSelectedHospital(null);

      try {
        let url = "/api/places/nearby-vets?";
        if (lat !== null && lng !== null) {
          url += `lat=${lat}&lng=${lng}`;
        }
        if (queryText.trim()) {
          url += (lat !== null ? "&" : "") + `q=${encodeURIComponent(queryText.trim())}`;
        }

        const res = await fetch(apiUrl(url));
        if (!res.ok) {
          throw new Error("HTTP error " + res.status);
        }

        const data = await res.json();

        if (data.status === "success" && Array.isArray(data.hospitals) && data.hospitals.length > 0) {
          setHospitals(data.hospitals);
          if (data.location) {
            setLocationName(data.location);
          }
        } else if (data.status === "no_results" || (Array.isArray(data.hospitals) && data.hospitals.length === 0)) {
          setHospitals([]);
          if (data.location) setLocationName(data.location);
        } else if (data.status === "location_not_found") {
          setHospitals([]);
          setSearchError(t.noHospitalsFound);
        } else {
          setHospitals([]);
          setSearchError(t.unableToSearch);
        }
      } catch (err) {
        console.error("[Emergency Vet Search Error]:", err);
        setSearchError(t.unableToSearch);
        setHospitals([]);
      } finally {
        setIsLoading(false);
      }
    },
    [t.noHospitalsFound, t.unableToSearch]
  );

  // Automatically detect user location on mount
  const handleDetectLocation = useCallback(() => {
    setLocationStatus("detecting");
    setIsLoading(true);
    setSearchError(null);

    if (!navigator.geolocation) {
      setLocationStatus("denied");
      setIsLoading(false);
      setIsManualInputOpen(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus("granted");
        setLocationName("📍 Current Location (GPS)");
        searchHospitals(latitude, longitude, "");
      },
      (geoError) => {
        console.warn("[Emergency Geolocation Failed/Denied]:", geoError.message);
        setLocationStatus("denied");
        setIsLoading(false);
        setIsManualInputOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [searchHospitals]);

  // Initial trigger
  useEffect(() => {
    handleDetectLocation();
  }, [handleDetectLocation]);

  // Manual location submit
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setLocationStatus("manual");
    setLocationName(manualQuery.trim());
    setIsManualInputOpen(false);
    searchHospitals(null, null, manualQuery.trim());
  };

  const getAmbulanceDisplay = (hospital: VetHospital) => {
    const isAvailable =
      hospital.ambulanceStatus === "available" && Boolean(hospital.ambulancePhone);
    if (isAvailable) {
      return {
        badgeText: t.ambulanceAvailable,
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        iconColor: "text-emerald-700",
      };
    }
    if (hospital.ambulanceStatus === "not_available") {
      return {
        badgeText: t.ambulanceNotAvailable,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        iconColor: "text-slate-500",
      };
    }
    return {
      badgeText: t.ambulanceContactHospital,
      badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
      iconColor: "text-amber-700",
    };
  };

  const getGuideIcon = (iconName: string) => {
    switch (iconName) {
      case "HeartPulse":
        return <HeartPulse className="w-5 h-5 text-rose-600" />;
      case "Activity":
        return <Activity className="w-5 h-5 text-purple-600" />;
      case "AlertTriangle":
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case "Zap":
        return <Zap className="w-5 h-5 text-amber-500" />;
      case "Flame":
        return <Flame className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertOctagon className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-20 px-2 sm:px-0">
      {/* 🚨 Emergency Header Banner */}
      <div className="bg-[#8F3B3B] text-white rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden border border-[#7A2E2E]">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            24x7 EMERGENCY RESPONSE
          </div>

          <a
            href="tel:1962"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#F7F6F1] text-[#8F3B3B] text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors active:scale-95"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#8F3B3B]" />
            <span>1962 SOS Helpline</span>
          </a>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5">
          {t.title}
        </h1>
        <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-2xl">
          {t.subtitle}
        </p>

        {/* Location Status Bar */}
        <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-white font-medium truncate max-w-md">
            <MapPin className="w-4 h-4 text-white/80 shrink-0" />
            <span className="truncate">
              {locationName || (locationStatus === "detecting" ? t.findingHelp : "Location not set")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsManualInputOpen((prev) => !prev)}
              className="px-2.5 py-1 bg-black/20 hover:bg-black/30 border border-white/25 rounded-lg text-white font-medium transition-colors cursor-pointer text-xs flex items-center gap-1"
              id="emergency-change-location-btn"
            >
              <Search className="w-3 h-3" />
              <span>{t.changeLocationBtn}</span>
            </button>
            <button
              onClick={handleDetectLocation}
              className="p-1 bg-black/20 hover:bg-black/30 border border-white/25 rounded-lg text-white font-medium transition-colors cursor-pointer"
              title={t.detectLocationBtn}
              aria-label="Refresh GPS"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Location Search Box (collapsible or displayed when permission denied) */}
      {(isManualInputOpen || locationStatus === "denied") && (
        <div className="bg-white border border-[#E3E1D9] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#252A27]">
              <MapPin className="w-4 h-4 text-[#315C4C]" />
              <span>{t.manualLocationTitle}</span>
            </div>
            {isManualInputOpen && locationStatus !== "denied" && (
              <button
                onClick={() => setIsManualInputOpen(false)}
                className="text-xs text-[#626963] hover:text-[#252A27] font-medium cursor-pointer"
              >
                ✕ Close
              </button>
            )}
          </div>

          <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder={t.manualLocationPlaceholder}
              className="flex-1 px-4 py-2.5 bg-[#FAF9F5] border border-[#D5D8D2] rounded-xl text-sm text-[#252A27] placeholder:text-[#858B86] focus:outline-none focus:ring-2 focus:ring-[#315C4C] focus:bg-white"
              id="emergency-manual-input"
            />
            <button
              type="submit"
              disabled={!manualQuery.trim() || isLoading}
              className="px-5 py-2.5 bg-[#315C4C] hover:bg-[#25473B] disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
              id="emergency-manual-submit-btn"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{t.findEmergencyVetBtn}</span>
            </button>
          </form>

          {locationStatus === "denied" && (
            <div className="flex items-center justify-between gap-2 pt-1 text-xs text-[#626963]">
              <span>{t.locationPrompt}</span>
              <button
                type="button"
                onClick={handleDetectLocation}
                className="text-[#315C4C] font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" />
                {t.detectLocationBtn}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ⏳ Loading State */}
      {isLoading && (
        <div className="bg-white border border-[#E3E1D9] rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-[#F7F6F1] rounded-full flex items-center justify-center mx-auto text-[#315C4C]">
            <Loader2 className="w-6 h-6 animate-spin text-[#315C4C]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#252A27]">{t.findingHelp}</h3>
            <p className="text-xs text-[#626963]">
              Locating nearest veterinary hospitals, clinics, and emergency mobile facilities...
            </p>
          </div>
        </div>
      )}

      {/* Error state with prominent 1962 SOS fallback */}
      {!isLoading && searchError && (
        <div className="bg-[#FFF5F5] border border-[#F0CECE] text-[#8F3B3B] p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-[#8F3B3B] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#8F3B3B]">{searchError}</h3>
              <p className="text-xs text-[#8F3B3B]/90 leading-relaxed">
                You can immediately call the National Government Veterinary Helpline (1962) or search for your town manually.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="tel:1962"
              className="px-4 py-2 bg-[#8F3B3B] hover:bg-[#7A2E2E] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{t.call1962Btn}</span>
            </a>
            <button
              onClick={() => setIsManualInputOpen(true)}
              className="px-3.5 py-2 bg-white border border-[#F0CECE] text-[#8F3B3B] hover:bg-[#FFF0F0] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {t.manualLocationTitle}
            </button>
            <button
              onClick={handleDetectLocation}
              className="px-3.5 py-2 bg-white border border-[#F0CECE] text-[#8F3B3B] hover:bg-[#FFF0F0] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {t.retryBtn}
            </button>
          </div>
        </div>
      )}

      {/* 🏥 Step 4: Selected Hospital Compact Emergency Card */}
      {!isLoading && selectedHospital && (
        <div className="bg-white border border-[#CBD8D0] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[#E3E1D9] pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wide uppercase text-[#315C4C] bg-[#E7EEE9] px-2.5 py-1 rounded-md border border-[#CBD8D0]">
                🏥 Selected Emergency Hospital
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#252A27] mt-2">
                {selectedHospital.name}
              </h2>
              {selectedHospital.distanceKm !== undefined && (
                <span className="inline-block text-xs font-medium text-[#626963]">
                  📍 Approximately {selectedHospital.distanceKm.toFixed(1)} km away
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedHospital(null)}
              className="px-3 py-1.5 bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3E1D9] text-[#252A27] font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              id="emergency-back-to-list-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.chooseAnotherBtn}</span>
            </button>
          </div>

          {/* Details List */}
          <div className="space-y-3 text-sm">
            {/* Address */}
            <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E3E1D9]">
              <span className="text-xs font-semibold text-[#626963] block mb-0.5">
                📍 {t.addressLabel}
              </span>
              <p className="text-sm font-medium text-[#252A27] leading-snug">
                {selectedHospital.address}
              </p>
            </div>

            {/* Phone */}
            <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E3E1D9]">
              <span className="text-xs font-semibold text-[#626963] block mb-0.5">
                📞 {t.phoneLabel}
              </span>
              {selectedHospital.phone ? (
                <span className="text-base font-bold text-[#315C4C] tracking-wide font-mono">
                  {selectedHospital.phone}
                </span>
              ) : (
                <span className="text-xs font-medium text-[#858B86] italic">
                  {t.noPhone}
                </span>
              )}
            </div>

            {/* Animal Ambulance Information */}
            {(() => {
              const amb = getAmbulanceDisplay(selectedHospital);
              return (
                <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E3E1D9] space-y-1.5">
                  <span className="text-xs font-semibold text-[#626963] block">
                    🚑 {t.ambulanceLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${amb.badgeClass}`}
                    >
                      <span>🚑</span>
                      <span>{amb.badgeText}</span>
                    </span>
                  </div>
                  {selectedHospital.ambulancePhone && (
                    <div className="text-xs text-[#252A27] font-semibold pt-1">
                      Ambulance Contact: <span className="font-mono text-[#315C4C]">{selectedHospital.ambulancePhone}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Call Hospital */}
            {selectedHospital.phone ? (
              <a
                href={`tel:${selectedHospital.phone.replace(/[^0-9+]/g, "")}`}
                className="h-12 bg-[#315C4C] hover:bg-[#25473B] text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                id="emergency-call-hospital-btn"
              >
                <PhoneCall className="w-4 h-4 text-white" />
                <span>{t.callHospitalBtn}</span>
              </a>
            ) : (
              <button
                disabled
                className="h-12 bg-[#E3E1D9] text-[#858B86] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
              >
                <PhoneCall className="w-4 h-4 text-[#858B86]" />
                <span>{t.noPhone}</span>
              </button>
            )}

            {/* Call Ambulance (Rendered only if verified separate ambulance phone exists) */}
            {selectedHospital.ambulancePhone ? (
              <a
                href={`tel:${selectedHospital.ambulancePhone.replace(/[^0-9+]/g, "")}`}
                className="h-12 bg-[#8F3B3B] hover:bg-[#7A2E2E] text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                id="emergency-call-ambulance-btn"
              >
                <PhoneCall className="w-4 h-4 text-white" />
                <span>{t.callAmbulanceBtn}</span>
              </a>
            ) : (
              <a
                href="tel:1962"
                className="h-12 bg-[#8F3B3B] hover:bg-[#7A2E2E] text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                id="emergency-call-1962-alt-btn"
              >
                <PhoneCall className="w-4 h-4 text-white" />
                <span>{t.call1962Btn}</span>
              </a>
            )}
          </div>

          {/* Quick link to choose another hospital */}
          <div className="text-center pt-1">
            <button
              onClick={() => setSelectedHospital(null)}
              className="text-xs font-semibold text-[#626963] hover:text-[#252A27] underline cursor-pointer"
            >
              ← {t.chooseAnotherBtn}
            </button>
          </div>
        </div>
      )}

      {/* 🏥 Step 3: Nearest 3-5 Veterinary Hospitals List (Simple Emergency Cards) */}
      {!isLoading && !selectedHospital && hospitals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-[#252A27] flex items-center gap-2">
              <span>🏥</span>
              <span>{t.nearestHospitalsTitle}</span>
              <span className="text-xs font-semibold bg-[#E7EEE9] text-[#315C4C] px-2 py-0.5 rounded-full border border-[#CBD8D0]">
                {hospitals.length} Found
              </span>
            </h2>
          </div>

          <div className="space-y-2">
            {hospitals.slice(0, 5).map((hospital, idx) => (
              <div
                key={`${hospital.name}-${idx}`}
                onClick={() => setSelectedHospital(hospital)}
                className="bg-white hover:bg-[#FAF9F5] border border-[#E3E1D9] hover:border-[#CBD8D0] rounded-xl p-4 transition-colors shadow-xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                id={`emergency-hospital-card-${idx}`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[#252A27] group-hover:text-[#315C4C] leading-tight">
                      🏥 {hospital.name}
                    </h3>
                    {hospital.distanceKm !== undefined && (
                      <span className="text-[11px] font-semibold bg-[#FAF9F5] border border-[#E3E1D9] text-[#626963] px-2 py-0.5 rounded-md">
                        {hospital.distanceKm.toFixed(1)} km
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#626963] truncate max-w-xl">
                    📍 {hospital.address}
                  </p>

                  <div className="pt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getAmbulanceDisplay(hospital).badgeClass}`}
                    >
                      <span>🚑</span>
                      <span>{getAmbulanceDisplay(hospital).badgeText}</span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHospital(hospital);
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 bg-[#315C4C] hover:bg-[#25473B] text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>{t.selectHospitalBtn}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* When search succeeds with zero results */}
      {!isLoading && !selectedHospital && !searchError && hospitals.length === 0 && (
        <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 bg-[#FAF9F5] rounded-full flex items-center justify-center mx-auto text-[#626963]">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-[#252A27]">
              {t.noHospitalsFound}
            </h3>
            <p className="text-xs text-[#626963] leading-relaxed">
              Try entering your village, nearest town, or district name above, or call the 1962 24x7 helpline directly.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <a
              href="tel:1962"
              className="px-4 py-2 bg-[#8F3B3B] hover:bg-[#7A2E2E] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{t.call1962Btn}</span>
            </a>
            <button
              onClick={() => setIsManualInputOpen(true)}
              className="px-3.5 py-2 bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3E1D9] text-[#252A27] font-semibold text-xs rounded-xl cursor-pointer"
            >
              {t.manualLocationTitle}
            </button>
          </div>
        </div>
      )}

      {/* 📞 1962 SOS Emergency Card (Always Visible & Prominent) */}
      <div className="bg-[#FFF5F5] border border-[#F0CECE] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#8F3B3B]/10 text-[#8F3B3B] text-[11px] font-bold">
            <span>🏛️</span>
            <span>GOVERNMENT VETERINARY HELPLINE</span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[#8F3B3B]">
            {t.govHelpTitle}
          </h3>
          <p className="text-xs text-[#8F3B3B]/85 font-medium max-w-lg leading-relaxed">
            {t.govHelpDesc}
          </p>
        </div>

        <a
          href="tel:1962"
          className="w-full sm:w-auto px-5 py-3 bg-[#8F3B3B] hover:bg-[#7A2E2E] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          id="emergency-bottom-call-1962-btn"
        >
          <PhoneCall className="w-4 h-4 text-white" />
          <span>Call 1962 (Toll-Free)</span>
        </a>
      </div>

      {/* 📖 Secondary Emergency Guidance (Collapsible Accordion - Does not block veterinary access) */}
      <div className="bg-white border border-[#E3E1D9] rounded-2xl p-4 shadow-xs space-y-3">
        <button
          onClick={() => setIsGuidanceOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group"
          id="emergency-toggle-guidance-accordion"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center font-bold text-xs">
              📖
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#252A27] group-hover:text-[#315C4C]">
                {t.guidanceTitle}
              </h3>
              <p className="text-xs text-[#626963]">
                {t.guidanceSubtitle}
              </p>
            </div>
          </div>

          <div className="p-1 rounded-md text-[#858B86] group-hover:text-[#252A27]">
            {isGuidanceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isGuidanceOpen && (
          <div className="pt-3 border-t border-[#E3E1D9] space-y-3">
            {/* Avoid warning alert */}
            <div className="bg-[#FFF9EB] border border-[#F3E2B8] rounded-xl p-3 text-xs text-[#7A5B18] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#C08518] shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">
                {t.avoidNotice}
              </p>
            </div>

            {/* Quick First-Aid Guides List */}
            <div className="space-y-2">
              {FIRST_AID_GUIDES.map((guide) => {
                const isOpen = openGuideId === guide.id;
                return (
                  <div
                    key={guide.id}
                    id={`guide-${guide.id}`}
                    className="border border-[#E3E1D9] rounded-xl p-3 bg-[#FAF9F5] hover:bg-white transition-colors"
                  >
                    <button
                      onClick={() => setOpenGuideId(isOpen ? null : guide.id)}
                      className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {getGuideIcon(guide.iconName)}
                        <span className="text-xs sm:text-sm font-bold text-[#252A27]">
                          {guide.title}
                        </span>
                      </div>
                      <span className="text-xs text-[#858B86] font-bold">
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-[#E3E1D9] text-xs space-y-2.5 text-[#252A27] leading-relaxed">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[#252A27]">{guide.summary}</p>
                          <AudioPlayerButton
                            textToRead={`${guide.title}. ${guide.summary}. Immediate steps: ${guide.immediateActions.join(". ")}`}
                            language={language}
                            size="sm"
                          />
                        </div>

                        <div className="space-y-1 pl-1">
                          <span className="font-bold text-[#315C4C] block">Immediate Actions:</span>
                          <ol className="list-decimal pl-4 space-y-1 text-[#626963]">
                            {guide.immediateActions.map((step, sIdx) => (
                              <li key={sIdx}><span className="text-[#252A27]">{step}</span></li>
                            ))}
                          </ol>
                        </div>

                        {guide.whatToAvoid && guide.whatToAvoid.length > 0 && (
                          <div className="bg-[#FFF5F5] p-2.5 rounded-lg border border-[#F0CECE] text-[#8F3B3B] space-y-1">
                            <span className="font-bold text-[#8F3B3B] block">❌ What to AVOID:</span>
                            <ul className="list-disc pl-4 space-y-0.5 text-[#8F3B3B]/90">
                              {guide.whatToAvoid.map((avoid, aIdx) => (
                                <li key={aIdx}>{avoid}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
