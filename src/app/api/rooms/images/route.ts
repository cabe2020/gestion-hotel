import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUserFromHeaders, resolveHotelId } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

interface RoomImages {
  [roomId: string]: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'room-images.json');

function readImages(): RoomImages {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '{}');
    return {};
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveImages(data: RoomImages) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function GET(request: Request) {
  try {
    const user = getUserFromHeaders(request);
    if (!user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const hotelId = await resolveHotelId(request.headers);
    const images = readImages();
    const hotelRooms = hotelId
      ? await prisma.room.findMany({ where: { hotelId }, select: { id: true } })
      : [];
    const hotelRoomIds = new Set(hotelRooms.map((r) => r.id));
    const filtered: RoomImages = {};
    for (const [roomId, dataUrl] of Object.entries(images)) {
      if (hotelRoomIds.has(roomId)) {
        filtered[roomId] = dataUrl;
      }
    }
    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromHeaders(request);
    if (!user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) {
      return NextResponse.json({ error: 'Hotel no encontrado' }, { status: 403 });
    }
    const body = await request.json();
    const { roomId, dataUrl } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'roomId requerido' }, { status: 400 });
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId },
    });
    if (!room) {
      return NextResponse.json({ error: 'Habitacion no encontrada' }, { status: 404 });
    }

    const images = readImages();
    images[roomId] = dataUrl || '';
    saveImages(images);

    return NextResponse.json({ roomId, dataUrl: images[roomId] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
