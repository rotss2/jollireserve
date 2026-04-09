const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

async function buildReceiptPdf(reservation, stream) {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  doc.pipe(stream);

  const accentColor = "#E84C4C"; // JolliReserve red
  const darkColor = "#1A1A1A";
  const grayColor = "#666666";
  const lightGray = "#F5F5F5";

  // ── Header with Logo Area ───────────────────────────────
  doc.fontSize(24).fillColor(accentColor).text("JolliReserve", { align: "center" });
  doc.fontSize(12).fillColor(grayColor).text("Reservation Receipt", { align: "center" });
  doc.moveDown(1);

  // Draw a line
  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor(accentColor).lineWidth(2).stroke();
  doc.moveDown(1);

  // ── Guest Info ──────────────────────────────────────────
  doc.fontSize(14).fillColor(darkColor).text("Guest Information", { underline: false });
  doc.moveDown(0.5);
  
  doc.fontSize(11).fillColor(darkColor);
  doc.text(`Reservation ID: ${reservation.id}`, { continued: true });
  doc.fillColor(accentColor).text(` • ${reservation.status.toUpperCase()}`);
  doc.fillColor(darkColor);
  doc.text(`Name: ${reservation.user_name || "Guest"}`);
  doc.text(`Email: ${reservation.user_email || "-"}`);
  doc.moveDown(1);

  // ── Booking Details ─────────────────────────────────────
  doc.fontSize(14).fillColor(darkColor).text("Booking Details", { underline: false });
  doc.moveDown(0.5);
  
  // Create a box for booking details
  const boxY = doc.y;
  doc.rect(48, boxY, 499, 100).fillColor(lightGray).fill();
  doc.fillColor(darkColor);
  
  doc.fontSize(11);
  doc.text(`📅 Date: ${reservation.date}`, 60, boxY + 15);
  doc.text(`🕐 Time: ${reservation.time}`, 60, boxY + 35);
  doc.text(`👥 Guests: ${reservation.party_size} people`, 60, boxY + 55);
  doc.text(`🍽️ Area: ${reservation.area_pref || "No preference"}`, 60, boxY + 75);
  
  doc.text(`Table: ${reservation.table_name || "Pending"}${reservation.table_area ? " (" + reservation.table_area + ")" : ""}`, 280, boxY + 15);
  doc.text(`Status: ${reservation.status.toUpperCase()}`, 280, boxY + 35);
  
  if (reservation.special_requests) {
    doc.text(`Special Requests: ${reservation.special_requests}`, 280, boxY + 55);
  }
  
  doc.moveDown(6);

  // ── QR Check-in Section ─────────────────────────────────
  // QR code format: JR:reservation-id (matches scanner expectations)
  const qrContent = `JR:${reservation.id}`;
  const baseUrl = process.env.FRONTEND_URL || "https://jollireserve-frontend.onrender.com";
  const checkinUrl = `${baseUrl}/checkin/${reservation.id}`;

  doc.fontSize(14).fillColor(darkColor).text("📱 QR Check-in", { underline: false });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(grayColor).text("Present this QR code on arrival for faster check-in.");
  doc.moveDown(0.5);

  // Generate QR image as buffer (using JR: format for scanner compatibility)
  const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 2, width: 200 });
  const buf = Buffer.from(qrDataUrl.split(",")[1], "base64");

  // Place QR image and track its position so text goes BELOW it
  const qrSize = 140;
  const qrX = doc.page.width / 2 - qrSize / 2; // Center the QR code
  const qrY = doc.y;

  doc.image(buf, qrX, qrY, { width: qrSize });

  // Move cursor BELOW the QR image before adding more text
  doc.y = qrY + qrSize + 12;
  doc.x = 48;

  doc.fontSize(9).fillColor(accentColor).text(checkinUrl, { align: "center", link: checkinUrl });
  doc.moveDown(1.5);

  // ── Footer ──────────────────────────────────────────────
  doc.moveDown(1);
  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor(lightGray).lineWidth(1).stroke();
  doc.moveDown(0.5);
  
  doc.fontSize(10).fillColor(grayColor).text("Thank you for using JolliReserve!", { align: "center" });
  doc.fontSize(9).fillColor(grayColor).text("For assistance, contact our support team.", { align: "center" });
  
  // Add receipt timestamp
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor(grayColor).text(`Receipt generated: ${new Date().toLocaleString()}`, { align: "center" });

  doc.end();
}

module.exports = { buildReceiptPdf };
