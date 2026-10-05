import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Accessibility | Pickulator",
  description: "How Pickulator works toward an accessible experience for everyone.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility">
      <p>
        We want Pickulator to be usable by everyone, including people who use screen readers, keyboards,
        magnification or other assistive technology. We aim to meet the Web Content Accessibility Guidelines
        (WCAG) 2.1 Level AA.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>Every page has a main landmark and a &ldquo;Skip to main content&rdquo; link for keyboard users.</li>
        <li>Form fields have labels, errors are announced to screen readers, and selections expose their state.</li>
        <li>Text and form-control borders are designed to meet WCAG contrast minimums.</li>
        <li>Everything can be used with a keyboard, with a visible focus indicator.</li>
        <li>Animations are reduced when your device is set to prefer reduced motion.</li>
      </ul>

      <h2>Known limits</h2>
      <p>
        We test as we build but haven&apos;t had a full third-party audit yet, so some things may still be
        rough. Restaurant details and photos come from outside sources and may not always have text
        alternatives.
      </p>

      <h2>Tell us about a problem</h2>
      <p>
        If something doesn&apos;t work for you, please let us know what page you were on and what assistive
        technology you use, and we&apos;ll work to fix it.
      </p>
    </LegalPage>
  );
}
