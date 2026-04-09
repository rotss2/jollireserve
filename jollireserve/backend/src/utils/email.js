const https = require("https");

async function sendMail({ to, subject, text }) {
  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || "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";
  if (!apiKey) {
    console.log("📧 No BREVO_API_KEY — skipping email");
    return { skipped: true };
  }

  const from = process.env.EMAIL_FROM || "JolliReserve <noreply@jollireserve.com>";
  // Parse "Name <email>" format
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  const fromName = match ? match[1].trim() : "JolliReserve";
  const fromEmail = process.env.BREVO_SMTP_USER || (match ? match[2].trim() : "ronnvincentpingol2005@gmail.com");

  const body = JSON.stringify({
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject,
    textContent: text,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.brevo.com",
        path: "/v3/smtp/email",
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log("📧 Email sent via Brevo:", parsed.messageId);
              resolve({ messageId: parsed.messageId });
            } else {
              console.error("📧 Brevo error:", parsed);
              resolve({ skipped: true, error: JSON.stringify(parsed) });
            }
          } catch (e) {
            resolve({ skipped: true, error: e.message });
          }
        });
      }
    );
    req.on("error", (err) => {
      console.error("📧 Brevo request failed:", err.message);
      resolve({ skipped: true, error: err.message });
    });
    req.write(body);
    req.end();
  });
}

module.exports = { sendMail };