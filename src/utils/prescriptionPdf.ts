import { jsPDF } from "jspdf";
import { VeterinaryPrescription } from "../types";

/**
 * Formats prescription details into clean, structured plain text for WhatsApp, SMS, or Clipboard.
 */
export function generatePrescriptionText(prescription: VeterinaryPrescription): string {
  const dateStr = prescription.date || new Date(prescription.createdAt || Date.now()).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  let text = `🐾 VETCHECK VETERINARY PRESCRIPTION\n`;
  text += `═══════════════════════════════════════\n`;
  text += `📅 Date: ${dateStr}\n`;
  text += `🐕 Animal: ${prescription.animalName || "Not specified"}\n`;
  text += `👨‍⚕️ Veterinarian: Dr. ${prescription.doctorName || "Registered Vet"}\n`;
  text += `🏥 Clinic/Hospital: ${prescription.hospitalClinic || "Veterinary Dispensary"}\n`;
  text += `🩺 Diagnosis: ${prescription.diagnosisCondition || "Clinical Assessment"}\n`;
  text += `═══════════════════════════════════════\n\n`;

  text += `💊 PRESCRIBED MEDICINES:\n`;
  if (prescription.medicines && prescription.medicines.length > 0) {
    prescription.medicines.forEach((med, idx) => {
      text += `\n${idx + 1}. ${med.name || "Medicine"}\n`;
      text += `   • Dosage: ${med.dosage || "As directed"}\n`;
      text += `   • Frequency: ${med.frequency || "Daily"}\n`;
      text += `   • Duration: ${med.duration || "Course as advised"}\n`;
      if (med.specialInstructions) {
        text += `   • Note: ${med.specialInstructions}\n`;
      }
    });
  } else {
    text += `(No specific medications recorded)\n`;
  }

  if (prescription.specialInstructions) {
    text += `\n📝 General Instructions:\n${prescription.specialInstructions}\n`;
  }

  text += `\n═══════════════════════════════════════\n`;
  text += `⚖️ Disclaimer: Prescription recorded for owner reference. Follow directions provided by the treating veterinarian.\n`;
  text += `📞 Emergency National Helpline: 1962 | VetCheck`;

  return text;
}

/**
 * Generates a clean, professional PDF document for a veterinary prescription using jsPDF.
 */
export function generatePrescriptionPdf(prescription: VeterinaryPrescription): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const forestGreen = [21, 71, 52]; // #154734
  const darkSlate = [30, 41, 59]; // #1e293b
  const mutedText = [100, 116, 139]; // #64748b
  const lightBg = [250, 248, 245]; // #FAF8F5
  const goldAccent = [217, 119, 6]; // #d97706
  const borderGrey = [232, 226, 213]; // #E8E2D5

  let y = margin;

  // 1. Header Banner
  doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("VETCHECK", margin + 6, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Animal Health & Veterinary Care Record", margin + 6, y + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("OFFICIAL VETERINARY PRESCRIPTION", pageWidth - margin - 6, y + 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Helpline: 1962", pageWidth - margin - 6, y + 16, { align: "right" });

  y += 30;

  // 2. Metadata Grid (Animal & Doctor details)
  const metaBoxHeight = 36;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, metaBoxHeight, 3, 3, "FD");

  const col1X = margin + 6;
  const col2X = margin + (contentWidth / 2) + 4;
  let metaY = y + 7;

  // Col 1: Animal Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("PATIENT / ANIMAL NAME", col1X, metaY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(prescription.animalName || "Patient Animal", col1X, metaY + 5);

  metaY += 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("DIAGNOSIS / CONDITION", col1X, metaY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.text(prescription.diagnosisCondition || "Clinical Assessment", col1X, metaY + 5);

  // Col 2: Vet & Date
  metaY = y + 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("VETERINARY DOCTOR", col2X, metaY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`Dr. ${prescription.doctorName || "Registered Veterinarian"}`, col2X, metaY + 5);

  metaY += 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("CLINIC / HOSPITAL & DATE", col2X, metaY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const dateFormatted = prescription.date || new Date(prescription.createdAt || Date.now()).toLocaleDateString("en-IN");
  doc.text(`${prescription.hospitalClinic || "Veterinary Clinic"} • ${dateFormatted}`, col2X, metaY + 5);

  y += metaBoxHeight + 8;

  // 3. Section Title: Prescribed Medicines
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.text("Rx — Prescribed Medicines", margin, y);

  y += 4;

  // Table Headers
  const thY = y + 3;
  doc.setFillColor(240, 237, 230);
  doc.roundedRect(margin, thY, contentWidth, 7, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

  doc.text("MEDICINE NAME", margin + 4, thY + 4.8);
  doc.text("DOSAGE", margin + 70, thY + 4.8);
  doc.text("FREQUENCY", margin + 105, thY + 4.8);
  doc.text("DURATION", margin + 140, thY + 4.8);

  y = thY + 8;

  // 4. Medicine Rows
  if (prescription.medicines && prescription.medicines.length > 0) {
    prescription.medicines.forEach((med, idx) => {
      const rowHeight = med.specialInstructions ? 14 : 10;

      // Alternating row background
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(252, 251, 249);
      }
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.roundedRect(margin, y, contentWidth, rowHeight, 1.5, 1.5, "FD");

      // Number and Medicine Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(`${idx + 1}. ${med.name || "Medicine"}`, margin + 4, y + 6);

      // Dosage
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(med.dosage || "As advised", margin + 70, y + 6);

      // Frequency
      doc.text(med.frequency || "Daily", margin + 105, y + 6);

      // Duration
      doc.text(med.duration || "Course", margin + 140, y + 6);

      // Special Instructions if any
      if (med.specialInstructions) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        doc.text(`Instructions: ${med.specialInstructions}`, margin + 8, y + 11);
      }

      y += rowHeight + 2;
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text("No specific prescription medications entered.", margin + 4, y + 6);
    y += 12;
  }

  y += 4;

  // 5. Special Notes / Advice (if any)
  if (prescription.specialInstructions) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    doc.text("Additional Veterinary Advice & Instructions:", margin, y);
    y += 5;

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    const splitNotes = doc.splitTextToSize(prescription.specialInstructions, contentWidth - 8);
    doc.text(splitNotes, margin + 4, y + 5.5);

    y += 18;
  }

  // 6. Sign-off / Signature area
  const sigY = Math.max(y + 8, pageHeight - 55);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(pageWidth - margin - 50, sigY + 12, pageWidth - margin, sigY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("Veterinarian Signature / Seal", pageWidth - margin - 25, sigY + 16, { align: "center" });

  // 7. Footer Disclaimer
  const footerY = pageHeight - 16;
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(
    "Prescription details are stored for caregiver reference. Administer medicines strictly as advised by your licensed veterinarian.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text(
    "National Toll-Free Animal Helpline: 1962 • VetCheck Digital Animal Care System",
    pageWidth / 2,
    footerY + 4,
    { align: "center" }
  );

  return doc;
}

/**
 * Downloads the prescription as a PDF file directly in browser.
 */
export function downloadPrescriptionPdf(prescription: VeterinaryPrescription): void {
  try {
    const doc = generatePrescriptionPdf(prescription);
    const safeAnimalName = (prescription.animalName || "Animal").replace(/[^a-zA-Z0-9]/g, "_");
    const safeDate = (prescription.date || "Date").replace(/[^a-zA-Z0-9]/g, "-");
    const filename = `VetCheck_Prescription_${safeAnimalName}_${safeDate}.pdf`;
    doc.save(filename);
  } catch (e) {
    console.error("Failed to download prescription PDF:", e);
  }
}

/**
 * Shares the prescription using Web Share API (PDF file or text fallback) or copies to clipboard.
 */
export async function sharePrescription(
  prescription: VeterinaryPrescription
): Promise<{ success: boolean; method: "file" | "text" | "clipboard" }> {
  const textContent = generatePrescriptionText(prescription);

  // Attempt Web Share with File if supported
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      const doc = generatePrescriptionPdf(prescription);
      const blob = doc.output("blob");
      const safeAnimalName = (prescription.animalName || "Animal").replace(/[^a-zA-Z0-9]/g, "_");
      const file = new File([blob], `VetCheck_Prescription_${safeAnimalName}.pdf`, {
        type: "application/pdf",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Veterinary Prescription - ${prescription.animalName || "Animal"}`,
          text: `Veterinary prescription for ${prescription.animalName || "animal"} by Dr. ${prescription.doctorName || "Vet"}.`,
          files: [file],
        });
        return { success: true, method: "file" };
      }

      // Fallback to text share
      await navigator.share({
        title: `Veterinary Prescription - ${prescription.animalName || "Animal"}`,
        text: textContent,
      });
      return { success: true, method: "text" };
    } catch (e: any) {
      if (e.name === "AbortError") {
        return { success: false, method: "text" };
      }
      console.warn("Web Share API failed, falling back to clipboard:", e);
    }
  }

  // Clipboard fallback
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(textContent);
      return { success: true, method: "clipboard" };
    }
  } catch (e) {
    console.error("Clipboard copy failed:", e);
  }

  return { success: false, method: "clipboard" };
}
