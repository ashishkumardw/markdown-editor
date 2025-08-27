"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Menu,
  X,
  Eye,
  EyeOff,
  FileText,
  Download,
  Trash2,
  Plus,
  Search,
} from "lucide-react";
import { defaultData } from "./data";

interface IMarkdownData {
  id: string;
  name: string;
  content: string;
}

const MarkdownEditor = () => {
  const [documents, setDocuments] = useState<IMarkdownData[]>([]);
  const [currentDoc, setCurrentDoc] = useState<IMarkdownData | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newDocName, setNewDocName] = useState("");

  // Load data from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem("obsidian-markdown-editor-data");
    if (saved) {
      const data = JSON.parse(saved);
      setDocuments(data.documents);
      if (data.documents.length > 0) {
        setCurrentDoc(data.documents[0]);
      }
    } else {
      setDocuments(defaultData.documents);
      setCurrentDoc(defaultData.documents[0]);
    }
  }, []);

  // Save to localStorage whenever documents change
  useEffect(() => {
    localStorage.setItem(
      "obsidian-markdown-editor-data",
      JSON.stringify({ documents })
    );
  }, [documents]);

  const createDocument = () => {
    const name = newDocName.trim() || `Untitled-${Date.now()}`;
    const newDoc = {
      id: Date.now().toString(),
      name: name,
      content: `# ${name}\n\nStart writing your thoughts here...`,
    };
    setDocuments([newDoc, ...documents]);
    setCurrentDoc(newDoc);
    setNewDocName("");
    setIsEditing(false);
  };

  const updateDocument = useCallback(
    (id: string, updates: { content: string }) => {
      setDocuments((docs) =>
        docs.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc))
      );
      if (currentDoc?.id === id) {
        setCurrentDoc((prev) => {
          if (!prev) return null;
          return { ...prev, ...updates };
        });
      }
    },
    [currentDoc]
  );

  const deleteDocument = (id: string) => {
    setDocuments((docs) => docs.filter((doc) => doc.id !== id));
    if (currentDoc?.id === id) {
      const remaining = documents.filter((doc) => doc.id !== id);
      setCurrentDoc(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const downloadAsPDF = () => {
    if (!currentDoc) return;

    const printWindow = window.open("", "_blank");
    printWindow?.document.write(`
      <html>
        <head>
          <title>${currentDoc.name}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 800px; 
              margin: 40px auto; 
              padding: 20px; 
              line-height: 1.6;
              color: #2e3338;
            }
            h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; color: #2e3338; }
            ul, ol { margin: 16px 0; padding-left: 24px; }
            li { margin: 4px 0; }
            code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
            pre { background: #f8f9fa; padding: 16px; border-radius: 6px; overflow: auto; border: 1px solid #e3e8ef; }
            blockquote { border-left: 4px solid #7c3aed; margin: 16px 0; padding: 0 16px; color: #6b7280; }
            strong { color: #2e3338; }
          </style>
        </head>
        <body>${parseMarkdown(currentDoc.content)}</body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
  };

  const parseMarkdown = (markdown: string) => {
    const lines = markdown.split("\n");
    let html = "";
    let inCodeBlock = false;
    let codeBlockContent = "";
    let currentList = null; // 'ul', 'ol', or 'task'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle code blocks
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          html += `<pre><code>${codeBlockContent.trim()}</code></pre>\n`;
          inCodeBlock = false;
          codeBlockContent = "";
        } else {
          if (currentList) {
            html += currentList === "ol" ? "</ol>\n" : "</ul>\n";
            currentList = null;
          }
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent += line + "\n";
        continue;
      }

      // Handle headings
      if (line.match(/^#{1,6}\s+/)) {
        if (currentList) {
          html += currentList === "ol" ? "</ol>\n" : "</ul>\n";
          currentList = null;
        }
        const level = (line.match(/^#+/) || [""])[0].length;
        const text = line.replace(/^#+\s*/, "");
        html += `<h${level}>${text}</h${level}>\n`;
        continue;
      }

      // Handle blockquotes
      if (line.match(/^>\s+/)) {
        if (currentList) {
          html += currentList === "ol" ? "</ol>\n" : "</ul>\n";
          currentList = null;
        }
        const text = line.replace(/^>\s*/, "");
        html += `<blockquote>${text}</blockquote>\n`;
        continue;
      }

      // Handle task lists (must come before bullet lists)
      if (line.match(/^-\s+\[(x|\s)\]\s+/)) {
        const isChecked = line.includes("[x]");
        const text = line.replace(/^-\s+\[(x|\s)\]\s*/, "");

        if (currentList !== "task") {
          if (currentList) {
            html += currentList === "ol" ? "</ol>\n" : "</ul>\n";
          }
          html += '<ul class="task-list">\n';
          currentList = "task";
        }

        html += `<li class="task-item">
          <label>
            <input type="checkbox" ${isChecked ? "checked" : ""} 
                   onchange="window.handleTaskToggle && window.handleTaskToggle(${i}, this.checked)"
                   data-line="${i}"> 
            <span>${text}</span>
          </label>
        </li>\n`;
        continue;
      }

      // Handle bullet lists
      if (line.match(/^-\s+/)) {
        const text = line.replace(/^-\s*/, "");

        if (currentList !== "ul") {
          if (currentList) {
            html += currentList === "ol" ? "</ol>\n" : "</ul>\n";
          }
          html += "<ul>\n";
          currentList = "ul";
        }

        html += `<li>${text}</li>\n`;
        continue;
      }

      // Handle numbered lists
      if (line.match(/^\d+\.\s+/)) {
        const text = line.replace(/^\d+\.\s*/, "");

        if (currentList !== "ol") {
          if (currentList) {
            html += currentList === "ol" ? "</ol>\n" : "</ul>\n";
          }
          html += "<ol>\n";
          currentList = "ol";
        }

        html += `<li>${text}</li>\n`;
        continue;
      }

      // Handle empty lines
      if (line.trim() === "") {
        if (currentList) {
          html += currentList === "ol" ? "</ol>\n" : "</ul>\n";
          currentList = null;
        }
        html += "<br>\n";
        continue;
      }

      // Handle regular paragraphs
      if (currentList) {
        html += currentList === "ol" ? "</ol>\n" : "</ul>\n";
        currentList = null;
      }
      html += `<p>${line}</p>\n`;
    }

    // Close any remaining lists
    if (currentList) {
      html += currentList === "ol" ? "</ol>\n" : "</ul>\n";
    }

    // Apply inline formatting
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img alt="$1" src="$2" style="max-width: 100%; height: auto; border-radius: 8px;">'
    );
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    return html;
  };

  // Handle task toggle
  useEffect(() => {
    window.handleTaskToggle = (lineIndex: number, checked: boolean) => {
      if (!currentDoc) return;

      const lines = currentDoc.content.split("\n");
      if (lines[lineIndex] && lines[lineIndex].match(/^-\s+\[(x|\s)\]\s+/)) {
        const updatedLines = [...lines];
        if (checked) {
          updatedLines[lineIndex] = lines[lineIndex].replace(/\[\s\]/, "[x]");
        } else {
          updatedLines[lineIndex] = lines[lineIndex].replace(/\[x\]/, "[ ]");
        }
        updateDocument(currentDoc.id, { content: updatedLines.join("\n") });
      }
    };

    return () => {
      delete window.handleTaskToggle;
    };
  }, [currentDoc, updateDocument]);

  return (
    <div className="flex min-h-screen h-full bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <div
        className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 ${
          sidebarOpen ? "w-80" : "w-0"
        } overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-purple-400">Vault</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-gray-200"
                title="New note"
              >
                <Plus size={16} />
              </button>
              <button className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-gray-200">
                <Search size={16} />
              </button>
            </div>
          </div>

          {isEditing && (
            <div className="mb-4 space-y-2">
              <input
                type="text"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Note name..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => e.key === "Enter" && createDocument()}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={createDocument}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-md text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-2 space-y-1">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition-colors ${
                currentDoc?.id === doc.id
                  ? "bg-purple-600/20 text-purple-300"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
              onClick={() => setCurrentDoc(doc)}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm truncate">{doc.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteDocument(doc.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 hover:text-red-400 rounded transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded-md text-gray-400 hover:text-gray-200 transition-colors"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {currentDoc && (
              <div className="flex items-center space-x-2">
                <FileText size={16} className="text-gray-400" />
                <span className="font-medium text-gray-200">
                  {currentDoc.name}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={downloadAsPDF}
              className="p-2 hover:bg-gray-700 rounded-md text-gray-400 hover:text-gray-200 transition-colors"
              title="Export as PDF"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                showPreview
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-200"
              }`}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline text-sm">
                {showPreview ? "Edit" : "Preview"}
              </span>
            </button>
          </div>
        </header>

        {/* Editor/Preview Area */}
        {currentDoc ? (
          <div className="flex-1 flex">
            {/* Editor */}
            <div
              className={`${
                showPreview ? "w-1/2" : "w-full"
              } flex flex-col border-r border-gray-700`}
            >
              <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Editor
                </h3>
              </div>
              <textarea
                value={currentDoc.content}
                onChange={(e) =>
                  updateDocument(currentDoc.id, { content: e.target.value })
                }
                className="flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none border-none outline-none leading-relaxed"
                placeholder="Start writing..."
                style={{
                  fontFamily:
                    "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                }}
              />
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="w-1/2 flex flex-col bg-gray-800/30">
                <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Preview
                  </h3>
                </div>
                <div className="flex-1 p-6 overflow-auto">
                  <div
                    className="prose prose-invert max-w-none"
                    style={{
                      lineHeight: "1.7",
                      fontSize: "15px",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: parseMarkdown(currentDoc.content),
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Select a note to get started</p>
              <p className="text-sm text-gray-600 mt-2">
                Or create a new one from the sidebar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;

declare global {
  interface Window {
    handleTaskToggle?: (lineIndex: number, checked: boolean) => void;
  }
}
