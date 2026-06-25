import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[] | null;
  topic: string | null;
  published_at: string;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Blog · RAGify — RAG, MCP, LLMs y deep learning aplicado";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute(
      "content",
      "Artículos técnicos sobre RAG, Model Context Protocol, embeddings, LLMs y arquitectura de IA. Publicado cada 12h por RAGify."
    );
    if (!meta.parentNode) document.head.appendChild(meta);

    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, tags, topic, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);
      setPosts((data as BlogPost[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← RAGify
          </Link>
          <h1 className="text-5xl font-serif mt-4 mb-3" style={{ fontFamily: "Lora, serif" }}>
            Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Ensayos técnicos sobre RAG, MCP, embeddings y arquitectura de IA. Nuevo post cada 12 horas.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">Aún no hay posts publicados. Vuelve en unas horas.</p>
        ) : (
          <ul className="space-y-6">
            {posts.map((p) => (
              <li key={p.id}>
                <Link to={`/blog/${p.slug}`}>
                  <Card className="p-6 hover:border-primary transition-colors">
                    <time className="text-xs text-muted-foreground">
                      {new Date(p.published_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <h2 className="text-2xl mt-2 mb-2" style={{ fontFamily: "Lora, serif" }}>
                      {p.title}
                    </h2>
                    {p.excerpt && <p className="text-muted-foreground mb-3">{p.excerpt}</p>}
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {p.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default Blog;
