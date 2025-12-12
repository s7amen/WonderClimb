import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { competitionsAPI } from '../../services/api';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import CompetitionsTable from '../../components/Competitions/CompetitionsTable';

const Competition = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'all'
  const [selectedGroupFilters, setSelectedGroupFilters] = useState(new Set()); // Set of 'children' | 'youth' | 'adults'
  const [searchQuery, setSearchQuery] = useState('');
  const [mainFilterSport, setMainFilterSport] = useState('');
  const [mainFilterRank, setMainFilterRank] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const response = await competitionsAPI.getCompetitions();
      setCompetitions(response.data.competitions || []);
    } catch (error) {
      console.error('Error fetching competitions:', error);
      showToast(
        error.response?.data?.error?.message || 'Грешка при зареждане на състезания',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Check if competition matches group filters
  const matchesGroupFilters = (comp, groupFilters) => {
    if (!groupFilters || groupFilters.size === 0 || !comp.groups) return true;

    const groupsLower = comp.groups.toLowerCase().trim();

    // Check if competition matches any of the selected filters
    let matchesAny = false;

    if (groupFilters.has('children')) {
      // Check for children-related keywords (деца, детски, децата, etc.)
      if (groupsLower.includes('деца') ||
        groupsLower.includes('детски') ||
        groupsLower.includes('децата') ||
        groupsLower.includes('детска')) {
        matchesAny = true;
      }
    }

    if (groupFilters.has('youth')) {
      // Check for youth-related keywords (юноши, девойки, etc.)
      if (groupsLower.includes('юноши') ||
        groupsLower.includes('девойки') ||
        groupsLower.includes('юношеск') ||
        groupsLower.includes('девойк')) {
        matchesAny = true;
      }
    }

    if (groupFilters.has('adults')) {
      // Check for adults-related keywords (мъже, жени, etc.)
      if (groupsLower.includes('мъже') ||
        groupsLower.includes('жени') ||
        groupsLower.includes('мъжк') ||
        groupsLower.includes('женск')) {
        matchesAny = true;
      }
    }

    return matchesAny;
  };

  // Filter competitions based on active tab
  const getFilteredCompetitionsList = () => {
    const now = new Date();
    let filtered = competitions;

    // Filter by tab
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(comp => new Date(comp.date) >= now);
    } else if (activeTab === 'past') {
      filtered = filtered.filter(comp => new Date(comp.date) < now);
    }
    // 'all' shows everything

    // Filter by groups (can have multiple selected)
    if (selectedGroupFilters.size > 0) {
      filtered = filtered.filter(comp => matchesGroupFilters(comp, selectedGroupFilters));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(comp =>
        comp.title?.toLowerCase().includes(query) ||
        comp.location?.toLowerCase().includes(query)
      );
    }

    // Filter by sport
    if (mainFilterSport) {
      filtered = filtered.filter(comp => comp.sport?.trim() === mainFilterSport);
    }

    // Filter by rank
    if (mainFilterRank) {
      filtered = filtered.filter(comp => comp.rank?.trim() === mainFilterRank);
    }

    return filtered;
  };

  const getUniqueMainValues = (field) => {
    const values = new Set();
    competitions.forEach(comp => {
      const value = comp[field];
      if (value && value.trim()) {
        values.add(value.trim());
      }
    });
    return Array.from(values).sort();
  };

  if (loading) {
    return <Loading text="Зареждане на състезания..." />;
  }

  const filteredCompetitionsList = getFilteredCompetitionsList();

  return (
    <div className="space-y-4 md:space-y-6 bg-[#f8f9fa] p-4 md:p-6 rounded-[10px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-base font-medium text-neutral-950 mb-1">Състезания</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${activeTab === 'upcoming'
            ? 'bg-[#ea7a24] text-white'
            : 'bg-white border border-[#d1d5dc] text-[#35383d] hover:bg-gray-50'
            }`}
        >
          Предстоящи
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${activeTab === 'past'
            ? 'bg-[#ea7a24] text-white'
            : 'bg-white border border-[#d1d5dc] text-[#35383d] hover:bg-gray-50'
            }`}
        >
          Минали
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${activeTab === 'all'
            ? 'bg-[#ea7a24] text-white'
            : 'bg-white border border-[#d1d5dc] text-[#35383d] hover:bg-gray-50'
            }`}
        >
          Всички
        </button>
      </div>

      {/* Filters and Search */}
      <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px] p-4">
        <div className="flex flex-col gap-3">
          {/* Search and Filters Row */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-0 h-9 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-[#35383d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Търси по заглавие или място..."
                className="pl-10 w-full h-9 mb-0"
              />
            </div>

            {/* Sport Filter */}
            <div className="relative w-full md:w-auto min-w-[169px]">
              <select
                value={mainFilterSport}
                onChange={(e) => setMainFilterSport(e.target.value)}
                className="w-full h-9 px-3 py-2 text-sm bg-[#f3f3f5] border border-[#d1d5dc] rounded-[8px] text-neutral-950"
              >
                <option value="">Всички спортове</option>
                {getUniqueMainValues('sport').map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </div>

            {/* Rank Filter */}
            <div className="relative w-full md:w-auto min-w-[212px]">
              <select
                value={mainFilterRank}
                onChange={(e) => setMainFilterRank(e.target.value)}
                className="w-full h-9 px-3 py-2 text-sm bg-[#f3f3f5] border border-[#d1d5dc] rounded-[8px] text-neutral-950"
              >
                <option value="">Всички рангове</option>
                {getUniqueMainValues('rank').map(rank => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Group Filter */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                const newFilters = new Set(selectedGroupFilters);
                if (newFilters.has('children')) {
                  newFilters.delete('children');
                } else {
                  newFilters.add('children');
                }
                setSelectedGroupFilters(newFilters);
              }}
              className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${selectedGroupFilters.has('children')
                ? 'bg-[#ea7a24] text-white'
                : 'bg-white border border-[#d1d5dc] text-[#35383d] hover:bg-gray-50'
                }`}
            >
              Деца
            </button>
            <button
              onClick={() => {
                const newFilters = new Set(selectedGroupFilters);
                if (newFilters.has('youth')) {
                  newFilters.delete('youth');
                } else {
                  newFilters.add('youth');
                }
                setSelectedGroupFilters(newFilters);
              }}
              className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${selectedGroupFilters.has('youth')
                ? 'bg-[#ea7a24] text-white'
                : 'bg-white border border-[#d1d5dc] text-[#35383d] hover:bg-gray-50'
                }`}
            >
              Юноши и девойки
            </button>
            <button
              onClick={() => {
                const newFilters = new Set(selectedGroupFilters);
                if (newFilters.has('adults')) {
                  newFilters.delete('adults');
                } else {
                  newFilters.add('adults');
                }
                setSelectedGroupFilters(newFilters);
              }}
              className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${selectedGroupFilters.has('adults')
                ? 'bg-[#ea7a24] text-white'
                : 'bg-white border border-[#d1d5dc] text-[#35383d] hover:bg-gray-50'
                }`}
            >
              Мъже и жени
            </button>
          </div>
        </div>
      </Card>

      {/* Competitions Table */}
      <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px] p-0 overflow-hidden">
        {filteredCompetitionsList.length === 0 ? (
          <div className="text-center text-[#4a5565] py-8 px-4">
            {competitions.length === 0
              ? 'Няма налични състезания.'
              : 'Няма състезания, отговарящи на избраните филтри.'}
          </div>
        ) : (
          <CompetitionsTable
            competitions={filteredCompetitionsList}
            onRowClick={(comp) => navigate(`/competitions/${comp._id}`)}
          />
        )}
      </Card>
    </div>
  );
};

export default Competition;

