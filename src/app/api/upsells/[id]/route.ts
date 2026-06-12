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

const DATA_FILE = path.join(process.cwd(), 'data', 'upsells.json');

function readItems(): UpsellItem[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveItems(items: UpsellItem[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const items = readItems();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Upsell no encontrado' }, { status: 404 });
    }
    items[index] = {
      ...items[index],
      name: body.name ?? items[index].name,
      description: body.description ?? items[index].description,
      price: body.price !== undefined ? parseFloat(body.price) : items[index].price,
      category: body.category ?? items[index].category,
      active: body.active !== undefined ? body.active : items[index].active,
    };
    saveItems(items);
    return NextResponse.json(items[index]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const items = readItems();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) {
      return NextResponse.json({ error: 'Upsell no encontrado' }, { status: 404 });
    }
    saveItems(filtered);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
