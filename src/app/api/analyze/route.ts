import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not set on server." }, { status: 500 });
  }

  const PROMPT = process.env.ROOF_AI_PROMPT;
  console.log('DEBUG: ROOF_AI_PROMPT value:', PROMPT);
  if (!PROMPT) {
    return NextResponse.json({ error: "AI prompt not set on server." }, { status: 500 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type must be multipart/form-data" }, { status: 400 });
  }

  // Parse multipart form data
  const formData = await req.formData();
  const address = formData.get("address")?.toString() || "";
  if (!address.trim()) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }
  const images = formData.getAll("images").filter((file) => file instanceof File) as File[];
  if (images.length === 0) {
    return NextResponse.json({ error: "No images uploaded." }, { status: 400 });
  }
  if (images.length > 10) {
    return NextResponse.json({ error: "Maximum 10 images allowed." }, { status: 400 });
  }

  // Analyze each image sequentially
  const perImageAnalyses = [];
  for (const imageFile of images) {
    let base64Image: string;
    let imageName = imageFile.name;
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Resize and optimize image using Sharp
      const resizedBuffer = await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      base64Image = `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`;
      if (base64Image.length > 20000000) {
        perImageAnalyses.push(`Image ${imageName}: Image too large even after resizing.`);
        continue;
      }
      if (!imageFile.type.startsWith('image/')) {
        perImageAnalyses.push(`Image ${imageName}: Unsupported file type.`);
        continue;
      }
    } catch (err) {
      perImageAnalyses.push(`Image ${imageName}: Failed to process image.`);
      continue;
    }

    // Prepare OpenAI API request for per-image analysis
    const body = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a certified roof inspector with expertise in analyzing roof conditions from images. When provided with an image, you should carefully examine it and provide detailed, specific analysis based on what you can observe. This tool is used by professional roofers for quick analysis, so provide direct technical assessment without suggesting to consult other professionals. Format your response with proper bold text for section headers."
        },
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }
      ],
      max_tokens: 1000
    };

    try {
      const openaiRes = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(body)
      });
      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        perImageAnalyses.push(`Image ${imageName}: OpenAI API error: ${errText}`);
        continue;
      }
      const openaiData = await openaiRes.json();
      const analysisText = openaiData.choices?.[0]?.message?.content || "No analysis returned.";
      perImageAnalyses.push(`Image ${imageName}: ${analysisText}`);
    } catch (err: any) {
      perImageAnalyses.push(`Image ${imageName}: ${err.message || "Unknown error calling OpenAI API."}`);
    }
  }

  // Summarize all analyses with a second OpenAI call
  const SUMMARIZE_PROMPT = process.env.SUMMARIZE_AI_PROMPT;
  if (!SUMMARIZE_PROMPT) {
    return NextResponse.json({ error: "Summarizing prompt not set on server." }, { status: 500 });
  }

  const summaryBody = {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a certified roof inspector. Given the following analyses of individual roof images and the location: ${address}, provide a single, holistic summary and recommendation for the roof as a whole. Consider local weather risks (hail, storms, etc.) in your advice. Do not mention individual images.`
      },
      {
        role: "user",
        content: [
          { type: "text", text: SUMMARIZE_PROMPT + "\n\n" + perImageAnalyses.join("\n\n") }
        ]
      }
    ],
    max_tokens: 1000
  };

  try {
    const openaiRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(summaryBody)
    });
    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return NextResponse.json({ error: `OpenAI API error (summary): ${errText}` }, { status: 500 });
    }
    const openaiData = await openaiRes.json();
    const holisticSummary = openaiData.choices?.[0]?.message?.content || "No summary returned.";
    return NextResponse.json({
      summary: holisticSummary
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error calling OpenAI API for summary." }, { status: 500 });
  }
} 