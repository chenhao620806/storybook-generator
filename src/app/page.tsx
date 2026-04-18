"use client";

import type { Metadata } from "next";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BookOpen, ImageIcon, Download, Copy, RefreshCw } from "lucide-react";

interface StoryScene {
  sceneNumber: number;
  visualDescription: string;
  narrative: string;
  dialogue?: string;
}

interface StoryData {
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

interface GeneratedContent {
  story: StoryData | null;
  images: string[];
  rawScript: string;
}

export default function StorybookGenerator() {
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({
    story: null,
    images: [],
    rawScript: "",
  });
  const [displayedScript, setDisplayedScript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scriptRef = useRef<string>("");

  const generateStory = useCallback(async () => {
    if (!topic.trim()) {
      setError("请输入故事主题");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setDisplayedScript("");
    scriptRef.current = "";
    setGeneratedContent({ story: null, images: [], rawScript: "" });

    try {
      const response = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error("生成故事失败");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  scriptRef.current += data.content;
                  setDisplayedScript(scriptRef.current);
                } else if (data.done) {
                  done = true;
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }

      // 尝试解析完整的脚本
      try {
        const parsedStory = parseStoryScript(scriptRef.current);
        if (parsedStory) {
          setGeneratedContent((prev) => ({
            ...prev,
            story: parsedStory,
            rawScript: scriptRef.current,
          }));
        }
      } catch (e) {
        console.error("解析故事脚本失败:", e);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  }, [topic]);

  const generateImages = useCallback(async () => {
    if (!generatedContent.story) {
      setError("请先生成故事脚本");
      return;
    }

    setIsGeneratingImages(true);
    setError(null);

    try {
      const response = await fetch("/api/story/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: generatedContent.story }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "生成图片失败");
      }

      const data = await response.json();

      setGeneratedContent((prev) => ({
        ...prev,
        images: data.imageUrls,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成图片失败");
    } finally {
      setIsGeneratingImages(false);
    }
  }, [generatedContent.story]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError("下载失败，请重试");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              儿童绘本生成器
            </h1>
            <Sparkles className="w-10 h-10 text-pink-600 dark:text-pink-400" />
          </div>
          <p className="text-lg text-muted-foreground dark:text-slate-400 max-w-2xl mx-auto">
            输入一个主题，让 AI 为你创作温馨有趣的儿童绘本故事，并生成配套的精美插画
          </p>
        </header>

        {/* Input Section */}
        <Card className="mb-8 shadow-lg border-purple-100 dark:border-purple-900">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              开始创作
            </CardTitle>
            <CardDescription>
              输入一个有趣的主题，比如&quot;小兔子学游泳&quot;、&quot;星星的秘密&quot;等
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Input
                placeholder="输入故事主题..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generateStory()}
                disabled={isGenerating || isGeneratingImages}
                className="text-lg py-6 border-purple-200 focus:border-purple-500 dark:border-purple-800"
              />
              <Button
                onClick={generateStory}
                disabled={isGenerating || isGeneratingImages || !topic.trim()}
                className="py-6 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isGenerating ? (
                  <>
                    <Spinner className="mr-2" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2" />
                    生成绘本
                  </>
                )}
              </Button>
            </div>
            {error && (
              <p className="text-red-500 mt-2 text-sm">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Generated Content */}
        {(isGenerating || displayedScript || generatedContent.story) && (
          <div className="space-y-6">
            {/* Script Section */}
            <Card className="shadow-lg border-purple-100 dark:border-purple-900">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    绘本脚本
                  </CardTitle>
                  {generatedContent.rawScript && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedContent.rawScript)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      复制
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-slate-50 dark:bg-slate-800">
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {displayedScript}
                    {isGenerating && <span className="animate-pulse">▊</span>}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Image Generation Button */}
            {generatedContent.story && (
              <div className="flex justify-center">
                <Button
                  onClick={generateImages}
                  disabled={isGeneratingImages || generatedContent.images.length > 0}
                  className="py-6 px-12 text-lg bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700"
                >
                  {isGeneratingImages ? (
                    <>
                      <Spinner className="mr-2" />
                      正在生成插画...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2" />
                      生成4张配套插画
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Images Section */}
            {generatedContent.images.length > 0 && (
              <Card className="shadow-lg border-purple-100 dark:border-purple-900">
                <CardHeader className="bg-gradient-to-r from-pink-50 to-orange-50 dark:from-pink-950 dark:to-orange-950 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-pink-600" />
                    绘本插画
                  </CardTitle>
                  <CardDescription>
                    使用 Seedream 4.5 sequential image generation 生成，保持画风一致
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {generatedContent.images.map((url, index) => (
                      <div key={index} className="space-y-2">
                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-purple-200 dark:border-purple-800">
                          <img
                            src={url}
                            alt={`场景 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900">
                            场景 {index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadImage(url, `story-scene-${index + 1}.png`)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            下载
                          </Button>
                        </div>
                        {generatedContent.story?.scenes[index] && (
                          <p className="text-xs text-muted-foreground p-2 bg-slate-50 dark:bg-slate-800 rounded">
                            {generatedContent.story.scenes[index].narrative}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Story Display */}
            {generatedContent.story && (
              <Card className="shadow-lg border-purple-100 dark:border-purple-900">
                <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-green-600" />
                      {generatedContent.story.title}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTopic("");
                        setDisplayedScript("");
                        scriptRef.current = "";
                        setGeneratedContent({ story: null, images: [], rawScript: "" });
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      新故事
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-purple-700 dark:text-purple-300">
                      主角介绍
                    </h3>
                    <p className="text-muted-foreground">
                      <span className="font-medium">{generatedContent.story.mainCharacter.name}</span>
                      {" - "}
                      {generatedContent.story.mainCharacter.appearance}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      性格: {generatedContent.story.mainCharacter.personality}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-purple-700 dark:text-purple-300">
                      故事背景
                    </h3>
                    <p className="text-muted-foreground">
                      {generatedContent.story.setting}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-purple-700 dark:text-purple-300">
                      故事内容
                    </h3>
                    <Tabs defaultValue="scene1" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        {generatedContent.story.scenes.map((scene, index) => (
                          <TabsTrigger key={index} value={`scene${index + 1}`}>
                            场景 {index + 1}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {generatedContent.story.scenes.map((scene, index) => (
                        <TabsContent key={index} value={`scene${index + 1}`} className="space-y-4">
                          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                            <h4 className="font-medium text-purple-700 dark:text-purple-300 mb-2">
                              画面描述
                            </h4>
                            <p className="text-sm">{scene.visualDescription}</p>
                          </div>
                          {scene.narrative && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <h4 className="font-medium mb-2">旁白</h4>
                              <p className="italic">{scene.narrative}</p>
                            </div>
                          )}
                          {scene.dialogue && (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                              <h4 className="font-medium mb-2">对话</h4>
                              <p>{scene.dialogue}</p>
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                  <Separator />
                  <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2 text-green-700 dark:text-green-300">
                      故事寓意
                    </h3>
                    <p className="text-muted-foreground">{generatedContent.story.moral}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isGenerating && !displayedScript && !generatedContent.story && (
          <div className="text-center py-20">
            <BookOpen className="w-20 h-20 mx-auto text-purple-300 dark:text-purple-600 mb-4" />
            <h2 className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mb-2">
              准备开始创作
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              在上方输入一个有趣的主题，AI 将为你创作一个温馨的儿童绘本故事，
              并生成配套的精美插画
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Powered by Seedream 4.5 Sequential Image Generation & Doubao LLM</p>
        </footer>
      </div>
    </div>
  );
}

function parseStoryScript(script: string): StoryData | null {
  // 尝试提取 JSON 部分
  const jsonMatch = script.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const story = JSON.parse(jsonMatch[0]);

    // 验证必需字段
    if (!story.title || !story.mainCharacter || !story.scenes || story.scenes.length < 4) {
      return null;
    }

    return story as StoryData;
  } catch {
    return null;
  }
}
