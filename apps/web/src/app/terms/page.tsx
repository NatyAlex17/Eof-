export const metadata = {
  title: 'Terms of Use — MANA Platform',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-gray-800">
      <h1 className="mb-2 text-3xl font-semibold">Terms of Use</h1>
      <p className="mb-8 text-sm text-gray-500">Last updated: July 10, 2026</p>

      <section className="space-y-6 leading-relaxed">
        <h2 className="text-xl font-semibold">1. Scope</h2>
        <p>
          The MANA Platform (&quot;the Platform&quot;) is proprietary internal software
          operated by EOF for use by its authorized employees and contractors only. Access
          is granted at the company&apos;s discretion and may be revoked at any time.
        </p>

        <h2 className="text-xl font-semibold">2. Acceptable use</h2>
        <p>
          Users may access the Platform only with their own assigned account and only for
          legitimate business purposes. Sharing credentials, attempting to access data
          beyond your assigned role, or interfering with the Platform&apos;s operation is
          prohibited.
        </p>

        <h2 className="text-xl font-semibold">3. Data</h2>
        <p>
          All business records in the Platform are the property of EOF. Users must handle
          customer and vendor information in accordance with our{' '}
          <a className="text-blue-700 underline" href="/privacy">
            Privacy Policy
          </a>{' '}
          and applicable company policies.
        </p>

        <h2 className="text-xl font-semibold">4. Third-party services</h2>
        <p>
          The Platform integrates with third-party services, including Intuit QuickBooks
          Online, to perform accounting synchronization. Use of those services through the
          Platform is additionally subject to the respective provider&apos;s terms.
        </p>

        <h2 className="text-xl font-semibold">5. Availability and changes</h2>
        <p>
          The Platform is provided on an as-is basis for internal use. We may modify,
          suspend, or discontinue any feature at any time without notice.
        </p>

        <h2 className="text-xl font-semibold">6. Contact</h2>
        <p>
          Questions about these terms should be directed to{' '}
          <a className="text-blue-700 underline" href="mailto:bereket@eromoventures.com">
            bereket@eromoventures.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
