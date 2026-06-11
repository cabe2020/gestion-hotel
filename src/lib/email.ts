/* eslint-disable @typescript-eslint/no-explicit-any */
import { Resend } from "resend";
import nodemailer from "nodemailer";

const getResendClient = () => {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
};

const getSmtpTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const from = process.env.EMAIL_FROM || "hotel@hosterix.com";

  const resend = getResendClient();
  if (resend) {
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[Resend Error]", error);
      return { success: false, mode: "resend", error: error.message };
    }
    return { success: true, mode: "resend" };
  }

  const transporter = getSmtpTransporter();
  if (transporter) {
    await transporter.sendMail({ from, to, subject, html });
    return { success: true, mode: "smtp" };
  }

  console.log(`[DEV EMAIL] To: ${to}, Subject: ${subject}`);
  console.log(html);
  return { success: true, mode: "dev" };
}

export function bookingConfirmationHtml(booking: any, hotel: any) {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1e3a8a;">${hotel.name}</h2>
  <h3>Confirmacion de Reserva</h3>
  <p>Estimado/a ${booking.guest.firstName} ${booking.guest.lastName},</p>
  <p>Su reserva ha sido confirmada exitosamente.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Codigo de Reserva</td><td style="padding: 8px; border: 1px solid #ddd;">${booking.code}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Check-in</td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(booking.checkIn).toLocaleDateString("es")}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Check-out</td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(booking.checkOut).toLocaleDateString("es")}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Habitacion</td><td style="padding: 8px; border: 1px solid #ddd;">${booking.room?.number || "Por asignar"}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total</td><td style="padding: 8px; border: 1px solid #ddd;">${hotel.currency} ${booking.totalAmount.toFixed(2)}</td></tr>
  </table>
  <p>Gracias por elegir ${hotel.name}.</p>
</div>
`;
}

export function checkInReminderHtml(booking: any, hotel: any) {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1e3a8a;">${hotel.name}</h2>
  <h3>Recordatorio de Check-in</h3>
  <p>Estimado/a ${booking.guest.firstName} ${booking.guest.lastName},</p>
  <p>Le recordamos que su check-in es manana ${new Date(booking.checkIn).toLocaleDateString("es")}.</p>
  <p>Codigo de reserva: <strong>${booking.code}</strong></p>
  <p>Esperamos su llegada!</p>
</div>
`;
}
