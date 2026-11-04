import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  BookOpen, 
  FlaskConical, 
  Database, 
  ExternalLink, 
  History, 
  Star,
  Zap,
  Info,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Play,
  Pause,
  Download
} from 'lucide-react';
import * as $3Dmol from '3dmol';
import { api } from '../../services/api';

// --- Types ---
interface PubMedArticle {
  id: string;
  title: string;
  journal: string;
  pubDate: string;
  authors: string[];
  abstract?: string;
  doi?: string;
  source: 'PubMed' | 'Europe PMC';
}

interface DrugInfo {
  cid: number;
  name: string;
  smiles: string;
  formula: string;
  molecularWeight: string;
  iupacName: string;
  description?: string;
}

// --- Components ---

const MolecularViewer: React.FC<{ pdbId?: string; uniprotId?: string }> = ({ pdbId, uniprotId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState<'cartoon' | 'stick' | 'sphere' | 'surface'>('cartoon');

  useEffect(() => {
    if (!containerRef.current) return;

    if (!viewerRef.current) {
      viewerRef.current = $3Dmol.createViewer(containerRef.current, {
        backgroundColor: '#0f172a',
      });
    }

    const loadStructure = async () => {
      if (!pdbId && !uniprotId) return;
      setLoading(true);
      try {
        let data: string;
        let format: string;

        if (pdbId) {
          const response = await fetch(`https://files.rcsb.org/download/${pdbId.toUpperCase()}.cif`);
          if (!response.ok) throw new Error('PDB not found');
          data = await response.text();
          format = 'cif';
        } else {
          // AlphaFold
          const metaRes = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${uniprotId?.toUpperCase()}`);
          const meta = metaRes.ok ? await metaRes.json() : [];
          const cifUrl = meta?.[0]?.cifUrl ?? `https://alphafold.ebi.ac.uk/files/AF-${uniprotId?.toUpperCase()}-F1-model_v6.cif`;
          
          const response = await fetch(cifUrl);
          if (!response.ok) throw new Error('AlphaFold model not found');
          data = await response.text();
          format = 'cif';
        }

        const viewer = viewerRef.current;
        viewer.clear();
        viewer.addModel(data, format);
        
        if (uniprotId) {
          // Apply pLDDT colors for AlphaFold
          const colorFunc = (atom: any) => {
            const b = atom.b;
            if (b > 90) return '#0053D6';
            if (b > 70) return '#65CBF3';
            if (b > 50) return '#FFDB13';
            return '#FF7D45';
          };
          viewer.setStyle({}, { [style]: { colorfunc: colorFunc } });
        } else {
          viewer.setStyle({}, { [style]: { color: 'spectrum' } });
        }

        viewer.zoomTo();
        viewer.render();
      } catch (err) {
        console.error('Molecular viewer error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStructure();
  }, [pdbId, uniprotId, style]);

  const toggleSpin = () => {
    if (viewerRef.current) {
      if (isSpinning) viewerRef.current.spin(false);
      else viewerRef.current.spin(true);
      setIsSpinning(!isSpinning);
    }
  };

  const resetCamera = () => {
    if (viewerRef.current) {
      viewerRef.current.zoomTo();
      viewerRef.current.render();
    }
  };

  return (
    <div className="relative w-full h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
      <div ref={containerRef} className="w-full h-full" />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={toggleSpin}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-600 backdrop-blur-sm transition-all"
            title={isSpinning ? "Stop Spin" : "Start Spin"}
          >
            {isSpinning ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button 
            onClick={resetCamera}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-600 backdrop-blur-sm transition-all"
            title="Reset Camera"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          {(['cartoon', 'stick', 'sphere', 'surface'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md border transition-all ${
                style === s 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Legend for AlphaFold */}
      {uniprotId && (
        <div className="absolute top-4 right-4 bg-slate-800/90 border border-slate-600 p-3 rounded-lg backdrop-blur-sm text-[10px] space-y-1.5 shadow-xl">
          <div className="font-bold text-slate-400 uppercase tracking-wider mb-1">pLDDT Confidence</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#0053D6]" />
            <span className="text-slate-200">Very High (&gt;90)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#65CBF3]" />
            <span className="text-slate-200">Confident (70-90)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#FFDB13]" />
            <span className="text-slate-200">Low (50-70)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#FF7D45]" />
            <span className="text-slate-200">Very Low (&lt;50)</span>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 left-4">
        <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-600 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-xl">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-mono font-bold text-white uppercase tracking-tight">
            {pdbId ? `PDB: ${pdbId}` : `UniProt: ${uniprotId}`}
          </span>
          <span className="text-[10px] text-slate-400 font-medium ml-1">
            {pdbId ? '[Experimental]' : '[AlphaFold Prediction]'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const DoctorResearchView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'literature' | 'structures' | 'pharmacology'>('literature');
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<PubMedArticle[]>([]);
  const [drugs, setDrugs] = useState<DrugInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Molecular view state
  const [activeStructure, setActiveStructure] = useState<{ pdbId?: string; uniprotId?: string }>({ pdbId: '1TNR' });

  // Default examples
  const examples = [
    { label: 'TP53 (Tumor Suppressor)', id: 'P04637', type: 'uniprot' },
    { label: 'Insulin (Human)', id: '1BEN', type: 'pdb' },
    { label: 'Spike Protein (SARS-CoV-2)', id: '6VXX', type: 'pdb' },
    { label: 'BRCA1', id: 'P38398', type: 'uniprot' }
  ];

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [metaSummary, setMetaSummary] = useState<{ executive_summary: string; consensus_points: string[]; clinical_implications: string[]; gaps_in_research: string[] } | null>(null);

  const handleMetaSynthesis = async () => {
    if (!articles.length) return;

    setIsSynthesizing(true);
    try {
      const response = await fetch('/api/ai/literature-meta-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          papers: articles.map(a => ({ title: a.title, abstract: a.abstract || 'No abstract available' })) 
        }),
      });
      
      if (!response.ok) throw new Error('Meta-synthesis failed');
      const data = await response.json();
      setMetaSummary(data);
    } catch (err) {
      console.error('Meta-synthesis Error:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      if (activeTab === 'literature') {
        const response = await fetch(`https://api.europepmc.org/search?query=${encodeURIComponent(searchQuery)}&format=json&pageSize=10`);
        const data = await response.json();
        const results = data.resultList.result.map((r: any) => ({
          id: r.id,
          title: r.title,
          journal: r.journalTitle,
          pubDate: r.pubYear,
          authors: r.authorString?.split(', ').slice(0, 3) || [],
          doi: r.doi,
          source: 'Europe PMC'
        }));
        setArticles(results);
      } else if (activeTab === 'pharmacology') {
        const response = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(searchQuery)}/JSON`);
        if (!response.ok) throw new Error('Compound not found');
        const data = await response.json();
        const compound = data.PC_Compounds[0];
        
        // Extract basic info
        const cid = compound.id.id.cid;
        const propsRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON`);
        const propsData = await propsRes.json();
        const props = propsData.PropertyTable.Properties[0];

        setDrugs([{
          cid: props.CID,
          name: searchQuery.toUpperCase(),
          smiles: props.CanonicalSMILES,
          formula: props.MolecularFormula,
          molecularWeight: props.MolecularWeight,
          iupacName: props.IUPACName
        }]);
      } else if (activeTab === 'structures') {
        // Just set the structure if it looks like a PDB or UniProt ID
        const q = searchQuery.trim().toUpperCase();
        if (q.length === 4 && /^[0-9A-Z]+$/.test(q)) {
          setActiveStructure({ pdbId: q });
        } else {
          setActiveStructure({ uniprotId: q });
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadExample = (ex: { id: string; type: string }) => {
    if (ex.type === 'pdb') setActiveStructure({ pdbId: ex.id });
    else setActiveStructure({ uniprotId: ex.id });
    setActiveTab('structures');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-inner border border-teal-100">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Research Workbench</h1>
              <p className="text-sm text-slate-500 font-medium">Authoritative scientific data discovery and molecular visualization platform.</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
            <button
              onClick={() => setActiveTab('literature')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'literature' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BookOpen size={14} /> Literature
            </button>
            <button
              onClick={() => setActiveTab('structures')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'structures' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Database size={14} /> Structures
            </button>
            <button
              onClick={() => setActiveTab('pharmacology')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'pharmacology' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Zap size={14} /> Pharmacology
            </button>
          </div>
        </div>
      </div>

      {/* Examples Bar */}
      <div className="flex flex-wrap items-center gap-2 px-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
          <Star size={12} className="text-amber-400 fill-amber-400" /> Quick-Try Examples:
        </span>
        {examples.map((ex) => (
          <button
            key={ex.id}
            onClick={() => loadExample(ex)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            {ex.label}
          </button>
        ))}
      </div>

      {/* Search Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'literature' ? "Search PubMed / Europe PMC (e.g. 'COVID-19 vaccination', 'TP53 mutation')" :
              activeTab === 'pharmacology' ? "Search PubChem Compounds (e.g. 'Imatinib', 'Aspirin', 'Remdesivir')" :
              "Search RCSB PDB ID or UniProt Accession (e.g. '1TNR', 'P04637')"
            }
            className="w-full pl-12 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm font-medium"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={20} />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
          >
            {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Discover'}
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visualizer or List */}
        <div className="lg:col-span-8 space-y-6">
          {activeTab === 'structures' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Maximize2 size={16} className="text-slate-400" />
                  <h2 className="font-bold text-slate-900 text-sm uppercase tracking-tight">Interactive Molecular Canvas</h2>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     WEBGL ACCELERATED
                   </div>
                </div>
              </div>
              <div className="p-4 flex-1">
                <MolecularViewer 
                  pdbId={activeStructure.pdbId} 
                  uniprotId={activeStructure.uniprotId} 
                />
              </div>
            </div>
          )}

          {activeTab === 'literature' && (
            <div className="space-y-4">
              {articles.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Found {articles.length} Research Papers</h3>
                  <button
                    onClick={handleMetaSynthesis}
                    disabled={isSynthesizing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSynthesizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    {isSynthesizing ? 'Synthesizing...' : 'Meta-Synthesize Results'}
                  </button>
                </div>
              )}

              {/* Meta Summary Display */}
              {metaSummary && (
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Gemini Literature Synthesis</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-tight">Executive Summary</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{metaSummary.executive_summary}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-indigo-300 mb-2 uppercase tracking-tight">Key Consensus Points</h4>
                        <ul className="space-y-1.5">
                          {metaSummary.consensus_points.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400 leading-tight">
                              <span className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-emerald-300 mb-2 uppercase tracking-tight">Clinical Implications</h4>
                        <p className="text-[11px] text-slate-400 leading-tight">{metaSummary.clinical_implications}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {articles.length > 0 ? (
                articles.map((article) => (
                  <div key={article.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase rounded border border-teal-100">
                            {article.source}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                            PMID: {article.id}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors leading-snug">
                          {article.title}
                        </h3>
                      </div>
                      <a 
                        href={`https://doi.org/${article.doi}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                      >
                        <ExternalLink size={18} />
                      </a>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        {article.authors.join(', ')}{article.authors.length > 3 ? ' et al.' : ''}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="italic">{article.journal}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        {article.pubDate}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4 shadow-sm border border-slate-100">
                    <BookOpen size={32} />
                  </div>
                  <h3 className="text-slate-900 font-bold mb-1">Explore Medical Literature</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">
                    Search millions of peer-reviewed articles from PubMed and Europe PMC to stay updated with clinical findings.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pharmacology' && (
            <div className="space-y-6">
              {drugs.length > 0 ? (
                drugs.map((drug) => (
                  <div key={drug.cid} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-200 shadow-sm">
                           {drug.cid}
                         </div>
                         <h2 className="font-bold text-slate-900 text-sm uppercase tracking-tight">{drug.name}</h2>
                       </div>
                       <a 
                         href={`https://pubchem.ncbi.nlm.nih.gov/compound/${drug.cid}`}
                         target="_blank"
                         rel="noreferrer"
                         className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                       >
                         PUBCHEM RECORD <ExternalLink size={12} />
                       </a>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Formula</span>
                            <span className="text-sm font-mono font-bold text-slate-900">{drug.formula}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mol. Weight</span>
                            <span className="text-sm font-mono font-bold text-slate-900">{drug.molecularWeight} g/mol</span>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">IUPAC Name</span>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {drug.iupacName}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">SMILES Notation</span>
                          <code className="block text-[10px] break-all font-mono bg-slate-900 text-emerald-400 p-3 rounded-xl shadow-inner border border-slate-800">
                            {drug.smiles}
                          </code>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed relative group">
                        <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded border border-slate-200">
                           2D Depiction
                        </div>
                        <img 
                          src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${drug.cid}/PNG?width=300&height=300`}
                          alt={drug.name}
                          className="max-w-full h-auto drop-shadow-md group-hover:scale-105 transition-transform"
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4 shadow-sm border border-slate-100">
                    <Zap size={32} />
                  </div>
                  <h3 className="text-slate-900 font-bold mb-1">Chemical Intelligence</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">
                    Look up compound structures, pharmacological properties, and safety data from PubChem's global chemical repository.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Sidebar Stats/Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-4 flex items-center gap-2">
              <Info size={14} /> Epistemic Provenance
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Database size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-300 uppercase mb-0.5">Primary Sources</p>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Data aggregated from UniProtKB, RCSB PDB, AlphaFold DB, PubChem, and Europe PMC.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <History size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-300 uppercase mb-0.5">Data Reliability</p>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Experimental structures are verified by X-ray, NMR, or Cryo-EM. Predictions use AlphaFold2 state-of-the-art models.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800">
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                <Download size={14} /> Export Dataset
              </button>
            </div>
          </div>

          {/* Research Context */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-900 text-sm mb-4">Institutional Research Notes</h3>
             <div className="space-y-4">
               <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                 <div className="flex items-center gap-2 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                   <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Clinical Alert</span>
                 </div>
                 <p className="text-[11px] text-amber-700 leading-normal font-medium">
                   Current investigation on EGFR kinase domain mutations in local lung cancer cohort. Refer to Lab Code: MMC-2024-EGFR.
                 </p>
               </div>
               
               <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl">
                 <div className="flex items-center gap-2 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                   <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Publication Note</span>
                 </div>
                 <p className="text-[11px] text-teal-700 leading-normal font-medium">
                   New study published in Nature Genetics regarding the polygenic risk scores for Cardiovascular diseases.
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
