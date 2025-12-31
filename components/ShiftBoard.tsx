import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Staff, Schedule, ShiftPeriod } from '../types';
import { getDaysInMonth, formatDateISO, formatDayMonth, calculateMonthlyTarget, groupDaysByWeek } from '../utils';
import { ChevronLeft, ChevronRight, Loader2, Filter, X, Copy, Sun, Moon, BarChart2, Users, Clock, Calendar, List } from 'lucide-react';

const SHIFT_PERIODS: ShiftPeriod[] = ['07-13', '13-19', '19-00', '00-07'];

// --- TYPES ---
interface DayDetail {
  staff: Staff;
  hours: number;
  isExtra: boolean;
  shifts: string[];
}

// --- MODAL: Daily List (Drill-down) ---
interface DailyListModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  type: 'day' | 'night' | null;
  schedules: Schedule[];
  staff: Staff[];
  roleFilter: string;
}

const DailyListModal: React.FC<DailyListModalProps> = ({ isOpen, onClose, date, type, schedules, staff, roleFilter }) => {
  if (!isOpen || !date) return null;

  const dateStr = formatDateISO(date);
  
  // Define slots based on type
  const targetSlots = type === 'day' ? ['07-13', '13-19'] : ['19-00', '00-07'];
  
  // Filter Data
  const shiftsOnDay = schedules.filter(s => s.date === dateStr && targetSlots.includes(s.shift_slot));
  const uniqueStaffIds = Array.from(new Set(shiftsOnDay.map(s => s.staff_id)));

  const list: DayDetail[] = [];
  uniqueStaffIds.forEach(id => {
      const person = staff.find(s => s.id === id);
      if (!person) return;
      if (roleFilter !== 'all' && person.roles?.name !== roleFilter) return;

      const personShifts = shiftsOnDay.filter(s => s.staff_id === id);
      const hours = personShifts.length * 6;
      
      list.push({
          staff: person,
          hours,
          isExtra: personShifts.some(s => s.is_extra),
          shifts: personShifts.map(s => s.shift_slot)
      });
  });

  const sortedList = list.sort((a, b) => b.hours - a.hours);
  const totalHours = list.reduce((acc, curr) => acc + curr.hours, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className={`p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center ${type === 'day' ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-indigo-50 dark:bg-indigo-900/10'}`}>
              <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {type === 'day' ? <Sun className="text-amber-600" size={20} /> : <Moon className="text-indigo-600" size={20} />}
                    <span>Lista Nominal - {type === 'day' ? 'Diurno' : 'Noturno'}</span>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
              </div>
              <button onClick={onClose} className="bg-white dark:bg-gray-800 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm">
                  <X size={20} className="text-gray-500" />
              </button>
          </div>
          
          {/* Summary */}
          <div className="px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex justify-between text-xs font-medium uppercase tracking-wider text-gray-500">
             <span>{list.length} Profissionais</span>
             <span>Total: {totalHours} Horas</span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50 dark:bg-gray-950/50">
             {sortedList.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <List size={40} className="mb-2 opacity-20"/>
                    <p>Ninguém escalado neste período.</p>
                 </div>
             ) : (
                sortedList.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center">
                        <div>
                            <div className="font-bold text-gray-800 dark:text-gray-200">{item.staff.full_name}</div>
                            <div className="text-[10px] uppercase font-bold text-gray-400">{item.staff.roles?.name}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.isExtra ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                {item.hours}h
                            </span>
                        </div>
                    </div>
                ))
             )}
          </div>
       </div>
    </div>
  );
};

// --- MODAL: Shift Editing (Existing) ---
interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  date: Date;
  currentShifts: Schedule[];
  onSave: (shifts: ShiftPeriod[], isExtra: boolean, replicateDays: number[]) => void;
  allDays: Date[];
}

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, staff, date, currentShifts, onSave, allDays }) => {
  if (!isOpen) return null;

  const [selectedPeriods, setSelectedPeriods] = useState<ShiftPeriod[]>([]);
  const [isExtra, setIsExtra] = useState(false);
  const [replicateMode, setReplicateMode] = useState<boolean>(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

  useEffect(() => {
    const active = currentShifts.map(s => s.shift_slot);
    setSelectedPeriods(active);
    setIsExtra(currentShifts.some(s => s.is_extra));
    setReplicateMode(false);
    setSelectedWeekdays([]);
  }, [currentShifts, isOpen]);

  const togglePeriod = (p: ShiftPeriod) => {
    setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const applyPreset = (type: 'day12' | 'night12' | 'full24' | 'clear') => {
    switch (type) {
      case 'day12': setSelectedPeriods(['07-13', '13-19']); break;
      case 'night12': setSelectedPeriods(['19-00', '00-07']); break;
      case 'full24': setSelectedPeriods(['07-13', '13-19', '19-00', '00-07']); break;
      case 'clear': setSelectedPeriods([]); break;
    }
  };

  const handleSave = () => {
    let daysToApply: number[] = [];
    if (replicateMode) {
        daysToApply = selectedWeekdays;
    } 
    onSave(selectedPeriods, isExtra, daysToApply);
    onClose();
  };

  const toggleWeekday = (dayIndex: number) => {
    setSelectedWeekdays(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]);
  };

  const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div>
             <h3 className="text-lg font-bold text-gray-900 dark:text-white">{staff.full_name}</h3>
             <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
               {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
             </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
           <div className="grid grid-cols-2 gap-2">
              <button onClick={() => applyPreset('day12')} className="flex items-center justify-center gap-2 p-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-sm font-bold">
                 <Sun size={16} /> Diurno (07h-19h)
              </button>
              <button onClick={() => applyPreset('night12')} className="flex items-center justify-center gap-2 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-sm font-bold">
                 <Moon size={16} /> Noturno (19h-07h)
              </button>
           </div>

           <div>
             <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Seleção Manual</label>
             <div className="grid grid-cols-4 gap-2">
               {SHIFT_PERIODS.map(p => {
                 const isSelected = selectedPeriods.includes(p);
                 const isNight = p === '19-00' || p === '00-07';
                 return (
                   <button
                     key={p}
                     onClick={() => togglePeriod(p)}
                     className={`py-2 px-1 rounded text-xs font-bold transition-all ${
                       isSelected 
                        ? (isNight ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-amber-500 text-white shadow-md scale-105')
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                     }`}
                   >
                     {p}
                   </button>
                 )
               })}
             </div>
           </div>

           <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Escala</span>
              <div className="flex items-center bg-gray-200 dark:bg-gray-900 rounded-full p-1 cursor-pointer" onClick={() => setIsExtra(!isExtra)}>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${!isExtra ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow' : 'text-gray-500'}`}>Contratual</div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${isExtra ? 'bg-green-500 text-white shadow' : 'text-gray-500'}`}>Extra</div>
              </div>
           </div>

           <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <button 
                onClick={() => setReplicateMode(!replicateMode)}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
              >
                <Copy size={14} /> 
                {replicateMode ? "Cancelar Padrão" : "Replicar Padrão..."}
              </button>

              {replicateMode && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30 animate-in slide-in-from-top-2">
                   <p className="text-xs text-blue-800 dark:text-blue-300 mb-2 font-medium">Aplicar para todos os:</p>
                   <div className="flex justify-between">
                      {weekDayLabels.map((label, idx) => (
                        <button
                          key={label}
                          onClick={() => toggleWeekday(idx)}
                          className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                            selectedWeekdays.includes(idx)
                             ? 'bg-blue-600 text-white shadow-sm'
                             : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-400'
                          }`}
                        >
                          {label.charAt(0)}
                        </button>
                      ))}
                   </div>
                   <div className="mt-2 flex justify-end">
                      <button onClick={() => setSelectedWeekdays([0,1,2,3,4,5,6])} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">Selecionar Todos</button>
                   </div>
                </div>
              )}
           </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors">
            {replicateMode && selectedWeekdays.length > 0 ? "Aplicar em Massa" : "Salvar Dia"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL: Stats Dashboard (Refined) ---
interface StatsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  days: Date[];
  schedules: Schedule[];
  staff: Staff[];
  monthName: string;
  onOpenDetail: (date: Date, type: 'day' | 'night') => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  availableRoles: string[];
}

const StatsDashboardModal: React.FC<StatsDashboardProps> = ({ 
    isOpen, onClose, days, schedules, staff, monthName, onOpenDetail, roleFilter, setRoleFilter, availableRoles 
}) => {
  
  if (!isOpen) return null;

  // 1. Calculate Daily Totals for Day (07-19) and Night (19-07)
  const chartData = days.map(day => {
    const dateStr = formatDateISO(day);
    const shiftsOnDay = schedules.filter(s => s.date === dateStr);
    
    // Day Logic
    const dayStaff = new Set(
        shiftsOnDay.filter(s => ['07-13', '13-19'].includes(s.shift_slot))
        .map(s => s.staff_id)
    );
    let dayCount = 0;
    dayStaff.forEach(id => {
        const person = staff.find(s => s.id === id);
        if (person && (roleFilter === 'all' || person.roles?.name === roleFilter)) dayCount++;
    });

    // Night Logic
    const nightStaff = new Set(
        shiftsOnDay.filter(s => ['19-00', '00-07'].includes(s.shift_slot))
        .map(s => s.staff_id)
    );
    let nightCount = 0;
    nightStaff.forEach(id => {
        const person = staff.find(s => s.id === id);
        if (person && (roleFilter === 'all' || person.roles?.name === roleFilter)) nightCount++;
    });

    return { date: day, dayCount, nightCount };
  });

  const maxDay = Math.max(...chartData.map(d => d.dayCount), 1);
  const maxNight = Math.max(...chartData.map(d => d.nightCount), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart2 className="text-blue-600" />
                        Dashboard de Lotação
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Análise Diurna vs Noturna de {monthName}</p>
                </div>
                <div className="flex items-center gap-4">
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-gray-100 dark:bg-gray-800 border-none rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todos os Cargos</option>
                        {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Charts Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50 dark:bg-gray-950/50">
                
                {/* Day Chart */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wider text-sm">
                        <Sun size={18} /> Lotação Diurna (07h - 19h)
                    </div>
                    
                    <div className="h-40 flex items-end gap-1 pb-2 pt-8">
                        {chartData.map((d, idx) => {
                            const heightPct = (d.dayCount / maxDay) * 100;
                            const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;
                            return (
                                <div key={idx} 
                                     onClick={() => onOpenDetail(d.date, 'day')}
                                     className="flex-1 h-full flex flex-col justify-end group cursor-pointer relative"
                                >
                                    {d.dayCount > 0 && (
                                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 text-center mb-1 group-hover:scale-110 transition-transform">
                                            {d.dayCount}
                                        </div>
                                    )}
                                    <div 
                                        style={{ height: `${heightPct}%` }}
                                        className={`w-full rounded-t transition-all ${
                                            isWeekend 
                                            ? 'bg-amber-300 dark:bg-amber-700 group-hover:bg-amber-400 dark:group-hover:bg-amber-600' 
                                            : 'bg-amber-400 dark:bg-amber-600 group-hover:bg-amber-500 dark:group-hover:bg-amber-500'
                                        }`}
                                    />
                                    <div className="mt-1 h-4 flex items-center justify-center text-[10px] text-gray-400 font-mono">
                                        {d.date.getDate()}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Night Chart */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-sm">
                        <Moon size={18} /> Lotação Noturna (19h - 07h)
                    </div>
                    
                    <div className="h-40 flex items-end gap-1 pb-2 pt-8">
                        {chartData.map((d, idx) => {
                            const heightPct = (d.nightCount / maxNight) * 100;
                            const isWeekend = d.date.getDay() === 0 || d.date.getDay() === 6;
                            return (
                                <div key={idx} 
                                     onClick={() => onOpenDetail(d.date, 'night')}
                                     className="flex-1 h-full flex flex-col justify-end group cursor-pointer relative"
                                >
                                    {d.nightCount > 0 && (
                                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 text-center mb-1 group-hover:scale-110 transition-transform">
                                            {d.nightCount}
                                        </div>
                                    )}
                                    <div 
                                        style={{ height: `${heightPct}%` }}
                                        className={`w-full rounded-t transition-all ${
                                            isWeekend 
                                            ? 'bg-indigo-300 dark:bg-indigo-700 group-hover:bg-indigo-400 dark:group-hover:bg-indigo-600' 
                                            : 'bg-indigo-500 dark:bg-indigo-600 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500'
                                        }`}
                                    />
                                    <div className="mt-1 h-4 flex items-center justify-center text-[10px] text-gray-400 font-mono">
                                        {d.date.getDate()}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};


// --- MAIN COMPONENT ---
export const ShiftBoard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editingDate, setEditingDate] = useState<Date | null>(null);

  // Dashboard State
  const [dashboardOpen, setDashboardOpen] = useState(false);
  
  // List Modal State
  const [listModalState, setListModalState] = useState<{ isOpen: boolean, date: Date | null, type: 'day' | 'night' | null }>({
    isOpen: false, date: null, type: null
  });

  // Filter State
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  const days = useMemo(() => {
    return getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  const weeks = useMemo(() => {
    return groupDaysByWeek(days);
  }, [days]);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    // 1. Fetch Staff sorted by Role
    const { data: staffData } = await supabase
      .from('staff')
      .select('*, roles(name)')
      .order('role_id', { ascending: true })
      .order('full_name', { ascending: true });

    // 2. Fetch Schedules for current month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
    
    const { data: scheduleData } = await supabase
      .from('schedules')
      .select('*')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (staffData) {
      setStaff(staffData);
      const roles = Array.from(new Set(staffData.map(s => s.roles?.name).filter(Boolean))) as string[];
      setAvailableRoles(roles);
    }
    if (scheduleData) setSchedules(scheduleData);
    setLoading(false);
  };

  const openModal = (staff: Staff, date: Date) => {
    setEditingStaff(staff);
    setEditingDate(date);
    setModalOpen(true);
  };

  const handleShiftSave = async (periods: ShiftPeriod[], isExtra: boolean, replicateWeekdays: number[]) => {
    if (!editingStaff || !editingDate) return;

    setLoading(true); 
    
    let targetDates: Date[] = [];
    if (replicateWeekdays.length > 0) {
        targetDates = days.filter(d => replicateWeekdays.includes(d.getDay()));
    } else {
        targetDates = [editingDate];
    }

    try {
        const operations = targetDates.map(async (date) => {
            const dateStr = formatDateISO(date);
            await supabase.from('schedules').delete().match({ staff_id: editingStaff.id, date: dateStr });
            
            if (periods.length > 0) {
                const payloads = periods.map(slot => ({
                    staff_id: editingStaff.id,
                    date: dateStr,
                    shift_slot: slot,
                    is_extra: isExtra
                }));
                await supabase.from('schedules').insert(payloads);
            }
        });

        await Promise.all(operations);
        await loadData();
        
    } catch (err) {
        console.error("Error saving shifts", err);
        alert("Erro ao salvar escala.");
    } finally {
        setLoading(false);
    }
  };


  // --- CALCULATION LOGIC ---
  const getStaffStats = (staffMember: Staff) => {
    const monthlyTarget = calculateMonthlyTarget(staffMember.weekly_contracted_hours);
    const allShifts = schedules.filter(s => s.staff_id === staffMember.id);
    const totalContractualHours = allShifts.filter(s => !s.is_extra).length * 6;
    const totalExtraHours = allShifts.filter(s => s.is_extra).length * 6;
    
    const weeklyStats = weeks.map((weekDays, index) => {
        const weekStart = formatDateISO(weekDays[0]);
        const weekEnd = formatDateISO(weekDays[weekDays.length - 1]);
        const shiftsInWeek = allShifts.filter(s => s.date >= weekStart && s.date <= weekEnd);
        const contractualHours = shiftsInWeek.filter(s => !s.is_extra).length * 6;
        const extraHours = shiftsInWeek.filter(s => s.is_extra).length * 6;
        
        return {
            weekIndex: index + 1,
            contractualHours,
            extraHours,
            isOverLimit: contractualHours > staffMember.weekly_contracted_hours,
            isUnderLimit: contractualHours < staffMember.weekly_contracted_hours,
            isExact: contractualHours === staffMember.weekly_contracted_hours
        };
    });

    return {
        monthlyTarget,
        totalContractualHours,
        totalExtraHours,
        remainingMonthly: monthlyTarget - totalContractualHours,
        weeklyStats
    };
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const filteredStaff = staff.filter(s => roleFilter === 'all' ? true : s.roles?.name === roleFilter);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 overflow-hidden select-none transition-colors relative">
      
      {/* Shift Edit Modal */}
      <ShiftModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        staff={editingStaff!}
        date={editingDate!}
        currentShifts={editingStaff && editingDate ? schedules.filter(s => s.staff_id === editingStaff.id && s.date === formatDateISO(editingDate)) : []}
        onSave={handleShiftSave}
        allDays={days}
      />

      {/* Stats Dashboard Modal */}
      <StatsDashboardModal 
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        days={days}
        schedules={schedules}
        staff={staff}
        monthName={currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        onOpenDetail={(date, type) => setListModalState({ isOpen: true, date, type })}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        availableRoles={availableRoles}
      />
      
      {/* Daily List Modal */}
      <DailyListModal 
         isOpen={listModalState.isOpen}
         onClose={() => setListModalState(prev => ({ ...prev, isOpen: false }))}
         date={listModalState.date}
         type={listModalState.type}
         schedules={schedules}
         staff={staff}
         roleFilter={roleFilter}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 shadow-sm z-30 gap-4">
        <div className="flex items-center gap-4">
           <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-500">Escala</span>
              <span className="text-gray-500 text-sm font-normal uppercase tracking-wider hidden sm:inline-block">
                | {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
           </h2>
           <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 border border-gray-200 dark:border-gray-700">
              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><ChevronLeft size={18} /></button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700"></div>
              <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><ChevronRight size={18} /></button>
           </div>
        </div>

        <div className="flex items-center gap-4">
             {/* Stats Button */}
             <button 
                onClick={() => setDashboardOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
             >
                <BarChart2 size={16} />
                <span className="hidden lg:inline">Estatísticas</span>
             </button>

             <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Filter size={14} className="text-gray-400" /></div>
                <select 
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-8 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <option value="all">Todas as Funções</option>
                  {availableRoles.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative custom-scrollbar bg-gray-50 dark:bg-gray-950">
        <table className="w-full border-collapse border-spacing-0">
          <thead className="bg-white dark:bg-gray-900 sticky top-0 z-20 shadow-md">
            <tr>
              <th className="p-3 w-72 min-w-[280px] text-left border-b border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-30 sticky left-0 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.5)] align-bottom">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Colaborador</span>
              </th>
              {days.map(day => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                    <th key={day.toISOString()} className={`min-w-[50px] border-b border-r border-gray-200 dark:border-gray-800 py-2 px-1 text-center ${isWeekend ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-900'} align-bottom`}>
                      <div className={`text-sm font-bold ${isWeekend ? 'text-amber-600 dark:text-yellow-500' : 'text-gray-700 dark:text-gray-300'}`}>{formatDayMonth(day)}</div>
                      <div className="text-[9px] text-gray-400 dark:text-gray-600 uppercase font-bold">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</div>
                    </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-950">
            {loading ? (
               <tr><td colSpan={days.length + 1} className="p-20 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2"/>Carregando escala...</td></tr>
            ) : filteredStaff.map((person, idx) => {
              const stats = getStaffStats(person);
              const isMonthlyOver = stats.remainingMonthly < 0;
              const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50/50 dark:bg-gray-900/30';

              return (
                <tr key={person.id} className={`${rowBg} hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group border-b border-gray-100 dark:border-gray-800`}>
                  
                  {/* Staff Column */}
                  <td className={`sticky left-0 ${rowBg} group-hover:bg-blue-50/50 dark:group-hover:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-3 z-10 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.5)] transition-colors align-middle`}>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                            <div className="font-bold text-sm text-gray-900 dark:text-gray-200 truncate max-w-[180px]" title={person.full_name}>{person.full_name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">{person.roles?.name}</div>
                        </div>
                        <div className="text-right">
                           <div className={`text-xs font-mono font-bold ${isMonthlyOver ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                             {stats.totalContractualHours}h
                           </div>
                           {stats.totalExtraHours > 0 && <div className="text-[10px] text-green-500 font-bold">+{stats.totalExtraHours}h</div>}
                        </div>
                      </div>
                      
                      <div className="flex gap-0.5 mt-1 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                        {stats.weeklyStats.map((week) => {
                            let barColor = "bg-transparent";
                            if (week.contractualHours > 0) {
                                if (week.isOverLimit) barColor = "bg-red-500";
                                else if (week.isExact) barColor = "bg-emerald-500";
                                else barColor = "bg-blue-400";
                            }
                            return (
                                <div key={week.weekIndex} className={`flex-1 ${barColor} first:rounded-l last:rounded-r`} title={`Semana ${week.weekIndex}: ${week.contractualHours}h`}/>
                            );
                        })}
                      </div>
                    </div>
                  </td>
                  
                  {/* Day Cells with Hours */}
                  {days.map(day => {
                     const dateStr = formatDateISO(day);
                     const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                     const cellShifts = schedules.filter(s => s.staff_id === person.id && s.date === dateStr);
                     
                     // Logic for hours
                     const dayHours = cellShifts.filter(s => ['07-13', '13-19'].includes(s.shift_slot)).length * 6;
                     const nightHours = cellShifts.filter(s => ['19-00', '00-07'].includes(s.shift_slot)).length * 6;
                     const isExtra = cellShifts.some(s => s.is_extra);

                     return (
                      <td 
                        key={dateStr} 
                        onClick={() => openModal(person, day)}
                        className={`border-r border-gray-200 dark:border-gray-800 cursor-pointer relative h-14 p-0.5 transition-colors ${isWeekend ? 'bg-gray-50/80 dark:bg-gray-900/20' : ''} hover:bg-blue-100 dark:hover:bg-blue-900/20`}
                      >
                         <div className="w-full h-full flex flex-col gap-0.5">
                            {/* Day Block */}
                            <div className={`flex-1 rounded-sm transition-all flex items-center justify-center text-[9px] font-bold ${
                                dayHours > 0
                                ? (isExtra ? 'text-amber-900' : 'bg-amber-200 dark:bg-amber-600/60 text-amber-900 dark:text-amber-100') 
                                : 'bg-transparent'
                            }`}
                                style={isExtra && dayHours > 0 ? { background: 'linear-gradient(90deg, #fcd34d 65%, #22c55e 65%)' } : {}}
                            >
                                {dayHours > 0 ? dayHours : ''}
                            </div>
                            
                            {/* Night Block */}
                            <div className={`flex-1 rounded-sm transition-all flex items-center justify-center text-[9px] font-bold ${
                                nightHours > 0
                                ? (isExtra ? 'text-indigo-900' : 'bg-indigo-200 dark:bg-indigo-600/60 text-indigo-900 dark:text-indigo-100') 
                                : 'bg-transparent'
                            }`}
                                style={isExtra && nightHours > 0 ? { background: 'linear-gradient(90deg, #818cf8 65%, #22c55e 65%)' } : {}}
                            >
                                {nightHours > 0 ? nightHours : ''}
                            </div>
                         </div>
                      </td>
                     );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};