import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, FileText, Layers, Scissors, Settings, Zap, BookOpen, CheckCircle
} from 'lucide-react';
import logo from '@/assets/logo.png';
import logoWhite from '@/assets/logo-white.png';

export default function ChunkingGuide() {
  const navigate = useNavigate();

  const strategies = [
    {
      title: 'Chunking de tamaño fijo',
      icon: <Scissors className="h-5 w-5 text-primary" />,
      description:
        'Divide el documento en fragmentos de una longitud constante (por ejemplo, 512 o 1024 tokens). Es el método más simple y rápido, pero puede cortar frases o párrafos a mitad de camino.',
      pros: ['Fácil de implementar', 'Rápido de procesar', 'Predecible'],
      cons: ['Puede romper el contexto semántico', 'Palabras cortadas a la mitad', 'Repetición de información en el overlap'],
      bestFor: 'Documentos técnicos estructurados, logs, CSVs o cualquier texto donde el orden exacto importa más que la coherencia narrativa.'
    },
    {
      title: 'Chunking semántico',
      icon: <Layers className="h-5 w-5 text-primary" />,
      description:
        'Agrupa el texto en función del significado. Detecta cambios de tema, transiciones de párrafo o puntos de ruptura lógicos para crear fragmentos que conservan la unidad de ideas.',
      pros: ['Preserva el contexto', 'Mejor precisión en retrieval', 'Fragmentos autocontenidos'],
      cons: ['Más costoso computacionalmente', 'Tamaño de chunks variable', 'Requiere un modelo de embeddings extra'],
      bestFor: 'Artículos, contratos, manuales y cualquier documento donde la comprensión del párrafo completo sea crítica para la respuesta.'
    },
    {
      title: 'Chunking recursivo por caracteres',
      icon: <Settings className="h-5 w-5 text-primary" />,
      description:
        'Intenta dividir por separadores naturales (párrafos, oraciones) y, si un bloque sigue siendo demasiado grande, recurre a separadores más pequeños (comas, espacios). Es un compromiso entre velocidad y coherencia.',
      pros: ['Equilibrio entre velocidad y calidad', 'Respeto por la estructura del texto', 'Configurable'],
      cons: ['Implementación más compleja', 'Puede generar chunks de tamaños muy dispares'],
      bestFor: 'Webs, blogs, documentación de software y contenido mixto con encabezados, listas y párrafos.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div className="h-6 w-px bg-border" />
            <img src={logo} alt="RAGify" className="h-24 w-auto -my-6 dark:hidden" />
            <img src={logoWhite} alt="RAGify" className="h-24 w-auto -my-6 hidden dark:block" />
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            <BookOpen className="h-3 w-3 mr-1" />
            Guía técnica
          </Badge>
        </div>
      </nav>

      <main className="container mx-auto px-6 pt-24 pb-16">
        <article className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-0">SEO & RAG</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Estrategias de chunking para RAG: guía práctica
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Descubre cómo diferentes <strong>estrategias de chunking</strong> impactan directamente
              en la calidad de las respuestas de tu RAG. Aprende a elegir el tamaño de fragmento y
              el overlap correctos para cada tipo de documento.
            </p>
          </header>

          {/* Intro */}
          <section className="mb-16">
            <p className="text-muted-foreground leading-relaxed mb-4">
              El <strong>chunking</strong> (o fragmentación de documentos) es uno de los pasos más
              críticos —y a menudo ignorados— en cualquier pipeline RAG. Un chunk demasiado grande
              satura el contexto del modelo; uno demasiado pequeño pierde el significado. En esta
              guía comparamos las estrategias más usadas por equipos de Pinecone, OpenAI y
              RAGify para que tomes decisiones informadas.
            </p>
          </section>

          {/* Strategies */}
          <section className="space-y-12 mb-16">
            <h2 className="text-2xl font-bold">Principales estrategias de chunking</h2>

            {strategies.map((s) => (
              <div
                key={s.title}
                className="p-6 md:p-8 rounded-xl border border-border bg-card/50 space-y-4"
              >
                <div className="flex items-center gap-3">
                  {s.icon}
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">{s.description}</p>

                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <p className="text-sm font-medium mb-2 text-green-400">Ventajas</p>
                    <ul className="space-y-1">
                      {s.pros.map((p) => (
                        <li key={p} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2 text-red-400">Desventajas</p>
                    <ul className="space-y-1">
                      {s.cons.map((c) => (
                        <li key={c} className="text-sm text-muted-foreground flex items-start gap-2">
                          <Scissors className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Ideal para: </span>
                    <span className="text-muted-foreground">{s.bestFor}</span>
                  </p>
                </div>
              </div>
            ))}
          </section>

          {/* Chunk size & overlap */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">
              Cómo elegir el tamaño de chunk y el overlap
            </h2>

            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-border bg-card/50">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Documentos legales o contractuales
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Usa chunks de <strong>1024–2048 tokens</strong> con un <strong>overlap del 20 %</strong>.
                  Los contratos requieren que las cláusulas vecinas estén disponibles juntas para
                  que el modelo interprete correctamente las referencias cruzadas.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card/50">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Base de conocimiento técnica (FAQ, docs)
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Chunks de <strong>512–1024 tokens</strong> y <strong>overlap del 10–15 %</strong>.
                  Aquí cada sección suele ser autocontenida; un overlap moderado evita que los
                  ejemplos de código queden cortados.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card/50">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Conversaciones o transcripciones
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Chunks de <strong>256–512 tokens</strong> con <strong>overlap del 25 %</strong>.
                  El contexto narrativo fluye rápido; un overlap alto mantiene la coherencia entre
                  intervenciones de hablantes.
                </p>
              </div>
            </div>
          </section>

          {/* RAGify CTA */}
          <section className="mb-16 p-8 rounded-2xl border border-primary/30 bg-primary/5 text-center">
            <h2 className="text-2xl font-bold mb-3">
              RAGify optimiza el chunking automáticamente
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              En RAGify no necesitas ser experto en chunking strategies. Al subir tus documentos,
              nuestro pipeline detecta el tipo de contenido, aplica la estrategia de fragmentación
              más adecuada y genera embeddings de alta calidad. Puedes ajustar el
              <strong> tamaño de chunk</strong>, el <strong>overlap</strong> y el
              <strong> umbral de similitud</strong> desde el panel de configuración de cada proyecto.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')} className="gradient-primary font-mono">
                Crear proyecto gratis
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/docs')}>
                Ver documentación API
              </Button>
            </div>
          </section>

          {/* Summary table */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Resumen comparativo</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium">Estrategia</th>
                    <th className="text-left py-3 px-4 font-medium">Velocidad</th>
                    <th className="text-left py-3 px-4 font-medium">Calidad retrieval</th>
                    <th className="text-left py-3 px-4 font-medium">Complejidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 px-4 font-medium">Tamaño fijo</td>
                    <td className="py-3 px-4 text-green-400">Alta</td>
                    <td className="py-3 px-4 text-yellow-400">Media</td>
                    <td className="py-3 px-4 text-green-400">Baja</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Semántico</td>
                    <td className="py-3 px-4 text-yellow-400">Media</td>
                    <td className="py-3 px-4 text-green-400">Alta</td>
                    <td className="py-3 px-4 text-red-400">Alta</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Recursivo</td>
                    <td className="py-3 px-4 text-green-400">Alta</td>
                    <td className="py-3 px-4 text-green-400">Alta</td>
                    <td className="py-3 px-4 text-yellow-400">Media</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer note */}
          <footer className="text-center text-sm text-muted-foreground border-t border-border pt-8">
            <p>
              ¿Tienes dudas sobre cómo configurar el chunking en tu proyecto?{' '}
              <button
                onClick={() => navigate('/docs')}
                className="text-primary hover:underline"
              >
                Consulta la documentación de RAGify
              </button>{' '}
              o empieza a probar directamente desde el dashboard.
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}
