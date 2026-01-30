import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, AlertTriangle, CheckCircle, Building, User, ChevronDown, MoreHorizontal, ToggleLeft, ToggleRight } from 'lucide-react';

import { searchRegistryLive } from '../services/geminiService';

// Enhanced Mock Data
const MOCK_REGISTRY = [
  { 
    id: '1', 
    name: 'TechGlobal Industries', 
    type: 'ORGANIZATION', 
    jurisdiction: 'US', 
    riskScore: 12, 
    riskLevel: 'LOW', 
    lastUpdated: '2024-03-10',
    aliases: ['TGI', 'TechGlobal'],
    description: 'Technology hardware manufacturer and distributor.'
  },
  { 
    id: '2', 
    name: 'Ivan Petrov', 
    type: 'INDIVIDUAL', 
    jurisdiction: 'RU', 
    riskScore: 88, 
    riskLevel: 'CRITICAL', 
    lastUpdated: '2024-02-15',
    aliases: ['Ivan the Terrible'],
    description: 'Known associate of sanctioned entities in energy sector.'
  },
  { 
    id: '3', 
    name: 'Oceanic Shipping Ltd', 
    type: 'ORGANIZATION', 
    jurisdiction: 'PA', 
    riskScore: 45, 
    riskLevel: 'MEDIUM', 
    lastUpdated: '2024-03-01',
    aliases: ['OSL Shipping'],
    description: 'International logistics and maritime transport.'
  },
  { 
    id: '4', 
    name: 'Sarah Connor', 
    type: 'INDIVIDUAL', 
    jurisdiction: 'US', 
    riskScore: 5, 
    riskLevel: 'LOW', 
    lastUpdated: '2024-01-20',
    aliases: [],
    description: 'Civilian with no adverse media.'
  },
  { 
    id: '5', 
    name: 'Apex Holdings', 
    type: 'ORGANIZATION', 
    jurisdiction: 'UK', 
    riskScore: 72, 
    riskLevel: 'HIGH', 
    lastUpdated: '2024-03-12',
    aliases: ['Apex Group'],
    description: 'Holding company with opaque ownership structure.'
  },
  { 
    id: '6', 
    name: 'CryptoVault DAO', 
    type: 'ORGANIZATION', 
    jurisdiction: 'KY', 
    riskScore: 95, 
    riskLevel: 'CRITICAL', 
    lastUpdated: '2024-03-14',
    aliases: ['CVD'],
    description: 'Decentralized autonomous organization linked to mixing services.'
  },
  { 
    id: '7', 
    name: 'Hans Gruber', 
    type: 'INDIVIDUAL', 
    jurisdiction: 'DE', 
    riskScore: 65, 
    riskLevel: 'HIGH', 
    lastUpdated: '2023-11-05',
    aliases: ['Bill Clay'],
    description: 'Person of interest in financial fraud investigation.'
  },
  { 
    id: '8', 
    name: 'Nakatomi Trading', 
    type: 'ORGANIZATION', 
    jurisdiction: 'JP', 
    riskScore: 15, 
    riskLevel: 'LOW', 
    lastUpdated: '2023-12-12',
    aliases: [],
    description: 'Established trading corporation with clean record.'
  },
  { 
    id: '9', 
    name: 'Medellin Exports', 
    type: 'ORGANIZATION', 
    jurisdiction: 'CO', 
    riskScore: 92, 
    riskLevel: 'CRITICAL', 
    lastUpdated: '2024-01-05',
    aliases: [],
    description: 'Company flagged for trade-based money laundering.'
  },
  { 
    id: '10', 
    name: 'Wayne Enterprises', 
    type: 'ORGANIZATION', 
    jurisdiction: 'US', 
    riskScore: 2, 
    riskLevel: 'LOW', 
    lastUpdated: '2024-03-15',
    aliases: ['Wayne Corp'],
    description: 'Multinational conglomerate.'
  },
];

// Simple Levenshtein distance for fuzzy matching
const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  const n = a.length;
  const m = b.length;

  if (n === 0) return m;
  if (m === 0) return n;

  for (let i = 0; i <= n; i++) matrix[i] = [i];
  for (let j = 0; j <= m; j++) matrix[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[n][m];
};

const RegistrySearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFuzzy, setIsFuzzy] = useState(false);
  const [filters, setFilters] = useState({
    jurisdiction: 'ALL',
    type: 'ALL',
    riskLevel: 'ALL'
  });
  
  // Live Search State
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [hasSearchedLive, setHasSearchedLive] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      // Reset live results when search term changes significantly
      if (Math.abs(searchTerm.length - debouncedSearch.length) > 2) {
        setHasSearchedLive(false);
        setLiveResults([]);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleLiveSearch = async () => {
    if (!debouncedSearch) return;
    setIsSearchingLive(true);
    try {
        const results = await searchRegistryLive(debouncedSearch);
        setLiveResults(results);
        setHasSearchedLive(true);
    } catch (e) {
        console.error("Live search failed", e);
    } finally {
        setIsSearchingLive(false);
    }
  };

  // Derived filtered data
  const filteredData = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    
    // Combine mock data and live results
    const combinedData = [...liveResults, ...MOCK_REGISTRY];
    
    return combinedData.filter(item => {
      // 1. Search Logic
      let matchesSearch = false;
      
      if (!query) {
        matchesSearch = true;
      } else {
        // Standard Inclusion Search
        const searchCorpus = [
          item.name,
          item.id,
          item.description,
          ...item.aliases
        ].join(' ').toLowerCase();

        if (searchCorpus.includes(query)) {
          matchesSearch = true;
        } 
        // Fuzzy Search (if enabled)
        else if (isFuzzy) {
          // Check if any word in the name is close to the query
          const nameWords = item.name.toLowerCase().split(' ');
          const queryWords = query.split(' ');
          
          // Allow match if any query word is close to any name word (distance <= 2)
          const fuzzyMatch = queryWords.some(qw => 
            nameWords.some(nw => {
               // Only apply fuzzy if words are somewhat comparable in length to avoid short noise
               if (Math.abs(qw.length - nw.length) > 3) return false;
               const dist = getLevenshteinDistance(qw, nw);
               return dist <= 2; // threshold
            })
          );
          
          matchesSearch = fuzzyMatch;
        }
      }

      // 2. Filter Logic
      const matchesJurisdiction = filters.jurisdiction === 'ALL' || item.jurisdiction === filters.jurisdiction;
      const matchesType = filters.type === 'ALL' || item.type === filters.type;
      const matchesRisk = filters.riskLevel === 'ALL' || item.riskLevel === filters.riskLevel;

      return matchesSearch && matchesJurisdiction && matchesType && matchesRisk;
    });
  }, [debouncedSearch, filters, isFuzzy]);

  const uniqueJurisdictions = Array.from(new Set(MOCK_REGISTRY.map(i => i.jurisdiction))).sort();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Global KYC Registry</h1>
        <p className="text-slate-500">Search and filter existing profiles in the centralized compliance database.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
        {/* Search Bar & Toggles */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by Name, ID, Alias, or Keyword..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => setIsFuzzy(!isFuzzy)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
              isFuzzy 
                ? 'bg-cyan-50 border-cyan-500 text-cyan-700' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {isFuzzy ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            <span className="text-sm font-medium">Fuzzy Search</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Jurisdiction Filter */}
          <div className="relative">
             <label className="text-xs text-slate-500 font-medium ml-1 mb-1 block">JURISDICTION</label>
             <div className="relative">
               <select 
                 className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 appearance-none focus:outline-none focus:border-cyan-500"
                 value={filters.jurisdiction}
                 onChange={(e) => setFilters(prev => ({ ...prev, jurisdiction: e.target.value }))}
               >
                 <option value="ALL">All Jurisdictions</option>
                 {uniqueJurisdictions.map(j => <option key={j} value={j}>{j}</option>)}
               </select>
               <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
             </div>
          </div>

          {/* Entity Type Filter */}
          <div className="relative">
             <label className="text-xs text-slate-500 font-medium ml-1 mb-1 block">ENTITY TYPE</label>
             <div className="relative">
                <select 
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 appearance-none focus:outline-none focus:border-brand-500"
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="ALL">All Types</option>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="ORGANIZATION">Organization</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
             </div>
          </div>

          {/* Risk Level Filter */}
          <div className="relative">
             <label className="text-xs text-slate-500 font-medium ml-1 mb-1 block">RISK LEVEL</label>
             <div className="relative">
                <select 
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 appearance-none focus:outline-none focus:border-brand-500"
                  value={filters.riskLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                >
                  <option value="ALL">All Levels</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
             </div>
          </div>
        </div>

        {/* Global Live Search Trigger */}
        {debouncedSearch.length > 2 && !hasSearchedLive && (
            <div className="pt-2 border-t border-slate-800 mt-2">
                <button 
                    onClick={handleLiveSearch}
                    disabled={isSearchingLive}
                    className="w-full py-3 flex items-center justify-center gap-2 text-brand-400 hover:bg-slate-900/50 rounded-lg transition-colors border border-dashed border-slate-700 hover:border-brand-500/50"
                >
                    {isSearchingLive ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent"/> : <Search size={16} />}
                    {isSearchingLive ? "Scanning Global Registries (Gemini Deep Search)..." : `Run Global Live Search for "${debouncedSearch}"`}
                </button>
            </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Entity Name & Details</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Jurisdiction</th>
                <th className="px-6 py-4 font-medium">Risk Score</th>
                <th className="px-6 py-4 font-medium">Last Updated</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg mt-1 ${item.type === 'ORGANIZATION' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                          {item.type === 'ORGANIZATION' ? <Building size={16} /> : <User size={16} />}
                        </div>
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <div className="text-xs text-slate-500 mt-1 max-w-xs line-clamp-2">
                             {item.aliases.length > 0 && <span className="text-slate-400 mr-2">AKA: {item.aliases.join(', ')}</span>}
                             <span>{item.description}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-medium border border-slate-700">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{item.jurisdiction}</td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${
                            item.riskLevel === 'CRITICAL' ? 'bg-red-500' :
                            item.riskLevel === 'HIGH' ? 'bg-orange-500' :
                            item.riskLevel === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                         }`}></div>
                         <span className={`${
                            item.riskLevel === 'CRITICAL' ? 'text-red-400' :
                            item.riskLevel === 'HIGH' ? 'text-orange-400' :
                            item.riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
                         } font-medium`}>
                           {item.riskScore} / 100
                         </span>
                       </div>
                    </td>
                    <td className="px-6 py-4">{item.lastUpdated}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Filter size={32} className="text-slate-700" />
                      <p>No matching records found.</p>
                      <button 
                        onClick={() => { setSearchTerm(''); setFilters({ jurisdiction: 'ALL', type: 'ALL', riskLevel: 'ALL' }); }}
                        className="text-brand-400 hover:underline text-xs"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
           <span>Showing {filteredData.length} records</span>
           <div className="flex gap-1">
             <button disabled className="px-2 py-1 bg-slate-800 rounded disabled:opacity-50">Prev</button>
             <button disabled className="px-2 py-1 bg-slate-800 rounded disabled:opacity-50">Next</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrySearch;