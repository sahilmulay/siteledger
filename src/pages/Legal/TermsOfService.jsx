import { Header } from '../../components/layout/Header'
import { PageWrapper } from '../../components/layout/PageWrapper'

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Terms of Service" backTo="/settings" />
      <PageWrapper>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-sm text-gray-700 space-y-6">
          
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-xs">
            <p className="font-semibold">Notice for review</p>
            <p>This document requires professional legal review to ensure full compliance before public distribution. Placeholders must be replaced with accurate business information.</p>
          </div>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using our construction management application (the "Service"), you agree to be bound by these Terms of Service. 
              If you disagree with any part of the terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">2. Description of Service</h2>
            <p>
              The Service provides a digital ledger for tracking construction project financials, including income, expenses, vendor directories, 
              and site media (photos/plans). It allows users to generate PDF reports for personal or client-facing use.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">3. User Accounts and Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials (email and password). 
              You are entirely responsible for all activities that occur under your account. We use Row Level Security to protect your data, 
              but you must secure your own device and login information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Acceptable Use and Content</h2>
            <p>
              You retain all rights to the data (financial records, photos, plans) you upload to the Service. However, you agree not to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Upload illegal, harmful, or unauthorized content.</li>
              <li>Attempt to bypass the Service's security measures or access data belonging to other users.</li>
              <li>Use the Service for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">5. Disclaimer of Warranties and Liability</h2>
            <p>
              The Service is provided "AS IS" without warranties of any kind. We do not guarantee that the Service will be uninterrupted or error-free. 
              The financial tracking features are for organizational purposes only and do not constitute certified accounting or tax advice. 
              In no event shall we be liable for any indirect, incidental, or consequential damages resulting from the use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">6. Modifications to the Service</h2>
            <p>
              We reserve the right to modify or discontinue, temporarily or permanently, the Service with or without notice. 
              We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">7. Contact Information</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
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
