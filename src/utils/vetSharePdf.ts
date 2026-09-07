import { jsPDF } from "jspdf";
import {
  AnimalProfile,
  ScreeningRecord,
  CareReminder,
  VeterinaryPrescription,
  VetVisit,
} from "../types";

export interface VetShareOptions {
  profile: AnimalProfile;
  screenings?: ScreeningRecord[];
  reminders?: CareReminder[];
  prescriptions?: VeterinaryPrescription[];
  vetVisits?: VetVisit[];
  selectedModules: {
    vaccinations: boolean;
    deworming: boolean;
    screenings: boolean;
    prescriptions: boolean;
    recoveryProgress: boolean;
    vetVisits: boolean;
  };
  notesForVet?: string;
}

/**
 * Generates formatted text summary for sharing via WhatsApp, SMS, or Clipboard.
 */
export function generateVetShareText(options: VetShareOptions): string {
  const { profile, screenings = [], reminders = [], prescriptions = [], vetVisits = [], selectedModules, notesForVet } = options;

  let text = `🩺 VETCHECK CLINICAL HEALTH SUMMARY\n`;
  text += `═══════════════════════════════════════\n`;
  text += `Animal Name: ${profile.name}\n`;
  text += `Species: ${profile.species}\n`;
  if (profile.breed) text += `Breed: ${profile.breed}\n`;
  if (profile.age || profile.approxAge) text += `Age: ${profile.age || profile.approxAge}\n`;
  if (profile.sex) text += `Sex: ${profile.sex}\n`;
  text += `Animal ID: ${profile.animalId || "VC-PENDING"}\n`;
  if (profile.tagNumber) text += `Tag Number: ${profile.tagNumber}\n`;
  text += `Shared Date: ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}\n`;
  text += `═══════════════════════════════════════\n\n`;

  if (notesForVet && notesForVet.trim()) {
    text += `📝 NOTE FROM OWNER:\n"${notesForVet.trim()}"\n\n`;
  }

  // 1. Vaccinations
  if (selectedModules.vaccinations) {
    const vaccines = reminders.filter((r) => r.reminderType === "vaccination" || r.type === "vaccination");
    text += `💉 VACCINATION HISTORY (${vaccines.length}):\n`;
    if (vaccines.length === 0) {
      text += `• No vaccination records logged.\n`;
    } else {
      vaccines.forEach((v) => {
        text += `• ${v.title} | Status: ${v.completed ? "Administered" : "Due: " + v.dueDate}`;
        if (v.administeredDate) text += ` [Given: ${v.administeredDate}]`;
        if (v.veterinarian) text += ` [Vet: Dr. ${v.veterinarian}]`;
        text += `\n`;
      });
    }
    text += `\n`;
  }

  // 2. Deworming
  if (selectedModules.deworming) {
    const dewormings = reminders.filter((r) => r.reminderType === "deworming" || r.type === "deworming");
    text += `💊 DEWORMING HISTORY (${dewormings.length}):\n`;
    if (dewormings.length === 0) {
      text += `• No deworming records logged.\n`;
    } else {
      dewormings.forEach((d) => {
        text += `• ${d.title} | Status: ${d.completed ? "Administered" : "Due: " + d.dueDate}`;
        if (d.administeredDate) text += ` [Given: ${d.administeredDate}]`;
        text += `\n`;
      });
    }
    text += `\n`;
  }

  // 3. Vet Visits
  if (selectedModules.vetVisits) {
    text += `🏥 VETERINARY VISIT HISTORY (${vetVisits.length}):\n`;
    if (vetVisits.length === 0) {
      text += `• No prior clinical visits logged.\n`;
    } else {
      vetVisits.forEach((vv) => {
        text += `• ${vv.date}: ${vv.reason}`;
        if (vv.veterinarian) text += ` (Dr. ${vv.veterinarian})`;
        if (vv.hospitalClinic) text += ` @ ${vv.hospitalClinic}`;
        if (vv.notes) text += ` — Notes: ${vv.notes}`;
        text += `\n`;
      });
    }
    text += `\n`;
  }

  // 4. Prescriptions
  if (selectedModules.prescriptions) {
    text += `📋 PRESCRIPTIONS & MEDICINES (${prescriptions.length}):\n`;
    if (prescriptions.length === 0) {
      text += `• No active or past prescriptions on file.\n`;
    } else {
      prescriptions.forEach((rx) => {
        text += `• ${rx.date}: ${rx.diagnosisCondition} (Dr. ${rx.doctorName || "Vet"} @ ${rx.hospitalClinic || "Dispensary"})\n`;
        if (rx.medicines && rx.medicines.length > 0) {
          rx.medicines.forEach((m) => {
            text += `   - ${m.name} (${m.dosage}, ${m.frequency} for ${m.duration})\n`;
          });
        }
      });
    }
    text += `\n`;
  }

  // 5. Recent Health Screenings & Recovery
  if (selectedModules.screenings || selectedModules.recoveryProgress) {
    text += `📷 HEALTH SCREENINGS & RECOVERY LOGS (${screenings.length}):\n`;
    if (screenings.length === 0) {
      text += `• No recent AI health screenings.\n`;
    } else {
      screenings.slice(0, 5).forEach((sc) => {
        const dateStr = new Date(sc.timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" });
        const severity = sc.result?.severity || "N/A";
        const bodyArea = sc.bodyArea || sc.result?.affectedBodyArea || "General";
        text += `• [${dateStr}] Severity: ${severity} | Area: ${bodyArea} | Status: ${sc.status || "Logged"}\n`;
        if (sc.result?.possibleConditions && sc.result.possibleConditions.length > 0) {
          text += `   Likely Condition: ${sc.result.possibleConditions[0].name}\n`;
        }
        if (selectedModules.recoveryProgress && sc.followUps && sc.followUps.length > 0) {
          text += `   Follow-Up (${sc.followUps.length} entries): Status Condition: ${sc.followUps[0].statusCondition || "Monitoring"}\n`;
          if (sc.followUps[0].newObservedSigns) {
            text += `   Observation: "${sc.followUps[0].newObservedSigns}"\n`;
          }
        }
      });
    }
    text += `\n`;
  }

  text += `═══════════════════════════════════════\n`;
  text += `Generated with explicit consent by animal owner for veterinary consultation.\n`;
  text += `📞 Emergency 24/7 Helpline: 1962 | VetCheck`;

  return text;
}

/**
 * Generates an official, printable Clinical Health Summary PDF for Veterinarians.
 */
export function generateVetSharePdf(options: VetShareOptions): jsPDF {
  const { profile, screenings = [], reminders = [], prescriptions = [], vetVisits = [], selectedModules, notesForVet } = options;

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
  const goldAccent = [217, 119, 6]; // #d97706
  const borderGrey = [232, 226, 213]; // #E8E2D5

  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 12) {
      doc.addPage();
      y = margin;
    }
  };

  // Header Banner
  doc.setFillColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("VETCHECK CLINICAL SUMMARY", margin + 6, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Verified Owner Health Records for Veterinary Consultation", margin + 6, y + 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(245, 208, 100);
  doc.text("ANIMAL ID: " + (profile.animalId || "VC-PENDING"), pageWidth - margin - 6, y + 9, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}`, pageWidth - margin - 6, y + 15, { align: "right" });

  y += 28;

  // Animal Profile Grid
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.roundedRect(margin, y, contentWidth, 26, 2.5, 2.5, "FD");

  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(profile.name, margin + 5, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
  doc.text(`Species: ${profile.species}${profile.breed ? ` (${profile.breed})` : ""}`, margin + 5, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Sex: ${profile.sex || "N/A"}   |   Age: ${profile.age || profile.approxAge || "N/A"}   |   Tag: ${profile.tagNumber || "N/A"}`, margin + 5, y + 19);
  if (profile.color) {
    doc.text(`Color/Markings: ${profile.color}`, margin + 5, y + 23);
  }

  y += 32;

  // Owner Notes if present
  if (notesForVet && notesForVet.trim()) {
    checkPageBreak(22);
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

    doc.setTextColor(180, 83, 9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("OWNER NOTE FOR VETERINARIAN:", margin + 5, y + 6);

    doc.setTextColor( darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitNotes = doc.splitTextToSize(`"${notesForVet.trim()}"`, contentWidth - 10);
    doc.text(splitNotes, margin + 5, y + 12);
    y += 24;
  }

  // 1. Vaccinations
  if (selectedModules.vaccinations) {
    const vaccines = reminders.filter((r) => r.reminderType === "vaccination" || r.type === "vaccination");
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    doc.text(`💉 VACCINATION RECORDS (${vaccines.length})`, margin, y);
    y += 5;

    if (vaccines.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text("No vaccination records logged.", margin + 4, y);
      y += 6;
    } else {
      vaccines.forEach((v) => {
        checkPageBreak(12);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
        doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.text(v.title, margin + 4, y + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        const statusStr = v.completed ? `Administered: ${v.administeredDate || v.dueDate}` : `Due: ${v.dueDate}`;
        doc.text(statusStr + (v.veterinarian ? ` • Vet: Dr. ${v.veterinarian}` : ""), pageWidth - margin - 4, y + 6, { align: "right" });
        y += 12;
      });
    }
    y += 4;
  }

  // 2. Deworming
  if (selectedModules.deworming) {
    const dewormings = reminders.filter((r) => r.reminderType === "deworming" || r.type === "deworming");
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    doc.text(`💊 DEWORMING RECORDS (${dewormings.length})`, margin, y);
    y += 5;

    if (dewormings.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text("No deworming records logged.", margin + 4, y);
      y += 6;
    } else {
      dewormings.forEach((d) => {
        checkPageBreak(12);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
        doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.text(d.title, margin + 4, y + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        const statusStr = d.completed ? `Administered: ${d.administeredDate || d.dueDate}` : `Due: ${d.dueDate}`;
        doc.text(statusStr, pageWidth - margin - 4, y + 6, { align: "right" });
        y += 12;
      });
    }
    y += 4;
  }

  // 3. Veterinary Visits
  if (selectedModules.vetVisits) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    doc.text(`🏥 CLINICAL VET VISITS (${vetVisits.length})`, margin, y);
    y += 5;

    if (vetVisits.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text("No prior clinical visits logged.", margin + 4, y);
      y += 6;
    } else {
      vetVisits.forEach((vv) => {
        checkPageBreak(16);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
        doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.text(`Date: ${vv.date} — ${vv.reason}`, margin + 4, y + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        const loc = `Vet: Dr. ${vv.veterinarian || "Registered Vet"} @ ${vv.hospitalClinic || "Dispensary"}`;
        doc.text(loc, margin + 4, y + 10);
        y += 16;
      });
    }
    y += 4;
  }

  // 4. Prescriptions
  if (selectedModules.prescriptions) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    doc.text(`📋 PRESCRIPTIONS & ACTIVE MEDICINES (${prescriptions.length})`, margin, y);
    y += 5;

    if (prescriptions.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text("No prescriptions recorded.", margin + 4, y);
      y += 6;
    } else {
      prescriptions.forEach((rx) => {
        checkPageBreak(22);
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
        doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.text(`${rx.date}: ${rx.diagnosisCondition} (Dr. ${rx.doctorName || "Vet"})`, margin + 4, y + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
        const medsSummary = (rx.medicines || []).map((m) => `${m.name} (${m.dosage}, ${m.frequency})`).join("; ");
        doc.text(`Medicines: ${medsSummary || "None specified"}`, margin + 4, y + 11);
        y += 20;
      });
    }
    y += 4;
  }

  // 5. Recent Screenings & Recovery Progress
  if (selectedModules.screenings || selectedModules.recoveryProgress) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(forestGreen[0], forestGreen[1], forestGreen[2]);
    doc.text(`📷 RECENT SCREENING & RECOVERY TRACKER (${screenings.length})`, margin, y);
    y += 5;

    if (screenings.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text("No recent screening records.", margin + 4, y);
      y += 6;
    } else {
      screenings.slice(0, 4).forEach((sc) => {
        checkPageBreak(18);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
        doc.roundedRect(margin, y, contentWidth, 15, 1.5, 1.5, "FD");

        const dateStr = new Date(sc.timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.text(`[${dateStr}] Severity: ${sc.result?.severity || "Logged"} • Area: ${sc.bodyArea || sc.result?.affectedBodyArea || "General"}`, margin + 4, y + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        const cond = sc.result?.possibleConditions?.[0]?.name || "Routine observation";
        doc.text(`Condition Sign: ${cond}   |   Status: ${sc.status || "Logged"}`, margin + 4, y + 10);
        y += 17;
      });
    }
  }

  // Footer Disclaimer
  checkPageBreak(18);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(margin, y + 4, pageWidth - margin, y + 4);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("This document was prepared with explicit animal owner authorization via VetCheck Health Card.", margin, y + 9);
  doc.text("For immediate veterinary emergency, call Toll-Free Helpline: 1962", margin, y + 13);

  return doc;
}

/**
 * Triggers download of the Vet Share PDF
 */
export function downloadVetSharePdf(options: VetShareOptions): void {
  try {
    const doc = generateVetSharePdf(options);
    const filename = `VetCheck_ClinicalSummary_${options.profile.name.replace(/[^A-Za-z0-9]/g, "_")}_${options.profile.animalId || "ID"}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error("Failed to download vet share summary:", error);
    alert("Could not generate PDF download. Please try again.");
  }
}
