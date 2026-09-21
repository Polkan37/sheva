import { db } from './client.js';

import {
  devices,
  rooms,
  thhomeData,
} from './schema.js';

const allRooms = db
  .select()
  .from(rooms)
  .all();

const allDevices = db
  .select()
  .from(devices)
  .all();

const allReadings = db
  .select()
  .from(thhomeData)
  .all();

console.log({
  rooms: allRooms,
  devices: allDevices,
  readings: allReadings,
});