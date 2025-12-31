export const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// Agrupa um array de dias em arrays de semanas (baseado no domingo como início)
export const groupDaysByWeek = (days: Date[]) => {
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  days.forEach((day) => {
    currentWeek.push(day);
    // Se for Sábado (6) ou o último dia do array, fecha a semana
    if (day.getDay() === 6 || day === days[days.length - 1]) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Caso sobrem dias (se o array acabar antes do sabado, o loop acima ja trata, 
  // mas por segurança garantimos que arrays vazios não entram)
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return weeks;
};

export const formatDateISO = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export const formatDayMonth = (date: Date) => {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

// Assuming monthly contract is roughly weekly * 4 for this visualization
export const calculateMonthlyTarget = (weeklyHours: number) => weeklyHours * 4;