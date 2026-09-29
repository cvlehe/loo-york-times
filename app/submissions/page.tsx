import type { Metadata } from "next";
import Link from "next/link";
import { PlaceholderPage } from "@/app/ui/placeholder-page";

export const metadata: Metadata = { title: "My submissions" };

export default function SubmissionsPage() {
  return (
    <>
      <PlaceholderPage
        description="Track restroom locations you have sent to the editorial team and see whether each is pending, approved, or rejected."
        eyebrow="Contributor desk"
        nextTask="Submission tracking will be added in Task 12."
        title="My submissions"
      />
      <div className="submission-placeholder-action">
        <Link className="button-link" href="/submissions/new">Submit a restroom</Link>
      </div>
    </>
  );
}
