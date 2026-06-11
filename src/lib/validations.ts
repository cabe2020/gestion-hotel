import { z } from "zod";

export const hotelSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().email("Email invalido").optional().or(z.literal("")).default(""),
  currency: z.string().optional().default("USD"),
  taxRate: z.number().min(0).optional().default(0),
});

export const roomTypeSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  code: z.string().min(1, "Codigo requerido"),
  basePrice: z.number().min(0, "Precio debe ser positivo"),
  capacity: z.number().int().min(1, "Capacidad minima 1"),
  amenities: z.string().optional().default(""),
});

export const roomSchema = z.object({
  number: z.string().min(1, "Numero requerido"),
  floor: z.number().int().min(0).optional().default(1),
  status: z.enum(["available", "occupied", "maintenance", "out-of-order", "cleaning"]).optional().default("available"),
  roomTypeId: z.string().min(1, "Tipo de habitacion requerido"),
});

export const guestSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Email invalido").optional().or(z.literal("")).default(""),
  phone: z.string().optional().default(""),
  idNumber: z.string().optional().default(""),
  nationality: z.string().optional().default(""),
  address: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const bookingSchema = z.object({
  guestId: z.string().min(1, "Huesped requerido"),
  roomId: z.string().min(1, "Habitacion requerida"),
  checkIn: z.string().or(z.date()),
  checkOut: z.string().or(z.date()),
  adults: z.number().int().min(1).optional().default(1),
  children: z.number().int().min(0).optional().default(0),
  roomRate: z.number().min(0, "Tarifa debe ser positiva"),
  totalNights: z.number().int().min(1, "Minimo 1 noche"),
  totalAmount: z.number().min(0, "Total debe ser positivo"),
  paidAmount: z.number().min(0).optional().default(0),
  source: z.string().optional().default("direct"),
  notes: z.string().optional().default(""),
  status: z.enum(["confirmed", "checked-in", "checked-out", "cancelled", "no-show"]).optional().default("confirmed"),
});

export const updateBookingSchema = z.object({
  guestId: z.string().min(1).optional(),
  roomId: z.string().min(1).optional(),
  checkIn: z.string().or(z.date()).optional(),
  checkOut: z.string().or(z.date()).optional(),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
  roomRate: z.number().min(0).optional(),
  totalNights: z.number().int().min(1).optional(),
  totalAmount: z.number().min(0).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  specialRequests: z.string().optional(),
  status: z.enum(["confirmed", "checked-in", "checked-out", "cancelled", "no-show"]).optional(),
});

export const paymentSchema = z.object({
  bookingId: z.string().min(1, "Reserva requerida"),
  amount: z.number().min(-1000000).max(1000000),
  method: z.enum(["cash", "card", "transfer", "other", "refund"]),
  reference: z.string().optional().default(""),
});

export const cashMoveSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Categoria requerida"),
  amount: z.number().min(0.01, "Monto debe ser positivo"),
  concept: z.string().min(1, "Concepto requerido"),
  method: z.enum(["cash", "card", "transfer", "other"]).optional().default("cash"),
  reference: z.string().optional().default(""),
});

export const invoiceSchema = z.object({
  number: z.string().min(1, "Numero requerido"),
  bookingId: z.string().min(1, "Reserva requerida"),
  hotelId: z.string().min(1, "Hotel requerido"),
  taxAmount: z.number().min(0).optional().default(0),
  total: z.number().min(0, "Total debe ser positivo"),
  status: z.enum(["pending", "paid"]).optional().default("pending"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
  role: z.enum(["admin", "receptionist"]).optional().default("receptionist"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "Nombre requerido").optional(),
  email: z.string().email("Email invalido").optional(),
  role: z.enum(["admin", "receptionist"]).optional(),
  active: z.boolean().optional(),
});

export const housekeepingSchema = z.object({
  roomId: z.string().min(1, "Habitacion requerida"),
  type: z.enum(["cleaning", "inspection", "maintenance", "deep-clean"]).optional().default("cleaning"),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional().default("normal"),
  assignedTo: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const folioItemSchema = z.object({
  bookingId: z.string().min(1, "Reserva requerida"),
  concept: z.string().min(1, "Concepto requerido"),
  amount: z.number().min(0, "Monto debe ser positivo"),
  category: z.enum(["room", "minibar", "restaurant", "spa", "laundry", "parking", "other"]).optional().default("other"),
  date: z.string().or(z.date()).optional(),
});

export const updateFolioItemSchema = z.object({
  concept: z.string().min(1, "Concepto requerido").optional(),
  amount: z.number().min(0, "Monto debe ser positivo").optional(),
  category: z.enum(["room", "minibar", "restaurant", "spa", "laundry", "parking", "other"]).optional(),
  date: z.string().or(z.date()).optional(),
});

export const cashRegisterSchema = z.object({
  openingCash: z.number().min(0).optional().default(0),
  notes: z.string().optional().default(""),
});

export const ratePlanSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  roomTypeId: z.string().min(1, "Tipo de habitacion requerido"),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  price: z.number().min(0, "Precio debe ser positivo"),
  minStay: z.number().int().min(1).optional().default(1),
});

export const guestTagSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  color: z.string().min(1, "Color requerido").optional().default("blue"),
});

export const upsellSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional().default(""),
  price: z.number().min(0, "Precio positivo"),
  category: z.enum(["late-checkout", "early-checkin", "breakfast", "airport-transfer", "spa", "minibar-package", "room-upgrade", "other"]).optional().default("other"),
  active: z.boolean().optional().default(true),
});
