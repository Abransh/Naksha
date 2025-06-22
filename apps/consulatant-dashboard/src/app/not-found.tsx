import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--main-background)]">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-[var(--black-100)]">404</h1>
          <h2 className="text-2xl font-semibold text-[var(--black-60)]">
            Page Not Found
          </h2>
          <p className="text-[var(--black-30)] max-w-md mx-auto">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button
          asChild
          className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90"
        >
          <Link href="/">Go back home</Link>
        </Button>
      </div>
    </div>
  );
}
