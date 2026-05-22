import sharp from 'sharp'
import type { PdfVariant } from '@/data/scenarios-static'

export async function applyVariant(pngBuffer: Buffer, variant: PdfVariant): Promise<Buffer> {
  let pipeline = sharp(pngBuffer)

  switch (variant) {
    case 'clean':
      // No processing — clean digital PDF
      return pipeline.png().toBuffer()

    case 'scanned': {
      // Grayscale, slight blur, mild rotation, off-white background
      pipeline = pipeline
        .rotate(1.2, { background: '#f5f0e8' })
        .grayscale()
        .blur(0.6)
        .gamma(1.15)
        .modulate({ brightness: 0.96, saturation: 0 })
      return pipeline.png().toBuffer()
    }

    case 'photo': {
      // Simulate a phone photo: slight rotation, brightness/contrast variation, mild sharpen
      pipeline = pipeline
        .rotate(4.5, { background: '#1a1a1a' })
        .modulate({ brightness: 0.88, saturation: 0.6 })
        .blur(0.4)
        .sharpen({ sigma: 1.2 })
        .gamma(1.1)
      return pipeline.png().toBuffer()
    }

    case 'handwritten':
      // Handwritten annotation is injected in the HTML template at render time
      // Just return the clean base
      return pipeline.png().toBuffer()

    case 'crumpled': {
      // Aged paper: lower contrast, slight warmth, gamma shift
      pipeline = pipeline
        .rotate(2.1, { background: '#e8dfc8' })
        .modulate({ brightness: 0.92, saturation: 0.4 })
        .gamma(1.25)
        .blur(0.3)
        .tint({ r: 220, g: 210, b: 185 })
      return pipeline.png().toBuffer()
    }
  }
}
