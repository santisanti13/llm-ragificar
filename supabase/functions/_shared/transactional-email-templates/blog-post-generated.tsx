import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  title?: string
  excerpt?: string
  url?: string
  topic?: string
  tags?: string[]
  contentPreview?: string
}

const Email = ({
  title = 'Nuevo post de blog',
  excerpt = '',
  url = 'https://llm-ragificar.lovable.app',
  topic = '',
  tags = [],
  contentPreview = '',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Nuevo post publicado en RAGify: ${title}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>RAGify · Blog</Text>
        <Heading style={h1}>{title}</Heading>
        {topic && <Text style={meta}>Tema: {topic}</Text>}
        {tags && tags.length > 0 && (
          <Text style={meta}>Tags: {tags.join(' · ')}</Text>
        )}
        <Hr style={hr} />
        {excerpt && <Text style={lead}>{excerpt}</Text>}
        {contentPreview && (
          <Section style={previewBox}>
            <Text style={previewText}>{contentPreview}</Text>
          </Section>
        )}
        <Hr style={hr} />
        <Text style={ctaWrap}>
          <Link href={url} style={cta}>Leer el post completo →</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Generado automáticamente por el motor editorial de RAGify cada 12h.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Props) => `📝 Nuevo post RAGify: ${data?.title ?? 'sin título'}`,
  displayName: 'Blog post generado',
  previewData: {
    title: 'Por qué MCP cambia la integración de LLMs',
    excerpt: 'Una mirada técnica al Model Context Protocol y por qué importa.',
    url: 'https://llm-ragificar.lovable.app/blog/mcp-llm-integration',
    topic: 'MCP',
    tags: ['MCP', 'LLM', 'RAG'],
    contentPreview: 'Los LLMs llevan dos años atascados en el mismo problema...',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif' }
const container = { padding: '32px 28px', maxWidth: '640px', margin: '0 auto' }
const brand = { color: '#666', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: '8px' }
const h1 = { color: '#111', fontSize: '28px', lineHeight: '1.25', margin: '0 0 12px' }
const meta = { color: '#666', fontSize: '13px', margin: '4px 0' }
const lead = { color: '#222', fontSize: '17px', lineHeight: '1.6', margin: '16px 0' }
const previewBox = { backgroundColor: '#f7f7f5', borderLeft: '3px solid #AAFF00', padding: '16px 18px', margin: '16px 0' }
const previewText = { color: '#333', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const, margin: 0 }
const ctaWrap = { textAlign: 'center' as const, margin: '24px 0' }
const cta = { backgroundColor: '#111', color: '#AAFF00', padding: '12px 24px', borderRadius: '4px', textDecoration: 'none', fontSize: '15px', fontWeight: 'bold' as const }
const hr = { borderColor: '#eee', margin: '20px 0' }
const footer = { color: '#999', fontSize: '12px', textAlign: 'center' as const }
