import { jsPDF } from "jspdf";
import {
  AnimalProfile,
  ScreeningRecord,
  CareReminder,
  VeterinaryPrescription,
  VetVisit,
} from "../types";

export interface AnimalHealthHistoryData {
  profile: AnimalProfile;
  screenings: ScreeningRecord[];
  reminders: CareReminder[];
  prescriptions: VeterinaryPrescription[];
  vetVisits: VetVisit[];
}

/**
 * Generates structured text summary for sharing or clipboard
 */
export function generateHealthHistoryText(data: AnimalHealthHistoryData): string {
  const { profile, screenings, reminders, prescriptions, vetVisits } = data;
  let text = `🐾 VETCHECK HEALTH PASSPORT & HISTORY\n`;
  text += `═══════════════════════════════════════\n`;
  text += `Animal Name: ${profile.name}\n`;
  text += `Species: ${profile.species}\n`;
  if (profile.breed) text += `Breed: ${profile.breed}\n`;
  if (profile.approxAge || profile.age) text += `Age: ${profile.approxAge || profile.age}\n`;
  if (profile.sex) text += `Sex: ${profile.sex}\n`;
  if (profile.tagNumber) text += `Ear Tag / ID: ${profile.tagNumber}\n`;
  text += `Generated: ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}\n`;
  text += `═══════════════════════════════════════\n\n`;

  // Upcoming Care
  const pendingReminders = reminders.filter((r) => !r.completed);
  if (pendingReminders.length > 0) {
    text += `🔔 UPCOMING CARE:\n`;
    pendingReminders.forEach((r) => {
      text += `• ${r.title} — Due: ${r.dueDate}\n`;
    });
    text += `\n`;
  }

  // Vaccinations
  const vaccines = reminders.filter((r) => r.reminderType === "vaccination");
  if (vaccines.length > 0) {
    text += `💉 VACCINATION RECORDS:\n`;
    vaccines.forEach((v) => {
      text += `• ${v.title} | Status: ${v.completed ? "Completed" : "Scheduled (Due: " + v.dueDate + ")"}`;
      if (v.administeredDate) text += ` (Given: ${v.administeredDate})`;
      if (v.veterinarian) text += ` [Vet: ${v.veterinarian}]`;
      text += `\n`;
    });
    text += `\n`;
  }

  // Deworming
  const dewormings = reminders.filter((r) => r.reminderType === "deworming");
  if (dewormings.length > 0) {
    text += `💊 DEWORMING RECORDS:\n`;
    dewormings.forEach((d) => {
      text += `• ${d.title} | Status: ${d.completed ? "Completed" : "Due: " + d.dueDate}`;
      if (d.administeredDate) text += ` (Given: ${d.administeredDate})`;
      text += `\n`;
    });
    text += `\n`;
  }

  // Vet Visits
  if (vetVisits.length > 0) {
    text += `🏥 VETERINARY VISITS:\n`;
    vetVisits.forEach((vv) => {
      text += `• ${vv.date}: ${vv.reason}`;
      if (vv.veterinarian) text += ` (Dr. ${vv.veterinarian})`;
      if (vv.hospitalClinic) text += ` @ ${vv.hospitalClinic}`;
      if (vv.notes) text += ` — Notes: ${vv.notes}`;
      text += `\n`;
    });
    text += `\n`;
  }

  // Prescriptions
  if (prescriptions.length > 0) {
    text += `🩺 VETERINARY PRESCRIPTIONS:\n`;
    prescriptions.forEach((rx) => {
      text += `• ${rx.date}: ${rx.diagnosisCondition} (Dr. ${rx.doctorName})`;
      if (rx.medicines && rx.medicines.length > 0) {
        const meds = rx.medicines.map((m) => m.name).join(", ");
        text += ` — Rx: ${meds}`;
      }
      text += `\n`;
    });
    text += `\n`;
  }

  // Health Scans
  if (screenings.length > 0) {
    text += `📷 RECENT HEALTH SCANS:\n`;
    screenings.slice(0, 5).forEach((sc) => {
      const dateStr = new Date(sc.timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" });
      text += `• ${dateStr}: Severity ${sc.result.severity} — Area: ${sc.bodyArea || sc.result.affectedBodyArea || "General"}\n`;
      if (sc.result.simpleExplanation) text += `   ${sc.result.simpleExplanation}\n`;
    });
    text += `\n`;
  }

  text += `═══════════════════════════════════════\n`;
  text += `📞 Emergency Helpline: 1962 (24x7 Pashu Sanjeevani) | VetCheck`;
  return text;
}

/**
 * Generates a clean, concise, professional multi-page PDF document for Animal Health Passport & Care History.
 */
export function generateHealthHistoryPdf(data: AnimalHealthHistoryData): jsPDF {
  const { profile, screenings, reminders, prescriptions, vetVisits } = data;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const forestGreen = [21, 71, 52]; // #154734
  const darkSlate = [30, 41, 59]; // #1e293b
  const mutedText = [100, 116, 139]; // #64748b
  const lightBg = [250, 248, 245]; // #FAF8F5
  const goldAccent = [180, 83, 9]; // amber-700
  const borderGrey = [226, 232, 240];

  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 15) {
      doc.addPage();
      y = margin;
      // mini header on subsequent pages
      doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
      doc.rect(margin, y, contentWidth, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`VETCHECK HEALTH PASSPORT — ${profile.name.toUpperCase()} (${profile.species})`, margin + 4, y + 5.5);
      y += 14;
    }
  };

  // 1. Header Banner
  doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("VETCHECK", margin + 6, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Animal Health Passport & Medical Timeline", margin + 6, y + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HEALTH HISTORY RECORD", pageWidth - margin - 6, y + 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("24x7 Helpline: 1962", pageWidth - margin - 6, y + 16, { align: "right" });

  y += 28;

  // 2. Animal Details Card
  const profileCardHeight = 32;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.roundedRect(margin, y, contentWidth, profileCardHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.text(`${profile.name}`, margin + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

  const col1X = margin + 6;
  const col2X = margin + 65;
  const col3X = margin + 125;

  doc.text(`Species: ${profile.species}`, col1X, y + 16);
  doc.text(`Breed: ${profile.breed || "Not specified"}`, col1X, y + 22);
  doc.text(`Age: ${profile.approxAge || profile.age || "Unknown"}`, col1X, y + 28);

  doc.text(`Sex: ${profile.sex || "Unknown"}`, col2X, y + 16);
  doc.text(`Ear Tag / ID: ${profile.tagNumber || "None"}`, col2X, y + 22);
  doc.text(`Color: ${profile.color || "Not recorded"}`, col2X, y + 28);

  const genDateStr = new Date().toLocaleDateString("en-IN", { dateStyle: "medium" });
  doc.text(`Record Date: ${genDateStr}`, col3X, y + 16);
  const activeCount = reminders.filter((r) => !r.completed).length;
  doc.text(`Care Status: ${activeCount > 0 ? activeCount + " Due items" : "Up to date"}`, col3X, y + 22);

  y += profileCardHeight + 6;

  // Helper section header drawer
  const drawSectionHeader = (title: string, count?: number) => {
    checkPageBreak(12);
    doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    doc.rect(margin, y, 3, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    const label = count !== undefined ? `${title} (${count})` : title;
    doc.text(label, margin + 6, y + 5);
    y += 9;
  };

  // 3. UPCOMING CARE
  const pendingReminders = reminders.filter((r) => !r.completed);
  if (pendingReminders.length > 0) {
    drawSectionHeader("Upcoming Care & Immunization Due", pendingReminders.length);
    pendingReminders.forEach((r) => {
      checkPageBreak(11);
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.text(`DUE: ${r.dueDate}`, margin + 4, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(`${r.title} (${r.reminderType.toUpperCase()})`, margin + 36, y + 6);

      if (r.veterinarian) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        doc.text(`Vet: ${r.veterinarian}`, pageWidth - margin - 4, y + 6, { align: "right" });
      }
      y += 11;
    });
    y += 3;
  }

  // 4. VACCINATIONS
  const vaccines = reminders.filter((r) => r.reminderType === "vaccination");
  drawSectionHeader("Vaccination & Immunization History", vaccines.length);
  if (vaccines.length === 0) {
    checkPageBreak(8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text("No vaccination records logged yet.", margin + 6, y + 4);
    y += 8;
  } else {
    vaccines.forEach((v) => {
      checkPageBreak(12);
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(v.title, margin + 4, y + 6.5);

      const statusText = v.completed ? "COMPLETED" : `DUE: ${v.dueDate}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      if (v.completed) {
        doc.setTextColor(16, 120, 60);
      } else {
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      }
      doc.text(statusText, margin + 110, y + 6.5);

      if (v.administeredDate) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        doc.text(`Given: ${v.administeredDate}`, pageWidth - margin - 4, y + 6.5, { align: "right" });
      }
      y += 12;
    });
    y += 2;
  }

  // 5. DEWORMING
  const dewormings = reminders.filter((r) => r.reminderType === "deworming");
  drawSectionHeader("Deworming & Parasite Control", dewormings.length);
  if (dewormings.length === 0) {
    checkPageBreak(8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text("No deworming records logged yet.", margin + 6, y + 4);
    y += 8;
  } else {
    dewormings.forEach((d) => {
      checkPageBreak(12);
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(d.title, margin + 4, y + 6.5);

      const stText = d.completed ? "COMPLETED" : `DUE: ${d.dueDate}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      if (d.completed) {
        doc.setTextColor(16, 120, 60);
      } else {
        doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      }
      doc.text(stText, margin + 110, y + 6.5);

      if (d.administeredDate) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        doc.text(`Given: ${d.administeredDate}`, pageWidth - margin - 4, y + 6.5, { align: "right" });
      }
      y += 12;
    });
    y += 2;
  }

  // 6. VETERINARY VISITS
  drawSectionHeader("Veterinary Clinic Visits", vetVisits.length);
  if (vetVisits.length === 0) {
    checkPageBreak(8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text("No clinic visits recorded yet.", margin + 6, y + 4);
    y += 8;
  } else {
    vetVisits.forEach((vv) => {
      checkPageBreak(16);
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(`${vv.date} — ${vv.reason}`, margin + 4, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      const vetHospital = [vv.veterinarian ? `Dr. ${vv.veterinarian}` : "", vv.hospitalClinic].filter(Boolean).join(" • ");
      doc.text(vetHospital || "Veterinary Visit", margin + 4, y + 11);

      if (vv.notes) {
        doc.setFont("helvetica", "italic");
        doc.text(vv.notes.length > 50 ? vv.notes.substring(0, 48) + "..." : vv.notes, pageWidth - margin - 4, y + 11, { align: "right" });
      }
      y += 16;
    });
    y += 2;
  }

  // 7. VETERINARY PRESCRIPTIONS
  drawSectionHeader("Prescriptions & Medical Treatments", prescriptions.length);
  if (prescriptions.length === 0) {
    checkPageBreak(8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text("No veterinary prescriptions recorded yet.", margin + 6, y + 4);
    y += 8;
  } else {
    prescriptions.forEach((rx) => {
      const medCount = rx.medicines?.length || 0;
      const cardH = medCount > 0 ? 18 : 12;
      checkPageBreak(cardH + 2);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.roundedRect(margin, y, contentWidth, cardH, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(`${rx.date} — ${rx.diagnosisCondition}`, margin + 4, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(`Dr. ${rx.doctorName} (${rx.hospitalClinic})`, margin + 4, y + 10.5);

      if (medCount > 0) {
        const medNames = rx.medicines.map((m) => `${m.name} (${m.dosage})`).join(" | ");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
        const truncated = medNames.length > 80 ? medNames.substring(0, 78) + "..." : medNames;
        doc.text(`Rx: ${truncated}`, margin + 4, y + 15);
      }
      y += cardH + 3;
    });
    y += 2;
  }

  // 8. RECENT HEALTH SCANS & RECOVERY
  drawSectionHeader("Health Scans & AI Triage Assessments", screenings.length);
  if (screenings.length === 0) {
    checkPageBreak(8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text("No visual screening scans recorded for this animal yet.", margin + 6, y + 4);
    y += 8;
  } else {
    screenings.slice(0, 6).forEach((sc) => {
      checkPageBreak(16);
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, "FD");

      const scDate = new Date(sc.timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text(`${scDate} — ${sc.bodyArea || sc.result.affectedBodyArea || "Observation"}`, margin + 4, y + 6);

      // Severity badge text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      if (sc.result.severity === "Emergency") {
        doc.setTextColor(225, 29, 72);
      } else if (sc.result.severity === "Serious") {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(16, 120, 60);
      }
      doc.text(`Severity: ${sc.result.severity}`, pageWidth - margin - 4, y + 6, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      const summaryText = sc.result.simpleExplanation || "Screening completed.";
      const shortSum = summaryText.length > 90 ? summaryText.substring(0, 88) + "..." : summaryText;
      doc.text(shortSum, margin + 4, y + 11);

      y += 16;
    });
  }

  // Footer on current page
  checkPageBreak(16);
  y = Math.max(y + 4, pageHeight - margin - 12);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(
    "VetCheck Passport is generated for animal health tracking. Consult a qualified veterinarian for medical decisions.",
    margin,
    y
  );
  doc.text("Helpline: 1962 (24x7 Pashu Sanjeevani)", pageWidth - margin, y, { align: "right" });

  return doc;
}

/**
 * Downloads the Animal Health History PDF directly
 */
export function downloadHealthHistoryPdf(data: AnimalHealthHistoryData): void {
  try {
    const doc = generateHealthHistoryPdf(data);
    const cleanName = (data.profile.name || "Animal").replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`VetCheck_Health_History_${cleanName}.pdf`);
  } catch (e) {
    console.error("Failed to generate and download health history PDF:", e);
    alert("Could not generate PDF. Please try again.");
  }
}

/**
 * Shares the Health History via Web Share API or downloads with text fallback
 */
export async function shareHealthHistory(data: AnimalHealthHistoryData): Promise<{ success: boolean; method: "share" | "download" | "clipboard" }> {
  const textSummary = generateHealthHistoryText(data);
  const cleanName = (data.profile.name || "Animal").replace(/[^a-zA-Z0-9_-]/g, "_");

  // Attempt Web Share with PDF File if navigator.canShare supports files
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      const doc = generateHealthHistoryPdf(data);
      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], `VetCheck_${cleanName}_Health_History.pdf`, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `VetCheck Health History - ${data.profile.name}`,
          text: `Here is the comprehensive VetCheck health history for ${data.profile.name} (${data.profile.species}).`,
          files: [pdfFile],
        });
        return { success: true, method: "share" };
      } else {
        await navigator.share({
          title: `VetCheck Health History - ${data.profile.name}`,
          text: textSummary,
        });
        return { success: true, method: "share" };
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { success: false, method: "share" };
      }
      console.warn("Navigator share failed, falling back to download:", err);
    }
  }

  // Fallback: Download PDF and copy summary to clipboard
  try {
    downloadHealthHistoryPdf(data);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textSummary);
    }
    return { success: true, method: "download" };
  } catch (e) {
    console.error("Share fallback error:", e);
    return { success: false, method: "download" };
  }
}
