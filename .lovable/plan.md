

# Landing Page Profesional para RAGify - Mejoras

## Resumen
La landing page actual ya tiene una buena base con hero, features, "como funciona", pricing y CTA final. El plan es elevarla a un nivel profesional con las siguientes mejoras:

## Cambios planificados

### 1. Hero Section mejorado
- Reemplazar el RotatingText con un headline mas impactante y directo con gradiente neon
- Agregar un "mini-demo" visual: una animacion de terminal mostrando una query RAG y su respuesta en tiempo real (typing effect)
- Mejorar los trust indicators con logos/iconos de tecnologias (OpenAI, Supabase, etc.)

### 2. Seccion de Social Proof renovada
- Agregar testimonios ficticios de usuarios con avatar, nombre, cargo y empresa
- Contador animado para las estadisticas (animacion al hacer scroll)
- Logos de "empresas que confian" (placeholders estilizados)

### 3. Seccion de Features con tabs interactivos
- Convertir las 6 feature cards en un layout con tabs/categorias: "Documentos", "IA", "API", "Seguridad"
- Cada tab muestra una vista con screenshot/mockup del dashboard + descripcion detallada
- Mantener las cards actuales pero con iconos mas grandes y mejor jerarquia visual

### 4. Pricing mejorado con toggle mensual/anual
- Agregar switch mensual/anual con descuento del 20% en anual
- 4 tiers en vez de 3: Free ($0), Starter ($15), Pro ($49), Enterprise (Custom)
- Tabla comparativa de features debajo de las cards
- Destacar mejor el plan Pro con badge animado y borde neon

### 5. Seccion FAQ nueva
- Agregar accordion con preguntas frecuentes:
  - "Que tipos de documentos puedo subir?"
  - "Como funciona la API?"
  - "Es seguro para datos sensibles?"
  - "Puedo cancelar en cualquier momento?"
  - "Que modelos de IA usan?"

### 6. CTA Final con formulario inline
- Reemplazar el boton simple con un input de email + boton "Empezar gratis"
- Agregar badges de seguridad y trust debajo

### 7. Footer profesional
- Footer con columnas: Producto, Recursos, Legal, Empresa
- Links a Docs, Changelog, Privacidad, Terminos, Blog
- Redes sociales y newsletter
- Actualizar copyright a 2025

## Detalles tecnicos

### Archivos a modificar
- `src/pages/Index.tsx` - Reescritura completa del componente con las nuevas secciones
- `src/index.css` - Agregar nuevas animaciones (typing effect, counter animation)

### Nuevos componentes inline (dentro de Index.tsx)
- `TestimonialCard` - Card de testimonio con avatar y quote
- `FAQSection` - Accordion con preguntas frecuentes usando Radix Accordion
- `PricingToggle` - Switch mensual/anual
- `ComparisonTable` - Tabla comparativa de planes
- `AnimatedCounter` - Numeros que se animan al hacer scroll (IntersectionObserver)
- `TerminalDemo` - Mini terminal con typing animation mostrando una API call

### Dependencias
- No se necesitan nuevas dependencias; se usaran Radix Accordion (ya instalado) y las animaciones CSS existentes

### Estructura de secciones (orden):
1. Nav (mejorada con CTA mas visible)
2. Hero (headline + terminal demo + trust indicators)
3. Social proof bar (stats animados + logos)
4. Features (tabs interactivos + cards)
5. How it works (mantener actual con mejoras visuales)
6. Code example (mantener actual)
7. Pricing (4 tiers + toggle + tabla comparativa)
8. Testimonials (nueva seccion)
9. FAQ (nueva seccion con accordion)
10. CTA final (con input de email)
11. Footer profesional (multi-columna)

