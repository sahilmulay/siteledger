# Roadmap

This roadmap outlines the prioritized sequence of pending tasks, improvements, and fixes for SiteLedger, based on current known issues, architecture risks, and planned features.

## High Priority
*Critical issues, security fixes, data integrity issues, architecture risks.*

1. **Fix Storage Authorization (RLS Policies)**
   - **Description**: Storage RLS policies for `project-files` currently rely solely on whether a user is `authenticated`, lacking stricter owner checks.
   - **Reason for Priority**: Security vulnerability. Prevents potential unauthorized access, modification, or deletion of another user's project files.
   - **Expected Impact**: Ensures strict tenant isolation for all uploaded documents and photos.

2. **Fix PWA Cache Persistence (Service Worker)**
   - **Description**: The service worker retains private API responses in CacheStorage even after a user logs out, leading to potential data leakage on shared devices.
   - **Reason for Priority**: Security and privacy risk.
   - **Expected Impact**: Protects sensitive financial data by enforcing a strict `NetworkOnly` policy for auth/private routes and wiping caches upon logout.

3. **Fix Vendor/Category Local Storage Leakage**
   - **Description**: Vendor and category data stored in LocalStorage occasionally leak between accounts if multiple users log in on the same shared device.
   - **Reason for Priority**: Data integrity and privacy risk.
   - **Expected Impact**: Ensures 100% data isolation on shared devices by scoping cached metadata to the authenticated user's UID.

4. **Resolve Pagination Limits for PDFs & Backups**
   - **Description**: Bulk PDF reports and backups currently cap at 1,000 rows due to default Supabase limits, causing silent omission of transactions.
   - **Reason for Priority**: Data integrity issue. Users rely on these reports for accurate accounting.
   - **Expected Impact**: Accurate, complete financial exports using database aggregates or paginated fetching loops.

## Medium Priority
*Performance improvements, usability improvements, scalability enhancements.*

1. **Enhance Offline Sync Capabilities**
   - **Description**: Strengthen the PWA's offline capabilities to queue data mutations (like adding expenses) when offline, and sync them once the network is restored.
   - **Reason for Priority**: Usability improvement. Construction sites often have poor or fluctuating network conditions.
   - **Expected Impact**: Seamless, interruption-free usage for field engineers and contractors.

## Low Priority
*Nice-to-have features, future enhancements, optional improvements.*

1. **Automated Mobile UI Testing**
   - **Description**: Implement UI regression tests simulating 360px-390px viewport widths to catch header truncations and layout overflows automatically.
   - **Reason for Priority**: Technical debt / Future enhancement.
   - **Expected Impact**: Reduces manual testing overhead and ensures strict adherence to the mobile-first UI rules.

2. **Advanced WhatsApp Integration**
   - **Description**: Enhance the current deep-link WhatsApp sharing to potentially use a direct API or more richly formatted PDF sharing flows.
   - **Reason for Priority**: Nice-to-have feature.
   - **Expected Impact**: Smoother client communication and report sharing.
