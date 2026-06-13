import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const existing = await prisma.hotel.findFirst();
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existen datos. Elimina la base de datos antes de resembrar.' },
        { status: 409 }
      );
    }

    const hotel = await prisma.hotel.create({
      data: {
        name: 'Hotel Paraiso',
        address: 'Av. del Mar 123, Ciudad',
        phone: '+34 123 456 789',
        email: 'info@hotelparaiso.com',
        currency: 'USD',
        taxRate: 13,
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

    const roomData = [
      { number: '101', floor: 1, roomTypeId: standard.id, hotelId: hotel.id },
      { number: '102', floor: 1, roomTypeId: standard.id, hotelId: hotel.id },
      { number: '103', floor: 1, roomTypeId: standard.id, hotelId: hotel.id },
      { number: '201', floor: 2, roomTypeId: superior.id, hotelId: hotel.id },
      { number: '202', floor: 2, roomTypeId: superior.id, hotelId: hotel.id },
      { number: '301', floor: 3, roomTypeId: suite.id, hotelId: hotel.id },
      { number: '302', floor: 3, roomTypeId: suite.id, hotelId: hotel.id },
    ];
    for (const r of roomData) await prisma.room.create({ data: r });

    const guestData = [
      {
        firstName: 'Juan',
        lastName: 'Perez',
        email: 'juan@email.com',
        phone: '+34 111 222 333',
        idNumber: '12345678A',
        nationality: 'Espanol',
        hotelId: hotel.id,
      },
      {
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria@email.com',
        phone: '+34 444 555 666',
        idNumber: '87654321B',
        nationality: 'Espanola',
        hotelId: hotel.id,
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@email.com',
        phone: '+1 555 123 456',
        idNumber: 'US98765432',
        nationality: 'Americano',
        hotelId: hotel.id,
      },
    ];
    const createdGuests = [];
    for (const g of guestData) {
      createdGuests.push(await prisma.guest.create({ data: g }));
    }

    await prisma.cashRegister.create({
      data: {
        openingCash: 200,
        status: 'open',
        hotelId: hotel.id,
      },
    });

    const adminPassword = await bcrypt.hash('admin123', 12);
    const recepPassword = await bcrypt.hash('recep123', 12);

    await prisma.user.createMany({
      data: [
        {
          name: 'Administrador',
          email: 'admin@hotel.com',
          password: adminPassword,
          role: 'admin',
          hotelId: hotel.id,
        },
        {
          name: 'Recepcionista',
          email: 'recepcion@hotel.com',
          password: recepPassword,
          role: 'receptionist',
          hotelId: hotel.id,
        },
      ],
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 3);

    await prisma.booking.createMany({
      data: [
        {
          code: 'BK-DEMO1',
          status: 'checked-in',
          checkIn: today,
          checkOut: dayAfter,
          adults: 2,
          children: 0,
          roomRate: 80,
          totalNights: 3,
          totalAmount: 240,
          paidAmount: 240,
          source: 'direct',
          guestId: createdGuests[0].id,
          roomId: (await prisma.room.findFirst({ where: { number: '101' } }))!.id,
          hotelId: hotel.id,
        },
        {
          code: 'BK-DEMO2',
          status: 'confirmed',
          checkIn: tomorrow,
          checkOut: dayAfter,
          adults: 1,
          children: 0,
          roomRate: 120,
          totalNights: 2,
          totalAmount: 240,
          paidAmount: 0,
          source: 'booking',
          guestId: createdGuests[1].id,
          roomId: (await prisma.room.findFirst({ where: { number: '201' } }))!.id,
          hotelId: hotel.id,
        },
      ],
    });

    await prisma.room.update({
      where: { id: (await prisma.room.findFirst({ where: { number: '101' } }))!.id },
      data: { status: 'occupied' },
    });

    return NextResponse.json({
      message: 'Seed data created',
      hotelId: hotel.id,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
