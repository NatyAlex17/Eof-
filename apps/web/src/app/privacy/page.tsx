export const metadata = {
  title: 'Privacy Policy — MANA Platform',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-gray-800">
      <h1 className="mb-2 text-3xl font-semibold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-gray-500">Last updated: July 10, 2026</p>

      <section className="space-y-6 leading-relaxed">
        <p>
          The MANA Platform (&quot;the Platform&quot;) is an internal operations system used
          exclusively by authorized staff of EOF and its affiliates to manage inventory,
          orders, invoicing, and vendor relationships. It is not offered to the general
          public.
        </p>

        <h2 className="text-xl font-semibold">Information we collect</h2>
        <p>
          The Platform stores business records — customer and vendor contact details,
          orders, inventory, invoices, and payment records — together with the name, email
          address, and activity logs of authorized staff accounts. We do not collect data
          from or about members of the public.
        </p>

        <h2 className="text-xl font-semibold">How we use information</h2>
        <p>
          Data is used solely to operate our seafood distribution business: processing
          orders, managing inventory, generating invoices, reconciling vendor statements,
          and synchronizing accounting records with QuickBooks Online. We do not sell,
          rent, or share data with third parties for marketing purposes.
        </p>

        <h2 className="text-xl font-semibold">QuickBooks Online integration</h2>
        <p>
          With authorization from our administrators, the Platform connects to Intuit
          QuickBooks Online to synchronize invoices, bills, and purchase orders. Access
          tokens are stored encrypted and are accessible only to the Platform&apos;s server.
          We access only the accounting data necessary for these functions and never share
          QuickBooks data with any other party.
        </p>

        <h2 className="text-xl font-semibold">Data security</h2>
        <p>
          Data is stored with access controls enforced at the database level (row-level
          security), encrypted in transit and at rest. Access requires authenticated staff
          accounts with role-based permissions, and changes to business records are
          recorded in an audit log.
        </p>

        <h2 className="text-xl font-semibold">Data retention</h2>
        <p>
          Business records are retained for as long as required for operational,
          accounting, and legal purposes. Staff accounts are deactivated when personnel
          leave the company.
        </p>

        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          For questions about this policy or our data practices, contact us at{' '}
          <a className="text-blue-700 underline" href="mailto:bereket@eromoventures.com">
            bereket@eromoventures.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
