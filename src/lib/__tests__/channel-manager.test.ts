import { describe, it, expect } from 'vitest';
import {
  getChannels,
  syncAvailabilityToChannel,
  fetchBookingsFromChannel,
  pushRatePlans,
} from '../channel-manager';
import type { ChannelConfig, ChannelAvailability } from '../channel-manager';

const mockConfig: ChannelConfig = {
  channel: 'booking',
  hotelCode: 'HOTEL001',
  apiKey: 'test-key',
  active: true,
  lastSync: null,
};

const mockAvailability: ChannelAvailability[] = [
  { roomTypeId: 'rt-1', date: '2025-06-01', available: 5, price: 100 },
  { roomTypeId: 'rt-2', date: '2025-06-01', available: 3, price: 150 },
];

describe('getChannels', () => {
  it('returns list of channels', () => {
    const channels = getChannels();
    expect(channels).toHaveLength(4);
    expect(channels[0].id).toBe('booking');
    expect(channels[1].id).toBe('expedia');
    expect(channels[2].id).toBe('airbnb');
    expect(channels[3].id).toBe('despegar');
  });

  it('each channel has id, name, and color', () => {
    const channels = getChannels();
    for (const ch of channels) {
      expect(ch).toHaveProperty('id');
      expect(ch).toHaveProperty('name');
      expect(ch).toHaveProperty('color');
      expect(ch.id).toBeTruthy();
      expect(ch.name).toBeTruthy();
      expect(ch.color).toBeTruthy();
    }
  });
});

describe('syncAvailabilityToChannel', () => {
  it('returns success result with synced count', async () => {
    const result = await syncAvailabilityToChannel(mockConfig, mockAvailability);
    expect(result.success).toBe(true);
    expect(result.synced).toBe(2);
    expect(result.timestamp).toBeTruthy();
  });

  it('returns correct count for empty availability', async () => {
    const result = await syncAvailabilityToChannel(mockConfig, []);
    expect(result.success).toBe(true);
    expect(result.synced).toBe(0);
  });
});

describe('fetchBookingsFromChannel', () => {
  it('returns an empty array', async () => {
    const result = await fetchBookingsFromChannel(mockConfig);
    expect(result).toEqual([]);
  });
});

describe('pushRatePlans', () => {
  it('returns success result', async () => {
    const result = await pushRatePlans(mockConfig, [{ name: 'High Season', price: 200 }]);
    expect(result.success).toBe(true);
  });
});
