import Link from "next/link";
import "./globals.css";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
    <html lang="en" className={`h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <nav className="flex items-center justify-between p-4 border-b">
          <div className="flex gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Home
              </Link>
              <Link
                href="/problems"
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Problems
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="text-sm font-medium hover:underline">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="text-sm font-medium px-3 py-1 bg-black text-white rounded">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
        </nav>
        {children}
      </body>
    </html>
    </ClerkProvider>
  );
}
