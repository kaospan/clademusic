import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Music,
  Youtube,
  Instagram,
  Twitter,
  ChevronUp,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import siteConfig from "@/data/siteConfig.json";

const footerLinks = {
  navigation: [
    { href: "/", label: "Home" },
    { href: "/releases", label: "Releases" },
    { href: "/tool", label: "Tool" },
    { href: "/events", label: "Events" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

// Social icon mapping
const socialIcons: Record<string, React.ReactNode> = {
  spotify: <Music className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5" />,
  instagram: <Instagram className="h-5 w-5" />,
  twitter: <Twitter className="h-5 w-5" />,
  soundcloud: <Music className="h-5 w-5" />,
};

export function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    // Simulate newsletter signup (replace with actual integration)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast({
      title: "Subscribed!",
      description: "Thanks for joining the Clade community.",
    });
    
    setEmail("");
    setIsSubmitting(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border bg-card/30 backdrop-blur-sm">
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />

      <div className="container relative mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="inline-block text-3xl font-display font-bold gradient-text mb-4"
            >
              {siteConfig.siteName}
            </Link>
            <p className="text-muted-foreground max-w-sm mb-6">
              {siteConfig.description}
            </p>

            {/* Newsletter Signup */}
            <form onSubmit={handleNewsletterSubmit} className="max-w-sm">
              <p className="text-sm font-medium mb-3">Join the community</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-muted/50"
                  required
                  aria-label="Email for newsletter"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isSubmitting}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Subscribe</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Navigation
            </h3>
            <ul className="space-y-3">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-foreground/80 hover:text-primary transition-colors animated-underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Connect
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(siteConfig.socials).map(([platform, url]) => (
                <motion.a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={`Visit our ${platform}`}
                >
                  {socialIcons[platform] || <Music className="h-5 w-5" />}
                </motion.a>
              ))}
            </div>

            {/* Legal Links */}
            <div className="mt-8">
              <ul className="space-y-2">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {siteConfig.copyright}. All rights reserved.
          </p>

          {/* Back to Top */}
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToTop}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronUp className="h-4 w-4" />
            Back to top
          </Button>
        </div>
      </div>
    </footer>
  );
}
