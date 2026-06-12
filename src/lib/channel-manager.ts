export interface ChannelConfig {
  channel: string;
  hotelCode: string;
  apiKey: string;
  active: boolean;
  lastSync: string | null;
}

export interface ChannelAvailability {
  roomTypeId: string;
  date: string;
  available: number;
  price: number;
}

export interface ChannelBooking {
  channelCode: string;
  channel: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  roomTypeName: string;
  adults: number;
  children: number;
  totalAmount: number;
  currency: string;
}

const CHANNELS = [
  { id: 'booking', name: 'Booking.com', color: '#003580' },
  { id: 'expedia', name: 'Expedia', color: '#FBAF17' },
  { id: 'airbnb', name: 'Airbnb', color: '#FF5A5F' },
  { id: 'despegar', name: 'Despegar', color: '#4300D2' },
];

export function getChannels() {
  return CHANNELS;
}

/**
 * REAL INTEGRATION NOTES:
 *
 * Booking.com (booking):
 *   - API: https://providers.booking.com/connectapi
 *   - Auth: OAuth 2.0 (client_id + client_secret → Bearer token)
 *   - Endpoints:
 *     GET  /hotels/{hotel_id}/rooms           - fetch room mapping
 *     PUT  /hotels/{hotel_id}/availability     - push availability
 *     GET  /reservations                       - fetch bookings (webhooks also available)
 *   - Hotel Code = Booking.com Hotel ID (numeric)
 *   - API Key = OAuth client_secret
 *   - Webhook: register at provider portal for real-time reservation notifications
 *   - Docs: https://connect.booking.com/providers/documentation
 *
 * Expedia (expedia):
 *   - API: https://services.expediapartnercentral.com
 *   - Auth: API Key + Shared Secret (HTTP Basic)
 *   - Endpoints:
 *     GET  /properties/{property_id}/rooms     - fetch room mapping
 *     PUT  /properties/{property_id}/availability - push availability
 *     GET  /reservations                       - fetch bookings
 *   - Hotel Code = Expedia Property ID
 *   - API Key = API Key (username:password format)
 *   - Webhook: Expedia QuickConnect uses XML (OTA-std)
 *   - Docs: https://www.expediapartnercentral.com/content/quick-reference
 *
 * Airbnb (airbnb):
 *   - API: https://api.airbnb.com/v2 (limited public API)
 *   - Auth: OAuth 2.0 (requires Airbnb for Hosts partnership)
 *   - For professional hosts: use Airbnb API via partnership program
 *   - Alternative: use a channel manager aggregator (e.g., SiteMinder, Cloudbeds)
 *     that already has Airbnb integration
 *   - Hotel Code = Airbnb Listing ID
 *   - API Key = OAuth access_token
 *   - Docs: https://docs.airbnb.com
 *
 * Despegar (despegar):
 *   - API: https://api.despegar.com/v3
 *   - Auth: API Key (header: X-ApiKey)
 *   - Endpoints:
 *     GET  /hotels/{hotel_id}/rooms            - fetch room mapping
 *     PUT  /hotels/{hotel_id}/availability      - push availability
 *     GET  /bookings                            - fetch bookings
 *   - Hotel Code = Despegar Hotel ID
 *   - API Key = API Key provided by Despegar
 *   - Docs: https://developer.despegar.com
 *
 * GENERAL PATTERN TO IMPLEMENT:
 *   1. Replace each stub function below with real HTTP calls using fetch()
 *   2. Add error handling with retries (exponential backoff)
 *   3. Map roomTypeId → channel room codes via a mapping table
 *   4. Handle rate limits (429 responses) with queue/throttle
 *   5. Add webhook endpoints at /api/channel-manager/webhook/{channel}
 *      to receive real-time booking notifications
 *   6. Store sync logs in DB for audit trail
 *   7. Consider using a message queue (Redis/Bull) for reliable sync
 */

export async function syncAvailabilityToChannel(
  config: ChannelConfig,
  availability: ChannelAvailability[]
) {
  console.log(`[ChannelManager] Syncing ${availability.length} records to ${config.channel}`);
  // TODO: Replace with real API call:
  // const response = await fetch(`https://api.${config.channel}.com/availability`, {
  //   method: "PUT",
  //   headers: {
  //     "Authorization": `Bearer ${config.apiKey}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ hotelCode: config.hotelCode, availability }),
  // });
  return {
    success: true,
    synced: availability.length,
    timestamp: new Date().toISOString(),
  };
}

export async function fetchBookingsFromChannel(config: ChannelConfig): Promise<ChannelBooking[]> {
  console.log(`[ChannelManager] Fetching bookings from ${config.channel}`);
  // TODO: Replace with real API call:
  // const response = await fetch(`https://api.${config.channel}.com/reservations?hotelCode=${config.hotelCode}`, {
  //   headers: { "Authorization": `Bearer ${config.apiKey}` },
  // });
  // const data = await response.json();
  // return data.reservations.map(mapToChannelBooking);
  return [];
}

export async function pushRatePlans(config: ChannelConfig, ratePlans: Record<string, unknown>[]) {
  console.log(`[ChannelManager] Pushing ${ratePlans.length} rate plans to ${config.channel}`);
  // TODO: Replace with real API call:
  // const response = await fetch(`https://api.${config.channel}.com/rate-plans`, {
  //   method: "PUT",
  //   headers: {
  //     "Authorization": `Bearer ${config.apiKey}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ hotelCode: config.hotelCode, ratePlans }),
  // });
  return { success: true };
}
