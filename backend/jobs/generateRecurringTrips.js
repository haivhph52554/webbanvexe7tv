const RecurringSchedule = require('../models/RecurringSchedule');
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const TripSeatStatus = require('../models/TripSeatStatus');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseTimeOfDayToDate(dayDate, hhmm, tz) {
  const [hh, mm] = (hhmm || '00:00').split(':').map(Number);
  // Interpret the date in the specified timezone at the given time
  return dayjs.tz(dayDate, tz).hour(hh).minute(mm).second(0).millisecond(0).toDate();
}

async function generateForSchedule(schedule, windowDays = 30, now = new Date()) {
  const results = { created: 0, skipped: 0 };
  const tz = process.env.RECURRING_TIMEZONE || 'Asia/Ho_Chi_Minh';
  const startFrom = schedule.lastGeneratedUntil ? new Date(schedule.lastGeneratedUntil) : (schedule.start_date ? new Date(schedule.start_date) : new Date());
  // startFrom should be at least today in the timezone
  const fromDay = dayjs.tz(now, tz).startOf('day');
  const fromDate = dayjs.max(dayjs.tz(startFrom, tz).startOf('day'), fromDay).toDate();
  const toDate = dayjs.tz(now, tz).add(windowDays, 'day').endOf('day').toDate();

  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    if (schedule.end_date && day > schedule.end_date) continue;
    if (schedule.frequency === 'weekly') {
      const dow = day.getDay();
      if (!Array.isArray(schedule.daysOfWeek) || !schedule.daysOfWeek.includes(dow)) continue;
    }
    // For daily or matching weekly day: create trips for each timeOfDay
    for (const time of (schedule.timesOfDay || [])) {
      const start_time = parseTimeOfDayToDate(day, time, tz);
      // avoid duplicates: check existing trip with same route and start_time
      const exists = await Trip.findOne({ route: schedule.route, start_time }).lean();
      if (exists) { results.skipped++; continue; }

      // create trip
      const tripPayload = {
        route: schedule.route,
        bus: schedule.bus,
        start_time: start_time,
        base_price: schedule.base_price || 0,
        status: 'scheduled'
      };
      const trip = await Trip.create(tripPayload);

      // create seats based on bus seat_count
      try {
        const bus = await Bus.findById(schedule.bus).lean();
        const seatCount = bus && bus.seat_count ? Number(bus.seat_count) : 0;
        const seats = [];
        for (let i = 1; i <= seatCount; i++) seats.push({ trip: trip._id, seat_number: i, status: 'available' });
        if (seats.length) await TripSeatStatus.insertMany(seats);
      } catch (e) {
        // don't fail the generation if seat creation fails; log and continue
        console.warn('Failed to create seat statuses for trip', trip._id, e.message || e);
      }

      results.created++;
    }
  }

  // update lastGeneratedUntil
  schedule.lastGeneratedUntil = toDate;
  await schedule.save();

  return results;
}

async function runOnce(opts = {}) {
  const windowDays = opts.windowDays || 30;
  const now = opts.now || new Date();
  const schedules = await RecurringSchedule.find({ active: true });
  const summary = [];
  for (const s of schedules) {
    try {
      const res = await generateForSchedule(s, windowDays, now);
      summary.push({ schedule: s._id, created: res.created, skipped: res.skipped });
    } catch (e) {
      console.error('Error generating for schedule', s._id, e.message || e);
    }
  }
  return summary;
}

function start(opts = {}) {
  const windowDays = opts.windowDays || 30;
  const intervalMs = (opts.intervalMs) || 24 * 60 * 60 * 1000; // daily

  // run once immediately if requested
  if (opts.runOnStart) {
    runOnce({ windowDays }).then(r => console.log('generateRecurringTrips: initial run results', r)).catch(e => console.error(e));
  }

  // schedule daily run
  setInterval(() => {
    runOnce({ windowDays }).then(r => console.log('generateRecurringTrips: daily run results', r)).catch(e => console.error(e));
  }, intervalMs);

  return { runOnce };
}

module.exports = start;
