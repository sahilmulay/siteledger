import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Privacy Policy" backTo="/settings" />
      <PageWrapper>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-sm text-gray-700 space-y-6">
          
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-xs">
            <p className="font-semibold">Notice for review</p>
            <p>This document requires professional legal review to ensure full compliance before public distribution. Placeholders must be replaced with accurate business information.</p>
          </div>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly to us when you register for an account, create a project, add vendors, log expenses, or upload site photos and plans. This includes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account Information:</strong> Email address and password.</li>
              <li><strong>Project Financials:</strong> Income, expenses, client details, and budgets.</li>
              <li><strong>Vendor Directory:</strong> Names and phone numbers of your workers or suppliers.</li>
              <li><strong>Media:</strong> Photos of receipts, bills, and construction sites.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">2. How We Use Your Information</h2>
            <p>We use the collected data strictly to provide the core functionality of the ledger application:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To maintain your project financial records and generate PDF reports.</li>
              <li>To synchronize your data securely across devices via our cloud backend (Supabase).</li>
              <li>To provide customer support and troubleshoot application errors.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">3. Data Storage and Security</h2>
            <p>
              Your data is stored securely using Supabase (our backend service provider). We employ Row Level Security (RLS) policies 
              to ensure that your financial data and project files are isolated and accessible only to your authenticated account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Third-Party Services</h2>
            <p>
              We do not sell your personal or financial information. We share information only with service providers needed to operate the application:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase:</strong> For database, authentication, and secure file storage.</li>
              <li><strong>Vercel Analytics:</strong> For basic, aggregated performance monitoring.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">5. Data Deletion and Rights</h2>
            <p>
              You have the right to access, update, or delete your account and associated project data at any time. 
              Contact us to request complete removal of your records from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">6. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <p className="mt-2 font-medium">Email: [Support Email Address]</p>
            <p>Business Name: [Your Business Name / JadhavPatil Construction]</p>
          </section>

          <div className="pt-4 border-t border-gray-100 text-xs text-gray-500">
            Effective Date: [Date]
          </div>

        </div>
      </PageWrapper>
    </div>
  )
}
