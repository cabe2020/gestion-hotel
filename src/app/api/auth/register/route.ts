import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerSchema, signupSchema } from '@/lib/validations';
import { getUserFromHeaders, resolveHotelId } from '@/lib/rbac';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.hotel && body.user) {
      const data = signupSchema.parse(body);

      const existingUser = await prisma.user.findUnique({
        where: { email: data.user.email },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(data.user.password, 12);

      const hotel = await prisma.hotel.create({
        data: {
          name: data.hotel.name,
          address: data.hotel.address,
          phone: data.hotel.phone,
          email: data.hotel.email,
          currency: data.hotel.currency,
        },
      });

      const user = await prisma.user.create({
        data: {
          name: data.user.name,
          email: data.user.email,
          password: hashedPassword,
          role: 'admin',
          hotelId: hotel.id,
        },
      });

      return NextResponse.json(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hotelId: hotel.id,
        },
        { status: 201 }
      );
    }

    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });
    }

    const currentUser = getUserFromHeaders(request);
    let role = data.role;
    if (role === 'admin' && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden crear usuarios administradores' },
        { status: 403 }
      );
    }
    if (currentUser.role !== 'admin') {
      role = 'receptionist';
    }

    const hotelId = await resolveHotelId(request.headers);
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role,
        hotelId,
      },
    });

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
