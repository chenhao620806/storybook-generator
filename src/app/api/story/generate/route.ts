import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `你是一个专业的儿童绘本作家。请根据用户给定的主题，创作一个温馨、有趣的儿童绘本故事。

要求：
1. 故事需要有明确的开端、发展、高潮和结局
2. 每个场景需要有详细的视觉描述，以便生成配套的图片
3. 对话要符合儿童理解水平，温馨有趣
4. 主角需要有明确的外貌和性格特征描述（用于保证画风一致）
5. 故事需要有教育意义或积极的主题

【重要】请严格按照以下 JSON 格式输出，不要添加任何其他文字说明，只输出纯 JSON：

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

【严格要求】
1. 必须包含完整的 JSON 字段：title, mainCharacter, setting, scenes, moral
2. scenes 必须是包含 4 个场景对象的数组
3. 每个场景必须包含：sceneNumber, visualDescription, narrative
4. visualDescription 要足够详细，包含主角外貌、服装、表情、动作、环境
5. 只输出 JSON，不要 markdown 代码块，不要额外解释`;

// Moonshot API 配置
const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_BASE_URL = "https://api.moonshot.cn/v1";

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "请提供有效的主题" },
        { status: 400 }
      );
    }

    // 检查 API Key
    if (!MOONSHOT_API_KEY) {
      return NextResponse.json(
        { error: "未配置 MOONSHOT_API_KEY 环境变量" },
        { status: 500 }
      );
    }

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `请为"${topic}"创作一个儿童绘本故事，生成完整的4场景绘本脚本。`,
      },
    ];

    // 调用 Moonshot API - 使用非流式输出以获得更稳定的 JSON
    const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MOONSHOT_API_KEY}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Moonshot API error:", error);
      return NextResponse.json(
        { error: "调用 AI 服务失败，请重试" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // 模拟流式输出
    const encoder = new TextEncoder();
    const streamData = new ReadableStream({
      async start(controller) {
        try {
          // 将内容分块发送，模拟流式效果
          const chunkSize = 10;
          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.slice(i, i + chunkSize);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            );
            // 小延迟模拟打字效果
            await new Promise(resolve => setTimeout(resolve, 10));
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
