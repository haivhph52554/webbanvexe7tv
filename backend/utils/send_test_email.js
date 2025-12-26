const { sendBookingConfirmationEmail } = require('./mailer');

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: node send_test_email.js recipient@example.com');
    process.exit(1);
  }

  const samplePayload = {
    bookingId: 'TEST123456',
    paymentId: 'PAY123456',
    route: { from: 'Hà Nội', to: 'Hồ Chí Minh', durationMin: 1800 },
    times: { departureTime: new Date(), arrivalTime: new Date(Date.now() + 1000 * 60 * 60 * 12) },
    bus: { busType: 'Sleeper', seatCount: 40 },
    seats: [1, 2],
    passenger: { name: 'Người dùng thử', phone: '0900000000' },
    pricePerSeat: 200000,
    totalAmount: 400000,
    paymentMethod: 'banking'
  };

  try {
    const info = await sendBookingConfirmationEmail(to, samplePayload);
    console.log('Send test email: done', info || 'skipped');
  } catch (e) {
    console.error('Send test email error:', e);
    process.exit(2);
  }
}

main();
