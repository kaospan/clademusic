import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Cookie, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';

export function TermsOfServicePage() {
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
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-muted-foreground">
            Last updated: January 22, 2026
          </p>
        </div>

        <Card className="p-6 md:p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using CladeAI ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground mb-3">
              CladeAI provides a music discovery and community platform that allows users to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Discover and listen to music through integrated streaming services</li>
              <li>Participate in music discussion forums</li>
              <li>Share and comment on tracks</li>
              <li>Create and manage playlists</li>
              <li>Connect with other music enthusiasts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">3. User Accounts</h2>
            <h3 className="text-lg font-semibold mb-2">3.1 Account Creation</h3>
            <p className="text-muted-foreground mb-3">
              You must create an account to access certain features. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li>Providing accurate and complete information</li>
              <li>Maintaining the security of your password</li>
              <li>All activities that occur under your account</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">3.2 Account Requirements</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>You must be at least 13 years old to create an account</li>
              <li>One person may not maintain multiple accounts</li>
              <li>Accounts are non-transferable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">4. User Content</h2>
            <h3 className="text-lg font-semibold mb-2">4.1 Content Ownership</h3>
            <p className="text-muted-foreground mb-4">
              You retain ownership of any content you post, including comments, posts, and playlists. By posting content, you grant CladeAI a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content.
            </p>

            <h3 className="text-lg font-semibold mb-2">4.2 Prohibited Content</h3>
            <p className="text-muted-foreground mb-3">
              You agree not to post content that:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Violates any law or regulation</li>
              <li>Infringes on intellectual property rights</li>
              <li>Contains hate speech, harassment, or threats</li>
              <li>Is sexually explicit or promotes violence</li>
              <li>Contains spam or malicious code</li>
              <li>Impersonates others or misrepresents affiliation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. Community Guidelines</h2>
            <p className="text-muted-foreground mb-3">
              All users must adhere to our Community Guidelines:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Be respectful:</strong> Treat others with courtesy and respect</li>
              <li><strong>Stay on topic:</strong> Keep discussions relevant to music</li>
              <li><strong>No spam:</strong> Don't post repetitive or promotional content</li>
              <li><strong>Authentic engagement:</strong> Don't manipulate votes or engagement</li>
              <li><strong>Report violations:</strong> Help us maintain a positive community</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The Service and its original content, features, and functionality are owned by CladeAI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Third-Party Services</h2>
            <p className="text-muted-foreground mb-3">
              The Service integrates with third-party streaming services (Spotify, YouTube). Your use of these services is subject to their respective terms of service:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Spotify Terms of Service</li>
              <li>YouTube Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">8. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              In no event shall CladeAI, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">12. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms, please contact us at:{' '}
              <a href="mailto:legal@cladeai.com" className="text-primary hover:underline">
                legal@cladeai.com
              </a>
            </p>
          </section>
        </Card>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
