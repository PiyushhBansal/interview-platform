import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import GlobalNav from "@/components/GlobalNav";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
    <html lang="en" className={`h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <GlobalNav />
        {children}
      </body>
    </html>
    </ClerkProvider>
  );
}
