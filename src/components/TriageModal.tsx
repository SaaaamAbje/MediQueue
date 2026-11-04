import React, { useState } from 'react';
import {
  ClipboardList,
  Smile,
  Meh,
  Frown,
  AlertOctagon,
  X,
  CheckCircle2,
  Heart,
  Pill,
  Zap,
} from 'lucide-react';
import { PreConsultationTriage } from '../types/index';
import { api } from '../services/api';

interface TriageModalProps {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  existingTriage?: PreConsultationTriage | null;
  onClose: () => void;
  onSaved: (triage: PreConsultationTriage) => void;
}

export const TriageModal: React.FC<TriageModalProps> = ({
  patientId,
  patientName,
  appointmentId,
  existingTriage,
  onClose,
  onSaved,
}) => {
  const [chiefComplaint, setChiefComplaint] = useState(existingTriage?.chief_complaint || '');
  const [duration, setDuration] = useState(existingTriage?.symptoms_duration || '3 days');
  const [painScale, setPainScale] = useState<number>(existingTriage?.pain_scale ?? 2);
  const [currentMeds, setCurrentMeds] = useState(existingTriage?.current_medications || '');
  const [allergies, setAllergies] = useState(existingTriage?.known_allergies || '');
  const [medicalHistory, setMedicalHistory] = useState(existingTriage?.medical_history_notes || '');
  const [saving, setSaving] = useState(false);

  const getPainDescription = (val: number) => {
    if (val === 0) return { label: '0 - No Pain', color: 'text-emerald-600', icon: Smile };
    if (val <= 3) return { label: `${val} - Mild Discomfort`, color: 'text-teal-600', icon: Smile };
    if (val <= 6) return { label: `${val} - Moderate Pain`, color: 'text-amber-600', icon: Meh };
    if (val <= 8) return { label: `${val} - Severe Pain`, color: 'text-orange-600', icon: Frown };
    return { label: `${val} - Extreme / Agonizing`, color: 'text-rose-600', icon: AlertOctagon };
  };

  const [isAssessing, setIsAssessing] = useState(false);
  const [aiUrgency, setAiUrgency] = useState<{ priority: string; urgency_score: number; reasoning: string; red_flags?: string[] } | null>(null);

  const handleAiAssessment = async () => {
    if (!chiefComplaint.trim()) {
      alert('Please describe your symptoms first.');
      return;
    }

    setIsAssessing(true);
    try {
      const response = await fetch('/api/ai/smart-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chief_complaint: chiefComplaint,
          pain_scale: painScale,
          symptoms_duration: duration,
          medical_history: medicalHistory
        }),
      });
      
      if (!response.ok) throw new Error('AI triage failed');
      const data = await response.json();
      setAiUrgency(data);
    } catch (err) {
      console.error('AI Triage Error:', err);
    } finally {
      setIsAssessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      alert('Please describe your main symptom or reason for visit.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.saveTriage({
        appointment_id: appointmentId,
        patient_id: patientId,
        chief_complaint: chiefComplaint,
        symptoms_duration: duration,
        pain_scale: painScale,
        current_medications: currentMeds || 'None',
        known_allergies: allergies || 'None known',
        medical_history_notes: medicalHistory || 'None reported',
      });

      onSaved(res.triage);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit triage intake.');
    } finally {
      setSaving(false);
    }
  };

  const painInfo = getPainDescription(painScale);
  const PainIcon = painInfo.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 bg-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800/80 flex items-center justify-center text-teal-300">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Pre-Consultation Clinical Intake</h2>
              <p className="text-xs text-teal-200">
                Patient: <strong className="text-white">{patientName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-teal-300 hover:text-white hover:bg-teal-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 bg-teal-50/70 p-3 rounded-xl border border-teal-100 text-teal-900 leading-relaxed">
            Filling out this intake helps your physician prepare specific diagnoses and speeds up your consultation time.
          </p>

          {/* Chief Complaint */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">
                Primary Symptoms / Chief Complaint *
              </label>
              <button
                type="button"
                onClick={handleAiAssessment}
                disabled={isAssessing || !chiefComplaint.trim()}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
              >
                {isAssessing ? <Heart className="w-3 h-3 animate-pulse" /> : <Zap className="w-3 h-3" />}
                {isAssessing ? 'Assessing...' : 'AI Urgency Check'}
              </button>
            </div>
            <textarea
              required
              rows={2}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Sharp morning chest tightness, persistent dry cough for 4 days, mild fatigue..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* AI Assessment Display */}
          {aiUrgency && (
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Gemini Clinical Insight</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  aiUrgency.priority === 'stat' ? 'bg-rose-600 text-white' : 
                  aiUrgency.priority === 'high' ? 'bg-amber-500 text-white' : 
                  'bg-emerald-600 text-white'
                }`}>
                  {aiUrgency.priority} Priority
                </span>
              </div>
              
              <div className="space-y-1">
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  <span className="text-blue-400 font-bold">Analysis:</span> {aiUrgency.reasoning}
                </p>
                {aiUrgency.red_flags && aiUrgency.red_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {aiUrgency.red_flags.map((flag, idx) => (
                      <span key={idx} className="bg-rose-500/10 text-rose-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-500/20">
                        RED FLAG: {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Symptoms Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              How long have you been experiencing these symptoms?
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 3 days, 2 weeks, started yesterday afternoon"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Pain Scale (0-10) with slider */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Pain Level (Wong-Baker Scale)
              </label>
              <div className={`flex items-center gap-1.5 font-bold text-xs ${painInfo.color}`}>
                <PainIcon className="w-4 h-4" />
                <span>{painInfo.label}</span>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={painScale}
              onChange={(e) => setPainScale(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>0 (None)</span>
              <span>2</span>
              <span>4</span>
              <span>6</span>
              <span>8</span>
              <span>10 (Worst)</span>
            </div>
          </div>

          {/* Current Medications */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Maintenance Medications or Supplements
            </label>
            <input
              type="text"
              value={currentMeds}
              onChange={(e) => setCurrentMeds(e.target.value)}
              placeholder="e.g. Losartan 50mg (morning), Metformin 500mg, Multivitamins"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Known Drug Allergies */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Known Drug / Food Allergies
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin (causes hives), Aspirin, Seafood, None"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Submitting...' : 'Save & Submit Intake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
