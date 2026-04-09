const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

async function buildReceiptPdf(reservation, stream) {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  doc.pipe(stream);

  // ── Header ─────────────────────────────────────────────
  doc.fontSize(20).fillColor("#111").text("JolliReserve – Reservation Receipt", { align: "left" });
  doc.moveDown(0.5);

  // ── Guest Info ──────────────────────────────────────────
  doc.fontSize(12).fillColor("#111");
  doc.text(`Reservation ID: ${reservation.id}`);
  doc.text(`Name: ${reservation.user_name || "Guest"}`);
  doc.text(`Email: ${reservation.user_email || "-"}`);
  doc.moveDown(0.5);

  // ── Booking Details ─────────────────────────────────────
  doc.fontSize(13).text("Booking Details", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(12);
  doc.text(`Date: ${reservation.date}`);
  doc.text(`Time: ${reservation.time}`);
  doc.text(`Guests: ${reservation.party_size}`);
  doc.text(`Area Preference: ${reservation.area_pref || "-"}`);
  doc.text(`Table: ${reservation.table_name || "Pending"}${reservation.table_area ? " (" + reservation.table_area + ")" : ""}`);
  doc.text(`Status: ${reservation.status}`);
  if (reservation.special_requests) doc.text(`Special Requests: ${reservation.special_requests}`);
  doc.moveDown(1);

  // ── QR Check-in Section ─────────────────────────────────
  const baseUrl = process.env.FRONTEND_URL || "https://jollireserve-frontend.onrender.com";
  const checkinUrl = `${baseUrl}/checkin/${reservation.id}`;

  doc.fontSize(13).fillColor("#111").text("QR Check-in", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).text("Present this QR code on arrival for faster check-in.");
  doc.moveDown(0.5);

  // Generate QR image as buffer
  const qrDataUrl = await QRCode.toDataURL(checkinUrl, { margin: 2, width: 200 });
  const buf = Buffer.from(qrDataUrl.split(",")[1], "base64");

  // Place QR image and track its position so text goes BELOW it
  const qrSize = 160;
  const qrX = doc.page.margins.left;
  const qrY = doc.y;

  doc.image(buf, qrX, qrY, { width: qrSize });

  // Move cursor BELOW the QR image before adding more text
  doc.y = qrY + qrSize + 12;
  doc.x = qrX;

  doc.fontSize(9).fillColor("#555").text(checkinUrl, { link: checkinUrl });
  doc.moveDown(1.5);

  // ── Footer ──────────────────────────────────────────────
  doc.fontSize(10).fillColor("#888").text("Thank you for using JolliReserve.", { align: "left" });

  doc.end();
}

module.exports = { buildReceiptPdf };
