import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  Plus,
  Search,
  X,
  User,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { LabOrder, LabTestResult, LabResultParam } from '../../types';

export const AdminLabWorkbenchView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'results'>('pending');
  const [pendingOrders, setPendingOrders] = useState<LabOrder[]>([]);
  const [labResults, setLabResults] = useState<LabTestResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Result entry modal
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [selectedTestName, setSelectedTestName] = useState<string>('');
  const [performedBy, setPerformedBy] = useState<string>('Mark Bautista, RMT');
  const [verifiedBy, setVerifiedBy] = useState<string>('Dr. Roberto Gomez, MD, FPSP');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [parameters, setParameters] = useState<LabResultParam[]>([
    { parameter_name: 'Primary Finding', value: '', unit: '', reference_range: 'Normal baseline', flag: 'normal' },
  ]);

  // Printable result modal
  const [printResult, setPrintResult] = useState<LabTestResult | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ordRes, resRes] = await Promise.all([
        api.getPendingLabOrders(),
        api.getLabResults(),
      ]);
      setPendingOrders(ordRes.orders || []);
      setLabResults(resRes.results || []);
    } catch (err) {
      console.error('Failed to load lab workbench:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openResultEntry = (order: LabOrder, testName: string) => {
    setSelectedOrder(order);
    setSelectedTestName(testName);

    // Preset standard test templates
    if (testName.toLowerCase().includes('cbc') || testName.toLowerCase().includes('complete blood')) {
      setParameters([
        { parameter_name: 'Hemoglobin', value: '14.5', unit: 'g/dL', reference_range: '13.0 - 17.5', flag: 'normal' },
        { parameter_name: 'Hematocrit', value: '42.0', unit: '%', reference_range: '40.0 - 52.0', flag: 'normal' },
        { parameter_name: 'White Blood Cell (WBC)', value: '6.8', unit: 'x10^9/L', reference_range: '4.5 - 11.0', flag: 'normal' },
        { parameter_name: 'Platelet Count', value: '250', unit: 'x10^9/L', reference_range: '150 - 450', flag: 'normal' },
      ]);
    } else if (testName.toLowerCase().includes('sugar') || testName.toLowerCase().includes('fbs')) {
      setParameters([
        { parameter_name: 'Fasting Blood Glucose', value: '94', unit: 'mg/dL', reference_range: '70 - 99', flag: 'normal' },
      ]);
    } else if (testName.toLowerCase().includes('lipid') || testName.toLowerCase().includes('cholesterol')) {
      setParameters([
        { parameter_name: 'Total Cholesterol', value: '185', unit: 'mg/dL', reference_range: '< 200', flag: 'normal' },
        { parameter_name: 'Triglycerides', value: '140', unit: 'mg/dL', reference_range: '< 150', flag: 'normal' },
        { parameter_name: 'HDL (Good Cholesterol)', value: '52', unit: 'mg/dL', reference_range: '> 40', flag: 'normal' },
        { parameter_name: 'LDL (Calculated)', value: '105', unit: 'mg/dL', reference_range: '< 100', flag: 'high' },
      ]);
    } else {
      setParameters([
        { parameter_name: testName, value: 'Negative / Clear', unit: '', reference_range: 'Negative', flag: 'normal' },
      ]);
    }
  };

  const handleAddParam = () => {
    setParameters([
      ...parameters,
      { parameter_name: '', value: '', unit: '', reference_range: '', flag: 'normal' },
    ]);
  };

  const handleParamChange = (index: number, field: keyof LabResultParam, val: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: val };
    setParameters(updated);
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await api.saveLabResult({
        lab_order_id: selectedOrder.id,
        patient_id: selectedOrder.patient_id,
        doctor_id: selectedOrder.doctor_id,
        test_name: selectedTestName,
        category: 'Clinical Diagnostics',
        performed_by: performedBy,
        verified_by: verifiedBy,
        status: 'released',
        parameters,
        clinical_interpretation: clinicalNotes || 'Analysis completed and certified within standard tolerances.',
      });

      setSelectedOrder(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit laboratory results');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 mb-1">
            <FlaskConical className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Clinical Laboratory Module</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Lab Technician Workbench & Diagnostics</h1>
          <p className="text-sm text-slate-500">
            Process physician requisitions, enter numeric test parameters, and release certified laboratory findings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending Specimen / Orders ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'results'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Released Results ({labResults.length})
          </button>
        </div>
      </div>

      {/* PENDING ORDERS TAB */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Doctor-Ordered Diagnostic Requisitions</h2>
              <button
                onClick={fetchData}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Refresh Queue
              </button>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No pending laboratory orders found. All requisitions are up to date!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingOrders.map((ord) => (
                  <div key={ord.id} className="p-6 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-base">
                            {ord.patient ? `${ord.patient.first_name} ${ord.patient.last_name}` : 'Patient'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {ord.patient?.patient_number || 'PT-XXXX'}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              ord.priority === 'stat'
                                ? 'bg-rose-100 text-rose-800 animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ord.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          Ordered by{' '}
                          <span className="font-medium text-slate-700">
                            {ord.doctor ? `Dr. ${ord.doctor.first_name} ${ord.doctor.last_name}` : 'Physician'}
                          </span>{' '}
                          • {new Date(ord.created_at).toLocaleDateString()} at{' '}
                          {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {ord.tests.map((test) => (
                            <div
                              key={test.id}
                              className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                            >
                              <span>{test.test_name}</span>
                              <button
                                onClick={() => openResultEntry(ord, test.test_name)}
                                className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px]"
                              >
                                Enter Findings
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <span>Total Tests: {ord.tests.length}</span>
                        <div className="text-slate-700 font-medium mt-1">
                          Estimated Cost: ₱{ord.tests.reduce((acc, t) => acc + (t.price || 0), 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RELEASED RESULTS TAB */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Released Diagnostic Test Results</h2>
              <button
                onClick={fetchData}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Refresh
              </button>
            </div>

            {labResults.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No released laboratory results found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {labResults.map((res) => (
                  <div key={res.id} className="p-6 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{res.test_name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                            {res.category}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                            Verified & Released
                          </span>
                        </div>

                        <p className="text-xs text-slate-600">
                          Patient:{' '}
                          <strong className="text-slate-800">
                            {res.patient ? `${res.patient.first_name} ${res.patient.last_name}` : 'Patient'}
                          </strong>{' '}
                          • Result Date: {new Date(res.result_date).toLocaleDateString()}
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs max-w-2xl">
                          <div className="grid grid-cols-4 font-semibold text-slate-600 border-b pb-1 mb-1.5">
                            <span>Parameter</span>
                            <span>Result</span>
                            <span>Reference</span>
                            <span>Flag</span>
                          </div>
                          {res.parameters.map((p, i) => (
                            <div key={i} className="grid grid-cols-4 text-slate-700 py-0.5">
                              <span>{p.parameter_name}</span>
                              <span className="font-semibold">{p.value} {p.unit}</span>
                              <span className="text-slate-500">{p.reference_range}</span>
                              <span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    p.flag === 'critical'
                                      ? 'bg-rose-600 text-white'
                                      : p.flag === 'high'
                                      ? 'bg-amber-100 text-amber-800'
                                      : p.flag === 'low'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {p.flag}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>

                        {res.clinical_interpretation && (
                          <p className="text-xs text-slate-600 italic">
                            <strong>Interpretation:</strong> {res.clinical_interpretation}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPrintResult(res)}
                          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Certificate of Findings
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENTER RESULTS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Enter Diagnostic Test Findings</h2>
                <p className="text-xs text-slate-500">
                  Test: <span className="font-semibold text-indigo-700">{selectedTestName}</span> • Patient:{' '}
                  {selectedOrder.patient ? `${selectedOrder.patient.first_name} ${selectedOrder.patient.last_name}` : 'Patient'}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResult} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Medical Technologist</label>
                  <input
                    type="text"
                    required
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pathologist Sign-off</label>
                  <input
                    type="text"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-700 font-semibold">Test Parameters & Findings</label>
                  <button
                    type="button"
                    onClick={handleAddParam}
                    className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-700"
                  >
                    <Plus className="w-3 h-3" /> Add Parameter
                  </button>
                </div>

                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  {parameters.map((p, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Parameter (e.g. Hemoglobin)"
                        value={p.parameter_name}
                        onChange={(e) => handleParamChange(idx, 'parameter_name', e.target.value)}
                        className="col-span-4 p-2 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={p.value}
                        onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                        className="col-span-2 p-2 bg-white border border-slate-200 rounded text-xs font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Unit (g/dL)"
                        value={p.unit}
                        onChange={(e) => handleParamChange(idx, 'unit', e.target.value)}
                        className="col-span-2 p-2 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Reference Range"
                        value={p.reference_range}
                        onChange={(e) => handleParamChange(idx, 'reference_range', e.target.value)}
                        className="col-span-2 p-2 bg-white border border-slate-200 rounded text-xs"
                      />
                      <select
                        value={p.flag}
                        onChange={(e) => handleParamChange(idx, 'flag', e.target.value)}
                        className="col-span-2 p-2 bg-white border border-slate-200 rounded text-xs font-medium"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Clinical Remarks / Interpretation
                </label>
                <textarea
                  rows={2}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Enter diagnostic summary or pathology notes..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Release Certified Results
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE CERTIFICATE OF FINDINGS MODAL */}
      {printResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-lg text-slate-900">CERTIFICATE OF LABORATORY FINDINGS</h3>
                  <p className="text-xs text-slate-500">Official Clinical Diagnostic Report</p>
                </div>
              </div>
              <button
                onClick={() => setPrintResult(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Body */}
            <div className="border border-slate-300 rounded-xl p-6 space-y-4 bg-white">
              <div className="grid grid-cols-2 text-xs border-b border-slate-200 pb-3 gap-2">
                <div>
                  <span className="text-slate-500">Patient:</span>{' '}
                  <strong className="text-slate-900">
                    {printResult.patient ? `${printResult.patient.first_name} ${printResult.patient.last_name}` : 'Patient'}
                  </strong>
                  <div>Age/Sex: {printResult.patient?.age || 'Adult'} / {printResult.patient?.sex || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div>Date Released: {new Date(printResult.result_date).toLocaleDateString()}</div>
                  <div className="text-slate-500">Ref Code: #{printResult.id.slice(-6).toUpperCase()}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">{printResult.test_name}</h4>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600">
                      <th className="py-1">Parameter</th>
                      <th className="py-1">Result</th>
                      <th className="py-1">Reference Range</th>
                      <th className="py-1">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {printResult.parameters.map((p, i) => (
                      <tr key={i} className="py-1">
                        <td className="py-1 font-medium text-slate-800">{p.parameter_name}</td>
                        <td className="py-1 font-bold text-slate-900">{p.value} {p.unit}</td>
                        <td className="py-1 text-slate-500">{p.reference_range}</td>
                        <td className="py-1 uppercase font-semibold text-indigo-900">{p.flag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {printResult.clinical_interpretation && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700 block">Interpretation:</span>
                  <p className="text-slate-600 mt-0.5">{printResult.clinical_interpretation}</p>
                </div>
              )}

              <div className="grid grid-cols-2 text-center text-xs pt-8 border-t border-slate-200">
                <div>
                  <div className="font-semibold text-slate-900">{printResult.performed_by}</div>
                  <div className="text-[11px] text-slate-500">Medical Technologist</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{printResult.verified_by || 'Dr. Roberto Gomez, MD'}</div>
                  <div className="text-[11px] text-slate-500">Pathologist</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPrintResult(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
