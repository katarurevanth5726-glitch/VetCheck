import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { AnimalProfile } from "../types";

/**
 * Generates a safe QR Code data URL for an animal profile.
 * Contains only a safe identifier reference URL, NOT sensitive medical history or personal data.
 */
export async function generateSafeAnimalQRCodeUrl(
  animalId: string,
  profileId: string
): Promise<string> {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://vetcheck.health";
  const safeReferenceUrl = `${origin}/?view=qr-card&animalId=${encodeURIComponent(animalId)}`;

  try {
    const dataUrl = await QRCode.toDataURL(safeReferenceUrl, {
      width: 400,
      margin: 1.5,
      color: {
        dark: "#154734", // Forest Green dark modules
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });
    return dataUrl;
  } catch (err) {
    console.error("Failed to generate QR Code:", err);
    // Fallback simple payload
    return await QRCode.toDataURL(`vetcheck://animal/${animalId}`, {
      width: 400,
      margin: 1.5,
    });
  }
}

interface HealthCardPdfOptions {
  profile: AnimalProfile;
  vaccinationStatusText: string;
  vaccinationStatusType: "up_to_date" | "due_soon" | "overdue" | "not_recorded";
  nextCareDate?: string;
  nextCareTitle?: string;
  qrDataUrl: string;
}

/**
 * Generates an official, printable/downloadable VetCheck Digital Health Card PDF.
 * Uses the authentic VetCheck palette: warm ivory (#FAF8F5), forest green (#154734), gold (#D4AF37).
 */
export function generateHealthCardPdf(options: HealthCardPdfOptions): jsPDF {
  const { profile, vaccinationStatusText, vaccinationStatusType, nextCareDate, nextCareTitle, qrDataUrl } = options;

  // Standard Postcard / Passport ID Card format (100mm x 145mm portrait)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [100, 150],
  });

  const pageWidth = 100;
  const pageHeight = 150;
  const margin = 6;
  const cardWidth = pageWidth - margin * 2;
  const cardHeight = pageHeight - margin * 2;

  // Colors
  const warmIvory = [250, 248, 245]; // #FAF8F5
  const forestGreen = [21, 71, 52]; // #154734
  const darkSlate = [30, 41, 59]; // #1e293b
  const mutedText = [100, 116, 139]; // #64748b
  const borderGrey = [232, 226, 213]; // #E8E2D5
  const goldAccent = [217, 119, 6]; // #d97706
  const emeraldGreen = [16, 185, 129];
  const amberOrange = [245, 158, 11];
  const roseRed = [225, 29, 72];

  // 1. Card Background & Outer Rounded Border
  doc.setFillColor(warmIvory[0], warmIvory[1], warmIvory[2]);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, margin, cardWidth, cardHeight, 6, 6, "FD");

  // Subtle Gold Inner Border
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 1.2, margin + 1.2, cardWidth - 2.4, cardHeight - 2.4, 5, 5, "D");

  let y = margin + 3;

  // 2. Header Banner
  doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.roundedRect(margin + 3, y, cardWidth - 6, 15, 3.5, 3.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("VETCHECK HEALTH CARD", margin + 6, y + 6.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Digital Animal Passport & Identity", margin + 6, y + 11.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(245, 208, 100);
  doc.text("SIH 2024", pageWidth - margin - 6, y + 6.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("Helpline: 1962", pageWidth - margin - 6, y + 11.5, { align: "right" });

  y += 18;

  // 3. Animal Primary Identity Box
  const infoBoxHeight = 44;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + 3, y, cardWidth - 6, infoBoxHeight, 3.5, 3.5, "FD");

  // Animal Photo if available, or stylized icon placeholder
  const photoSize = 22;
  const photoX = margin + 6;
  const photoY = y + 4;

  if (profile.photoUri && profile.photoUri.startsWith("data:image")) {
    try {
      doc.addImage(profile.photoUri, "JPEG", photoX, photoY, photoSize, photoSize);
      doc.setDrawColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.setLineWidth(0.5);
      doc.rect(photoX, photoY, photoSize, photoSize, "D");
    } catch {
      // fallback box
      doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("🐾", photoX + photoSize / 2, photoY + photoSize / 2 + 2, { align: "center" });
    }
  } else {
    doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const initial = (profile.name || "A").charAt(0).toUpperCase();
    doc.text(initial, photoX + photoSize / 2, photoY + photoSize / 2 + 3.5, { align: "center" });
  }

  // Animal Name & Species
  const textX = photoX + photoSize + 4;
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(profile.name || "Animal", textX, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  const breedStr = profile.breed ? ` • ${profile.breed}` : "";
  doc.text(`${profile.species || "Animal"}${breedStr}`, textX, y + 13);

  // Key Info Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);

  let detailLine = `Sex: ${profile.sex || "Not specified"}`;
  if (profile.age || profile.approxAge) {
    detailLine += `   |   Age: ${profile.age || profile.approxAge}`;
  }
  doc.text(detailLine, textX, y + 18);

  if (profile.color || profile.tagNumber) {
    let extraLine = "";
    if (profile.color) extraLine += `Color: ${profile.color}`;
    if (profile.tagNumber) extraLine += (extraLine ? "   |   Tag: " : "Tag: ") + profile.tagNumber;
    doc.text(extraLine, textX, y + 22.5);
  }

  // Animal ID Badge
  const animalId = profile.animalId || `VC-${profile.name.slice(0, 3).toUpperCase()}-1024`;
  doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.roundedRect(textX, y + 26, 48, 6.5, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(`ANIMAL ID: ${animalId}`, textX + 24, y + 30.5, { align: "center" });

  // 4. Status Bar (Vaccination & Next Care)
  const statusBoxY = y + 36;
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(margin + 6, statusBoxY - 2, pageWidth - margin - 6, statusBoxY - 2);

  // Vaccination Status Pill
  let badgeColor = emeraldGreen;
  if (vaccinationStatusType === "overdue") badgeColor = roseRed;
  else if (vaccinationStatusType === "due_soon") badgeColor = amberOrange;
  else if (vaccinationStatusType === "not_recorded") badgeColor = mutedText;

  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(margin + 6, statusBoxY, 36, 5.5, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text(`VAX: ${vaccinationStatusText.toUpperCase()}`, margin + 24, statusBoxY + 3.8, { align: "center" });

  // Next Care Info
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  if (nextCareDate) {
    const nextDateFormatted = new Date(nextCareDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    doc.text(`Next Care: ${nextDateFormatted}`, pageWidth - margin - 6, statusBoxY + 3.8, { align: "right" });
  } else {
    doc.text("Health Log: Active", pageWidth - margin - 6, statusBoxY + 3.8, { align: "right" });
  }

  y += infoBoxHeight + 3;

  // 5. QR Code Section (Centered & Clear)
  const qrBoxHeight = 54;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + 3, y, cardWidth - 6, qrBoxHeight, 3.5, 3.5, "FD");

  // QR Code Image
  const qrSize = 36;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = y + 3;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.warn("Could not draw QR in PDF:", e);
    }
  }

  // QR Label & Security notice
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("SCAN FOR DIGITAL HEALTH PASSPORT", pageWidth / 2, y + 42.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("Scan with VetCheck app or phone camera • Privacy protected reference", pageWidth / 2, y + 46.5, {
    align: "center",
  });

  if (profile.qrPrivacySettings?.enableLostPetContact && profile.qrPrivacySettings.lostPetContactPhone) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    doc.text(
      `Lost Pet Contact: ${profile.qrPrivacySettings.lostPetContactPhone}`,
      pageWidth / 2,
      y + 50.5,
      { align: "center" }
    );
  }

  y += qrBoxHeight + 3;

  // 6. Emergency 1962 & Footer Banner
  doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.roundedRect(margin + 3, y, cardWidth - 6, 12, 2.5, 2.5, "F");

  doc.setTextColor(245, 208, 100);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("EMERGENCY 1962 (TOLL-FREE)", margin + 6, y + 5);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("24/7 Mobile Veterinary Ambulance & Crisis Support", margin + 6, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("VetCheck.health", pageWidth - margin - 6, y + 7, { align: "right" });

  return doc;
}

/**
 * Initiates download of the animal health card PDF
 */
export function downloadHealthCardPdf(options: HealthCardPdfOptions): void {
  try {
    const doc = generateHealthCardPdf(options);
    const filename = `VetCheck_HealthCard_${options.profile.name.replace(/[^A-Za-z0-9]/g, "_")}_${options.profile.animalId || "ID"}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error("Failed to download health card PDF:", error);
    alert("Could not generate PDF download. Please try again.");
  }
}
