import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/experiences", label: "Experiences" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border p-4 md:p-6">
        <Logo href="/admin" />
        <nav className="mt-6 flex md:flex-col gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium text-foreground-muted hover:bg-surface-sunken hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
