import React, { useState, useEffect } from "react";
import {
  MapPin,
  Search,
  Phone,
  X,
  AlertCircle,
  PhoneCall,
  Loader2,
  WifiOff,
} from "lucide-react";

import { VetHospital } from "../types";
import { searchNearbyVetsClient } from "../utils/placesClientFallback";
import { apiUrl } from "../config/api";
import { useModalHistory } from "../utils/useModalHistory";

interface NearbyVetModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
}

// Multilingual labels mapping for key supported languages
const UI_LABELS: Record<
  string,
  {
    title: string;
    findingHospitals: string;
    addressLabel: string;
    phoneLabel: string;
    noPhone: string;
    locationNeeded: string;
    allowLocationBtn: string;
    manualSearchPlaceholder: string;
    searchBtn: string;
    noHospitalsFound: string;
    unableToSearch: string;
    locationNotFound: string;
    callEmergency: string;
  }
> = {
  en: {
    title: "Nearest Veterinary Hospitals",
    findingHospitals: "Finding veterinary hospitals near you...",
    addressLabel: "Address",
    phoneLabel: "Phone Number",
    noPhone: "Phone number not available",
    locationNeeded: "Location access is needed to find veterinary hospitals near you.",
    allowLocationBtn: "Use Current Location",
    manualSearchPlaceholder: "Enter Village / Town / City (e.g. Ongole)",
    searchBtn: "Search",
    noHospitalsFound: "No veterinary hospitals found nearby.",
    unableToSearch: "Unable to search veterinary hospitals right now. Please try again.",
    locationNotFound: "Location could not be found. Enter your town or city.",
    callEmergency: "National 24x7 Helpline (1962)",
  },
  hi: {
    title: "निकटतम पशु चिकित्सालय",
    findingHospitals: "आपके निकट पशु चिकित्सालय खोज रहे हैं...",
    addressLabel: "पता",
    phoneLabel: "फ़ोन नंबर",
    noPhone: "फ़ोन नंबर उपलब्ध नहीं है",
    locationNeeded: "निकटतम पशु चिकित्सालय खोजने के लिए लोकेशन की अनुमति आवश्यक है।",
    allowLocationBtn: "वर्तमान स्थान का उपयोग करें",
    manualSearchPlaceholder: "गाँव / कस्बा / शहर दर्ज करें (उदा. ओंगोल)",
    searchBtn: "खोजें",
    noHospitalsFound: "निकट में कोई पशु चिकित्सालय नहीं मिला।",
    unableToSearch: "पशु चिकित्सालय खोजने में असमर्थ। पुनः प्रयास करें।",
    locationNotFound: "स्थान नहीं मिला। कृपया अपना शहर दर्ज करें।",
    callEmergency: "राष्ट्रीय 24x7 हेल्पलाइन (1962)",
  },
  te: {
    title: "సమీప పశు వైద్యశాలలు",
    findingHospitals: "మీ సమీపంలోని పశు వైద్యశాలల కోసం వెతుకుతోంది...",
    addressLabel: "చిరునామా",
    phoneLabel: "ఫోన్ నంబర్",
    noPhone: "ఫోన్ నంబర్ అందుబాటులో లేదు",
    locationNeeded: "సమీప పశు వైద్యశాలలను కనుగొనడానికి లొకేషన్ అనుమతి అవసరం.",
    allowLocationBtn: "ప్రస్తుత లొకేషన్ వాడండి",
    manualSearchPlaceholder: "గ్రామం / పట్టణం / నగరం పేరు నమోదు చేయండి",
    searchBtn: "వెతకండి",
    noHospitalsFound: "సమీపంలో ఎలాంటి పశు వైద్యశాలలు దొరకలేదు.",
    unableToSearch: "పశు వైద్యశాలల సమాచారం పొందలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.",
    locationNotFound: "లొకేషన్ గుర్తించలేకపోయాము. దయచేసి మీ ప్రాంతాన్ని నమోదు చేయండి.",
    callEmergency: "జాతీయ 24x7 హెల్ప్‌లైన్ (1962)",
  },
  ta: {
    title: "அருகிலுள்ள கால்நடை மருத்துவமனைகள்",
    findingHospitals: "கால்நடை மருத்துவமனைகளைத் தேடுகிறது...",
    addressLabel: "முகவரி",
    phoneLabel: "தொலைபேசி எண்",
    noPhone: "தொலைபேசி எண் இல்லை",
    locationNeeded: "மருத்துவமனைகளைக் கண்டறிய இருப்பிட அனுமதி தேவை.",
    allowLocationBtn: "தற்போதைய இருப்பிடத்தைப் பயன்படுத்து",
    manualSearchPlaceholder: "கிராமம் / ஊர் / நகரம் உள்ளிடவும்",
    searchBtn: "தேடு",
    noHospitalsFound: "அருகில் கால்நடை மருத்துவமனைகள் எதுவும் கிடைக்கவில்லை.",
    unableToSearch: "தேட முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    locationNotFound: "இருப்பிடத்தைக் கண்டறிய முடியவில்லை.",
    callEmergency: "தேசிய 24x7 உதவி எண் (1962)",
  },
  kn: {
    title: "ಹತ್ತಿರದ ಪಶು ವೈದ್ಯಕೀಯ ಆಸ್ಪತ್ರೆಗಳು",
    findingHospitals: "ನಿಮ್ಮ ಸಮೀಪದ ಪಶು ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    addressLabel: "ವಿಳಾಸ",
    phoneLabel: "ದೂರವಾಣಿ ಸಂಖ್ಯೆ",
    noPhone: "ದೂರವಾಣಿ ಸಂಖ್ಯೆ ಲಭ್ಯವಿಲ್ಲ",
    locationNeeded: "ಹತ್ತಿರದ ಪಶು ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಲು ಸ್ಥಳ ಪ್ರವೇಶದ ಅಗತ್ಯವಿದೆ.",
    allowLocationBtn: "ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ",
    manualSearchPlaceholder: "ಗ್ರಾಮ / ಪಟ್ಟಣ / ನಗರ ನಮೂದಿಸಿ",
    searchBtn: "ಹುಡುಕಿ",
    noHospitalsFound: "ಹತ್ತಿರದಲ್ಲಿ ಯಾವುದೇ ಪಶು ಆಸ್ಪತ್ರೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
    unableToSearch: "ಪ್ರಸ್ತುತ ಪಶು ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    locationNotFound: "ಸ್ಥಳವನ್ನು ಕಂಡುಹಿಡಿಯಲಾಗಲಿಲ್ಲ. ನಿಮ್ಮ ಊರು ಅಥವಾ ನಗರವನ್ನು ನಮೂದಿಸಿ.",
    callEmergency: "ರಾಷ್ಟ್ರೀಯ 24x7 ಸಹಾಯವಾಣಿ (1962)",
  },
  ml: {
    title: "ഏറ്റവും അടുത്തുള്ള വെറ്ററിനറി ആശുപത്രികൾ",
    findingHospitals: "നിങ്ങളുടെ അടുത്തുള്ള വെറ്ററിനറി ആശുപത്രികൾ കണ്ടെത്തുന്നു...",
    addressLabel: "വിലാസം",
    phoneLabel: "ഫോൺ നമ്പർ",
    noPhone: "ഫോൺ നമ്പർ ലഭ്യമല്ല",
    locationNeeded: "അടുത്തുള്ള ആശുപത്രികൾ കണ്ടെത്താൻ ലൊക്കേഷൻ അനുമതി ആവശ്യമാണ്.",
    allowLocationBtn: "നിലവിലെ ലൊക്കേഷൻ ഉപയോഗിക്കുക",
    manualSearchPlaceholder: "ഗ്രാമം / പട്ടണം / നഗരം നൽകുക",
    searchBtn: "തിരയുക",
    noHospitalsFound: "അടുത്തെങ്ങും വെറ്ററിനറി ആശുപത്രികൾ കണ്ടെത്താനായില്ല.",
    unableToSearch: "ഇപ്പോൾ വെറ്ററിനറി ആശുപത്രികൾ കണ്ടെത്താൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
    locationNotFound: "ലൊക്കേഷൻ കണ്ടെത്താനായില്ല. നിങ്ങളുടെ ഗ്രാമമോ നഗരമോ നൽകുക.",
    callEmergency: "ദേശീയ 24x7 ഹെൽപ്പ്‌ലൈൻ (1962)",
  },
  mr: {
    title: "जवळपासचे पशुवैद्यकीय रुग्णालय",
    findingHospitals: "आपल्या जवळील पशुवैद्यकीय रुग्णालये शोधत आहे...",
    addressLabel: "पत्ता",
    phoneLabel: "फोन नंबर",
    noPhone: "फोन नंबर उपलब्ध नाही",
    locationNeeded: "जवळपासचे पशुवैद्यकीय रुग्णालय शोधण्यासाठी लोकेशन परवानगी आवश्यक आहे.",
    allowLocationBtn: "सध्याचे स्थान वापरा",
    manualSearchPlaceholder: "गाव / शहर / जिल्हा टाका",
    searchBtn: "शोधा",
    noHospitalsFound: "जवळपास कोणतेही पशुवैद्यकीय रुग्णालय सापडले नाही.",
    unableToSearch: "सध्या पशुवैद्यकीय रुग्णालय शोधणे शक्य नाही. कृपया पुन्हा प्रयत्न करा.",
    locationNotFound: "स्थान सापडले नाही. कृपया तुमचे शहर किंवा गाव प्रविष्ट करा.",
    callEmergency: "राष्ट्रीय 24x7 हेल्पलाइन (1962)",
  },
  bn: {
    title: "নিকটতম পশু হাসপাতাল",
    findingHospitals: "আপনার কাছাকাছি পশু হাসপাতাল খোঁজা হচ্ছে...",
    addressLabel: "ঠিকানা",
    phoneLabel: "ফোন নম্বর",
    noPhone: "ফোন নম্বর পাওয়া যায়নি",
    locationNeeded: "কাছাকাছি পশু হাসপাতাল খুঁজতে লোকেশন অ্যাক্সেস প্রয়োজন।",
    allowLocationBtn: "বর্তমান অবস্থান ব্যবহার করুন",
    manualSearchPlaceholder: "গ্রাম / শহর / এলাকা লিখুন",
    searchBtn: "অনুসন্ধান",
    noHospitalsFound: "কাছাকাছি কোনো পশু হাসপাতাল পাওয়া যায়নি।",
    unableToSearch: "এই মুহূর্তে পশু হাসপাতাল অনুসন্ধান করা সম্ভব হচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।",
    locationNotFound: "অবস্থান খুঁজে পাওয়া যায়নি। আপনার শহর বা এলাকার নাম লিখুন।",
    callEmergency: "জাতীয় 24x7 হেল্পলাইন (1962)",
  },
};

type SearchStatus =
  | "idle"
  | "loading"
  | "success"
  | "no_results"
  | "api_unavailable"
  | "location_not_found"
  | "offline";

export const NearbyVetModal: React.FC<NearbyVetModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  useModalHistory({
    isOpen,
    onClose,
    modalKey: "nearby_vet",
  });

  const langKey = UI_LABELS[language] ? language : "en";
  const t = UI_LABELS[langKey] || UI_LABELS.en;

  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [hospitals, setHospitals] = useState<VetHospital[]>([]);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [manualLocation, setManualLocation] = useState<string>("");
  const [activeLocationLabel, setActiveLocationLabel] = useState<string>("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // When modal opens, auto-request location and search
  useEffect(() => {
    if (isOpen) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSearchStatus("offline");
        setHospitals([]);
        return;
      }
      if (searchStatus === "idle" && hospitals.length === 0) {
        handleRequestAndFetchLocation();
      }
    }
  }, [isOpen]);

  const fetchHospitals = async (params: { lat?: number; lng?: number; q?: string }) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSearchStatus("offline");
      setHospitals([]);
      return;
    }

    setSearchStatus("loading");

    try {
      const queryParams = new URLSearchParams();
      if (params.lat !== undefined && params.lng !== undefined) {
        queryParams.set("lat", params.lat.toString());
        queryParams.set("lng", params.lng.toString());
      }
      if (params.q) {
        queryParams.set("q", params.q);
      }

      console.log("[VetSearch] Searching veterinary hospitals with params:", params);
      let data: any = null;

      try {
        const res = await fetch(apiUrl(`/api/places/nearby-vets?${queryParams.toString()}`));
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            data = await res.json();
          }
        }
      } catch (fetchErr) {
        console.warn("[VetSearch] Server places fetch failed, using client fallback:", fetchErr);
        data = null;
      }

      if (!data || !data.hospitals || data.hospitals.length === 0) {
        const searchLat = params.lat ?? 28.6139;
        const searchLng = params.lng ?? 77.2090;
        data = await searchNearbyVetsClient(searchLat, searchLng, params.q || "");
      }

      if (data.status === "location_not_found") {
        setSearchStatus("location_not_found");
        setHospitals([]);
        return;
      }

      const list: VetHospital[] = data.hospitals || [];
      if (list.length > 0) {
        setHospitals(list.slice(0, 5));
        setSearchStatus("success");
      } else {
        setHospitals([]);
        setSearchStatus("no_results");
      }
    } catch (err) {
      console.error("[VetSearch] Error fetching nearby veterinary hospitals:", err);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSearchStatus("offline");
      } else {
        setSearchStatus("api_unavailable");
      }
      setHospitals([]);
    }
  };

  const handleRequestAndFetchLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermissionDenied(true);
      return;
    }

    setSearchStatus("loading");
    setPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setActiveLocationLabel("Current Location (GPS)");
        fetchHospitals({ lat, lng });
      },
      (error) => {
        console.warn("[Geolocation] Permission denied or failed:", error);
        setSearchStatus("idle");
        setPermissionDenied(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualLocation.trim();
    if (!query) return;

    setActiveLocationLabel(query);
    fetchHospitals({ q: query });
  };

  if (!isOpen) return null;

  return (
    <div
      id="nearby-vet-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="nearby-vet-modal-card"
        className="bg-[#FAF8F5] text-slate-900 rounded-3xl border border-[#E8E2D5] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nearest-vet-heading"
      >
        {/* Header Section */}
        <div className="p-4 sm:p-5 border-b border-[#E8E2D5] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF2ED] text-[#154734] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="nearest-vet-heading"
                className="text-base sm:text-lg font-black text-[#154734] leading-tight"
              >
                {t.title}
              </h2>
              {activeLocationLabel && (
                <p className="text-[11px] text-stone-500 font-medium truncate max-w-[240px]">
                  📍 {activeLocationLabel}
                </p>
              )}
            </div>
          </div>

          <button
            id="close-nearby-vet-modal-btn"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Permission Denied Notice */}
          {permissionDenied && (
            <div
              id="location-permission-denied-box"
              className="bg-[#FFF9EE] border border-amber-200 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 font-semibold leading-relaxed">
                  {t.locationNeeded}
                </div>
              </div>

              <button
                id="retry-location-permission-btn"
                type="button"
                onClick={handleRequestAndFetchLocation}
                className="w-full bg-[#154734] hover:bg-[#1E5C45] text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer shadow-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{t.allowLocationBtn}</span>
              </button>
            </div>
          )}

          {/* Manual Search Input (Always easily accessible to enter village / town / city) */}
          <form
            id="manual-location-search-form"
            onSubmit={handleManualSearch}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                id="manual-location-input"
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder={t.manualSearchPlaceholder}
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#DCD5C6] bg-white focus:outline-hidden focus:border-[#154734] focus:ring-1 focus:ring-[#154734] text-slate-900 placeholder:text-stone-400 font-medium"
              />
            </div>
            <button
              id="manual-location-search-submit"
              type="submit"
              disabled={!manualLocation.trim() || searchStatus === "loading"}
              className="bg-[#154734] hover:bg-[#1E5C45] disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
            >
              {searchStatus === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              <span>{t.searchBtn}</span>
            </button>
          </form>

          {/* Loading State */}
          {searchStatus === "loading" && (
            <div
              id="finding-hospitals-loading-state"
              className="bg-white border border-[#E8E2D5] rounded-2xl p-6 text-center space-y-3 shadow-2xs"
            >
              <div className="w-8 h-8 border-3 border-[#154734] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-[#154734]">
                {t.findingHospitals}
              </p>
            </div>
          )}

          {/* Location Not Found State */}
          {searchStatus === "location_not_found" && (
            <div
              id="location-not-found-state"
              className="bg-white border border-amber-200 rounded-2xl p-6 text-center space-y-2.5 shadow-2xs"
            >
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-stone-800">
                {t.locationNotFound}
              </p>
            </div>
          )}

          {/* Offline State */}
          {searchStatus === "offline" && (
            <div
              id="vet-offline-state"
              className="bg-white border border-amber-200 rounded-2xl p-6 text-center space-y-2.5 shadow-2xs"
            >
              <WifiOff className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-stone-800">
                Internet connection is required for this feature. Please try again when you're online.
              </p>
            </div>
          )}

          {/* API Unavailable / Error State */}
          {searchStatus === "api_unavailable" && (
            <div
              id="api-unavailable-state"
              className="bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-2.5 shadow-2xs"
            >
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-stone-800">
                {t.unableToSearch}
              </p>
            </div>
          )}

          {/* Verified Zero Results State */}
          {searchStatus === "no_results" && (
            <div
              id="no-hospitals-found-state"
              className="bg-white border border-[#E8E2D5] rounded-2xl p-6 text-center space-y-2.5 shadow-2xs"
            >
              <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-stone-800">
                {t.noHospitalsFound}
              </p>
              <p className="text-[11px] text-stone-500">
                Try searching with a nearby district or larger town name.
              </p>
            </div>
          )}

          {/* Hospital Cards List (Display ONLY 3 Details: Name, Address, Phone) */}
          {searchStatus === "success" && hospitals.length > 0 && (
            <div id="hospital-cards-list" className="space-y-3">
              {hospitals.map((hospital, idx) => {
                const phoneClean = hospital.phone
                  ? hospital.phone.replace(/[^0-9+]/g, "")
                  : null;

                return (
                  <div
                    key={`${hospital.name}-${idx}`}
                    id={`hospital-card-${idx}`}
                    className="bg-white border border-[#E8E2D5] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2.5 transition-all hover:border-[#154734]/40"
                  >
                    {/* 1. Hospital Name */}
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg shrink-0">🏥</span>
                      <div className="flex-1 min-w-0">
                        <h3
                          id={`hospital-name-${idx}`}
                          className="text-sm sm:text-base font-extrabold text-[#154734] leading-snug"
                        >
                          {hospital.name}
                        </h3>
                        {hospital.distanceKm !== undefined && (
                          <span className="text-[11px] font-semibold text-stone-500">
                            ~{hospital.distanceKm} km away
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Address */}
                    <div className="flex items-start gap-2 text-xs text-stone-700 pl-7 font-medium leading-relaxed">
                      <span className="shrink-0 text-stone-400">📍</span>
                      <span id={`hospital-address-${idx}`}>
                        {hospital.address}
                      </span>
                    </div>

                    {/* 3. Phone Number (Clickable Phone Action) */}
                    <div className="pl-7 pt-1">
                      {hospital.phone && phoneClean ? (
                        <a
                          id={`hospital-phone-${idx}`}
                          href={`tel:${phoneClean}`}
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#154734] bg-[#EAF2ED] hover:bg-[#D4E8DC] px-3.5 py-2 rounded-xl border border-[#C2DEC9] transition-all cursor-pointer group"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#154734] group-hover:scale-110 transition-transform shrink-0" />
                          <span className="underline decoration-1 underline-offset-2">
                            {hospital.phone}
                          </span>
                        </a>
                      ) : (
                        <div
                          id={`hospital-phone-unavailable-${idx}`}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200"
                        >
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{t.noPhone}</span>
                        </div>
                      )}
                    </div>

                    {/* 4. Animal Ambulance Status */}
                    <div className="pl-7 pt-1 space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-stone-50 border-stone-200 text-stone-700">
                        <span>🚑</span>
                        <span>
                          {hospital.ambulanceAvailability ||
                            (hospital.ambulanceStatus === "available"
                              ? "Ambulance Available"
                              : "Contact Hospital for Ambulance Availability")}
                        </span>
                      </div>
                      {hospital.ambulancePhone && (
                        <div>
                          <a
                            href={`tel:${hospital.ambulancePhone.replace(/[^0-9+]/g, "")}`}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                          >
                            <Phone className="w-3 h-3 text-emerald-700" />
                            <span>Direct Ambulance: {hospital.ambulancePhone}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with 1962 24x7 Helpline Shortcut */}
        <div className="p-3.5 sm:p-4 bg-[#F2EDE4] border-t border-[#E8E2D5] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-stone-700 font-semibold truncate">
            {t.callEmergency}
          </div>
          <a
            id="emergency-1962-footer-btn"
            href="tel:1962"
            className="bg-[#154734] hover:bg-[#1E5C45] text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shrink-0 shadow-xs"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 1962</span>
          </a>
        </div>
      </div>
    </div>
  );
};
