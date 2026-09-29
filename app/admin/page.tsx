import type { Metadata } from "next";
import { PlaceholderPage } from "@/app/ui/placeholder-page";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <PlaceholderPage
      description="Review community submissions and maintain the published restroom directory."
      eyebrow="Editorial desk"
      nextTask="The server-enforced review queue will be added in Task 13."
      title="Administration"
    />
  );
}
