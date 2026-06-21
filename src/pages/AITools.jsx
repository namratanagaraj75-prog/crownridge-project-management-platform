import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/PageHeader";
import {
  SparklesIcon,
  FileText,
  BookOpen,
  Bug,
  Users,
  ClipboardList,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { generateAIResponse } from "@/lib/gemini";

const tools = [
  {
    id: "spec",
    label: "Spec Generator",
    icon: FileText,
    placeholder:
      "Describe the project or feature you need a technical specification for...",
    prompt:
      "Generate a detailed technical specification document for the following requirements. Include sections for Overview, Architecture, Tech Stack, Data Models, API Endpoints, Security, Deployment, and Timeline:\n\n",
  },
  {
    id: "userstory",
    label: "User Stories",
    icon: BookOpen,
    placeholder: "Describe the requirements or feature...",
    prompt:
      'Generate detailed user stories with acceptance criteria in the format "As a [role], I want [feature], so that [benefit]". Include edge cases and include acceptance criteria for each:\n\n',
  },
  {
    id: "testcase",
    label: "Test Cases",
    icon: ClipboardList,
    placeholder:
      "Describe the feature or user story to generate test cases for...",
    prompt:
      "Generate comprehensive test cases including functional tests, edge cases, and validation cases. Format each test case with: ID, Title, Preconditions, Steps, Expected Result, Priority:\n\n",
  },
  {
    id: "bug",
    label: "Bug Summarizer",
    icon: Bug,
    placeholder: "Paste the bug report or describe the issue...",
    prompt:
      "Analyze this bug report and provide: 1) Root Cause Summary, 2) Severity Assessment (Critical/High/Medium/Low), 3) Impact Analysis, 4) Suggested Fixes with step-by-step resolution, 5) Prevention recommendations:\n\n",
  },
  {
    id: "meeting",
    label: "Meeting Minutes",
    icon: Users,
    placeholder: "Paste the raw meeting notes...",
    prompt:
      "Convert these meeting notes into structured Minutes of Meeting (MOM). Include: 1) Meeting Summary, 2) Key Discussion Points, 3) Decisions Made, 4) Action Items (with Owner, Deadline, Priority), 5) Next Meeting Date:\n\n",
  },
  {
    id: "docs",
    label: "Documentation",
    icon: FileText,
    placeholder:
      "Describe what documentation you need (API docs, project docs, release notes)...",
    prompt:
      "Generate professional technical documentation based on the following input. Create well-structured, clear documentation with proper headings, code examples where applicable, and comprehensive coverage:\n\n",
  },
];

export default function AITools() {
  const [activeTool, setActiveTool] = useState("spec");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!input.trim()) return;

    try {
      setGenerating(true);
      setOutput("");

      const tool = tools.find((t) => t.id === activeTool);

      const prompt = tool.prompt + input;

      const response = await generateAIResponse(prompt);

      setOutput(response);
    } catch (error) {
      console.error(error);

      setOutput("Error generating response. Check API key.");
    } finally {
      setGenerating(false);
    }
  };

  const currentTool = tools.find((t) => t.id === activeTool);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Tools"
        description="AI-powered documentation and analysis tools"
      />

      <Tabs
        value={activeTool}
        onValueChange={(v) => {
          setActiveTool(v);
          setOutput("");
        }}
      >
        <TabsList className="flex-wrap h-auto gap-1">
          {tools.map((tool) => (
            <TabsTrigger key={tool.id} value={tool.id} className="gap-1.5">
              <tool.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tool.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tools.map((tool) => (
          <TabsContent key={tool.id} value={tool.id} className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <tool.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-heading font-semibold text-sm">
                      {tool.label}
                    </h3>
                  </div>
                  <Textarea
                    placeholder={tool.placeholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={12}
                    className="resize-none"
                  />
                  <Button
                    className="w-full mt-3"
                    onClick={handleGenerate}
                    disabled={generating || !input.trim()}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-heading font-semibold text-sm mb-3">
                  Output
                </h3>
                {generating ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        AI is generating content...
                      </p>
                    </div>
                  </div>
                ) : output ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-y-auto">
                    <ReactMarkdown>{output}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                      <SparklesIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        Enter your input and click Generate
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
