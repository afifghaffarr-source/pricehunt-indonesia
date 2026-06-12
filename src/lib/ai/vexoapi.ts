// VexoAPI AI Integration for Product Descriptions
// Path: src/lib/ai/vexoapi.ts

export interface ProductDescriptionInput {
  name: string;
  category?: string;
  price?: number;
  marketplace?: string;
  existingTitle?: string;
}

export interface ProductDescriptionOutput {
  description: string;
  bullets: string[];
  seoKeywords: string[];
  model: string;
}

const VEXOAPI_BASE = 'https://vexoapi.dev';

/**
 * Generate product description using VexoAPI Gemini
 * Free endpoint, good Indonesian support
 */
export async function generateProductDescription(
  input: ProductDescriptionInput
): Promise<ProductDescriptionOutput> {
  const prompt = `Buatkan deskripsi produk e-commerce untuk:

Nama Produk: ${input.name}
Kategori: ${input.category || 'Elektronik'}
Harga: ${input.price ? `Rp ${input.price.toLocaleString('id-ID')}` : 'Belum tersedia'}

Requirements:
1. Deskripsi 2-3 paragraf (150-200 kata)
2. 5 bullet points fitur utama
3. 5 SEO keywords dalam Bahasa Indonesia
4. Tone: Professional, informatif, persuasive
5. Target: Pembeli online Indonesia

Format output:
DESCRIPTION:
[deskripsi lengkap]

BULLETS:
- [bullet 1]
- [bullet 2]
...

KEYWORDS:
[keyword1], [keyword2], ...`;

  try {
    const response = await fetch(`${VEXOAPI_BASE}/api/ai/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt,
        // Optional: cookie for authenticated Gemini access
        // cookie: process.env.GEMINI_COOKIE,
      }),
    });

    if (!response.ok) {
      throw new Error(`VexoAPI error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.result || data.response || '';

    // Parse AI response
    const parsed = parseAIResponse(aiResponse);

    return {
      ...parsed,
      model: 'gemini-vexoapi',
    };
  } catch (error) {
    console.error('VexoAPI generation failed:', error);
    throw error;
  }
}

/**
 * Parse structured AI response
 */
function parseAIResponse(response: string): {
  description: string;
  bullets: string[];
  seoKeywords: string[];
} {
  const descMatch = response.match(/DESCRIPTION:\s*([\s\S]*?)(?=BULLETS:|$)/i);
  const bulletsMatch = response.match(/BULLETS:\s*([\s\S]*?)(?=KEYWORDS:|$)/i);
  const keywordsMatch = response.match(/KEYWORDS:\s*(.*?)$/im);

  const description = descMatch?.[1]?.trim() || '';
  
  const bullets = bulletsMatch?.[1]
    ?.split('\n')
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(line => line.length > 0) || [];

  const seoKeywords = keywordsMatch?.[1]
    ?.split(',')
    .map(kw => kw.trim())
    .filter(kw => kw.length > 0) || [];

  return {
    description,
    bullets,
    seoKeywords,
  };
}

/**
 * Alternative: Use Deepseek R1 for reasoning-based descriptions
 */
export async function generateProductDescriptionDeepseek(
  input: ProductDescriptionInput
): Promise<ProductDescriptionOutput> {
  const prompt = `Analyze this product and create a compelling Indonesian e-commerce description:

Product: ${input.name}
Category: ${input.category || 'Electronics'}
Price: ${input.price ? `Rp ${input.price.toLocaleString('id-ID')}` : 'TBA'}

Generate:
1. SEO-optimized description (150-200 words, Indonesian)
2. 5 key feature bullets
3. 5 relevant keywords

Target audience: Indonesian online shoppers
Tone: Professional, trustworthy, persuasive`;

  try {
    const response = await fetch(`${VEXOAPI_BASE}/api/ai/deepseekr1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        system: 'You are an expert Indonesian e-commerce copywriter specializing in product descriptions that convert.',
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`VexoAPI Deepseek error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.result || data.response || '';

    const parsed = parseAIResponse(aiResponse);

    return {
      ...parsed,
      model: 'deepseek-r1-vexoapi',
    };
  } catch (error) {
    console.error('VexoAPI Deepseek generation failed:', error);
    throw error;
  }
}

/**
 * Batch generate descriptions for multiple products
 */
export async function batchGenerateDescriptions(
  products: ProductDescriptionInput[]
): Promise<ProductDescriptionOutput[]> {
  const results: ProductDescriptionOutput[] = [];

  for (const product of products) {
    try {
      const result = await generateProductDescription(product);
      results.push(result);
      
      // Rate limiting: 1 request per 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to generate description for ${product.name}:`, error);
      results.push({
        description: '',
        bullets: [],
        seoKeywords: [],
        model: 'error',
      });
    }
  }

  return results;
}
