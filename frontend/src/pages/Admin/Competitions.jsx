import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { competitionsAPI } from '../../services/api';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

const Competitions = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState(null);
  const [scrapedCompetitions, setScrapedCompetitions] = useState([]);
  const [selectedCompetitions, setSelectedCompetitions] = useState(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [competitionStatuses, setCompetitionStatuses] = useState({}); // { tempId: 'new' | 'exists' | 'changed' }
  const [filterSport, setFilterSport] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [filterRank, setFilterRank] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null); // 'sport' | 'groups' | 'rank' | null
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'all'
  const [selectedGroupFilters, setSelectedGroupFilters] = useState(new Set()); // Set of 'children' | 'youth' | 'adults'
  const [searchQuery, setSearchQuery] = useState('');
  const [mainFilterSport, setMainFilterSport] = useState('');
  const [mainFilterRank, setMainFilterRank] = useState('');
  const [openMainDropdown, setOpenMainDropdown] = useState(null);
  const { showToast, ToastComponent } = useToast();

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    title: '',
    location: '',
    sport: '',
    groups: '',
    rank: '',
  });

  useEffect(() => {
    fetchCompetitions();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking inside the dropdown
      if (!e.target.closest('.multi-select-dropdown')) {
        setOpenDropdown(null);
      }
    };
    
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openDropdown]);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const response = await competitionsAPI.getCompetitionsAdmin();
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

  // Helper функция за scroll до елемент
  const scrollToElement = (elementId) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleImportClick = async () => {
    try {
      setIsScraping(true);
      console.log('Starting import from БФКА...');
      const response = await competitionsAPI.previewImport();
      console.log('Import response:', response);
      const scraped = response.data.competitions || [];
      console.log(`Found ${scraped.length} competitions`);
      
      if (scraped.length === 0) {
        showToast('Не са намерени състезания за импортиране', 'warning');
        setIsScraping(false);
        return;
      }
      
      setScrapedCompetitions(scraped);
      
      // Check for duplicates and changes
      const statuses = {};
      scraped.forEach((comp) => {
        const existing = competitions.find(existingComp => {
          // Check if same title and location (might be same competition)
          const sameTitle = existingComp.title.toLowerCase().trim() === comp.title.toLowerCase().trim();
          const sameLocation = existingComp.location.toLowerCase().trim() === comp.location.toLowerCase().trim();
          
          if (sameTitle && sameLocation) {
            // Check if date is different (changed)
            const existingDate = new Date(existingComp.date);
            const newDate = new Date(comp.date);
            const dateDiff = Math.abs(existingDate.getTime() - newDate.getTime());
            const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
            
            if (daysDiff < 1) {
              // Same date - exact duplicate
              return true;
            } else {
              // Different date - changed
              return 'changed';
            }
          }
          return false;
        });
        
        if (existing === true) {
          statuses[comp.tempId] = 'exists';
        } else if (existing === 'changed') {
          statuses[comp.tempId] = 'changed';
        } else {
          statuses[comp.tempId] = 'new';
        }
      });
      
      setCompetitionStatuses(statuses);
      
      // Auto-select upcoming competitions (not past)
      const now = new Date();
      const autoSelected = new Set();
      scraped.forEach((comp) => {
        const compDate = new Date(comp.date);
        // Select upcoming competitions (date >= today)
        if (compDate >= now) {
          autoSelected.add(comp.tempId);
        }
      });
      setSelectedCompetitions(autoSelected);
      setShowImportModal(true);
    } catch (error) {
      console.error('Error scraping competitions:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      
      let errorMessage = 'Грешка при импортиране от БФКА';
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      } else if (error.response?.status === 403) {
        errorMessage = 'Нямате права за импортиране на състезания';
      } else if (error.response?.status === 401) {
        errorMessage = 'Сесията ви е изтекла. Моля, влезте отново.';
      } else if (!error.response) {
        errorMessage = 'Не може да се свърже със сървъра. Проверете интернет връзката.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setIsScraping(false);
    }
  };

  const handleImportSelected = async () => {
    try {
      setIsImporting(true);
      const selected = Array.from(selectedCompetitions).map(id => {
        return scrapedCompetitions.find(c => c.tempId === id);
      }).filter(Boolean);

      await competitionsAPI.importCompetitions(selected);
      showToast('Състезанията са импортирани успешно', 'success');
      setShowImportModal(false);
      setSelectedCompetitions(new Set());
      setScrapedCompetitions([]);
      fetchCompetitions();
    } catch (error) {
      console.error('Error importing competitions:', error);
      showToast(
        error.response?.data?.error?.message || 'Грешка при импортиране на състезания',
        'error'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddClick = () => {
    setFormData({
      date: '',
      time: '',
      title: '',
      location: '',
      sport: '',
      groups: '',
      rank: '',
    });
    setShowAddModal(true);
  };

  const handleEditClick = (competition) => {
    const date = new Date(competition.date);
    setFormData({
      date: date.toISOString().split('T')[0],
      time: format(date, 'HH:mm'),
      title: competition.title,
      location: competition.location,
      sport: competition.sport,
      groups: competition.groups || '',
      rank: competition.rank,
    });
    setEditingCompetition(competition);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      
      const data = {
        date: dateTime.toISOString(),
        title: formData.title,
        location: formData.location,
        sport: formData.sport,
        groups: formData.groups || '',
        rank: formData.rank,
      };

      if (editingCompetition) {
        const response = await competitionsAPI.updateCompetition(editingCompetition._id, data);
        const updatedCompetition = response.data.competition;
        
        // Обновяваме само редактираното състезание в масива
        setCompetitions(prev => prev.map(c => c._id === editingCompetition._id ? updatedCompetition : c));
        
        showToast('Състезанието е обновено успешно', 'success');
        setShowEditModal(false);
        setEditingCompetition(null);
        setFormData({
          date: '',
          time: '',
          title: '',
          location: '',
          sport: '',
          groups: '',
          rank: '',
        });
        
        // Скролваме до редактираното състезание
        scrollToElement(`competition-${editingCompetition._id}`);
      } else {
        // For new competitions, we use import with single item
        // Add tempId for compatibility with import function
        const dataWithTempId = {
          ...data,
          tempId: Date.now(), // Temporary ID for import compatibility
        };
        const response = await competitionsAPI.importCompetitions([dataWithTempId]);
        const newCompetitions = response.data.competitions || [];
        
        // Добавяме новите състезания в масива
        if (newCompetitions.length > 0) {
          setCompetitions(prev => [...prev, ...newCompetitions].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
          ));
          
          // Скролваме до първото ново състезание
          scrollToElement(`competition-${newCompetitions[0]._id}`);
        } else {
          // If competitions array is not in response, refetch all competitions
          await fetchCompetitions();
        }
        
        showToast('Състезанието е добавено успешно', 'success');
        setShowAddModal(false);
        setFormData({
          date: '',
          time: '',
          title: '',
          location: '',
          sport: '',
          groups: '',
          rank: '',
        });
      }
    } catch (error) {
      console.error('Error saving competition:', error);
      showToast(
        error.response?.data?.error?.message || 'Грешка при запазване на състезанието',
        'error'
      );
    }
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteCompetitionId, setDeleteCompetitionId] = useState(null);

  const handleDelete = (id) => {
    setDeleteCompetitionId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteCompetitionId) return;

    try {
      await competitionsAPI.deleteCompetition(deleteCompetitionId);
      
      // Премахваме състезанието от масива
      setCompetitions(prev => prev.filter(c => c._id !== deleteCompetitionId));
      
      showToast('Състезанието е изтрито успешно', 'success');
      setShowDeleteDialog(false);
      setDeleteCompetitionId(null);
    } catch (error) {
      console.error('Error deleting competition:', error);
      showToast(
        error.response?.data?.error?.message || 'Грешка при изтриване на състезанието',
        'error'
      );
    }
  };

  const toggleSelection = (tempId) => {
    const newSelected = new Set(selectedCompetitions);
    if (newSelected.has(tempId)) {
      newSelected.delete(tempId);
    } else {
      newSelected.add(tempId);
    }
    setSelectedCompetitions(newSelected);
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredCompetitions();
    const filteredIds = filtered.map(c => c.tempId);
    const allFilteredSelected = filteredIds.every(id => selectedCompetitions.has(id));
    
    const newSelected = new Set(selectedCompetitions);
    if (allFilteredSelected) {
      // Deselect all filtered
      filteredIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all filtered
      filteredIds.forEach(id => newSelected.add(id));
    }
    setSelectedCompetitions(newSelected);
  };

  const getFilteredCompetitions = () => {
    return scrapedCompetitions.filter(comp => {
      if (filterSport.length > 0) {
        const compSport = comp.sport?.trim() || '';
        if (!filterSport.includes(compSport)) {
          return false;
        }
      }
      if (filterGroups.length > 0) {
        const compGroups = comp.groups?.trim() || '';
        if (!filterGroups.includes(compGroups)) {
          return false;
        }
      }
      if (filterRank.length > 0) {
        const compRank = comp.rank?.trim() || '';
        if (!filterRank.includes(compRank)) {
          return false;
        }
      }
      return true;
    });
  };

  const getUniqueValues = (field) => {
    const values = new Set();
    scrapedCompetitions.forEach(comp => {
      const value = comp[field];
      if (value && value.trim()) {
        values.add(value.trim());
      }
    });
    return Array.from(values).sort();
  };

  const toggleFilterValue = (filterType, value) => {
    if (filterType === 'sport') {
      setFilterSport(prev => 
        prev.includes(value) 
          ? prev.filter(v => v !== value)
          : [...prev, value]
      );
    } else if (filterType === 'groups') {
      setFilterGroups(prev => 
        prev.includes(value) 
          ? prev.filter(v => v !== value)
          : [...prev, value]
      );
    } else if (filterType === 'rank') {
      setFilterRank(prev => 
        prev.includes(value) 
          ? prev.filter(v => v !== value)
          : [...prev, value]
      );
    }
  };

  const MultiSelectDropdown = ({ label, filterType, values, selectedValues, onToggle }) => {
    const isOpen = openDropdown === filterType;
    const displayText = selectedValues.length === 0 
      ? `Всички ${label.toLowerCase()}` 
      : selectedValues.length === 1 
      ? selectedValues[0] 
      : `${selectedValues.length} избрани`;

    return (
      <div className="relative multi-select-dropdown">
        <label className="block text-xs font-medium text-neutral-950 mb-1">{label}</label>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(isOpen ? null : filterType);
          }}
          className="w-full px-3 py-2 text-sm border border-[rgba(0,0,0,0.1)] rounded-[10px] bg-white text-left flex items-center justify-between hover:border-[rgba(0,0,0,0.2)]"
        >
          <span className="truncate">{displayText}</span>
          <span className="ml-2 text-[#4a5565]">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && (
          <div 
            className="absolute z-20 w-full mt-1 bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] shadow-lg max-h-60 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              {values.map(value => (
                <label
                  key={value}
                  className="flex items-center px-2 py-1.5 hover:bg-[#f3f3f5] rounded cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(value)}
                    onChange={() => onToggle(filterType, value)}
                    className="rounded mr-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm text-neutral-950">{value}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-950">Състезания</h1>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            onClick={handleImportClick}
            disabled={isScraping}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-[8px] px-4 py-2 h-9 flex items-center gap-2 disabled:bg-gray-300"
          >
            {isScraping ? 'Импортиране...' : 'Импортирай от БФКА'}
          </Button>
          <Button
            onClick={handleAddClick}
            className="bg-[#ea7a24] hover:bg-[#d86a1a] text-white rounded-[8px] px-4 py-2 h-9 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добави състезание
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-[#ea7a24] text-white'
              : 'bg-white border border-[#d1d5dc] text-[#35383d] hover:bg-gray-50'
          }`}
        >
          Предстоящи
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
            activeTab === 'past'
              ? 'bg-[#ea7a24] text-white'
              : 'bg-white border border-[#d1d5dc] text-[#35383d] hover:bg-gray-50'
          }`}
        >
          Минали
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
            activeTab === 'all'
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
              className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                selectedGroupFilters.has('children')
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
              className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                selectedGroupFilters.has('youth')
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
              className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                selectedGroupFilters.has('adults')
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
              ? 'Няма импортирани състезания. Използвайте бутона "Импортирай от БФКА" или "Добави състезание".'
              : 'Няма състезания, отговарящи на избраните филтри.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="bg-[#35383d]">
                  <th className="text-left py-2 px-2 text-sm font-medium text-white">Дата</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-white">Заглавие</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-white">Място</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-white">Спорт</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-white">Групи</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-white">Ранг</th>
                  <th className="text-center py-2 px-2 text-sm font-medium text-white">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitionsList.map((competition, index) => {
                  const date = new Date(competition.date);
                  const isEven = index % 2 === 0;
                  return (
                    <tr
                      key={competition._id}
                      id={`competition-${competition._id}`}
                      className={`border-b border-[rgba(0,0,0,0.1)] cursor-pointer ${
                        isEven ? 'bg-white' : 'bg-neutral-50'
                      } hover:bg-gray-100`}
                      onClick={() => navigate(`/admin/competitions/${competition._id}`)}
                    >
                      <td className="py-4 px-2 text-sm text-neutral-950">
                        {format(date, 'dd.MM.yyyy')}
                      </td>
                      <td className="py-4 px-2 text-sm text-neutral-950 font-normal">
                        {competition.title}
                      </td>
                      <td className="py-4 px-2 text-sm text-neutral-950">
                        {competition.location}
                      </td>
                      <td className="py-4 px-2">
                        {competition.sport && (
                          <span className="inline-block bg-[#e3f2fd] border border-[#e3f2fd] text-[#1976d2] text-xs font-medium px-2 py-1 rounded-[8px]">
                            {competition.sport}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        {competition.groups ? (
                          <span className="inline-block bg-[#f3e5f5] border border-[#f3e5f5] text-[#7b1fa2] text-xs font-medium px-2 py-1 rounded-[8px]">
                            {competition.groups}
                          </span>
                        ) : (
                          <span className="text-sm text-[#4a5565]">-</span>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        {competition.rank && (
                          <span className="inline-block bg-[#eddcca] border border-[#eddcca] text-[#35383d] text-xs font-medium px-2 py-1 rounded-[8px]">
                            {competition.rank}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(competition)}
                            className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-gray-200 transition-colors"
                            title="Редактирай"
                          >
                            <svg className="w-4 h-4 text-[#35383d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(competition._id)}
                            className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-red-100 transition-colors"
                            title="Изтрий"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[rgba(0,0,0,0.1)]">
              {filteredCompetitionsList.map((competition) => {
                const date = new Date(competition.date);
                return (
                  <div
                    key={competition._id}
                    id={`competition-${competition._id}`}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/competitions/${competition._id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-neutral-950 mb-1">{competition.title}</h3>
                        <p className="text-xs text-[#4a5565] mb-2">{format(date, 'dd.MM.yyyy')} • {competition.location}</p>
                      </div>
                      <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditClick(competition)}
                          className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-gray-200"
                        >
                          <svg className="w-4 h-4 text-[#35383d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(competition._id)}
                          className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-red-100"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {competition.sport && (
                        <span className="bg-[#e3f2fd] border border-[#e3f2fd] text-[#1976d2] text-xs font-medium px-2 py-1 rounded-[8px]">
                          {competition.sport}
                        </span>
                      )}
                      {competition.groups && (
                        <span className="bg-[#f3e5f5] border border-[#f3e5f5] text-[#7b1fa2] text-xs font-medium px-2 py-1 rounded-[8px]">
                          {competition.groups}
                        </span>
                      )}
                      {competition.rank && (
                        <span className="bg-[#eddcca] border border-[#eddcca] text-[#35383d] text-xs font-medium px-2 py-1 rounded-[8px]">
                          {competition.rank}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-[rgba(0,0,0,0.1)] rounded-[10px]">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-base font-medium text-neutral-950 pr-2">
                Импортиране от БФКА ({selectedCompetitions.size} избрани)
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedCompetitions(new Set());
                  setScrapedCompetitions([]);
                  setCompetitionStatuses({});
                  setFilterSport([]);
                  setFilterGroups([]);
                  setFilterRank([]);
                  setOpenDropdown(null);
                }}
                className="text-[#4a5565] hover:text-[#35383d] text-2xl flex-shrink-0 w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="mb-4 space-y-3">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <MultiSelectDropdown
                  label="Филтър по Спорт"
                  filterType="sport"
                  values={getUniqueValues('sport')}
                  selectedValues={filterSport}
                  onToggle={toggleFilterValue}
                />
                <MultiSelectDropdown
                  label="Филтър по Групи"
                  filterType="groups"
                  values={getUniqueValues('groups')}
                  selectedValues={filterGroups}
                  onToggle={toggleFilterValue}
                />
                <MultiSelectDropdown
                  label="Филтър по Ранг"
                  filterType="rank"
                  values={getUniqueValues('rank')}
                  selectedValues={filterRank}
                  onToggle={toggleFilterValue}
                />
              </div>
              
              {/* Select All/None buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={toggleSelectAll}
                  variant="secondary"
                  className="text-sm bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
                >
                  {getFilteredCompetitions().every(c => selectedCompetitions.has(c.tempId)) && getFilteredCompetitions().length > 0
                    ? 'Отмени всички (филтрирани)' 
                    : 'Избери всички (филтрирани)'}
                </Button>
                {(filterSport.length > 0 || filterGroups.length > 0 || filterRank.length > 0) && (
                  <Button
                    onClick={() => {
                      setFilterSport([]);
                      setFilterGroups([]);
                      setFilterRank([]);
                    }}
                    variant="secondary"
                    className="text-sm bg-gray-200 hover:bg-gray-300 text-[#35383d] rounded-[10px]"
                  >
                    Изчисти филтри
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.1)]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-neutral-950 w-12">
                      <input
                        type="checkbox"
                        checked={getFilteredCompetitions().every(c => selectedCompetitions.has(c.tempId)) && getFilteredCompetitions().length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-neutral-950">Дата</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-neutral-950">Заглавие</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-neutral-950">Място</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-neutral-950">Спорт</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-neutral-950">Групи</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-neutral-950">Ранг</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredCompetitions().map((comp) => {
                    const date = new Date(comp.date);
                    const status = competitionStatuses[comp.tempId] || 'new';
                    const bgColor = status === 'exists' 
                      ? 'bg-green-50 hover:bg-green-100' 
                      : status === 'changed' 
                      ? 'bg-orange-50 hover:bg-orange-100' 
                      : 'hover:bg-[#f3f3f5]';
                    const statusText = status === 'exists' 
                      ? ' (Вече съществува)' 
                      : status === 'changed' 
                      ? ' (Променена дата)' 
                      : '';
                    
                    return (
                      <tr key={comp.tempId} className={`border-b border-[rgba(0,0,0,0.1)] ${bgColor}`}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={selectedCompetitions.has(comp.tempId)}
                            onChange={() => toggleSelection(comp.tempId)}
                            className="rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-xs text-[#4a5565]">
                          {format(date, 'dd.MM.yyyy')}
                        </td>
                        <td className="py-2 px-3 text-xs text-neutral-950">
                          {comp.title}
                          {statusText && <span className="text-xs text-[#4a5565] italic">{statusText}</span>}
                        </td>
                        <td className="py-2 px-3 text-xs text-[#4a5565]">{comp.location}</td>
                        <td className="py-2 px-3 text-xs text-[#4a5565]">{comp.sport}</td>
                        <td className="py-2 px-3 text-xs text-[#4a5565]">{comp.groups || '-'}</td>
                        <td className="py-2 px-3 text-xs text-[#4a5565]">{comp.rank}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedCompetitions(new Set());
                  setScrapedCompetitions([]);
                  setCompetitionStatuses({});
                  setFilterSport([]);
                  setFilterGroups([]);
                  setFilterRank([]);
                  setOpenDropdown(null);
                }}
                variant="secondary"
                className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
              >
                Отказ
              </Button>
              <Button
                onClick={handleImportSelected}
                disabled={selectedCompetitions.size === 0 || isImporting}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-[10px] disabled:bg-gray-300"
              >
                {isImporting ? 'Импортиране...' : `Импортирай (${selectedCompetitions.size})`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full border border-[rgba(0,0,0,0.1)] rounded-[10px]">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-base font-medium text-neutral-950 pr-2">
                {editingCompetition ? 'Редактиране на състезание' : 'Добавяне на състезание'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingCompetition(null);
                  setFormData({
                    date: '',
                    time: '',
                    title: '',
                    location: '',
                    sport: '',
                    groups: '',
                    rank: '',
                  });
                }}
                className="text-[#4a5565] hover:text-[#35383d] text-2xl flex-shrink-0 w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-950 mb-1">Дата *</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-950 mb-1">Час *</label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-950 mb-1">Заглавие *</label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например: Национално първенство"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-950 mb-1">Място *</label>
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Например: София, България"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-950 mb-1">Спорт *</label>
                <Input
                  type="text"
                  value={formData.sport}
                  onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                  placeholder="Например: спортно катерене"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-950 mb-1">Групи</label>
                <Input
                  type="text"
                  value={formData.groups}
                  onChange={(e) => setFormData({ ...formData, groups: e.target.value })}
                  placeholder="Например: Мъже, Жени"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-950 mb-1">Ранг *</label>
                <Input
                  type="text"
                  value={formData.rank}
                  onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                  placeholder="Например: Национално"
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingCompetition(null);
                }}
                variant="secondary"
                className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
              >
                Отказ
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.date || !formData.time || !formData.title || !formData.location || !formData.sport || !formData.rank}
                className="bg-[#ea7a24] hover:bg-[#d86a1a] text-white rounded-[10px] disabled:bg-gray-300"
              >
                Запази
              </Button>
            </div>
          </Card>
        </div>
      )}

        <ToastComponent />
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Изтриване на състезание"
          message="Сигурни ли сте, че искате да изтриете това състезание?"
          confirmText="Изтрий"
          cancelText="Отказ"
          variant="danger"
        />
      </div>
    </div>
  );
};

export default Competitions;

