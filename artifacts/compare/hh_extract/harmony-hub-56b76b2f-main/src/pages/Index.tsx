import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Disc3, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { ParticleBackground } from "@/components/effects/ParticleBackground";
import { FloatingNotes } from "@/components/effects/FloatingNotes";
import siteConfig from "@/data/siteConfig.json";
import releases from "@/data/releases.json";
import type { Release } from "@/types";

const typedReleases = releases as Release[];
const featuredRelease = typedReleases.find((r) => r.featured) || typedReleases[0];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

// Stats data (placeholder - can be made dynamic later)
const stats = [
  { label: "Releases", value: typedReleases.length },
  { label: "Streams", value: "50K+" },
  { label: "Countries", value: "30+" },
];

// Quick links
const quickLinks = [
  {
    title: "Releases",
    description: "Explore our growing catalog",
    href: "/releases",
    icon: Disc3,
  },
  {
    title: "The Tool",
    description: "Analyze harmonic structures",
    href: "/tool",
    icon: Music,
  },
];

export default function Index() {
  return (
    <Layout>
      <ParticleBackground particleCount={40} />
      <FloatingNotes count={8} />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <motion.div
          className="container relative z-10 px-4 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Main Title */}
          <motion.h1
            variants={itemVariants}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-bold tracking-tight mb-6"
          >
            <span className="gradient-text">{siteConfig.siteName}</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl lg:text-3xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            {siteConfig.tagline}
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button asChild size="lg" className="gap-2 text-base glow-cyan">
              <Link to="/releases">
                <Play className="h-5 w-5" />
                Explore Releases
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 text-base border-primary/50 hover:bg-primary/10"
            >
              <Link to="/tool">
                Try the Tool
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Featured Release Section */}
      {featuredRelease && (
        <section className="py-20 md:py-32">
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-4 text-center">
                Latest Release
              </h2>
              <div className="max-w-4xl mx-auto">
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8">
                    {/* Album Art */}
                    <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                      <img
                        src={featuredRelease.artwork}
                        alt={`${featuredRelease.title} album artwork`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Release Info */}
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-medium uppercase tracking-wider text-primary mb-2">
                        {featuredRelease.type}
                      </span>
                      <h3 className="text-3xl md:text-4xl font-display font-bold mb-2">
                        {featuredRelease.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {featuredRelease.artist}
                      </p>
                      <p className="text-sm text-muted-foreground mb-6">
                        {featuredRelease.description}
                      </p>

                      {/* Genre Tags */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {featuredRelease.genres.map((genre) => (
                          <span
                            key={genre}
                            className="px-3 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>

                      {/* Listen Button */}
                      <Button asChild className="w-full sm:w-auto">
                        <Link to="/releases">
                          <Play className="h-4 w-4 mr-2" />
                          Listen Now
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-16 border-y border-border/50">
        <div className="container px-4">
          <motion.div
            className="grid grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-3xl md:text-5xl font-display font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Explore Clade
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Discover our music catalog or dive into the harmony analysis tool.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {quickLinks.map((link, index) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={link.href} className="group block">
                  <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                    <link.icon className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {link.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {link.description}
                    </p>
                    <div className="mt-4 flex items-center text-primary text-sm font-medium">
                      Explore
                      <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-20 md:py-32">
        <div className="container px-4">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <blockquote className="text-2xl md:text-3xl font-display leading-relaxed text-foreground/90">
              "Music is the universal language that connects us all.{" "}
              <span className="gradient-text">Clade</span> explores the
              mathematical beauty hidden within every harmony."
            </blockquote>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
