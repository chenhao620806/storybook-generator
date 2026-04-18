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

    // 返回故事数据，前端负责生成图片 URL
    return NextResponse.json({
      success: true,
      story: story,
      sceneCount: story.scenes.length,
    });
  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json(
      { error: "生成失败，请重试" },
      { status: 500 }
    );
  }
}
