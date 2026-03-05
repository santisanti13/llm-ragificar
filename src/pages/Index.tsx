import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  ArrowRight, Loader2, Shield, Code, FileText, Bot, Terminal, Check,
  ChevronRight, Sparkles, Lock, Upload, Brain, Rocket,
  Menu, X, Play, Zap, Mail, Twitter, Github, Linkedin
} from 'lucide-react';
import logo from '@/assets/logo.png';
import logoWhite from '@/assets/logo-white.png';

export default function Index() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const navLinks = [
    { label: 'OVERVIEW', href: '#features' },
    { label: 'BENEFITS', href: '#benefits' },
    { label: 'HOW IT WORKS', href: '#how-it-works' },
    { label: 'PRICING', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - TinyFish style: clean, monospaced */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="RAGify" className="h-24 md:h-28 w-auto -my-6 dark:hidden" />
            <img src={logoWhite} alt="RAGify" className="h-24 md:h-28 w-auto -my-6 hidden dark:block" />
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-mono tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
              className="hidden sm:flex font-mono text-xs tracking-wider"
            >
              LOG IN
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/auth')}
              className="gradient-primary font-mono text-xs tracking-wider px-5"
            >
              START FREE
            </Button>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-background border-b border-border animate-fade-in">
            <div className="container mx-auto px-6 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-xs font-mono tracking-widest text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Button variant="outline" size="sm" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="w-full mt-2 font-mono text-xs tracking-wider">
                LOG IN
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - TinyFish style: massive typography */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 relative">
        <div className="container mx-auto px-6">
          {/* Small badge */}
          <div className="mb-8">
            <span className="inline-block font-mono text-xs tracking-widest px-4 py-2 rounded-full border border-primary/40 text-primary bg-primary/5">
              RAG AS A SERVICE
            </span>
          </div>

          {/* Giant headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold leading-[0.9] tracking-tight mb-8">
            Build your{' '}
            <br className="hidden md:block" />
            <span className="text-gradient">AI Knowledge</span>
            <br />
            API.
          </h1>

          {/* Subtitle - monospaced */}
          <p className="font-mono text-sm md:text-base text-muted-foreground max-w-xl mb-10 leading-relaxed">
            Upload documents, train with your data, and deploy a production-ready
            RAG endpoint in minutes. No ML. No DevOps.
          </p>

          {/* CTA */}
          <Button
            size="lg"
            className="gradient-primary h-14 px-10 font-mono text-sm tracking-wider rounded-none hover:opacity-90 transition-opacity"
            onClick={() => navigate('/auth')}
          >
            START FREE →
          </Button>
        </div>
      </section>

      {/* Marquee Ticker - TinyFish style */}
      <MarqueeTicker />

      {/* Stats Section - 3 columns with large numbers */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-3 divide-x divide-border">
            <StatBlock value="3 min" label="SETUP TIME" />
            <StatBlock value="99.9%" label="UPTIME GUARANTEED" />
            <StatBlock value="<100ms" label="AVG LATENCY" />
          </div>
        </div>
      </section>

      {/* Benefits Section - Numbered cards like TinyFish */}
      <section id="benefits" className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">What You Get</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-16 max-w-2xl">
            Everything you need for RAG in production.
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            <BenefitCard
              number="01"
              title="Document Processing"
              description="PDFs, Word, Excel, images with OCR, URLs. We process, chunk, and vectorize automatically with high-dimensional embeddings."
            />
            <BenefitCard
              number="02"
              title="No-Code Training"
              description="Define how your assistant responds with system prompts and Q&A examples. Control tone, format, and precision without touching a model."
            />
            <BenefitCard
              number="03"
              title="REST API in Minutes"
              description="A single endpoint with API key auth. Examples in cURL, Python, JavaScript, and more. Integrate with any stack."
            />
            <BenefitCard
              number="04"
              title="Enterprise Security"
              description="Encrypted documents, isolated per project. Your data is never shared with third parties or used to train models."
            />
            <BenefitCard
              number="05"
              title="Real-Time Analytics"
              description="Track queries, latency, token usage, and confidence scores. Understand how your knowledge base performs."
            />
            <BenefitCard
              number="06"
              title="Webhook Integrations"
              description="Connect to n8n, Zapier, Make, and any HTTP-compatible tool. Automate workflows with your RAG endpoint."
            />
          </div>
        </div>
      </section>

      {/* How It Works - Timeline style */}
      <section id="how-it-works" className="py-24 md:py-32 border-t border-border">
        <div className="container mx-auto px-6">
          <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">How It Works</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-20 max-w-3xl">
            From zero to API.{' '}
            <span className="text-primary">3 simple steps.</span>
          </h2>

          <div className="space-y-0 border-t border-border">
            <TimelineStep
              number="01"
              title="Upload"
              duration="2 min"
              description="Drag PDFs, images, Word docs, or paste URLs. We extract, clean, and vectorize automatically."
              details={['PDFs, Word, images with OCR', 'URL scraping', 'Automatic semantic chunking']}
            />
            <TimelineStep
              number="02"
              title="Train"
              duration="5 min"
              description="Define how your assistant should respond with custom system prompts and few-shot Q&A examples."
              details={['Custom system prompts', 'Q&A examples', 'Tone and style control']}
            />
            <TimelineStep
              number="03"
              title="Deploy"
              duration="Instant"
              description="Copy your endpoint and API key. Make your first query in seconds with any language."
              details={['REST API endpoint', 'Optional streaming', 'Full documentation']}
            />
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-24 md:py-32 border-t border-border bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="font-mono text-xs tracking-widest text-primary mb-4">INTEGRATION</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">One API call.<br />That's it.</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  No complicated SDKs. No model configuration. Just a POST with your question and get the answer.
                </p>
                <div className="space-y-4">
                  {['Contextual answers from your documents', 'Optional streaming for fluid UX', 'Chunk metadata in every response'].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="bg-card border border-border rounded-none overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-warning/60" />
                      <div className="w-3 h-3 rounded-full bg-primary/60" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">api-request.js</span>
                  </div>
                  <pre className="p-6 text-sm overflow-x-auto">
                    <code className="text-muted-foreground font-mono">
{`const response = await fetch(
  'https://api.ragify.dev/v1/query',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      project_id: 'proj_abc123',
      query: '¿Cuál es la política de
              devoluciones?'
    })
  }
);

const data = await response.json();
console.log(data.answer);`}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 border-t border-border">
        <div className="container mx-auto px-6">
          <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">Pricing</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 max-w-2xl">
            Start free. Scale when ready.
          </h2>
          <p className="text-muted-foreground mb-16 max-w-xl">No surprises. Pay only for what you use.</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            <PricingCard
              name="Free"
              price="$0"
              period="/mo"
              description="For testing and personal projects"
              features={['1 project', '50 queries/mo', '25MB storage', 'API docs', 'Community support']}
              onCtaClick={() => navigate('/auth')}
            />
            <PricingCard
              name="Starter"
              price="$15"
              period="/mo"
              description="For growing projects"
              features={['3 projects', '1K queries/mo', '200MB storage', 'Basic analytics', 'Email support']}
              onCtaClick={() => navigate('/auth')}
            />
            <PricingCard
              name="Pro"
              price="$49"
              period="/mo"
              description="For startups and teams"
              features={['10 projects', '10K queries/mo', '1GB storage', 'Advanced analytics', 'Priority support', 'Webhooks']}
              highlighted
              onCtaClick={() => navigate('/auth')}
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              period=""
              description="For large organizations"
              features={['Unlimited projects', 'Unlimited queries', 'Unlimited storage', 'SSO / SAML', 'Dedicated support', 'SLA 99.99%']}
              onCtaClick={() => navigate('/auth')}
            />
          </div>
        </div>
      </section>

      {/* FAQ - Numbered like TinyFish */}
      <section id="faq" className="py-24 md:py-32 border-t border-border">
        <div className="container mx-auto px-6">
          <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">FAQ</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-16 max-w-2xl">
            Common questions, straight answers.
          </h2>

          <div className="max-w-3xl">
            <Accordion type="single" collapsible className="space-y-0 border-t border-border">
              {[
                { q: 'What document types can I upload?', a: 'We support PDF, Word (.docx), Excel (.xlsx), images (with automatic OCR), Markdown, and HTML files. Each document is processed, chunked intelligently, and vectorized automatically.' },
                { q: 'How does the API work?', a: 'You get a unique REST endpoint per project. Send a POST with your question and receive an AI-generated answer with context from your documents. Includes API Key auth and rate limiting.' },
                { q: 'Is it secure for sensitive data?', a: 'Yes. All documents are encrypted at rest (AES-256) and in transit (TLS 1.3). Data is completely isolated per project and never used to train third-party models.' },
                { q: 'Can I cancel anytime?', a: 'Absolutely. No contracts, no minimum commitment. Change plans or cancel from your dashboard at any time.' },
                { q: 'What AI models do you use?', a: 'We use state-of-the-art models like GPT-5 and Gemini for response generation, and text-embedding-3-small for vector embeddings. Models are updated automatically.' },
                { q: 'Can I integrate with no-code tools?', a: 'Yes. We offer webhooks compatible with n8n, Zapier, and Make. You can also use our REST API directly from any tool that supports HTTP.' },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border py-2">
                  <AccordionTrigger className="text-left font-medium hover:no-underline gap-4">
                    <span className="font-mono text-xs text-muted-foreground w-8 flex-shrink-0">0{i + 1}</span>
                    <span className="flex-1">{faq.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pl-12">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA - Big bold text */}
      <section className="py-24 md:py-32 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <p className="font-mono text-xs tracking-widest text-muted-foreground mb-6">
              Every great AI product starts with great knowledge
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-10 leading-[0.95]">
              Ready to build your{' '}
              <span className="text-gradient">Knowledge API?</span>
            </h2>
            <Button
              size="lg"
              className="gradient-primary h-14 px-10 font-mono text-sm tracking-wider rounded-none hover:opacity-90 transition-opacity"
              onClick={() => navigate('/auth')}
            >
              START FREE →
            </Button>

            <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-border">
              <div>
                <span className="text-2xl md:text-3xl font-bold">$0</span>
                <p className="text-xs font-mono text-muted-foreground mt-1">TO GET STARTED</p>
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-bold">3 min</span>
                <p className="text-xs font-mono text-muted-foreground mt-1">SETUP TIME</p>
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-bold">100%</span>
                <p className="text-xs font-mono text-muted-foreground mt-1">YOUR DATA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Clean and minimal */}
      <footer className="border-t border-border py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <img src={logo} alt="RAGify" className="h-16 w-auto -ml-3 mb-3 dark:hidden" />
              <img src={logoWhite} alt="RAGify" className="h-16 w-auto -ml-3 mb-3 hidden dark:block" />
              <p className="text-xs font-mono text-muted-foreground">RAG as a Service.</p>
            </div>

            <div>
              <h4 className="font-mono text-xs tracking-widest mb-4">PRODUCT</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono text-xs tracking-widest mb-4">RESOURCES</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate('/docs')} className="hover:text-foreground transition-colors">Documentation</button></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Guides</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono text-xs tracking-widest mb-4">LEGAL</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookies</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">GDPR</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono text-xs tracking-widest mb-4">COMPANY</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs font-mono text-muted-foreground">© 2025 RAGify. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Twitter className="h-4 w-4" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Github className="h-4 w-4" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Linkedin className="h-4 w-4" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Mail className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============ INLINE COMPONENTS ============ */

function MarqueeTicker() {
  const items = [
    'RAG AS A SERVICE',
    'NO ML REQUIRED',
    'PRODUCTION READY',
    'AES-256 ENCRYPTION',
    'REAL EMBEDDINGS',
    '< 100ms LATENCY',
    'REST API',
    'SEMANTIC SEARCH',
  ];

  return (
    <div className="border-y border-border bg-primary/5 py-3 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span key={i} className="font-mono text-xs tracking-widest text-primary mx-6 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center py-4 px-6">
      <div className="text-2xl md:text-4xl font-bold mb-1">{value}</div>
      <div className="font-mono text-xs tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function BenefitCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="bg-background p-8 md:p-10 group hover:bg-primary/5 transition-colors duration-300">
      <span className="font-mono text-xs text-muted-foreground">{number}</span>
      <h3 className="font-bold text-lg mt-4 mb-3 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function TimelineStep({ number, title, duration, description, details }: {
  number: string; title: string; duration: string; description: string; details: string[];
}) {
  return (
    <div className="grid grid-cols-12 border-b border-border py-8 md:py-12 group">
      <div className="col-span-1">
        <span className="font-mono text-xs text-muted-foreground">{number}</span>
      </div>
      <div className="col-span-5 md:col-span-3">
        <h3 className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors">{title}</h3>
      </div>
      <div className="col-span-2 md:col-span-2">
        <span className="font-mono text-xs text-muted-foreground">{duration}</span>
      </div>
      <div className="col-span-12 md:col-span-6 mt-4 md:mt-0">
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <ul className="space-y-1">
          {details.map((d, i) => (
            <li key={i} className="text-xs font-mono text-muted-foreground flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PricingCard({ name, price, period, description, features, highlighted, onCtaClick }: {
  name: string; price: string; period: string; description: string; features: string[]; highlighted?: boolean; onCtaClick: () => void;
}) {
  return (
    <div className={`bg-background p-8 flex flex-col ${highlighted ? 'ring-1 ring-primary bg-primary/5' : ''}`}>
      <div className="mb-8">
        <h3 className="font-mono text-xs tracking-widest mb-4">{name.toUpperCase()}</h3>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-3xl font-bold">{price}</span>
          {period && <span className="text-muted-foreground text-sm">{period}</span>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className={`w-full rounded-none font-mono text-xs tracking-wider ${highlighted ? 'gradient-primary' : ''}`}
        variant={highlighted ? 'default' : 'outline'}
        onClick={onCtaClick}
      >
        {price === 'Custom' ? 'CONTACT SALES' : 'GET STARTED'}
      </Button>
    </div>
  );
}
