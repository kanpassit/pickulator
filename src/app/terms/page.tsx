import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use | Pickulator",
  description: "The ground rules for using Pickulator.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>By using Pickulator you agree to these terms. If you don&apos;t agree, please don&apos;t use the app.</p>

      <h2>The service</h2>
      <p>
        Pickulator lets groups share preferences privately and get an AI-assisted suggestion for where to eat,
        drink or get coffee. It is free to use and may change or be discontinued at any time.
      </p>

      <h2>Recommendations</h2>
      <p>
        Suggestions are generated with the help of AI and web search. We try to recommend real, open places but
        can&apos;t guarantee that a place is open, available, accurately described, suitable for your dietary
        needs or allergies, or that ratings and prices are current. Please confirm details with the venue
        before you go.
      </p>

      <h2>Your account and groups</h2>
      <ul>
        <li>Keep your sign-in details and personal invite links private; you&apos;re responsible for activity under them.</li>
        <li>Only add people to a group who are happy to take part, and only share links with them.</li>
        <li>Don&apos;t use the app to harass others, break the law, or try to disrupt or probe the service.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You keep ownership of what you enter. You give us permission to store and process it as needed to
        run the app, as described in the Privacy Policy.
      </p>

      <h2>No warranty</h2>
      <p>
        The app is provided &quot;as is&quot; without warranties of any kind. To the extent the law allows,
        we aren&apos;t liable for losses arising from your use of the app or from a recommendation, including
        any meal, venue or travel decision you make.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms; continuing to use the app after a change means you accept the update.</p>
    </LegalPage>
  );
}
