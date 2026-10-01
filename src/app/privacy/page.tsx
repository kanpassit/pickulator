import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Pickulator",
  description: "What Pickulator collects, why, and the choices you have.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Pickulator helps a group of friends decide where to eat. This page explains in plain language what
        information the app handles to do that, who it&apos;s shared with, and what you can control.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details</strong> - your name, email address and a hashed password (never the password
          itself) if you create an account.
        </li>
        <li>
          <strong>Group details</strong> - group names, the names people are added under, and invite links.
          Guests who join through a link are identified by that link, not by an account.
        </li>
        <li>
          <strong>Round answers</strong> - the cuisines, dealbreakers, budget, vibe, travel preferences and any
          dietary needs you submit, the area you enter for a round, and the check-in you leave afterwards
          (where you went and how it was).
        </li>
        <li>
          <strong>Cookies</strong> - a sign-in cookie for accounts, and a cookie that lets a guest be
          recognized when they return to a group they joined. Both are needed for the app to work.
        </li>
        <li>
          <strong>Usage analytics</strong> - if you accept analytics, Google Analytics records page views and
          general device and browser information. It is not loaded until you accept.
        </li>
      </ul>

      <h2>How it&apos;s used</h2>
      <ul>
        <li>To run rounds, combine everyone&apos;s answers and recommend a place.</li>
        <li>To show history and avoid repeating places a group has rated poorly or already visited.</li>
        <li>To send account emails such as password resets, and in-app notifications.</li>
        <li>To understand how the app is used and fix problems.</li>
      </ul>

      <h2>Who it&apos;s shared with</h2>
      <p>We don&apos;t sell your information. It is processed by services that help run the app:</p>
      <ul>
        <li>
          <strong>Anthropic</strong> - when a round is decided, the group&apos;s aggregated preferences, area
          and any places to avoid are sent to Anthropic&apos;s Claude API (with web search) to find a real
          restaurant. Individual names are not part of that request.
        </li>
        <li>
          <strong>Hosting and database providers</strong> - Vercel (hosting) and a managed Postgres database
          store the app and its data.
        </li>
        <li>
          <strong>Resend</strong> - sends account emails.
        </li>
        <li>
          <strong>Google Analytics</strong> - only if you accept analytics.
        </li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>You can decline analytics in the banner; the app works the same either way.</li>
        <li>Hosts can delete a round or a group, which removes its answers, results and check-ins.</li>
        <li>You can clear cookies at any time; guests may then need their invite link again.</li>
        <li>To ask about or delete your account data, use the contact details below.</li>
      </ul>

      <h2>Children</h2>
      <p>Pickulator isn&apos;t directed at children under 13 and we don&apos;t knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a meaningful way, the date at the top will be updated.</p>
    </LegalPage>
  );
}
