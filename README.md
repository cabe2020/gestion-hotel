# GestHotel - Sistema de Gestion Hotelera

Sistema completo de gestion hotelera construido con Next.js, Prisma y SQLite.

## Caracteristicas

- **Dashboard**: Estadisticas de ocupacion, ingresos, reservas recientes
- **Habitaciones**: Gestion de habitaciones con estados y tipos
- **Reservas**: Creacion y seguimiento de reservas con deteccion de conflictos de fechas
- **Calendario**: Vista mensual por habitacion
- **Check-in / Check-out**: Flujos de trabajo rapidos
- **Huespedes**: CRUD completo con historial de reservas
- **Facturas**: Generacion y gestion de facturas
- **Caja**: Registro de caja y movimientos de ingresos/gastos
- **Reportes**: Reportes por periodo con graficos
- **Configuracion**: Datos del hotel y tipos de habitacion
- **Autenticacion**: Login con base de datos, registro de usuarios, middleware de proteccion

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Base de datos**: SQLite via Prisma 6
- **Autenticacion**: NextAuth.js v4 con bcrypt
- **Validacion**: Zod
- **UI**: Tailwind CSS v4 + Lucide Icons

## Primeros Pasos

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno (archivo `.env`):

```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="tu-clave-secreta-aqui"
```

3. Ejecutar migraciones y crear datos iniciales:

```bash
npx prisma migrate dev
npx prisma db seed
```

4. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

5. Abrir http://localhost:3000 - Se redirige al login

## Credenciales por defecto

- **Admin**: admin@hotel.com / admin123
- **Recepcionista**: recepcion@hotel.com / recep123

## Estructura del Proyecto

```
src/
  app/
    api/          # Rutas API con validacion Zod
    auth/         # Pagina de login
    dashboard/    # Dashboard principal
    rooms/        # Gestion de habitaciones
    bookings/     # Gestion de reservas
    calendar/     # Vista calendario
    checkin/      # Check-in
    checkout/     # Check-out
    guests/       # Gestion de huespedes
    invoices/     # Facturas
    cash/         # Caja y movimientos
    reports/      # Reportes
    settings/     # Configuracion
  components/     # Componentes reutilizables
  lib/            # Utilidades, Prisma client, validaciones
  middleware.ts   # Proteccion de rutas
prisma/           # Schema y migraciones
```
