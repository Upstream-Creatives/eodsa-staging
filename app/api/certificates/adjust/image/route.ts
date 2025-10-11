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

    const styleTop = parseFloat(searchParams.get('styleTop') || '67.5');
    const styleLeft = parseFloat(searchParams.get('styleLeft') || '61');
    const styleFontSize = parseInt(searchParams.get('styleFontSize') || '20');

    const titleTop = parseFloat(searchParams.get('titleTop') || '73.5');
    const titleLeft = parseFloat(searchParams.get('titleLeft') || '57.5');
    const titleFontSize = parseInt(searchParams.get('titleFontSize') || '21');

    const medallionTop = parseFloat(searchParams.get('medallionTop') || '79.5');
    const medallionLeft = parseFloat(searchParams.get('medallionLeft') || '65');
    const medallionFontSize = parseInt(searchParams.get('medallionFontSize') || '32');

    const dateTop = parseFloat(searchParams.get('dateTop') || '89.5');
    const dateLeft = parseFloat(searchParams.get('dateLeft') || '67.5');
    const dateFontSize = parseInt(searchParams.get('dateFontSize') || '24');

    const certificateData = {
      dancerName: 'ANGELO SOLIS',
      percentage: 92,
      style: 'CONTEMPORARY',
      title: 'RISING PHOENIX',
      medallion: 'Gold' as const,
      date: '4 October 2025',
      positions: {
        nameTop,
        nameLeft,
        nameFontSize,
        percentageTop,
        percentageLeft,
        percentageFontSize,
        styleTop,
        styleLeft,
        styleFontSize,
        titleTop,
        titleLeft,
        titleFontSize,
        medallionTop,
        medallionLeft,
        medallionFontSize,
        dateTop,
        dateLeft,
        dateFontSize
      }
    };

    // Use Cloudinary to generate certificate with text overlays
    const certificateUrl = cloudinary.url('Template_syz7di', {
      transformation: [
        {
          overlay: {
            font_family: 'Arial',
            font_size: nameFontSize,
            font_weight: 'bold',
            text: 'ANGELO SOLIS'
          },
          color: 'white',
          gravity: 'north',
          y: Math.floor(nameTop * 13)
        },
        {
          overlay: {
            font_family: 'Arial',
            font_size: percentageFontSize,
            font_weight: 'bold',
            text: '92'
          },
          color: 'white',
          gravity: 'north_west',
          x: Math.floor(percentageLeft * 9),
          y: Math.floor(percentageTop * 13)
        },
        {
          overlay: {
            font_family: 'Arial',
            font_size: styleFontSize,
            font_weight: 'bold',
            text: 'CONTEMPORARY'
          },
          color: 'white',
          gravity: 'north',
          x: Math.floor((styleLeft - 50) * 9),
          y: Math.floor(styleTop * 13)
        },
        {
          overlay: {
            font_family: 'Arial',
            font_size: titleFontSize,
            font_weight: 'bold',
            text: 'RISING PHOENIX'
          },
          color: 'white',
          gravity: 'north',
          x: Math.floor((titleLeft - 50) * 9),
          y: Math.floor(titleTop * 13)
        },
        {
          overlay: {
            font_family: 'Arial',
            font_size: medallionFontSize,
            font_weight: 'bold',
            text: 'GOLD'
          },
          color: 'white',
          gravity: 'north',
          x: Math.floor((medallionLeft - 50) * 9),
          y: Math.floor(medallionTop * 13)
        },
        {
          overlay: {
            font_family: 'Arial',
            font_size: dateFontSize,
            text: '4 October 2025'
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
