import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

const TermsConditions = () => {
  const { settings, isLoading } = useGatewaySettings();
  const gatewayName = settings.gatewayName || 'Payment Gateway';
  const logoUrl = settings.logoUrl;
  const supportEmail = settings.supportEmail || 'support@example.com';

  useDocumentMeta({
    title: `Terms & Conditions - ${gatewayName}`,
    description: `Terms and Conditions for ${gatewayName}. Read our terms of service and usage policies.`,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-xl object-contain" />
            ) : !isLoading ? (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
            )}
            <span className="text-xl font-bold">{gatewayName}</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Terms & Conditions</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using {gatewayName}'s payment gateway services, you agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Definitions</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>"Service"</strong> refers to the payment gateway services provided by {gatewayName}</li>
              <li><strong>"Merchant"</strong> refers to any business or individual using our services to accept payments</li>
              <li><strong>"User"</strong> refers to any person accessing or using our platform</li>
              <li><strong>"Transaction"</strong> refers to any payment processed through our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use our services, you must be at least 18 years of age and have the legal capacity to enter into a binding agreement. 
              Merchants must be legally registered businesses with valid documentation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">When creating an account, you agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information as needed</li>
              <li>Keep your login credentials secure and confidential</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Services Provided</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">{gatewayName} provides:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Payment processing services for online transactions</li>
              <li>Secure payment gateway integration</li>
              <li>Transaction reporting and analytics</li>
              <li>Settlement and payout services</li>
              <li>API access for integration purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Fees and Payments</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">By using our services, you agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Pay all applicable transaction fees as outlined in your merchant agreement</li>
              <li>Maintain sufficient balance for fee deductions</li>
              <li>Accept our fee schedule which may be updated with notice</li>
              <li>Acknowledge that refunds may incur additional processing fees</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to use our services for:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Any illegal or fraudulent activities</li>
              <li>Money laundering or terrorist financing</li>
              <li>Transactions involving prohibited goods or services</li>
              <li>Circumventing any security measures</li>
              <li>Interfering with the proper functioning of our platform</li>
              <li>Violating any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Transaction Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to decline, suspend, or reverse any transaction that we believe, in our sole discretion, 
              may be fraudulent, illegal, or in violation of these terms. Settlement timelines are subject to our standard processing schedules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Chargebacks and Disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              Merchants are responsible for handling customer disputes and chargebacks. We may deduct chargeback amounts and 
              associated fees from your account. Excessive chargebacks may result in account suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, trademarks, and intellectual property on our platform are owned by {gatewayName} or its licensors. 
              You may not use, copy, or distribute any content without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, {gatewayName} shall not be liable for any indirect, incidental, special, 
              consequential, or punitive damages arising from your use of our services. Our total liability shall not exceed 
              the fees paid by you in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">12. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless {gatewayName}, its officers, directors, employees, and agents from any 
              claims, damages, losses, or expenses arising from your use of our services or violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">13. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              Either party may terminate this agreement with written notice. We reserve the right to suspend or terminate 
              your account immediately for any violation of these terms. Upon termination, outstanding balances will be 
              settled according to our standard procedures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">14. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms and Conditions at any time. Changes will be effective upon posting to our website. 
              Your continued use of our services after any changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">15. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms and Conditions shall be governed by and construed in accordance with applicable laws. 
              Any disputes shall be resolved through binding arbitration or in the courts of the applicable jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">16. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms and Conditions, please contact us at:{' '}
              <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border/40 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <span className="font-semibold">{gatewayName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {gatewayName}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsConditions;
