import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

      // JSON-LD
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
        <h1 className="text-3xl mb-4">Post no encontrado</h1>
        <Link to="/blog" className="text-primary underline">
          Volver al blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">
            ← Blog
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <time className="text-sm text-muted-foreground">
          {new Date(post.published_at).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        )}

        <div
          className="prose prose-invert prose-lg max-w-none mt-6
            prose-headings:font-serif prose-headings:text-foreground
            prose-h1:text-5xl prose-h1:leading-tight prose-h1:mb-6
            prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
            prose-h3:text-2xl prose-h3:mt-8
            prose-p:text-foreground/90 prose-p:leading-relaxed
            prose-a:text-primary hover:prose-a:underline
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-card prose-pre:border prose-pre:border-border
            prose-blockquote:border-l-primary prose-strong:text-foreground"
          style={{ fontFamily: "Lora, serif" } as React.CSSProperties}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content_md}</ReactMarkdown>
        </div>

        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-muted-foreground mb-4">
            ¿Quieres usar tu propio conocimiento con IA, vía API o MCP?
          </p>
          <Link
            to="/auth"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded font-semibold hover:opacity-90"
          >
            Probar RAGify gratis
          </Link>
        </div>
      </article>
    </div>
  );
};

export default BlogPostPage;
