// app/page.jsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";
import DebtReminderApp from "@/components/DebtReminderApp";

const prisma = new PrismaClient();

export default async function Page() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  
  if (!sessionCookie?.value) redirect("/login");

  try {
    // Verifica e decodifica o token JWT
    const { payload } = await jwtVerify(
      sessionCookie.value,
      new TextEncoder().encode(process.env.JWT_SECRET || "supersecret")
    );
    
    // Busca os dados reais do usuário
    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: {
        id: true,
        email: true,
        phoneE164: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        nome: true,
        pix: true,
        documento: true,
        avatar: true,
      }
    });

    if (!user) {
      redirect("/signup");
    }

    // Prepara os dados do usuário para o componente
    const userData = {
      id: user.id,
      nome: user.nome || "Usuário",
      email: user.email || "",
      phoneE164: user.phoneE164 || "",
      pix: user.pix || user.email || user.phoneE164 || "",
      documento: user.documento || "",
      avatar: user.avatar || "",
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
    };

    return <DebtReminderApp user={userData} />;
  } catch (error) {
    console.error("Erro ao carregar usuário:", error);
    redirect("/login");
  }
}
