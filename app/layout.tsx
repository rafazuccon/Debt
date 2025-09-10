import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${spaceGrotesk.variable} h-full`}>
      <body className="min-h-screen bg-black text-purple-500 font-sans">
        {children}
      </body>
    </html>
  );
}
