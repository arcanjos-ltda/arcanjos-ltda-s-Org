export interface Role {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  created_at?: string;
  full_name: string; // SQL: full_name
  cpf: string;
  rg: string;
  professional_id: string; // SQL: professional_id
  driver_license: string; // SQL: driver_license
  education: string;
  contact_phone: string; // SQL: contact_phone
  weekly_contracted_hours: number; // SQL: weekly_contracted_hours
  role_id: string;
  roles?: Role; // Joined property
}

export interface Vehicle {
  id: string;
  name: string; // SQL: name
  plate: string;
  renavam: string;
  model: string;
  license_number: string;
  year: number; // SQL: integer
  status?: string;
}

export type ShiftPeriod = '07-13' | '13-19' | '19-00' | '00-07';

export interface Schedule {
  id: string;
  staff_id: string;
  date: string; // YYYY-MM-DD
  shift_slot: ShiftPeriod; // SQL: shift_slot
  is_extra: boolean; // SQL: is_extra
}

export interface DailyStats {
  date: string;
  doctors: number;
  nurses: number;
  drivers: number;
}