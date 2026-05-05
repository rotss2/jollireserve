const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

async function buildReceiptPdf(reservation, stream, paymentStatus = null) {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  doc.pipe(stream);

  // Brand Colors
  const primaryColor = "#E84C4C"; // JolliReserve Red
  const secondaryColor = "#2C3E50"; // Dark Blue-Gray
  const accentColor = "#F39C12"; // Gold accent
  const darkColor = "#1A1A1A";
  const grayColor = "#7F8C8D";
  const lightGray = "#ECF0F1";
  const whiteColor = "#FFFFFF";

  // Helper function to draw a styled box
  function drawBox(y, height, color = lightGray) {
    doc.roundedRect(48, y, 499, height, 8).fillColor(color).fill();
  }

  // ── HEADER SECTION ──────────────────────────────────────
  // Background header bar
  doc.rect(0, 0, 595, 120).fillColor(primaryColor).fill();
  
  // Logo Circle
  doc.circle(80, 60, 30).fillColor(whiteColor).fill();
  doc.fontSize(28).fillColor(primaryColor).text("J", 72, 48);
  
  // Brand Name
  doc.fontSize(28).fillColor(whiteColor).text("olli", 110, 45);
  doc.fontSize(28).fillColor(whiteColor).font("Helvetica-Bold").text("Reserve", 168, 45);
  
  // Tagline
  doc.fontSize(10).fillColor("#FFD700").text("Smart Restaurant Reservations", 110, 78);
  
  // Receipt Type Badge
  const badgeY = 35;
  doc.roundedRect(420, badgeY, 127, 30, 15).fillColor(accentColor).fill();
  doc.fontSize(12).fillColor(whiteColor).font("Helvetica-Bold").text("RECEIPT", 455, badgeY + 9);
  
  doc.moveDown(8);

  // ── STATUS BAR ──────────────────────────────────────────
  const statusY = 135;
  const statusColor = reservation.status === "confirmed" ? "#27AE60" : 
                      reservation.status === "pending" ? "#F39C12" : "#E74C3C";
  
  doc.roundedRect(48, statusY, 499, 35, 5).fillColor(statusColor).fill();
  doc.fontSize(14).fillColor(whiteColor).font("Helvetica-Bold").text(
    `  ${reservation.status.toUpperCase()}`, 60, statusY + 10);
  
  // Payment Status (if paid)
  if (paymentStatus === "paid") {
    doc.roundedRect(380, statusY, 150, 35, 5).fillColor("#27AE60").fill();
    doc.fontSize(12).fillColor(whiteColor).font("Helvetica-Bold").text("PAID ✓", 425, statusY + 11);
  }

  doc.moveDown(4);

  // ── GUEST INFORMATION ───────────────────────────────────
  const guestY = doc.y;
  doc.fontSize(16).fillColor(secondaryColor).font("Helvetica-Bold").text("Guest Information", 48, guestY);
  doc.moveDown(0.8);
  
  drawBox(doc.y - 5, 75, lightGray);
  
  doc.fontSize(11).fillColor(darkColor);
  doc.text(`  Reservation ID: ${reservation.id}`, 60, doc.y - 65);
  doc.text(`  Guest Name: ${reservation.user_name || "Guest"}`, 60, doc.y + 5);
  doc.text(`  Email: ${reservation.user_email || "Not provided"}`, 60, doc.y + 5);
  
  doc.moveDown(3);

  // ── BOOKING DETAILS ─────────────────────────────────────
  doc.fontSize(16).fillColor(secondaryColor).font("Helvetica-Bold").text("Booking Details", 48, doc.y);
  doc.moveDown(0.8);
  
  const detailsY = doc.y - 5;
  drawBox(detailsY, 130, lightGray);
  
  // Left column
  doc.fontSize(11).fillColor(darkColor);
  doc.text(`📅 Date: ${reservation.date}`, 60, detailsY + 15);
  doc.text(`🕐 Time: ${reservation.time}`, 60, detailsY + 40);
  doc.text(`👥 Party Size: ${reservation.party_size} guests`, 60, detailsY + 65);
  doc.text(`🍽️ Area: ${reservation.area_pref || "No preference"}`, 60, detailsY + 90);
  
  // Right column
  doc.text(`🪑 Table: ${reservation.table_name || "To be assigned"}`, 300, detailsY + 15);
  doc.text(`📊 Status: ${reservation.status.toUpperCase()}`, 300, detailsY + 40);
  
  if (reservation.special_requests) {
    doc.text(`📝 Special Requests:`, 300, detailsY + 65);
    doc.fontSize(9).fillColor(grayColor).text(reservation.special_requests, 300, detailsY + 80, { width: 230 });
  }
  
  doc.moveDown(6);

  // ── QR CHECK-IN SECTION ─────────────────────────────────
  const qrSectionY = doc.y;
  
  // QR Section Header
  doc.roundedRect(48, qrSectionY, 499, 40, 8).fillColor(primaryColor).fill();
  doc.fontSize(16).fillColor(whiteColor).font("Helvetica-Bold").text("📱 Quick Check-In", 200, qrSectionY + 12);
  
  doc.moveDown(3);
  
  // QR Code Box
  const qrBoxY = doc.y;
  drawBox(qrBoxY, 200, whiteColor);
  
  // QR Code
  const qrContent = `JR:${reservation.id}`;
  const baseUrl = process.env.FRONTEND_URL || "https://jollireserve-frontend.onrender.com";
  const checkinUrl = `${baseUrl}/checkin/${reservation.id}`;
  
  const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 180 });
  const buf = Buffer.from(qrDataUrl.split(",")[1], "base64");
  
  // Center QR code
  const qrSize = 120;
  const qrX = 297.5 - (qrSize / 2);
  doc.image(buf, qrX, qrBoxY + 20, { width: qrSize });
  
  // Instructions
  doc.fontSize(10).fillColor(grayColor).text(
    "Scan this QR code at the restaurant for faster check-in",
    48, qrBoxY + 155,
    { align: "center", width: 499 }
  );
  
  // URL
  doc.fontSize(9).fillColor(primaryColor).text(checkinUrl, 48, qrBoxY + 175, { align: "center", link: checkinUrl });
  
  doc.moveDown(5);

  // ── FOOTER ──────────────────────────────────────────────
  const footerY = doc.page.height - 80;
  
  // Footer line
  doc.moveTo(48, footerY).lineTo(547, footerY).strokeColor(lightGray).lineWidth(1).stroke();
  
  // Thank you message
  doc.fontSize(11).fillColor(secondaryColor).font("Helvetica-Bold").text(
    "Thank you for choosing JolliReserve!",
    48, footerY + 15,
    { align: "center" }
  );
  
  // Contact info
  doc.fontSize(9).fillColor(grayColor).text(
    "Questions? Contact us at support@jollireserve.com | www.jollireserve.com",
    48, footerY + 35,
    { align: "center" }
  );
  
  // Timestamp
  const now = new Date();
  doc.fontSize(8).fillColor(grayColor).text(
    `Receipt generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`,
    48, footerY + 50,
    { align: "center" }
  );

  doc.end();
}

module.exports = { buildReceiptPdf };
