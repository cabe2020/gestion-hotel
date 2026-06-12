export const roomStatuses = [
  { value: 'available', label: 'Disponible' },
  { value: 'occupied', label: 'Ocupada' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'out-of-order', label: 'Fuera de servicio' },
  { value: 'cleaning', label: 'Limpieza' },
];

export interface Room {
  id: string;
  number: string;
  floor: number;
  status: string;
  roomTypeId: string;
}
