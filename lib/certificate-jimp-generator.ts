import Jimp from 'jimp';
import path from 'path';

export interface CertificatePositions {
  nameTop: number;
  nameLeft: number;
  nameFontSize: number;
  percentageTop: number;
  percentageLeft: number;
  percentageFontSize: number;
  styleTop: number;
  styleLeft: number;
  styleFontSize: number;
  titleTop: number;
  titleLeft: number;
  titleFontSize: number;
  medallionTop: number;
  medallionLeft: number;
  medallionFontSize: number;
  dateTop: number;
  dateLeft: number;
  dateFontSize: number;
}

export interface CertificateImageData {
  dancerName: string;
  percentage: number;
  style: string;
  title: string;
  medallion: 'Gold' | 'Silver' | 'Bronze' | '';
  date: string;
  positions?: CertificatePositions;
}

/**
 * Generate a certificate image using Jimp (serverless-friendly)
 */
export async function generateCertificateWithJimp(data: CertificateImageData): Promise<Buffer> {
  try {
    // Load the template image
    const templatePath = path.join(process.cwd(), 'public', 'Template.jpg');
    const image = await Jimp.read(templatePath);
    
    const width = image.getWidth();
    const height = image.getHeight();

    // Use custom positions if provided, otherwise use defaults
    const pos = data.positions || {
      nameTop: 48.5,
      nameLeft: 50,
      nameFontSize: 65,
      percentageTop: 65.5,
      percentageLeft: 15.5,
      percentageFontSize: 76,
      styleTop: 67.5,
      styleLeft: 62.5,
      styleFontSize: 33,
      titleTop: 74,
      titleLeft: 60,
      titleFontSize: 29,
      medallionTop: 80.5,
      medallionLeft: 65.5,
      medallionFontSize: 46,
      dateTop: 90.5,
      dateLeft: 52,
      dateFontSize: 39,
    };

    // Map font sizes to Jimp built-in fonts
    const getFontSize = (size: number) => {
      if (size >= 64) return Jimp.FONT_SANS_64_WHITE;
      if (size >= 32) return Jimp.FONT_SANS_32_WHITE;
      if (size >= 16) return Jimp.FONT_SANS_16_WHITE;
      return Jimp.FONT_SANS_8_WHITE;
    };

    // Load fonts
    const nameFont = await Jimp.loadFont(getFontSize(pos.nameFontSize));
    const percentageFont = await Jimp.loadFont(getFontSize(pos.percentageFontSize));
    const styleFont = await Jimp.loadFont(getFontSize(pos.styleFontSize));
    const titleFont = await Jimp.loadFont(getFontSize(pos.titleFontSize));
    const medallionFont = await Jimp.loadFont(getFontSize(pos.medallionFontSize));
    const dateFont = await Jimp.loadFont(getFontSize(pos.dateFontSize));

    // Add text to image
    // Dancer Name (centered)
    const nameX = Math.floor(width * (pos.nameLeft / 100) - Jimp.measureText(nameFont, data.dancerName) / 2);
    const nameY = Math.floor(height * (pos.nameTop / 100));
    image.print(nameFont, nameX, nameY, data.dancerName);

    // Percentage
    const percentageX = Math.floor(width * (pos.percentageLeft / 100));
    const percentageY = Math.floor(height * (pos.percentageTop / 100));
    image.print(percentageFont, percentageX, percentageY, data.percentage.toString());

    // Style
    const styleX = Math.floor(width * (pos.styleLeft / 100));
    const styleY = Math.floor(height * (pos.styleTop / 100));
    image.print(styleFont, styleX, styleY, data.style.toUpperCase());

    // Title
    const titleX = Math.floor(width * (pos.titleLeft / 100));
    const titleY = Math.floor(height * (pos.titleTop / 100));
    image.print(titleFont, titleX, titleY, data.title.toUpperCase());

    // Medallion
    const medallionX = Math.floor(width * (pos.medallionLeft / 100));
    const medallionY = Math.floor(height * (pos.medallionTop / 100));
    image.print(medallionFont, medallionX, medallionY, data.medallion.toUpperCase());

    // Date
    const dateX = Math.floor(width * (pos.dateLeft / 100));
    const dateY = Math.floor(height * (pos.dateTop / 100));
    image.print(dateFont, dateX, dateY, data.date);

    // Convert to buffer
    return await image.quality(95).getBufferAsync(Jimp.MIME_JPEG);
  } catch (error) {
    console.error('Error generating certificate with Jimp:', error);
    throw new Error(`Failed to generate certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

