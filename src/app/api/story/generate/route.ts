import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

const SYSTEM_PROMPT = `你是一个专业的儿童绘本作家。请根据用户给定的主题，创作一个温馨、有趣的儿童绘本故事。

要求：
1. 故事需要有明确的开端、发展、高潮和结局
2. 每个场景需要有详细的视觉描述，以便生成配套的图片
3. 对话要符合儿童理解水平，温馨有趣
4. 主角需要有明确的外貌和性格特征描述（用于保证画风一致）
5. 故事需要有教育意义或积极的主题

请按以下 JSON 格式输出故事脚本：
{
  "title": "故事标题",
  "mainCharacter": {
    "name": "主角名字",
    "appearance": "外貌描述（用于画风一致性）",
    "personality": "性格特点"
  },
  "setting": "故事背景设定",
  "scenes": [
    {
      "sceneNumber": 1,
      "visualDescription": "详细的画面描述（包含主角外貌、动作、表情、环境等，用于生成图片）",
      "narrative": "旁白/叙述文字",
      "dialogue": "对话内容（可为空）"
    },
    {
      "sceneNumber": 2,
      "visualDescription": "详细的画面描述",
      "narrative": "旁白/叙述文字",
      "dialogue": "对话内容"
    },
    {
      "sceneNumber": 3,
      "visualDescription": "详细的画面描述",
      "narrative": "旁白/叙述文字",
      "dialogue": "对话内容"
    },
    {
      "sceneNumber": 4,
      "visualDescription": "详细的画面描述",
      "narrative": "旁白/叙述文字",
      "dialogue": "对话内容"
    }
  ],
  "moral": "故事寓意"
}

请确保：
1. visualDescription 足够详细，包含主角的外貌特征、服装、表情、动作等
2. 4个场景的画面风格保持一致
3. 每个场景的描述都是一个独立的、完整的画面`;

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "请提供有效的主题" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `请为"${topic}"创作一个儿童绘本故事，生成完整的4场景绘本脚本。`,
      },
    ];

    const stream = client.stream(messages, {
      model: "doubao-seed-2-0-pro-260215",
      temperature: 0.9,
    });

    const encoder = new TextEncoder();
    const streamData = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk.content.toString() })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(streamData, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating story:", error);
    return NextResponse.json(
      { error: "生成绘本失败，请重试" },
      { status: 500 }
    );
  }
}
