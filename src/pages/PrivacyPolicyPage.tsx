import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, UserCheck, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-muted-foreground">
            Last updated: January 22, 2026
          </p>
        </div>

        <Card className="p-6 md:p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              <Eye className="h-6 w-6" />
              1. Information We Collect
            </h2>
            
            <h3 className="text-lg font-semibold mb-2">1.1 Information You Provide</h3>
            <p className="text-muted-foreground mb-3">
              When you create an account and use CladeAI, you provide:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Account information (email, username, password)</li>
              <li>Profile information (display name, avatar, bio)</li>
              <li>Music preferences and listening habits</li>
              <li>Content you create (posts, comments, playlists)</li>
              <li>Communication with us (support messages, feedback)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">1.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Device information (browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>IP address and general location</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">1.3 Third-Party Information</h3>
            <p className="text-muted-foreground mb-3">
              When you connect third-party services (Spotify, YouTube):
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>OAuth tokens for authentication</li>
              <li>Public profile information</li>
              <li>Listening history and preferences (with your permission)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              <UserCheck className="h-6 w-6" />
              2. How We Use Your Information
            </h2>
            <p className="text-muted-foreground mb-3">
              We use collected information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide and maintain the Service</li>
              <li>Personalize your experience and recommendations</li>
              <li>Enable social features (comments, forums, connections)</li>
              <li>Send important notifications about your account</li>
              <li>Analyze usage patterns to improve the Service</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              <Globe className="h-6 w-6" />
              3. Information Sharing and Disclosure
            </h2>
            
            <h3 className="text-lg font-semibold mb-2">3.1 Public Information</h3>
            <p className="text-muted-foreground mb-4">
              Your profile, posts, comments, and public playlists are visible to other users of the Service.
            </p>

            <h3 className="text-lg font-semibold mb-2">3.2 Third-Party Services</h3>
            <p className="text-muted-foreground mb-3">
              We share information with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Spotify & YouTube:</strong> To enable music playback</li>
              <li><strong>Supabase:</strong> Our database and authentication provider</li>
              <li><strong>Analytics Services:</strong> To understand usage patterns</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">3.3 Legal Requirements</h3>
            <p className="text-muted-foreground">
              We may disclose your information if required by law, court order, or to protect the rights, property, or safety of CladeAI, our users, or others.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              <Lock className="h-6 w-6" />
              4. Data Security
            </h2>
            <p className="text-muted-foreground mb-3">
              We implement security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encryption at rest for sensitive data</li>
              <li>Row-level security policies in our database</li>
              <li>Regular security audits and penetration testing</li>
              <li>Rate limiting to prevent abuse</li>
              <li>Secure password hashing (bcrypt)</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. Your Rights and Choices</h2>
            
            <h3 className="text-lg font-semibold mb-2">5.1 Access and Update</h3>
            <p className="text-muted-foreground mb-4">
              You can access and update your profile information at any time through your account settings.
            </p>

            <h3 className="text-lg font-semibold mb-2">5.2 Delete Your Account</h3>
            <p className="text-muted-foreground mb-4">
              You can delete your account from settings. This will remove your personal information, but public content may remain archived.
            </p>

            <h3 className="text-lg font-semibold mb-2">5.3 Marketing Communications</h3>
            <p className="text-muted-foreground mb-4">
              You can opt out of marketing emails by clicking "unsubscribe" in any email or updating your preferences.
            </p>

            <h3 className="text-lg font-semibold mb-2">5.4 Cookies</h3>
            <p className="text-muted-foreground">
              You can control cookies through your browser settings. Note that disabling cookies may affect Service functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your information as long as your account is active or as needed to provide the Service. After account deletion, we may retain some information for legal, security, and operational purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Children's Privacy</h2>
            <p className="text-muted-foreground">
              The Service is not intended for children under 13. We do not knowingly collect information from children under 13. If you believe we have collected such information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">8. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">9. GDPR Compliance (EU Users)</h2>
            <p className="text-muted-foreground mb-3">
              If you are in the European Union, you have additional rights under GDPR:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">10. CCPA Compliance (California Users)</h2>
            <p className="text-muted-foreground mb-3">
              If you are a California resident, you have rights under CCPA:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of the sale of personal information</li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              <strong>Note:</strong> We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">11. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">12. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or your data, contact us at:
            </p>
            <ul className="text-muted-foreground mt-3 space-y-1">
              <li>
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@cladeai.com" className="text-primary hover:underline">
                  privacy@cladeai.com
                </a>
              </li>
              <li>
                <strong>Data Protection Officer:</strong>{' '}
                <a href="mailto:dpo@cladeai.com" className="text-primary hover:underline">
                  dpo@cladeai.com
                </a>
              </li>
            </ul>
          </section>
        </Card>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
