import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Search,
  Phone,
  X,
  AlertCircle,
  PhoneCall,
  Loader2,
  Scissors,
  Info,
  Navigation,
} from "lucide-react";

export interface PetSalon {
  name: string;
  address: string;
  phone?: string | null;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  openNow?: boolean;
  source?: string;
}
import { searchNearbyPetSalonsClient, formatDistance } from "../utils/placesClientFallback";
import { apiUrl } from "../config/api";
import { useModalHistory } from "../utils/useModalHistory";

interface NearbyPetSalonModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  initialQuery?: string;
}

// Multilingual labels mapping for supported languages
const UI_LABELS: Record<
  string,
  {
    title: string;
    subtitle: string;
    findingSalons: string;
    addressLabel: string;
    phoneLabel: string;
    noPhone: string;
    noAddress: string;
    callBtn: string;
    directionsBtn: string;
    locationNeeded: string;
    allowLocationBtn: string;
    manualSearchPlaceholder: string;
    searchBtn: string;
    noSalonsFound: string;
    expandSearchBtn: string;
    searchAnotherBtn: string;
    unableToSearch: string;
    locationNotFound: string;
    safetyNote: string;
  }
> = {
  en: {
    title: "Nearby Pet Salons",
    subtitle: "Pet Grooming & Spa Centers Near You",
    findingSalons: "Finding pet salons near you...",
    addressLabel: "Address",
    phoneLabel: "Phone Number",
    noPhone: "Phone number not available",
    noAddress: "Address not available",
    callBtn: "Call",
    directionsBtn: "Directions",
    locationNeeded: "Location access is needed to find pet salons near you.",
    allowLocationBtn: "Use Current Location",
    manualSearchPlaceholder: "Enter Village / Town / City (e.g. Ongole)",
    searchBtn: "Search",
    noSalonsFound: "No verified pet grooming centers found nearby.",
    expandSearchBtn: "Expand Search",
    searchAnotherBtn: "Search Another Location",
    unableToSearch: "Unable to search pet salons right now. Please try again.",
    locationNotFound: "Location could not be found. Enter your town or city.",
    safetyNote:
      "For pets with wounds, infections, severe skin problems, fever, breathing problems, or serious illness, consult a veterinarian before grooming.",
  },
  hi: {
    title: "निकटतम पेट सैलून",
    subtitle: "आपके निकट पेट ग्रूमिंग एवं स्पा केंद्र",
    findingSalons: "आपके निकट पेट सैलून खोज रहे हैं...",
    addressLabel: "पता",
    phoneLabel: "फ़ोन नंबर",
    noPhone: "फ़ोन नंबर उपलब्ध नहीं है",
    noAddress: "पता उपलब्ध नहीं है",
    callBtn: "कॉल करें",
    directionsBtn: "दिशा-निर्देश",
    locationNeeded: "आपके निकट पेट सैलून खोजने के लिए लोकेशन अनुमति आवश्यक है।",
    allowLocationBtn: "वर्तमान स्थान का उपयोग करें",
    manualSearchPlaceholder: "गाँव / कस्बा / शहर दर्ज करें (उदा. ओंगोल)",
    searchBtn: "खोजें",
    noSalonsFound: "निकट कोई सत्यापित पेट ग्रूमिंग केंद्र नहीं मिला।",
    expandSearchBtn: "खोज का दायरा बढ़ाएं",
    searchAnotherBtn: "अन्य स्थान खोजें",
    unableToSearch: "वर्तमान में पेट सैलून खोजना संभव नहीं है। कृपया पुनः प्रयास करें।",
    locationNotFound: "स्थान नहीं मिला। कृपया अपना शहर या कस्बा दर्ज करें।",
    safetyNote:
      "यदि पालतू जानवर को घाव, संक्रमण, गंभीर त्वचा रोग, बुखार या सांस की तकलीफ़ है, तो ग्रूमिंग से पहले पशु चिकित्सक से परामर्श लें।",
  },
  te: {
    title: "సమీప పెట్ సెలూన్లు",
    subtitle: "మీ సమీపంలోని పెట్ గ్రూమింగ్ & స్పా కేంద్రాలు",
    findingSalons: "మీ సమీపంలోని పెట్ సెలూన్లను వెతుకుతున్నాము...",
    addressLabel: "చిరునామా",
    phoneLabel: "ఫోన్ నంబర్",
    noPhone: "ఫోన్ నంబర్ అందుబాటులో లేదు",
    noAddress: "చిరునామా అందుబాటులో లేదు",
    callBtn: "కాల్ చేయండి",
    directionsBtn: "మ్యాప్ / రూట్",
    locationNeeded: "మీ సమీపంలోని పెట్ సెలూన్లను కనుగొనడానికి లొకేషన్ అనుమతి అవసరం.",
    allowLocationBtn: "ప్రస్తుత లొకేషన్‌ను ఉపయోగించండి",
    manualSearchPlaceholder: "గ్రామం / పట్టణం / నగరం నమోదు చేయండి (ఉదా: ఒంగోలు)",
    searchBtn: "వెతకండి",
    noSalonsFound: "సమీపంలో ఎలాంటి ధృవీకరించబడిన పెట్ గ్రూమింగ్ కేంద్రాలు కనుగొనబడలేదు.",
    expandSearchBtn: "శోధనను విస్తరించండి",
    searchAnotherBtn: "మరొక ప్రాంతాన్ని శోధించండి",
    unableToSearch: "ప్రస్తుతం పెట్ సెలూన్లను శోధించడం సాధ్యపడలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.",
    locationNotFound: "లొకేషన్ కనుగొనబడలేదు. మీ ఊరు లేదా నగరం పేరు నమోదు చేయండి.",
    safetyNote:
      "పెంపుడు జంతువులకు గాయాలు, ఇన్ఫెక్షన్లు, తీవ్రమైన చర్మ వ్యాధులు, జ్వరం లేదా శ్వాస సమస్యలు ఉంటే గ్రూమింగ్‌కు ముందు పశువైద్యుడిని సంప్రదించండి.",
  },
  ta: {
    title: "அருகிலுள்ள செல்லப்பிராணி நிலையங்கள்",
    subtitle: "செல்லப்பிராணி சீரமைப்பு மையங்கள்",
    findingSalons: "அருகிலுள்ள செல்லப்பிராணி நிலையங்களைத் தேடுகிறது...",
    addressLabel: "முகவரி",
    phoneLabel: "தொலைபேசி எண்",
    noPhone: "தொலைபேசி எண் கிடைக்கவில்லை",
    noAddress: "முகவரி கிடைக்கவில்லை",
    callBtn: "அழைக்க",
    directionsBtn: "திசைகள்",
    locationNeeded: "அருகிலுள்ள நிலையங்களைக் கண்டறிய இருப்பிட அனுமதி தேவை.",
    allowLocationBtn: "தற்போதைய இருப்பிடத்தைப் பயன்படுத்துக",
    manualSearchPlaceholder: "கிராமம் / நகரம் / மாவட்டத்தை உள்ளிடவும்",
    searchBtn: "தேடு",
    noSalonsFound: "அருகில் சரிபார்க்கப்பட்ட செல்லப்பிராணி நிலையங்கள் எதுவும் கிடைக்கவில்லை.",
    expandSearchBtn: "தேடலை விரிவாக்கு",
    searchAnotherBtn: "மற்றொரு இடத்தை தேடு",
    unableToSearch: "தற்போது செல்லப்பிராணி நிலையங்களைத் தேட முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    locationNotFound: "இருப்பிடத்தைக் கண்டறிய முடியவில்லை. உங்கள் ஊர் அல்லது நகரத்தை உள்ளிடவும்.",
    safetyNote:
      "காயங்கள், தொற்று, காய்ச்சல் அல்லது சுவாசப் பிரச்சனைகள் உள்ள பிராணிகளுக்கு சீரமைக்கும் முன் மருத்துவரிடம் ஆலோசனை பெறவும்.",
  },
  kn: {
    title: "ಹತ್ತಿರದ ಸಾಕುಪ್ರಾಣಿ ಸಲೂನ್‌ಗಳು",
    subtitle: "ಸಾಕುಪ್ರಾಣಿ ಗ್ರೂಮಿಂಗ್ ಮತ್ತು ಸ್ಪಾ ಕೇಂದ್ರಗಳು",
    findingSalons: "ನಿಮ್ಮ ಸಮೀಪದ ಸಾಕುಪ್ರಾಣಿ ಸಲೂನ್‌ಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    addressLabel: "ವಿಳಾಸ",
    phoneLabel: "ದೂರವಾಣಿ ಸಂಖ್ಯೆ",
    noPhone: "ದೂರವಾಣಿ ಸಂಖ್ಯೆ ಲಭ್ಯವಿಲ್ಲ",
    noAddress: "ವಿಳಾಸ ಲಭ್ಯವಿಲ್ಲ",
    callBtn: "ಕರೆ ಮಾಡಿ",
    directionsBtn: "ದಿಕ್ಕುಗಳು",
    locationNeeded: "ಹತ್ತಿರದ ಸಲೂನ್‌ಗಳನ್ನು ಹುಡುಕಲು ಸ್ಥಳ ಪ್ರವೇಶದ ಅಗತ್ಯವಿದೆ.",
    allowLocationBtn: "ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ",
    manualSearchPlaceholder: "ಗ್ರಾಮ / ಪಟ್ಟಣ / ನಗರ ನಮೂದಿಸಿ",
    searchBtn: "ಹುಡುಕಿ",
    noSalonsFound: "ಹತ್ತಿರದಲ್ಲಿ ಯಾವುದೇ ಪರಿಶೀಲಿತ ಸಾಕುಪ್ರಾಣಿ ಸಲೂನ್‌ಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
    expandSearchBtn: "ಹುಡುಕಾಟ ವಿಸ್ತರಿಸಿ",
    searchAnotherBtn: "ಮತ್ತೊಂದು ಸ್ಥಳ ಹುಡುಕಿ",
    unableToSearch: "ಪ್ರಸ್ತುತ ಸಾಕುಪ್ರಾಣಿ ಸಲೂನ್‌ಗಳನ್ನು ಹುಡುಕಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    locationNotFound: "ಸ್ಥಳವನ್ನು ಕಂಡುಹಿಡಿಯಲಾಗಲಿಲ್ಲ. ನಿಮ್ಮ ಊರು ಅಥವಾ ನಗರವನ್ನು ನಮೂದಿಸಿ.",
    safetyNote:
      "ಗಾಯಗಳು, ಸೋಂಕುಗಳು ಅಥವಾ ಜ್ವರ ಇರುವ ಪ್ರಾಣಿಗಳಿಗೆ ಗ್ರೂಮಿಂಗ್ ಮಾಡುವ ಮೊದಲು ಪಶುವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
  },
  ml: {
    title: "അടുത്തുള്ള പെറ്റ് സലൂണുകൾ",
    subtitle: "പെറ്റ് ഗ്രൂമിംഗ് കേന്ദ്രങ്ങൾ",
    findingSalons: "നിങ്ങളുടെ അടുത്തുള്ള പെറ്റ് സലൂണുകൾ കണ്ടെത്തുന്നു...",
    addressLabel: "വിലാസം",
    phoneLabel: "ഫോൺ നമ്പർ",
    noPhone: "ഫോൺ നമ്പർ ലഭ്യമല്ല",
    noAddress: "വിലാസം ലഭ്യമല്ല",
    callBtn: "വിളിക്കുക",
    directionsBtn: "വഴി",
    locationNeeded: "അടുത്തുള്ള സലൂണുകൾ കണ്ടെത്താൻ ലൊക്കേഷൻ അനുമതി ആവശ്യമാണ്.",
    allowLocationBtn: "നിലവിലെ ലൊക്കേഷൻ ഉപയോഗിക്കുക",
    manualSearchPlaceholder: "ഗ്രാമം / പട്ടണം / നഗരം നൽകുക",
    searchBtn: "തിരയുക",
    noSalonsFound: "അടുത്തെങ്ങും പെറ്റ് സലൂണുകൾ കണ്ടെത്താനായില്ല.",
    expandSearchBtn: "തിരച്ചിൽ വിപുലീകരിക്കുക",
    searchAnotherBtn: "മറ്റൊരു സ്ഥലം തിരയുക",
    unableToSearch: "ഇപ്പോൾ പെറ്റ് സലൂണുകൾ കണ്ടെത്താൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
    locationNotFound: "ലൊക്കേഷൻ കണ്ടെത്താനായില്ല. നിങ്ങളുടെ ഗ്രാമമോ നഗരമോ നൽകുക.",
    safetyNote:
      "മുറിവുകളോ പനിയോ ശ്വാസതടസ്സമോ ഉള്ള വളർത്തുമൃഗങ്ങൾക്ക് ഗ്രൂമിംഗിന് മുൻപ് ഡോക്ടറുടെ ഉപദേശം തേടുക.",
  },
  mr: {
    title: "जवळपासचे पेट सलून",
    subtitle: "पेट ग्रूमिंग व स्पा केंद्र",
    findingSalons: "आपल्या जवळील पेट सलून शोधत आहे...",
    addressLabel: "पत्ता",
    phoneLabel: "फोन नंबर",
    noPhone: "फोन नंबर उपलब्ध नाही",
    noAddress: "पत्ता उपलब्ध नाही",
    callBtn: "कॉल करा",
    directionsBtn: "दिशा",
    locationNeeded: "जवळपासचे पेट सलून शोधण्यासाठी लोकेशन परवानगी आवश्यक आहे.",
    allowLocationBtn: "सध्याचे स्थान वापरा",
    manualSearchPlaceholder: "गाव / शहर / जिल्हा टाका",
    searchBtn: "शोधा",
    noSalonsFound: "जवळपास कोणतेही सत्यापित पेट सलून सापडले नाही.",
    expandSearchBtn: "शोध विस्तार करा",
    searchAnotherBtn: "दुसरे स्थान शोधा",
    unableToSearch: "सध्या पेट सलून शोधणे शक्य नाही. कृपया पुन्हा प्रयत्न करा.",
    locationNotFound: "स्थान सापडले नाही. कृपया तुमचे शहर किंवा गाव प्रविष्ट करा.",
    safetyNote:
      "जखमा, संसर्ग किंवा ताप असलेल्या प्राण्यांसाठी ग्रूमिंग करण्यापूर्वी पशुवैद्यकांचा सल्ला घ्या.",
  },
  bn: {
    title: "কাছাকাছি পেট সেলুন",
    subtitle: "পেট গ্রুমিং ও স্পা কেন্দ্র",
    findingSalons: "আপনার কাছাকাছি পেট সেলুন খোঁজা হচ্ছে...",
    addressLabel: "ঠিকানা",
    phoneLabel: "ফোন নম্বর",
    noPhone: "ফোন নম্বর পাওয়া যায়নি",
    noAddress: "ঠিকানা পাওয়া যায়নি",
    callBtn: "কল করুন",
    directionsBtn: "দিকনির্দেশনা",
    locationNeeded: "কাছাকাছি পেট সেলুন খুঁজতে লোকেশন অ্যাক্সেস প্রয়োজন।",
    allowLocationBtn: "বর্তমান অবস্থান ব্যবহার করুন",
    manualSearchPlaceholder: "গ্রাম / শহর / এলাকা লিখুন",
    searchBtn: "অনুসন্ধান",
    noSalonsFound: "কাছাকাছি কোনো যাচাইকৃত পেট সেলুন পাওয়া যায়নি।",
    expandSearchBtn: "অনুসন্ধান বিস্তৃত করুন",
    searchAnotherBtn: "অন্য অবস্থান অনুসন্ধান করুন",
    unableToSearch: "এই মুহূর্তে পেট সেলুন অনুসন্ধান করা সম্ভব হচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।",
    locationNotFound: "স্থান পাওয়া যায়নি। শহর বা এলাকার নাম লিখুন।",
    safetyNote:
      "ক্ষত, সংক্রমণ বা শ্বাসকষ্ট থাকলে গ্রুমিং করানোর আগে পশু চিকিৎসকের পরামর্শ নিন।",
  },
};

export const NearbyPetSalonModal: React.FC<NearbyPetSalonModalProps> = ({
  isOpen,
  onClose,
  language,
  initialQuery = "",
}) => {
  useModalHistory({
    isOpen,
    onClose,
    modalKey: "nearby_pet_salon",
  });

  const [salons, setSalons] = useState<PetSalon[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [activeLocation, setActiveLocation] = useState<string>("");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const t = UI_LABELS[language] || UI_LABELS.en;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto trigger search on modal open if location is available
  useEffect(() => {
    if (isOpen) {
      if (initialQuery.trim()) {
        fetchSalonsByText(initialQuery.trim());
      } else {
        requestGeoLocation();
      }
    } else {
      // Clear or reset on close
      setSalons([]);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  /**
   * Request GPS Location & Fetch Salons
   */
  const requestGeoLocation = () => {
    setLoading(true);
    setError(null);
    setLocationPermissionDenied(false);

    if (!navigator.geolocation) {
      setLocationPermissionDenied(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        await fetchSalons(latitude, longitude, "");
      },
      (err) => {
        console.warn("[Pet Salons] Geolocation error or denied:", err.message);
        setLocationPermissionDenied(true);
        setLoading(false);
      },
      { timeout: 9000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  /**
   * Fetch by text query (Village/Town/City)
   */
  const fetchSalonsByText = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    await fetchSalons(null, null, text.trim());
  };

  /**
   * Core API call to /api/places/nearby-pet-salons with progressive expansion & fallback
   */
  const fetchSalons = async (
    lat: number | null,
    lng: number | null,
    queryText: string,
    expanded: boolean = false
  ) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("Internet connection is required for this feature. Please try again when you're online.");
      setSalons([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let url = "/api/places/nearby-pet-salons?";
      const params = new URLSearchParams();
      if (lat !== null && lng !== null) {
        params.append("lat", lat.toString());
        params.append("lng", lng.toString());
      }
      if (queryText) {
        params.append("q", queryText);
      }
      if (expanded) {
        params.append("expanded", "true");
      }
      url += params.toString();

      let data: any = null;
      try {
        const res = await fetch(apiUrl(url));
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            data = await res.json();
          }
        }
      } catch (fetchErr) {
        console.warn("[Pet Salons] Server fetch failed, using client fallback:", fetchErr);
        data = null;
      }

      // If server returns empty or fails, attempt client Overpass search
      if (!data || !data.salons || data.salons.length === 0) {
        const searchLat = lat ?? currentCoords?.lat ?? 28.6139;
        const searchLng = lng ?? currentCoords?.lng ?? 77.2090;
        data = await searchNearbyPetSalonsClient(searchLat, searchLng, queryText || "", expanded);
      }

      if (data.status === "location_not_found") {
        setError(t.locationNotFound);
        setSalons([]);
      } else if (data.status === "no_results" || !data.salons || data.salons.length === 0) {
        setError(t.noSalonsFound);
        setSalons([]);
      } else {
        const list: PetSalon[] = [...data.salons];
        list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        setSalons(list.slice(0, 10));
        setActiveLocation(data.location || queryText || "");
      }
    } catch (err) {
      console.error("[Pet Salons] Fetch error:", err);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setError("Internet connection is required for this feature. Please try again when you're online.");
      } else {
        setError(t.unableToSearch);
      }
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchSalonsByText(searchQuery.trim());
    }
  };

  const handleExpandSearch = () => {
    if (currentCoords) {
      fetchSalons(currentCoords.lat, currentCoords.lng, searchQuery.trim(), true);
    } else if (searchQuery.trim()) {
      fetchSalons(null, null, searchQuery.trim(), true);
    } else {
      requestGeoLocation();
    }
  };

  const handleSearchAnother = () => {
    setError(null);
    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="nearby-pet-salons-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in"
    >
      <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#154734] text-white flex items-center justify-between border-b border-[#E8E2D5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Scissors className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">{t.title}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                  🐾 Pet Care
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-medium">
                {activeLocation ? `Near: ${activeLocation}` : t.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar / Location Controls */}
        <div className="p-3 sm:p-4 bg-white border-b border-[#E8E2D5] space-y-2.5 shrink-0">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.manualSearchPlaceholder}
                className="w-full pl-9 pr-3 py-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-[#154734] text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="px-4 py-2.5 bg-[#154734] hover:bg-[#103828] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t.searchBtn}</span>
            </button>
          </form>

          {/* Use GPS Location Button */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={requestGeoLocation}
              disabled={loading}
              className="text-[#154734] hover:text-[#103828] font-bold flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <MapPin className="w-3.5 h-3.5 text-[#154734]" />
              <span>{t.allowLocationBtn}</span>
            </button>

            {activeLocation && (
              <span className="text-[11px] text-stone-500 font-medium truncate max-w-[200px]">
                📍 {activeLocation}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-[#FAF8F5]">
          {/* Loading State */}
          {loading && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#154734] animate-spin mx-auto" />
              <p className="text-sm font-bold text-stone-700">{t.findingSalons}</p>
            </div>
          )}

          {/* Location Access Prompt if denied and no query */}
          {!loading && locationPermissionDenied && salons.length === 0 && !error && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-center">
              <AlertCircle className="w-6 h-6 text-amber-700 mx-auto" />
              <p className="text-xs font-bold text-amber-900">{t.locationNeeded}</p>
              <p className="text-[11px] text-amber-800">
                Please enter your village, town, or city in the search bar above to view nearby pet grooming centers.
              </p>
            </div>
          )}

          {/* Empty / Error state with Expand Search & Search Another Location actions */}
          {!loading && error && (
            <div className="p-5 bg-white border border-[#E8E2D5] rounded-2xl text-center space-y-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-500">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-stone-800">{error}</p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Try expanding the search radius or searching for a nearby larger town or city.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExpandSearch}
                  className="w-full sm:w-auto px-4 py-2 bg-[#154734] hover:bg-[#103828] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-300" />
                  <span>{t.expandSearchBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSearchAnother}
                  className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Search className="w-3.5 h-3.5 text-stone-600" />
                  <span>{t.searchAnotherBtn}</span>
                </button>
              </div>
            </div>
          )}

          {/* Salons List (Genuine Verified Places) */}
          {!loading && salons.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-stone-600">
                  Showing nearest {salons.length} grooming centers:
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Verified Places
                </span>
              </div>

              {salons.map((salon, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E8E2D5] rounded-2xl p-4 shadow-2xs space-y-2.5 transition-all hover:border-[#154734]"
                >
                  {/* Salon Name & Proximity */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0 mt-0.5">✂️</span>
                      <div>
                        <h3 className="text-sm font-black text-[#154734] leading-snug">
                          {salon.name}
                        </h3>
                        {salon.openNow && (
                          <span className="inline-block mt-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            Open
                          </span>
                        )}
                      </div>
                    </div>
                    {salon.distanceKm !== undefined && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 shrink-0">
                        {formatDistance(salon.distanceKm)}
                      </span>
                    )}
                  </div>

                  {/* 📍 Address */}
                  <div className="flex items-start gap-2 text-xs text-stone-600 pl-6">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">
                      {salon.address && salon.address !== "Address not available"
                        ? salon.address
                        : t.noAddress}
                    </span>
                  </div>

                  {/* 📞 Actions (Phone Call + Directions) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 pl-6">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span
                        className={`font-semibold ${
                          salon.phone ? "text-slate-800" : "text-stone-400 italic text-[11px]"
                        }`}
                      >
                        {salon.phone || t.noPhone}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {salon.googleMapsUrl && (
                        <a
                          href={salon.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-xl flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                        >
                          <Navigation className="w-3 h-3 text-[#154734]" />
                          <span>{t.directionsBtn}</span>
                        </a>
                      )}

                      {salon.phone ? (
                        <a
                          href={`tel:${salon.phone.replace(/[^0-9+]/g, "")}`}
                          className="px-3 py-1.5 bg-[#154734] hover:bg-[#103828] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 shrink-0"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
                          <span>{t.callBtn}</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-1 rounded-lg">
                          {t.noPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Note Footer */}
        <div className="p-3 sm:p-3.5 bg-amber-50/90 border-t border-amber-200 text-[11px] text-amber-950 font-medium flex items-start gap-2 shrink-0">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-snug">{t.safetyNote}</p>
        </div>
      </div>
    </div>
  );
};

