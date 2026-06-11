import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { z, ZodError } from "zod";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

const resetTokens = new Map<
  string,
  { userId: string; expiresAt: number }
>();

const requestSchema = z.object({
  email: z.string().email("Email invalido"),
});

const resetBodySchema = z.object({
  token: z.string().min(1, "Token requerido"),
  newPassword: z.string().min(6, "Minimo 6 caracteres"),
});

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, entry] of resetTokens) {
    if (entry.expiresAt < now) {
      resetTokens.delete(token);
    }
  }
}

function resetPasswordHtml(resetUrl: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e3a8a;">Restablecer Contraseña</h2>
      <p>Has solicitado restablecer tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
      <p><a href="${resetUrl}" style="background-color: #1e3a8a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a></p>
      <p>Este enlace expirará en 1 hora.</p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = requestSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { message: "Si existe una cuenta con ese email, se enviará un enlace de restablecimiento" },
        { status: 200 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + TOKEN_EXPIRY_MS;

    cleanExpiredTokens();
    resetTokens.set(token, { userId: user.id, expiresAt });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    const hasEmailService = !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST);

    if (hasEmailService) {
      await sendEmail({
        to: user.email,
        subject: "Restablecer Contraseña",
        html: resetPasswordHtml(resetUrl),
      });
    } else {
      console.log(`[DEV RESET] Enlace de restablecimiento: ${resetUrl}`);
    }

    return NextResponse.json({
      message: "Si existe una cuenta con ese email, se enviará un enlace de restablecimiento",
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token requerido" },
        { status: 400 }
      );
    }

    cleanExpiredTokens();
    const entry = resetTokens.get(token);

    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) resetTokens.delete(token);
      return NextResponse.json(
        { error: "Token invalido o expirado" },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true, token });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = resetBodySchema.parse(body);

    cleanExpiredTokens();
    const entry = resetTokens.get(token);

    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) resetTokens.delete(token);
      return NextResponse.json(
        { error: "Token invalido o expirado" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: entry.userId } });
    if (!user) {
      resetTokens.delete(token);
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    resetTokens.delete(token);

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
