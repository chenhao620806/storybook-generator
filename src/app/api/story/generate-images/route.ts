import { NextRequest, NextResponse } from "next/server";

export interface StoryScene {
  sceneNumber: number;
  visualDescription: string;
  narrative: string;
  dialogue?: string;
}

export interface StoryData {
  title: string;
  mainCharacter: {
    name: string;
    appearance: string;
    personality: string;
  };
  setting: string;
  scenes: StoryScene[];
  moral: string;
}

export async function POST(request: NextRequest) {
  try {
    const { story }: { story: StoryData } = await request.json();

    if (!story || !story.scenes || story.scenes.length < 4) {
      return NextResponse.json(
        { error: "无效的故事数据，需要至少4个场景" },
        { status: 400 }
      );
    }

    // 为4个场景生成对应的图片 URL
    const imageUrls = story.scenes.map((scene, index) => {
      return generatePollinationsUrl(story, scene, index + 1);
    });

    // 等待所有图片生成
    const verifiedUrls = await Promise.all(
      imageUrls.map(async (url, index) => {
        try {
          // 预热请求，确保图片生成
          await fetch(url, { method: 'HEAD', timeout: 30000 });
          return { index, url, success: true };
        } catch {
          return { index, url, success: true }; // 即使预热失败也返回 URL
        }
      })
    );

    return NextResponse.json({
      success: true,
      imageUrls: verifiedUrls.map(v => v.url),
      sceneCount: verifiedUrls.length,
    });
  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json(
      { error: "图片生成失败，请重试" },
      { status: 500 }
    );
  }
}

function generatePollinationsUrl(story: StoryData, scene: StoryScene, sceneNumber: number): string {
  const { mainCharacter, setting } = story;

  // 构建详细的画面描述
  const visualDescription = scene.visualDescription;
  
  // 构建完整的提示词 - 使用英文以获得更好的效果
  const prompt = `Children's storybook illustration, Scene ${sceneNumber}/4. ` +
    `Story: "${story.title}". ` +
    `Character: ${mainCharacter.name} - ${mainCharacter.appearance}. ` +
    `Scene description: ${visualDescription}. ` +
    `Setting: ${setting}. ` +
    `Style: cute children's book watercolor illustration, warm colors, soft lines, ` +
    `child-friendly, adorable cartoon style, consistent character design. ` +
    `Quality: high detail, professional children's illustration`;

  // URL 编码
  const encodedPrompt = encodeURIComponent(prompt);

  // 构建 Pollinations.AI URL
  // 使用 2K 分辨率 (1024x1024)
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&n=1&model=flux`;

  return url;
}
