import { NextResponse } from 'next/server';
import { requireAdmin, resolveHotelId } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getChannels } from '@/lib/channel-manager';
import { syncAvailabilityToChannel, fetchBookingsFromChannel } from '@/lib/channel-manager';
import type { ChannelConfig } from '@/lib/channel-manager';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'channel-config.json');

function readConfig(): Record<string, any> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function writeConfig(config: Record<string, any>) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function POST(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const hotelId = await resolveHotelId(request.headers);
    if (!hotelId) {
      return NextResponse.json({ error: 'No hotel' }, { status: 404 });
    }

    const config = readConfig();
    const channels = getChannels();
    const results = [];

    const body = await request.json().catch(() => ({}));
    const targetChannel = body.channel || null;

    const channelsToSync = targetChannel
      ? channels.filter((ch) => ch.id === targetChannel)
      : channels;

    for (const ch of channelsToSync) {
      const stored = config[ch.id];
      if (!stored || !stored.active) {
        results.push({
          channel: ch.id,
          name: ch.name,
          status: 'skipped',
          reason: 'inactive',
          availabilitySynced: 0,
          bookingsFetched: 0,
        });
        continue;
      }

      const roomTypes = await prisma.roomType.findMany({
        where: { hotelId },
        include: { rooms: true },
      });

      const availability = roomTypes.map((rt) => ({
        roomTypeId: rt.id,
        date: new Date().toISOString().split('T')[0],
        available: rt.rooms.filter((r) => r.status === 'available').length,
        price: rt.basePrice,
      }));

      const channelConfig: ChannelConfig = {
        channel: ch.id,
        hotelCode: stored.hotelCode || '',
        apiKey: stored.apiKey || '',
        active: true,
        lastSync: stored.lastSync,
      };

      try {
        const syncResult = await syncAvailabilityToChannel(channelConfig, availability);
        const bookings = await fetchBookingsFromChannel(channelConfig);

        config[ch.id] = {
          ...stored,
          lastSync: new Date().toISOString(),
        };

        results.push({
          channel: ch.id,
          name: ch.name,
          status: 'success',
          availabilitySynced: syncResult.synced,
          bookingsFetched: bookings.length,
        });
      } catch (err) {
        results.push({
          channel: ch.id,
          name: ch.name,
          status: 'error',
          reason: String(err),
          availabilitySynced: 0,
          bookingsFetched: 0,
        });
      }
    }

    writeConfig(config);

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
