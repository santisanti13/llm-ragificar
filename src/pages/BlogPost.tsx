import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[] | null;
  topic: string | null;
  published_at: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const p = data as BlogPost;
      setPost(p);
      setLoading(false);

      document.title = `${p.meta_title || p.title} · RAGify Blog`;
      const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      metaDesc.setAttribute("content", p.meta_description || p.excerpt || "");
      if (!metaDesc.parentNode) document.head.appendChild(metaDesc);

      const ld = document.getElementById("blog-jsonld") || document.createElement("script");
      ld.id = "blog-jsonld";
      ld.setAttribute("type", "application/ld+json");
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: p.title,
        description: p.meta_description || p.excerpt,
        datePublished: p.published_at,
        author: { "@type": "Organization", name: "RAGify" },
        publisher: { "@type": "Organization", name: "RAGify" },
        keywords: (p.tags || []).join(", "),
      });
      if (!ld.parentNode) document.head.appendChild(ld);
    })();
  }, [slug]);

  const headings = useMemo(() => {
    if (!post?.content_md) return [] as { id: string; text: string }[];
    const matches = Array.from(post.content_md.matchAll(/^##\s+(.+)$/gm));
    return matches.map((m) => ({ id: slugify(m[1]), text: m[1].trim() }));
  }, [post?.content_md]);

  const readingMinutes = useMemo(() => {
    if (!post?.content_md) return 0;
    const words = post.content_md.split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  }, [post?.content_md]);

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="text-3xl mb-4" style={{ fontFamily: "Lora, serif" }}>Post no encontrado</h1>
        <Link to="/blog" className="text-primary underline">Volver al blog</Link>
      </div>
    );
  }

  const publishedDate = new Date(post.published_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to="/blog" className="text-sm text-white/50 hover:text-[#D4FF00] transition-colors">
            ← Blog
          </Link>
          <Link to="/" className="text-sm text-white/50 hover:text-white transition-colors" style={{ fontFamily: "Lora, serif" }}>
            RAGify
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-16">
        {/* Sticky sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-16 space-y-10">
            <div className="space-y-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#D4FF00] font-bold">Índice</p>
              <nav className="flex flex-col space-y-4 border-l border-white/5 pl-5">
                {headings.length === 0 && (
                  <span className="text-xs text-white/30 italic">Sin secciones</span>
                )}
                {headings.map((h) => {
                  const isActive = activeId === h.id;
                  return (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`text-sm transition-colors w-fit pb-1 border-b ${
                        isActive
                          ? "text-[#D4FF00] border-[#D4FF00] font-medium"
                          : "text-white/40 hover:text-white border-transparent"
                      }`}
                    >
                      {h.text}
                    </a>
                  );
                })}
              </nav>
            </div>

            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#D4FF00] animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/60">Lectura</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed italic">
                ~{readingMinutes} min · nivel técnico medio/alto para ingenieros de IA.
              </p>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <main className="max-w-3xl space-y-16">
          {/* Hero */}
          <header className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="h-[1px] w-8 bg-[#D4FF00]" />
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4FF00]">
                  {post.topic || "Engineering Series"}
                </span>
              </div>
              <h1
                className="text-4xl lg:text-6xl italic leading-[1.1] tracking-tight text-white"
                style={{ fontFamily: "Lora, serif" }}
              >
                {post.title}
              </h1>
              {post.excerpt && (
                <p
                  className="text-xl text-white/60 leading-relaxed not-italic"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  {post.excerpt}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="w-12 h-12 rounded-full bg-[#D4FF00] flex items-center justify-center text-black font-bold text-lg" style={{ fontFamily: "Lora, serif" }}>
                R
              </div>
              <div className="text-sm">
                <p className="font-bold text-white">RAGify Research</p>
                <p className="text-white/50">{publishedDate}</p>
              </div>
              {post.tags && post.tags.length > 0 && (
                <div className="hidden md:flex items-center gap-2 ml-auto">
                  {post.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] uppercase tracking-widest px-2 py-1 border border-white/10 text-white/50 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Article content */}
          <div
            className="prose prose-invert max-w-none space-y-8
              prose-p:text-lg prose-p:leading-relaxed prose-p:text-white/70
              prose-strong:text-white prose-strong:font-semibold
              prose-a:text-[#D4FF00] prose-a:no-underline hover:prose-a:underline
              prose-li:text-white/70 prose-li:leading-relaxed
              prose-ul:my-6 prose-ol:my-6
              prose-code:bg-white/5 prose-code:text-[#D4FF00] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
              prose-blockquote:my-10 prose-blockquote:p-6 prose-blockquote:bg-white/[0.02] prose-blockquote:border-l-4 prose-blockquote:border-[#D4FF00] prose-blockquote:rounded-r-xl prose-blockquote:not-italic
              prose-img:rounded-2xl prose-img:border prose-img:border-white/10
              prose-hr:my-12 prose-hr:border-white/10"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => {
                  const text = String(children);
                  const id = slugify(text);
                  return (
                    <h2
                      id={id}
                      className="text-3xl text-white pt-10 mt-12 mb-6 border-t border-white/5 scroll-mt-24"
                      style={{ fontFamily: "Lora, serif" }}
                    >
                      {children}
                    </h2>
                  );
                },
                h3: ({ children }) => (
                  <h3
                    className="text-2xl text-white mt-8 mb-4"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    {children}
                  </h3>
                ),
                hr: () => (
                  <div className="flex items-center gap-4 py-8 not-prose">
                    <div className="w-3 h-3 border-2 border-[#D4FF00] rotate-45" />
                    <div className="h-[1px] flex-1 bg-white/10" />
                    <div className="w-3 h-3 border-2 border-[#D4FF00] rotate-45" />
                  </div>
                ),
              }}
            >
              {post.content_md}
            </ReactMarkdown>
          </div>

          {/* Final CTA card */}
          <section className="relative">
            <div className="absolute -inset-[2px] bg-[#D4FF00] rounded-2xl" />
            <div className="relative p-10 bg-background rounded-2xl space-y-4">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#D4FF00]">
                Cómo RAGify resuelve esto
              </p>
              <h3
                className="text-3xl italic text-white leading-tight"
                style={{ fontFamily: "Lora, serif" }}
              >
                Lleva tu conocimiento a producción en minutos, no en sprints.
              </h3>
              <p className="text-white/60 leading-relaxed">
                Subes tus documentos, RAGify los indexa con búsqueda híbrida y los expone como API y servidor MCP listos para Claude, Cursor o tu propio agente.
              </p>
              <div className="pt-2">
                <Link
                  to="/auth"
                  className="inline-block bg-[#D4FF00] text-black px-6 py-3 rounded-lg font-bold hover:bg-[#AAFF00] transition-colors"
                >
                  Probar RAGify gratis →
                </Link>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-12 border-t border-white/10 flex justify-between items-center">
            <Link to="/blog" className="group cursor-pointer">
              <p className="text-[10px] uppercase font-bold text-white/30 mb-2">Volver</p>
              <h4
                className="text-white group-hover:text-[#D4FF00] transition-colors italic text-lg"
                style={{ fontFamily: "Lora, serif" }}
              >
                Todos los artículos
              </h4>
            </Link>
            <Link to="/" className="text-right group cursor-pointer">
              <p className="text-[10px] uppercase font-bold text-white/30 mb-2">Producto</p>
              <h4
                className="text-white group-hover:text-[#D4FF00] transition-colors italic text-lg"
                style={{ fontFamily: "Lora, serif" }}
              >
                Conoce RAGify
              </h4>
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default BlogPostPage;
