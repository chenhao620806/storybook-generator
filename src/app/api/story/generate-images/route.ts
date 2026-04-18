import { NextRequest, NextResponse } from "next/server";
import { ImageGenerationClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

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

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 合并所有场景的视觉描述，创建一个连贯的故事画面描述
    const combinedPrompt = createSequentialPrompt(story);

    const response = await client.generate({
      prompt: combinedPrompt,
      model: "doubao-seedream-4-5-251228",
      size: "2K",
      sequentialImageGeneration: "auto",
      sequentialImageGenerationMaxImages: 4,
      watermark: false,
      optimizePromptMode: "standard",
    });

    const helper = client.getResponseHelper(response);

    if (helper.success) {
      return NextResponse.json({
        success: true,
        imageUrls: helper.imageUrls,
        sceneCount: helper.imageUrls.length,
      });
    } else {
      return NextResponse.json(
        { error: "图片生成失败", errors: helper.errorMessages },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json(
      { error: "图片生成失败，请重试" },
      { status: 500 }
    );
  }
}

function createSequentialPrompt(story: StoryData): string {
  const { mainCharacter, scenes, setting } = story;

  // 构建主角特征描述，确保画风一致
  const characterDescription = `Main character: ${mainCharacter.name}, ${mainCharacter.appearance}. ` +
    `Personality: ${mainCharacter.personality}. ` +
    `This character must remain visually consistent across all 4 scenes. `;

  // 构建4个场景的描述
  const sceneDescriptions = scenes.map((scene, index) => {
    return `Scene ${index + 1}: ${scene.visualDescription}`;
  }).join(" ");

  // 组合完整的提示词
  return `Children's storybook illustration series (4 sequential scenes). ` +
    `Setting: ${setting}. ` +
    `${characterDescription} ` +
    `Style: Warm, colorful, child-friendly watercolor illustration style. ` +
    `All scenes must maintain visual consistency with the same character design. ` +
    `${sceneDescriptions} ` +
    `The 4 images should flow as a continuous story, showing progression from scene to scene.`;
}
