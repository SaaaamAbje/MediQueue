import React, { useState, useEffect } from 'react';
import {
  Heart,
  Activity,
  Thermometer,
  Scale,
  Droplet,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { VitalSignRecord } from '../types/index';
import { api } from '../services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface VitalsTrackerProps {
  patientId: string;
  patientName?: string;
  canRecord?: boolean; // Can this user add new vitals?
  onRecorded?: () => void;
}

export const VitalsTracker: React.FC<VitalsTrackerProps> = ({
  patientId,
  patientName,
  canRecord = true,
  onRecorded,
}) => {
  const [vitals, setVitals] = useState<VitalSignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<'bp' | 'weight' | 'pulse' | 'temp'>('bp');

  // Form state
  const [form, setForm] = useState({
    systolic_bp: 120,
    diastolic_bp: 80,
    heart_rate: 75,
    temperature_c: 36.6,
    respiratory_rate: 16,
    spo2: 99,
    blood_glucose_mgdl: 95,
    weight_kg: 70,
    height_cm: 170,
    notes: '',
  });

  const loadVitals = async () => {
    try {
      setLoading(true);
      const res = await api.getPatientVitals(patientId);
      setVitals(res.vitals || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load vital sign history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadVitals();
    }
  }, [patientId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.recordVitalSign({
        patient_id: patientId,
        systolic_bp: Number(form.systolic_bp),
        diastolic_bp: Number(form.diastolic_bp),
        heart_rate: Number(form.heart_rate),
        temperature_c: Number(form.temperature_c),
        respiratory_rate: Number(form.respiratory_rate),
        spo2: Number(form.spo2),
        blood_glucose_mgdl: form.blood_glucose_mgdl ? Number(form.blood_glucose_mgdl) : undefined,
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
        bmi: Number((form.weight_kg / Math.pow(form.height_cm / 100, 2)).toFixed(1)),
        notes: form.notes,
      });

      setShowAddModal(false);
      await loadVitals();
      if (onRecorded) onRecorded();
    } catch (err: any) {
      alert(err.message || 'Failed to record vital signs.');
    } finally {
      setSaving(false);
    }
  };

  const latest = vitals[0];

  // Helper for Blood Pressure classification
  const getBpStatus = (sys: number, dia: number) => {
    if (sys < 120 && dia < 80) return { label: 'Normal / Optimal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (sys <= 129 && dia < 80) return { label: 'Elevated', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (sys <= 139 || dia <= 89) return { label: 'Stage 1 Hypertension', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { label: 'Stage 2 Hypertension', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  // Helper for BMI classification
  const getBmiStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (bmi <= 24.9) return { label: 'Normal Weight', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (bmi <= 29.9) return { label: 'Overweight', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Obese', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  // Recharts Chart Rendering
  const renderTrendChart = () => {
    if (vitals.length < 2) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-sm text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <Activity className="w-8 h-8 text-slate-300 mb-2" />
          At least 2 vital sign recordings needed to generate trend chart.
        </div>
      );
    }

    const chartData = [...vitals]
      .reverse()
      .map((v) => ({
        date: new Date(v.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: new Date(v.recorded_at).toLocaleString(),
        systolic: v.systolic_bp,
        diastolic: v.diastolic_bp,
        weight: v.weight_kg,
        pulse: v.heart_rate,
        temp: v.temperature_c,
      }));

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl text-xs">
            <p className="font-bold text-slate-900 mb-1.5">{payload[0].payload.fullDate}</p>
            <div className="space-y-1">
              {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600">{entry.name}:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {entry.value} {entry.name.includes('Temp') ? '°C' : entry.name.includes('Weight') ? 'kg' : entry.name.includes('BP') ? 'mmHg' : 'bpm'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          {activeMetric === 'bp' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                dy={10}
              />
              <YAxis 
                domain={[40, 200]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '20px' }}
              />
              <Line
                name="Systolic BP"
                type="monotone"
                dataKey="systolic"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
              />
              <Line
                name="Diastolic BP"
                type="monotone"
                dataKey="diastolic"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
              />
            </LineChart>
          ) : activeMetric === 'weight' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                dy={10}
              />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                name="Weight"
                type="monotone"
                dataKey="weight"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorWeight)"
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
              />
            </AreaChart>
          ) : activeMetric === 'pulse' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                dy={10}
              />
              <YAxis 
                domain={[40, 160]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                name="Heart Rate"
                type="monotone"
                dataKey="pulse"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
              />
            </LineChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                dy={10}
              />
              <YAxis 
                domain={[35, 41]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                name="Temperature"
                type="monotone"
                dataKey="temp"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-7 space-y-6">
      {/* Header with Title & Add Vitals Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Vital Signs &amp; Clinical Health Tracker
              </h2>
              <p className="text-xs text-slate-500">
                {patientName ? `Continuous clinical record for ${patientName}` : 'Longitudinal physiological monitoring'}
              </p>
            </div>
          </div>
        </div>

        {canRecord && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Record New Vitals
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading vital sign history...</div>
      ) : vitals.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No Vital Signs Recorded Yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Log patient blood pressure, heart rate, oxygen levels, and BMI to track health trends over time.
          </p>
          {canRecord && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700"
            >
              Add Initial Baseline Vitals
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Latest Metric Cards Grid */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Blood Pressure */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Blood Pressure</span>
                  <Heart className="w-4 h-4 text-rose-500" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {latest.systolic_bp}/{latest.diastolic_bp}
                  </span>
                  <span className="text-[11px] text-slate-500 block">mmHg</span>
                </div>
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBpStatus(latest.systolic_bp, latest.diastolic_bp).color}`}>
                    {getBpStatus(latest.systolic_bp, latest.diastolic_bp).label}
                  </span>
                </div>
              </div>

              {/* Heart Rate */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Pulse / HR</span>
                  <Activity className="w-4 h-4 text-red-500" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {latest.heart_rate}
                  </span>
                  <span className="text-[11px] text-slate-500 block">bpm</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {latest.heart_rate >= 60 && latest.heart_rate <= 100 ? 'Normal Resting' : 'Review'}
                  </span>
                </div>
              </div>

              {/* SpO2 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Oxygen (SpO2)</span>
                  <Droplet className="w-4 h-4 text-sky-500" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {latest.spo2}%
                  </span>
                  <span className="text-[11px] text-slate-500 block">ambient room air</span>
                </div>
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${latest.spo2 >= 95 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {latest.spo2 >= 95 ? 'Normal Saturation' : 'Hypoxic Warning'}
                  </span>
                </div>
              </div>

              {/* Temperature */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Body Temp</span>
                  <Thermometer className="w-4 h-4 text-amber-500" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {latest.temperature_c}°C
                  </span>
                  <span className="text-[11px] text-slate-500 block">axillary / oral</span>
                </div>
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${latest.temperature_c >= 37.8 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {latest.temperature_c >= 37.8 ? 'Febrile / Fever' : 'Afebrile'}
                  </span>
                </div>
              </div>

              {/* BMI */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">BMI Index</span>
                  <Scale className="w-4 h-4 text-purple-500" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {latest.bmi}
                  </span>
                  <span className="text-[11px] text-slate-500 block">{latest.weight_kg} kg / {latest.height_cm} cm</span>
                </div>
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBmiStatus(latest.bmi).color}`}>
                    {getBmiStatus(latest.bmi).label}
                  </span>
                </div>
              </div>

              {/* Blood Glucose */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Blood Sugar</span>
                  <Droplet className="w-4 h-4 text-teal-500" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {latest.blood_glucose_mgdl || '--'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">mg/dL (fasting)</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {latest.blood_glucose_mgdl ? (latest.blood_glucose_mgdl <= 100 ? 'Normal Fasting' : 'Pre-diabetic Range') : 'Not Checked'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Longitudinal Trend Visualizer */}
          <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  Health Progression & Trends
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">Visualizing {vitals.length} historical records</p>
              </div>

              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setActiveMetric('bp')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    activeMetric === 'bp' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  BP
                </button>
                <button
                  onClick={() => setActiveMetric('pulse')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    activeMetric === 'pulse' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Pulse
                </button>
                <button
                  onClick={() => setActiveMetric('weight')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    activeMetric === 'weight' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Weight
                </button>
                <button
                  onClick={() => setActiveMetric('temp')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    activeMetric === 'temp' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Temp
                </button>
              </div>
            </div>

            {renderTrendChart()}
          </div>

          {/* Historical Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">BP (mmHg)</th>
                  <th className="py-2.5 px-3">HR (bpm)</th>
                  <th className="py-2.5 px-3">Temp (°C)</th>
                  <th className="py-2.5 px-3">SpO2</th>
                  <th className="py-2.5 px-3">Weight &amp; BMI</th>
                  <th className="py-2.5 px-3">Blood Sugar</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                  <th className="py-2.5 px-3">Clinical Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {vitals.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(v.recorded_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {new Date(v.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {v.systolic_bp}/{v.diastolic_bp}
                    </td>
                    <td className="py-3 px-3 font-mono">{v.heart_rate}</td>
                    <td className="py-3 px-3 font-mono">{v.temperature_c}°</td>
                    <td className="py-3 px-3 font-mono">{v.spo2}%</td>
                    <td className="py-3 px-3">
                      <span>{v.weight_kg} kg</span>
                      <span className="text-[10px] text-slate-400 block font-mono">BMI {v.bmi}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {v.blood_glucose_mgdl ? `${v.blood_glucose_mgdl} mg/dL` : '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {v.recorded_by_name || 'Clinic Staff'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {v.notes || 'Normal clinical findings.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Record New Vitals Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Record Patient Vital Signs</h3>
            <p className="text-xs text-slate-500 mb-6">
              Enter current physical exam measurements taken during clinical triage or room entry.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Systolic BP (mmHg) *
                  </label>
                  <input
                    type="number"
                    required
                    min={60}
                    max={250}
                    value={form.systolic_bp}
                    onChange={(e) => setForm({ ...form, systolic_bp: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diastolic BP (mmHg) *
                  </label>
                  <input
                    type="number"
                    required
                    min={40}
                    max={150}
                    value={form.diastolic_bp}
                    onChange={(e) => setForm({ ...form, diastolic_bp: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pulse / HR (bpm) *
                  </label>
                  <input
                    type="number"
                    required
                    min={30}
                    max={220}
                    value={form.heart_rate}
                    onChange={(e) => setForm({ ...form, heart_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Temp (°C) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min={32}
                    max={43}
                    value={form.temperature_c}
                    onChange={(e) => setForm({ ...form, temperature_c: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SpO2 (%) *
                  </label>
                  <input
                    type="number"
                    required
                    min={70}
                    max={100}
                    value={form.spo2}
                    onChange={(e) => setForm({ ...form, spo2: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min={2}
                    max={300}
                    value={form.weight_kg}
                    onChange={(e) => setForm({ ...form, weight_kg: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Height (cm) *
                  </label>
                  <input
                    type="number"
                    required
                    min={40}
                    max={250}
                    value={form.height_cm}
                    onChange={(e) => setForm({ ...form, height_cm: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Blood Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={600}
                    value={form.blood_glucose_mgdl}
                    onChange={(e) => setForm({ ...form, blood_glucose_mgdl: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Triage Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Patient reports mild headache; rested 10 minutes prior to blood pressure reading."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Vital Signs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
