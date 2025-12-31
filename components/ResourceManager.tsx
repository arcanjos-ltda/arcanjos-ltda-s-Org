import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Role, Staff, Vehicle } from '../types';
import { UserPlus, Truck, Save, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { formatCPF } from '../utils';

export const ResourceManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'vehicles'>('staff');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);

  // Form States - keys matching DB columns for simplicity
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({
    full_name: '', 
    cpf: '', 
    rg: '', 
    professional_id: '', 
    driver_license: '', 
    education: '', 
    contact_phone: '', 
    weekly_contracted_hours: 36, // Default per SQL
    role_id: ''
  });
  
  const [vehicleForm, setVehicleForm] = useState<{
    name: string;
    plate: string;
    renavam: string;
    model: string;
    license_number: string;
    year: string;
  }>({
    name: '', plate: '', renavam: '', model: '', license_number: '', year: ''
  });

  useEffect(() => {
    fetchRoles();
    fetchStaff();
    fetchVehicles();
  }, []);

  const fetchRoles = async () => {
    const { data, error } = await supabase.from('roles').select('*');
    if (error) console.error('Erro ao buscar roles:', error);
    if (data) setRoles(data);
  };

  const fetchStaff = async () => {
    const { data, error } = await supabase.from('staff').select('*, roles(name)');
    if (error) console.error('Erro ao buscar staff:', error);
    if (data) setStaffList(data);
  };

  const fetchVehicles = async () => {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) console.error('Erro ao buscar viaturas:', error);
    if (data) setVehiclesList(data);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!staffForm.role_id) {
      alert("Erro: É necessário selecionar uma Função (Cargo).");
      setLoading(false);
      return;
    }

    const hours = Number(staffForm.weekly_contracted_hours) || 0;

    const payload = {
      full_name: staffForm.full_name?.trim(),
      cpf: staffForm.cpf?.trim(),
      rg: staffForm.rg?.trim() || null,
      professional_id: staffForm.professional_id?.trim() || null,
      driver_license: staffForm.driver_license?.trim() || null,
      education: staffForm.education?.trim() || null,
      contact_phone: staffForm.contact_phone?.trim() || null,
      weekly_contracted_hours: hours,
      role_id: staffForm.role_id
    };

    const { data, error } = await supabase.from('staff').insert([payload]).select();
    
    setLoading(false);
    
    if (error) {
      console.error("Erro Supabase Detalhado:", error);
      const errorMsg = error.message || JSON.stringify(error, null, 2);
      alert(`Erro ao cadastrar:\n${errorMsg}`);
    } else {
      fetchStaff();
      setStaffForm({ 
        full_name: '', cpf: '', rg: '', professional_id: '', driver_license: '', 
        education: '', contact_phone: '', weekly_contracted_hours: 36, role_id: '' 
      });
      alert('Colaborador cadastrado com sucesso!');
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const yearInt = parseInt(vehicleForm.year, 10) || null;

    const payload = {
      name: vehicleForm.name?.trim(),
      plate: vehicleForm.plate?.trim().toUpperCase(),
      renavam: vehicleForm.renavam?.trim() || null,
      model: vehicleForm.model?.trim() || null,
      license_number: vehicleForm.license_number?.trim() || null,
      year: yearInt
    };

    const { data, error } = await supabase.from('vehicles').insert([payload]).select();
    
    setLoading(false);
    
    if (error) {
      console.error("Erro Supabase Detalhado:", error);
      const errorMsg = error.message || JSON.stringify(error, null, 2);
      alert(`Erro ao cadastrar viatura:\n${errorMsg}`);
    } else {
      fetchVehicles();
      setVehicleForm({ name: '', plate: '', renavam: '', model: '', license_number: '', year: '' });
      alert('Viatura cadastrada com sucesso!');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if(!confirm("Tem certeza que deseja remover este colaborador?")) return;
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert("Erro ao remover: " + error.message);
    } else {
      fetchStaff();
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if(!confirm("Tem certeza que deseja remover esta viatura?")) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert("Erro ao remover: " + error.message);
    } else {
      fetchVehicles();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors">
      <header className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between transition-colors">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciamento de Recursos</h1>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-1">
          <button
            onClick={() => setActiveSubTab('staff')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              activeSubTab === 'staff' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Colaboradores
          </button>
          <button
            onClick={() => setActiveSubTab('vehicles')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              activeSubTab === 'vehicles' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Viaturas
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {activeSubTab === 'staff' ? (
          <div className="space-y-8">
            {/* Staff Form */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl transition-colors">
              <div className="flex items-center space-x-2 mb-6 text-blue-600 dark:text-blue-400">
                <UserPlus size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Novo Colaborador</h2>
              </div>
              <form onSubmit={handleStaffSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome Completo</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={staffForm.full_name}
                    onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Função (Cargo)</label>
                  {roles.length > 0 ? (
                    <select
                      required
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      value={staffForm.role_id}
                      onChange={(e) => setStaffForm({ ...staffForm, role_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center space-x-2 text-yellow-500 text-xs p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                       <AlertCircle size={14} />
                       <span>Nenhum cargo encontrado</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CPF</label>
                  <input
                    required
                    type="text"
                    maxLength={14}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    value={staffForm.cpf}
                    onChange={(e) => setStaffForm({ ...staffForm, cpf: formatCPF(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">RG</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    value={staffForm.rg}
                    onChange={(e) => setStaffForm({ ...staffForm, rg: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Registro de Classe</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    value={staffForm.professional_id}
                    onChange={(e) => setStaffForm({ ...staffForm, professional_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CNH</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    value={staffForm.driver_license}
                    onChange={(e) => setStaffForm({ ...staffForm, driver_license: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Formação</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    value={staffForm.education}
                    onChange={(e) => setStaffForm({ ...staffForm, education: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Telefone</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    value={staffForm.contact_phone}
                    onChange={(e) => setStaffForm({ ...staffForm, contact_phone: e.target.value })}
                  />
                </div>
                 <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Carga Horária Semanal</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    value={staffForm.weekly_contracted_hours}
                    onChange={(e) => setStaffForm({ ...staffForm, weekly_contracted_hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>Salvar Colaborador</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Staff Table */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm dark:shadow-none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Nome</th>
                    <th className="p-4 font-semibold">Função</th>
                    <th className="p-4 font-semibold">CPF</th>
                    <th className="p-4 font-semibold">Registro</th>
                    <th className="p-4 font-semibold">Telefone</th>
                    <th className="p-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{s.full_name}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                         <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-xs">
                           {s.roles?.name || 'N/A'}
                         </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{s.cpf}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{s.professional_id || '-'}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{s.contact_phone}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDeleteStaff(s.id)}
                          className="text-red-600 dark:text-red-500 hover:text-red-500 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {staffList.length === 0 && (
                     <tr>
                       <td colSpan={6} className="p-8 text-center text-gray-500">
                         {loading ? "Carregando..." : "Nenhum colaborador cadastrado."}
                       </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Vehicle Form */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl transition-colors">
              <div className="flex items-center space-x-2 mb-6 text-green-600 dark:text-green-400">
                <Truck size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Viatura</h2>
              </div>
              <form onSubmit={handleVehicleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Identificação (ex: USA-01)</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none"
                    value={vehicleForm.name}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Placa</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none uppercase"
                    value={vehicleForm.plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Renavam</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none"
                    value={vehicleForm.renavam}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, renavam: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Modelo</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">N° Licença</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none"
                    value={vehicleForm.license_number}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, license_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                  />
                </div>
                <div className="lg:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded flex items-center space-x-2 transition-colors disabled:opacity-50"
                  >
                     {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>Salvar Viatura</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Vehicle Table */}
             <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm dark:shadow-none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Identificação</th>
                    <th className="p-4 font-semibold">Placa</th>
                    <th className="p-4 font-semibold">Modelo</th>
                    <th className="p-4 font-semibold">Ano</th>
                    <th className="p-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {vehiclesList.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 text-sm font-bold text-gray-900 dark:text-white">{v.name}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-800/30 rounded w-fit">{v.plate}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{v.model}</td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{v.year}</td>
                      <td className="p-4 text-right">
                        <button 
                           onClick={() => handleDeleteVehicle(v.id)}
                           className="text-red-600 dark:text-red-500 hover:text-red-500 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                   {vehiclesList.length === 0 && (
                     <tr>
                       <td colSpan={5} className="p-8 text-center text-gray-500">
                         {loading ? "Carregando..." : "Nenhuma viatura cadastrada."}
                       </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};