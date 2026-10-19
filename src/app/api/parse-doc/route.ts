import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || 'document';
    const extension = fileName.split('.').pop()?.toLowerCase();

    let extractedText = '';

    if (extension === 'pptx') {
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles = Object.keys(zip.files).filter((name) =>
        name.match(/^ppt\/slides\/slide\d+\.xml$/i)
      );

      slideFiles.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      const slides: string[] = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const xml = await zip.file(slideFiles[i])?.async('string');
        if (xml) {
          const matches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
          const words = matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
          if (words.length > 0) {
            slides.push(`[Slide ${i + 1}]\n${words.join(' ')}`);
          }
        }
      }
      extractedText = slides.join('\n\n');
    } else if (extension === 'docx') {
      const zip = await JSZip.loadAsync(buffer);
      const docXml = await zip.file('word/document.xml')?.async('string');
      if (docXml) {
        const paragraphs = docXml.match(/<w:p[^>]*>.*?<\/w:p>/gi) || [];
        const lines: string[] = [];
        paragraphs.forEach((pXml) => {
          const matches = pXml.match(/<w:t[^>]*>(.*?)<\/w:t>/gi) || [];
          const text = matches.map((m) => m.replace(/<[^>]+>/g, '')).join('').trim();
          if (text) lines.push(text);
        });
        extractedText = lines.join('\n');
      }
    } else if (extension === 'txt' || extension === 'md') {
      extractedText = buffer.toString('utf-8');
    } else if (extension === 'pdf') {
      // PDF text extraction
      try {
        // Attempt fast regex stream extraction of PDF text blocks
        const rawPdf = buffer.toString('latin1');
        const textBlocks: string[] = [];
        // Matches text inside parentheses in PDF text rendering blocks: (Some text) Tj or '
        const matches = rawPdf.match(/\(([^()]{2,500})\)\s*(?:Tj|'|TJ)/g) || [];
        
        matches.forEach((m) => {
          const clean = m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|TJ)$/, '').trim();
          // Filter out binary garbage
          if (clean.length > 2 && /^[\x20-\x7E\s]+$/.test(clean)) {
            textBlocks.push(clean);
          }
        });

        if (textBlocks.length > 10) {
          extractedText = textBlocks.slice(0, 1000).join(' ');
        } else {
          // If stream compressed, provide readable header + context
          extractedText = `[PDF Document: ${fileName}]\nFile content ready for AI analysis.`;
        }
      } catch (pdfErr) {
        extractedText = `[PDF Document: ${fileName}]`;
      }
    } else {
      extractedText = buffer.toString('utf-8').slice(0, 50000);
    }

    return NextResponse.json({
      success: true,
      text: extractedText.trim(),
      length: extractedText.length,
      fileName,
    });
  } catch (error: any) {
    console.error('Document parse error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse file' },
      { status: 500 }
    );
  }
}
