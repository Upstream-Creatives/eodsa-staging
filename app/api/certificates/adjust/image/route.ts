import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get positioning parameters from query string
    const nameTop = parseFloat(searchParams.get('nameTop') || '47.5');
    const nameLeft = parseFloat(searchParams.get('nameLeft') || '50');
    const nameFontSize = parseInt(searchParams.get('nameFontSize') || '42');

    const percentageTop = parseFloat(searchParams.get('percentageTop') || '64.5');
    const percentageLeft = parseFloat(searchParams.get('percentageLeft') || '14');
    const percentageFontSize = parseInt(searchParams.get('percentageFontSize') || '47');

    // Use standardized font size (26px) for style, title, and medallion to ensure text always fits
    const styleTop = parseFloat(searchParams.get('styleTop') || '67.5');
    const styleLeft = parseFloat(searchParams.get('styleLeft') || '61');
    const styleFontSize = parseInt(searchParams.get('styleFontSize') || '26'); // Standardized to 26px

    const titleTop = parseFloat(searchParams.get('titleTop') || '73.5');
    const titleLeft = parseFloat(searchParams.get('titleLeft') || '57.5');
    const titleFontSize = parseInt(searchParams.get('titleFontSize') || '26'); // Standardized to 26px

    const medallionTop = parseFloat(searchParams.get('medallionTop') || '79.5');
    const medallionLeft = parseFloat(searchParams.get('medallionLeft') || '65');
    const medallionFontSize = parseInt(searchParams.get('medallionFontSize') || '26'); // Standardized to 26px

    const dateTop = parseFloat(searchParams.get('dateTop') || '89.5');
    const dateLeft = parseFloat(searchParams.get('dateLeft') || '67.5');
    const dateFontSize = parseInt(searchParams.get('dateFontSize') || '24');

    // Get actual certificate data from query params
    const dancerName = searchParams.get('name') || 'ANGELO SOLIS';
    const percentage = searchParams.get('percentage') || '92';
    const style = searchParams.get('style') || 'CONTEMPORARY';
    const title = searchParams.get('title') || 'RISING PHOENIX';
    const medallion = searchParams.get('medallion') || 'Gold';
    const date = searchParams.get('date') || '4 October 2025';

    // Use Cloudinary to generate certificate with text overlays (Montserrat font)
    const certificateUrl = cloudinary.url('Template_syz7di', {
      transformation: [
        {
          overlay: {
            font_family: 'Montserrat',
            font_size: nameFontSize,
            font_weight: 'bold',
            text: dancerName.toUpperCase(),
            letter_spacing: 2
          },
          color: 'white',
          gravity: 'north',
          y: Math.floor(nameTop * 13)
        },
        {
          overlay: {
            font_family: 'Montserrat',
            font_size: percentageFontSize,
            font_weight: 'bold',
            text: percentage
          },
          color: 'white',
          gravity: 'north_west',
          x: Math.floor(percentageLeft * 9),
          y: Math.floor(percentageTop * 13)
        },
        {
          overlay: {
            font_family: 'Montserrat',
            font_size: styleFontSize,
            font_weight: 'bold',
            text: style.toUpperCase()
          },
          color: 'white',
          gravity: 'north',
          x: Math.floor((styleLeft - 50) * 9),
          y: Math.floor(styleTop * 13)
        },
        {
          overlay: {
            font_family: 'Montserrat',
            font_size: titleFontSize,
            font_weight: 'bold',
            text: title.toUpperCase()
          },
          color: 'white',
          gravity: 'north',
          x: Math.floor((titleLeft - 50) * 9),
          y: Math.floor(titleTop * 13)
        },
        {
          overlay: {
            font_family: 'Montserrat',
            font_size: medallionFontSize,
            font_weight: 'bold',
            text: medallion.toUpperCase()
          },
          color: 'white',
          gravity: 'north',
          x: Math.floor((medallionLeft - 50) * 9),
          y: Math.floor(medallionTop * 13)
        },
        {
          overlay: {
            font_family: 'Montserrat',
            font_size: dateFontSize,
            text: date
          },
          color: 'white',
          gravity: 'north',
          x: Math.floor((dateLeft - 50) * 9),
          y: Math.floor(dateTop * 13)
        }
      ],
      format: 'jpg',
      quality: 95
    });

    // Fetch the generated image from Cloudinary
    const response = await fetch(certificateUrl);
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(Buffer.from(imageBuffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}
