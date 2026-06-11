import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z, ZodError } from "zod";

const resetSchema = z.object({
  email: z.string().email("Email invalido"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = resetSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "No existe un usuario con ese email" },
        { status: 404 }
      );
    }

    const tempPassword = Math.random()
      .toString(36)
      .slice(2, 10);

    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: "Contraseña temporal generada",
      tempPassword,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
