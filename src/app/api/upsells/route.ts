import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import fs from 'fs';
import path from 'path';

interface UpsellItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  active: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'upsells.json');

function ensureDataFile(): UpsellItem[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const defaults: UpsellItem[] = [
      {
        id: '1',
        name: 'Late Checkout (14:00)',
        description: 'Salida tardia hasta las 2pm',
        price: 25,
        category: 'late-checkout',
        active: true,
      },
      {
        id: '2',
        name: 'Early Check-in (10:00)',
        description: 'Entrada temprana desde las 10am',
        price: 20,
        category: 'early-checkin',
        active: true,
      },
      {
        id: '3',
        name: 'Desayuno Buffet',
        description: 'Desayuno buffet completo por persona/dia',
        price: 15,
        category: 'breakfast',
        active: true,
      },
      {
        id: '4',
        name: 'Traslado Aeropuerto',
        description: 'Transporte ida y vuelta al aeropuerto',
        price: 50,
        category: 'airport-transfer',
        active: true,
      },
      {
        id: '5',
        name: 'Acceso Spa',
        description: 'Acceso completo al spa por persona/dia',
        price: 35,
        category: 'spa',
        active: true,
      },
      {
        id: '6',
        name: 'Paquete Minibar Premium',
        description: 'Minibar surtido con bebidas premium',
        price: 30,
        category: 'minibar-package',
        active: true,
      },
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(items: UpsellItem[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

export async function GET() {
  try {
    const items = ensureDataFile();
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();
    const items = ensureDataFile();
    const newItem: UpsellItem = {
      id: Date.now().toString(),
      name: body.name || '',
      description: body.description || '',
      price: parseFloat(body.price) || 0,
      category: body.category || 'other',
      active: body.active !== false,
    };
    items.push(newItem);
    saveData(items);
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
