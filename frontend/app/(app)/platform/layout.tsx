import { PlatformAdminGuard } from "@/components/platform/platform-admin-guard";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformAdminGuard>{children}</PlatformAdminGuard>;
}
