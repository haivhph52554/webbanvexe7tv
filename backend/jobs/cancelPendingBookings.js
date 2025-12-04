const Booking = require('../models/Booking');
const TripSeatStatus = require('../models/TripSeatStatus');
const { sendBookingCancellationEmail } = require('../utils/mailer');

/**

 * @param {{ttlMinutes:number, intervalSeconds:number}} opts
 */
module.exports = function startCancelPendingBookings(opts = {}) {
  const { ttlMinutes = 2, intervalSeconds = 60 } = opts;
  const ms = intervalSeconds * 1000;

  console.log(`[cancelPendingBookings] starting job: ttlMinutes=${ttlMinutes}, intervalSeconds=${intervalSeconds}`);

  const runOnce = async () => {
    try {
      const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);
      const toCancel = await Booking.find({ status: 'pending', createdAt: { $lt: cutoff } });
      if (!toCancel || toCancel.length === 0) return;

      for (const b of toCancel) {
        try {
          
          b.status = 'cancelled';
          await b.save();

         
          await TripSeatStatus.updateMany(
            { booking_id: b._id },
            { $set: { status: 'available', booking_id: null } }
          );

          
          const recipient = (b.user && b.user.email) ? b.user.email : (b.passenger && b.passenger.email);
          if (recipient) {
            sendBookingCancellationEmail(recipient, {
              bookingId: String(b._id),
              seats: b.seat_numbers,
              totalAmount: b.total_amount || b.total_price,
              createdAt: b.createdAt
            }).catch((e) => console.error('[cancelPendingBookings] send email error', e));
          }

          console.log('[cancelPendingBookings] cancelled booking', String(b._id));
        } catch (innerErr) {
          console.error('[cancelPendingBookings] error cancelling booking', b._id, innerErr);
        }
      }
    } catch (err) {
      console.error('[cancelPendingBookings] job error', err);
    }
  };

  
  runOnce().catch((e) => console.error('[cancelPendingBookings] initial run error', e));
  const id = setInterval(runOnce, ms);

  
  return () => clearInterval(id);
};
