import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { getChannels } from "@/lib/channel-manager";
import { encrypt, decrypt } from "@/lib/crypto";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "channel-config.json");

function readConfig(): Record<string, any> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function writeConfig(config: Record<string, any>) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function GET(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;

  const channels = getChannels();
  const config = readConfig();

  const result = channels.map((ch) => {
    const stored = config[ch.id] || {};
    return {
      channel: ch.id,
      name: ch.name,
      color: ch.color,
      hotelCode: stored.hotelCode || "",
      apiKey: stored.apiKey ? decrypt(stored.apiKey) : "",
      active: stored.active ?? false,
      lastSync: stored.lastSync || null,
    };
  });

  return NextResponse.json({ channels: result });
}

export async function POST(request: Request) {
  const adminCheck = requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();
    const { channel, hotelCode, apiKey, active } = body;

    if (!channel) {
      return NextResponse.json(
        { error: "Channel is required" },
        { status: 400 }
      );
    }

    const config = readConfig();
    const existing = config[channel] || {};

    config[channel] = {
      hotelCode: hotelCode || existing.hotelCode || "",
      apiKey: apiKey ? encrypt(apiKey) : existing.apiKey || "",
      active: active ?? existing.active ?? false,
      lastSync: existing.lastSync || null,
    };

    writeConfig(config);

    return NextResponse.json({
      channel,
      hotelCode: config[channel].hotelCode,
      active: config[channel].active,
      lastSync: config[channel].lastSync,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
