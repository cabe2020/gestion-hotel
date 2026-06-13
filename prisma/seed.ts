import { PrismaClient } from '@/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hotel = await prisma.hotel.create({
    data: {
      name: 'Hotel Paraiso',
      address: 'Av. del Mar 123, Ciudad',
      phone: '+34 123 456 789',
      email: 'info@hotelparaiso.com',
      currency: 'USD',
      taxRate: 13,
      logo: '',
      taxId: 'RFC-ABC123456',
      timezone: 'America/Mexico_City',
    },
  });

  const standard = await prisma.roomType.create({
    data: {
      name: 'Estandar',
      code: 'STD',
      basePrice: 80,
      capacity: 2,
      amenities: 'WiFi, TV, A/C, Bano privado',
      hotelId: hotel.id,
    },
  });

  const superior = await prisma.roomType.create({
    data: {
      name: 'Superior',
      code: 'SUP',
      basePrice: 120,
      capacity: 2,
      amenities: 'WiFi, TV, A/C, Bano privado, Minibar, Balcon',
      hotelId: hotel.id,
    },
  });

  const suite = await prisma.roomType.create({
    data: {
      name: 'Suite',
      code: 'STE',
      basePrice: 200,
      capacity: 4,
      amenities: 'WiFi, TV, A/C, Bano privado, Minibar, Balcon, Sala, Jacuzzi',
      hotelId: hotel.id,
    },
  });

  const roomsData = [
    {
      number: '101',
      floor: 1,
      roomTypeId: standard.id,
      hotelId: hotel.id,
      cleaningStatus: 'clean',
      smoking: false,
      view: 'garden',
    },
    {
      number: '102',
      floor: 1,
      roomTypeId: standard.id,
      hotelId: hotel.id,
      cleaningStatus: 'clean',
      smoking: false,
      view: 'garden',
    },
    {
      number: '103',
      floor: 1,
      roomTypeId: standard.id,
      hotelId: hotel.id,
      cleaningStatus: 'dirty',
      smoking: true,
      view: 'city',
    },
    {
      number: '201',
      floor: 2,
      roomTypeId: superior.id,
      hotelId: hotel.id,
      cleaningStatus: 'clean',
      smoking: false,
      view: 'ocean',
    },
    {
      number: '202',
      floor: 2,
      roomTypeId: superior.id,
      hotelId: hotel.id,
      cleaningStatus: 'inspecting',
      smoking: false,
      view: 'ocean',
    },
    {
      number: '301',
      floor: 3,
      roomTypeId: suite.id,
      hotelId: hotel.id,
      cleaningStatus: 'clean',
      smoking: false,
      view: 'ocean',
    },
    {
      number: '302',
      floor: 3,
      roomTypeId: suite.id,
      hotelId: hotel.id,
      cleaningStatus: 'clean',
      smoking: false,
      view: 'ocean',
    },
  ];

  const rooms: { id: string }[] = [];
  for (const room of roomsData) {
    const created = await prisma.room.create({ data: room });
    rooms.push(created);
  }

  const guestsData = [
    {
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan@email.com',
      phone: '+34 111 222 333',
      idNumber: '12345678A',
      nationality: 'Espanol',
      hotelId: hotel.id,
      vip: true,
      dateOfBirth: new Date('1985-03-15'),
    },
    {
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria@email.com',
      phone: '+34 444 555 666',
      idNumber: '87654321B',
      nationality: 'Espanola',
      hotelId: hotel.id,
      vip: false,
      dateOfBirth: new Date('1990-07-22'),
    },
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@email.com',
      phone: '+1 555 123 456',
      idNumber: 'US98765432',
      nationality: 'Americano',
      hotelId: hotel.id,
      vip: true,
    },
  ];

  const guests: { id: string }[] = [];
  for (const guest of guestsData) {
    const created = await prisma.guest.create({ data: guest });
    guests.push(created);
  }

  await prisma.cashRegister.create({
    data: {
      openingCash: 200,
      status: 'open',
      hotelId: hotel.id,
      openedBy: 'admin@hotel.com',
    },
  });

  const adminPassword = await bcrypt.hash('admin123', 12);
  const recepPassword = await bcrypt.hash('recep123', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@hotel.com',
      password: adminPassword,
      role: 'admin',
      hotelId: hotel.id,
    },
  });
  const recep = await prisma.user.create({
    data: {
      name: 'Recepcionista',
      email: 'recepcion@hotel.com',
      password: recepPassword,
      role: 'receptionist',
      hotelId: hotel.id,
    },
  });

  // Guest Tags
  const vipTag = await prisma.guestTag.create({
    data: { name: 'VIP', color: 'gold', hotelId: hotel.id },
  });
  const corporateTag = await prisma.guestTag.create({
    data: { name: 'Corporativo', color: 'blue', hotelId: hotel.id },
  });
  const returningTag = await prisma.guestTag.create({
    data: { name: 'Habitual', color: 'green', hotelId: hotel.id },
  });

  // Assign tags to guests
  await prisma.guestTagAssignment.createMany({
    data: [
      { guestId: guests[0].id, tagId: vipTag.id },
      { guestId: guests[0].id, tagId: returningTag.id },
      { guestId: guests[1].id, tagId: corporateTag.id },
      { guestId: guests[2].id, tagId: vipTag.id },
      { guestId: guests[2].id, tagId: corporateTag.id },
    ],
  });

  // Housekeeping Tasks
  await prisma.housekeepingTask.createMany({
    data: [
      {
        roomId: rooms[2].id,
        type: 'cleaning',
        status: 'pending',
        priority: 'high',
        notes: 'Checkout cleaning',
        assignedTo: recep.id,
        hotelId: hotel.id,
      },
      {
        roomId: rooms[4].id,
        type: 'inspection',
        status: 'in-progress',
        priority: 'normal',
        notes: 'Post-cleaning inspection',
        assignedTo: admin.id,
        hotelId: hotel.id,
      },
      {
        roomId: rooms[5].id,
        type: 'deep-clean',
        status: 'pending',
        priority: 'low',
        notes: 'Monthly deep clean',
        hotelId: hotel.id,
      },
      {
        roomId: rooms[0].id,
        type: 'maintenance',
        status: 'pending',
        priority: 'urgent',
        notes: 'AC not working',
        assignedTo: recep.id,
        hotelId: hotel.id,
      },
    ],
  });

  // Rate Plans
  const today = new Date();
  const highSeasonStart = new Date(today.getFullYear(), 11, 15);
  const highSeasonEnd = new Date(today.getFullYear() + 1, 0, 15);
  const summerStart = new Date(today.getFullYear(), 6, 1);
  const summerEnd = new Date(today.getFullYear(), 7, 31);

  await prisma.ratePlan.createMany({
    data: [
      {
        name: 'Temporada Alta',
        roomTypeId: standard.id,
        startDate: highSeasonStart,
        endDate: highSeasonEnd,
        price: 120,
        minStay: 3,
        hotelId: hotel.id,
      },
      {
        name: 'Temporada Alta',
        roomTypeId: superior.id,
        startDate: highSeasonStart,
        endDate: highSeasonEnd,
        price: 180,
        minStay: 3,
        hotelId: hotel.id,
      },
      {
        name: 'Temporada Alta',
        roomTypeId: suite.id,
        startDate: highSeasonStart,
        endDate: highSeasonEnd,
        price: 320,
        minStay: 2,
        hotelId: hotel.id,
      },
      {
        name: 'Verano',
        roomTypeId: standard.id,
        startDate: summerStart,
        endDate: summerEnd,
        price: 100,
        minStay: 2,
        hotelId: hotel.id,
      },
      {
        name: 'Verano',
        roomTypeId: superior.id,
        startDate: summerStart,
        endDate: summerEnd,
        price: 150,
        minStay: 2,
        hotelId: hotel.id,
      },
      {
        name: 'Verano',
        roomTypeId: suite.id,
        startDate: summerStart,
        endDate: summerEnd,
        price: 260,
        minStay: 1,
        hotelId: hotel.id,
      },
    ],
  });

  // Sample Booking with FolioItems
  const checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const checkOut = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);

  const booking = await prisma.booking.create({
    data: {
      code: 'BKG-001',
      status: 'checked-in',
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      roomRate: 80,
      totalNights: 3,
      totalAmount: 240,
      paidAmount: 100,
      source: 'direct',
      specialRequests: 'Late checkout please',
      depositAmount: 50,
      hotelId: hotel.id,
      guestId: guests[0].id,
      roomId: rooms[0].id,
    },
  });

  // Folio Items for the booking
  await prisma.folioItem.createMany({
    data: [
      {
        bookingId: booking.id,
        concept: 'Room Night 1',
        amount: 80,
        category: 'room',
        date: checkIn,
      },
      {
        bookingId: booking.id,
        concept: 'Room Night 2',
        amount: 80,
        category: 'room',
        date: new Date(checkIn.getTime() + 86400000),
      },
      {
        bookingId: booking.id,
        concept: 'Room Night 3',
        amount: 80,
        category: 'room',
        date: new Date(checkIn.getTime() + 86400000 * 2),
      },
      { bookingId: booking.id, concept: 'Minibar', amount: 25, category: 'minibar', date: checkIn },
      {
        bookingId: booking.id,
        concept: 'Room Service Dinner',
        amount: 45,
        category: 'restaurant',
        date: checkIn,
      },
      {
        bookingId: booking.id,
        concept: 'Laundry Service',
        amount: 15,
        category: 'laundry',
        date: new Date(checkIn.getTime() + 86400000),
      },
    ],
  });

  // BookingRoom for multi-room booking
  await prisma.bookingRoom.create({
    data: {
      bookingId: booking.id,
      roomId: rooms[0].id,
      roomRate: 80,
    },
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: 'New Booking',
        message: 'Booking BKG-001 has been created',
        type: 'info',
        hotelId: hotel.id,
      },
      {
        userId: recep.id,
        title: 'Room 103 needs cleaning',
        message: 'Room 103 is marked as dirty and needs attention',
        type: 'warning',
        hotelId: hotel.id,
      },
      {
        userId: admin.id,
        title: 'High season rate plan active',
        message: 'Temporada Alta rate plan is now active for all room types',
        type: 'success',
        hotelId: hotel.id,
      },
    ],
  });

  console.log('Seed data created successfully!');
  console.log('Users: admin@hotel.com / admin123, recepcion@hotel.com / recep123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
