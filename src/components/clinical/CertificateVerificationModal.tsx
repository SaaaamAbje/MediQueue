import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Award,
  Calendar,
  Building2,
  UserCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { MedicalCertificate } from '../../types/index';

interface CertificateVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const CertificateVerificationModal: React.FC<CertificateVerificationModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
}) => {
  const [code, setCode] = useState(initialCode);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedCert, setVerifiedCert] = useState<MedicalCertificate | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setIsVerifying(true);
    setErrorMsg(null);
    setVerifiedCert(null);

    try {
      const res = await api.verifyMedicalCertificate(code.trim());
      if (res.verified && res.certificate) {
        setVerifiedCert(res.certificate);
      } else {
        setErrorMsg(res.error || 'Medical certificate not found or verification code is invalid.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Online Medical Certificate Authenticity Verification
              </h3>
              <p className="text-xs text-slate-500">
                Official registry check for employers, HR departments, academic institutions, and insurers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Verification Code Form */}
          <form onSubmit={handleVerify} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Enter Certificate Number or QR Verification Token:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. VERIFY-MC-90214 or MC-2026-00481"
                className="flex-1 text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {isVerifying ? 'Verifying...' : 'Verify Authenticity'}
              </button>
            </div>

            {/* Quick try sample chips */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Quick tests:</span>
              <button
                type="button"
                onClick={() => {
                  setCode('VERIFY-MC-90214');
                }}
                className="font-mono text-teal-700 hover:underline"
              >
                VERIFY-MC-90214
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setCode('VERIFY-MC-81092');
                }}
                className="font-mono text-teal-700 hover:underline"
              >
                VERIFY-MC-81092
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Verification Unsuccessful</strong>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Verified Certificate Card */}
          {verifiedCert && (
            <div className="space-y-4 border border-emerald-200 bg-emerald-50/40 rounded-2xl p-5">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm">AUTHENTIC & LEGITIMATE RECORD</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  {verifiedCert.certificate_number}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Patient Name:</span>
                    <strong className="text-slate-900 text-sm">
                      {verifiedCert.patient
                        ? `${verifiedCert.patient.first_name} ${verifiedCert.patient.last_name}`
                        : 'Patient'}
                    </strong>
                    <span className="text-slate-400 font-mono text-[10px]">
                      ({verifiedCert.patient?.patient_number})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Clearance Type:</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 capitalize">
                      {verifiedCert.certificate_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Diagnosis:</span>
                  <p className="font-semibold text-slate-900">
                    {verifiedCert.diagnosis}{' '}
                    {verifiedCert.icd10_code && (
                      <span className="text-slate-500 font-mono text-[11px]">
                        (ICD-10: {verifiedCert.icd10_code})
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Recommendations:</span>
                  <p className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-800">
                    {verifiedCert.recommendations}
                  </p>
                </div>

                {verifiedCert.rest_days !== undefined && verifiedCert.rest_days > 0 && (
                  <div className="text-teal-800 font-bold">
                    Advised bed rest duration: {verifiedCert.rest_days} day(s)
                  </div>
                )}

                {/* Issuing Physician Credentials */}
                <div className="border-t border-emerald-200/80 pt-3 mt-3 bg-white p-3 rounded-xl border">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Attending Physician Credentials
                  </span>
                  <p className="font-bold text-slate-900 text-xs">
                    {verifiedCert.physician_credentials.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {verifiedCert.physician_credentials.specialization}
                  </p>
                  <div className="flex gap-4 text-[10px] font-mono text-slate-600 mt-1">
                    <span>PRC No: <strong>{verifiedCert.physician_credentials.prc_license}</strong></span>
                    <span>PTR No: <strong>{verifiedCert.physician_credentials.ptr_number}</strong></span>
                    {verifiedCert.physician_credentials.s2_license && (
                      <span>S2: <strong>{verifiedCert.physician_credentials.s2_license}</strong></span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-1 flex justify-between">
                  <span>Issued: {new Date(verifiedCert.effective_date).toLocaleDateString()}</span>
                  <span>
                    Valid until:{' '}
                    {verifiedCert.expiry_date
                      ? new Date(verifiedCert.expiry_date).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
