import React, { useState } from "react";
import {
  Award,
  Users,
  GraduationCap,
  FileCode,
  Github,
  Mail,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { VetCheckLogo } from "./ui/VetCheckLogo";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

interface AboutProjectScreenProps {
  onNavigateTab: (tab: any) => void;
  onOpenChecklist?: () => void;
}

export const AboutProjectScreen: React.FC<AboutProjectScreenProps> = ({
  onNavigateTab,
  onOpenChecklist,
}) => {
  // Configurable / Editable project details with clear placeholders for developer
  const [projectInfo] = useState({
    teamName: "Team VetCheck Innovations",
    teamMembers: [
      { name: "Team Lead & Full-Stack Architect", role: "Frontend, AI Proxy & System Design" },
      { name: "AI / ML Vision Engineer", role: "Multimodal Gemini Triage & Schema Enforcement" },
      { name: "Veterinary Domain Researcher", role: "Clinical Rule Safety, 1962 Protocols & Dosages Firewall" },
      { name: "UI/UX & Accessibility Specialist", role: "Vernacular Multilingual & WCAG AA Design" },
    ],
    collegeName: "Smart India Hackathon Participating Institution",
    problemStatementId: "SIH-HealthTech-2024 / Rural Veterinary Triage",
    theme: "HealthTech & MedTech / Rural Animal Welfare & Dairy Productivity",
    contactEmail: "katarurevanth5726@gmail.com",
    githubRepo: "https://github.com/your-team-vetcheck/vetcheck-sih",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold text-teal-100 backdrop-blur-xs">
            <Award className="w-3.5 h-3.5 text-emerald-300" />
            <span>Smart India Hackathon • Project Information</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <VetCheckLogo size="lg" textColor="text-white" showText={true} />
          </div>

          <p className="text-sm sm:text-base text-teal-100 font-medium max-w-2xl leading-relaxed">
            “See the signs. Support them sooner.” — An AI-powered visual triage and life-saving first-aid system for India’s 535M+ livestock, working animals, and household pets.
          </p>

          <div className="pt-2 flex flex-wrap gap-2">
            {onOpenChecklist && (
              <button
                onClick={onOpenChecklist}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Submission Readiness Checklist</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submission Details Card */}
      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-teal-700" />
            <h2 className="text-base font-black text-slate-900">
              SIH Project Submission Dossier
            </h2>
          </div>
          <span className="text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full">
            Ready for Evaluation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Problem Statement ID
            </div>
            <div className="font-extrabold text-slate-900 text-sm">
              {projectInfo.problemStatementId}
            </div>
            <p className="text-[11px] text-slate-500">
              Veterinary Tele-triage & AI Early Warning for Livestock and Domestic Pets
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Theme / Category
            </div>
            <div className="font-extrabold text-slate-900 text-sm">
              {projectInfo.theme}
            </div>
            <p className="text-[11px] text-slate-500">
              HealthTech / Agriculture & Animal Husbandry
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              College / Institution
            </div>
            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-teal-700 shrink-0" />
              <span>{projectInfo.collegeName}</span>
            </div>
            <span className="inline-block text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              [Editable placeholder for final team details]
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Project Contact & Email
            </div>
            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-teal-700 shrink-0" />
              <a href={`mailto:${projectInfo.contactEmail}`} className="text-teal-700 hover:underline">
                {projectInfo.contactEmail}
              </a>
            </div>
            <p className="text-[11px] text-slate-500">Primary point of contact for SIH evaluators</p>
          </div>
        </div>

        {/* GitHub Repository */}
        <div className="mt-4 p-4 rounded-2xl bg-teal-50/70 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-teal-950">Source Code & Documentation Repository</div>
              <div className="text-[11px] text-teal-800 font-mono break-all">{projectInfo.githubRepo}</div>
            </div>
          </div>
          <a
            href={projectInfo.githubRepo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            <span>Open Repository</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </Card>

      {/* Team Members */}
      <Card variant="default" padding="lg">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
          <Users className="w-5 h-5 text-teal-700" />
          <h2 className="text-base font-black text-slate-900">
            Team Members & Key Roles
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projectInfo.teamMembers.map((member, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-700 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                {idx + 1}
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">{member.name}</div>
                <div className="text-[11px] text-slate-600 font-medium">{member.role}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Key Architectural Highlights */}
      <Card variant="default" padding="lg">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-black text-slate-900">
            Technological & Social Innovations
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-1.5">
            <Shield className="w-5 h-5 text-teal-700" />
            <div className="font-bold text-slate-900">Safe Care Firewall</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Blocks dangerous folklore remedies (kerosene on wounds, paracetamol on cats) and prioritizes non-invasive comfort care.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
            <Layers className="w-5 h-5 text-emerald-700" />
            <div className="font-bold text-slate-900">10+ Regional Languages</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Native voice input and Text-to-Speech narration in Hindi, Telugu, Tamil, Marathi, Bengali, Odia, Gujarati, Punjabi, Urdu, and Kannada.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1.5">
            <Award className="w-5 h-5 text-amber-700" />
            <div className="font-bold text-slate-900">1962 SOS Triage</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Instant one-tap routing to the Government of India Mobile Veterinary Unit (MVU) 1962 emergency helpline.
            </p>
          </div>
        </div>

        {/* Release Version Label & Evaluation Notice */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center space-y-1.5">
          <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-black text-slate-700">
            VetCheck SIH Prototype — Version 1.0
          </div>
          <p className="text-[11px] text-slate-500 max-w-xl mx-auto leading-relaxed">
            This prototype is designed for technological evaluation and preliminary triage assistance. It is not a certified medical device, is not clinically validated, and does not replace examination by a registered veterinary doctor.
          </p>
        </div>
      </Card>
    </div>
  );
};
