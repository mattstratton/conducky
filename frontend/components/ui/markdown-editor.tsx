import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bold, 
  Italic, 
  Quote, 
  Code, 
  Link2, 
  List, 
  Eye, 
  EyeOff,
  Heading2,
  Heading3
} from "lucide-react";
import { SecureMarkdown } from "@/components/ui/secure-markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  quotedText?: string; // For reply/quote functionality
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your comment in markdown...",
  quotedText,
  rows = 6,
  className = "",
  disabled = false
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to insert text at cursor position
  const insertText = (before: string, after: string = "", placeholder?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder || "";
    
    const newText = 
      value.substring(0, start) + 
      before + 
      textToInsert + 
      after + 
      value.substring(end);
    
    onChange(newText);
    
    // Set cursor position after insertion
    setTimeout(() => {
      if (selectedText || placeholder) {
        textarea.setSelectionRange(
          start + before.length,
          start + before.length + textToInsert.length
        );
      } else {
        textarea.setSelectionRange(
          start + before.length,
          start + before.length
        );
      }
      textarea.focus();
    }, 0);
  };

  // Formatting functions
  const formatBold = () => insertText("**", "**", "bold text");
  const formatItalic = () => insertText("_", "_", "italic text");
  const formatCode = () => insertText("`", "`", "code");
  const formatLink = () => insertText("[", "](url)", "link text");
  const formatQuote = () => {
    insertText('\n> ', '', 'quoted text');
  };
  const formatList = () => insertText('\n- ', '', 'list item');
  const formatHeading2 = () => insertText('\n## ', '', 'Heading');
  const formatHeading3 = () => insertText('\n### ', '', 'Subheading');

  // Add quoted text to the beginning if provided
  React.useEffect(() => {
    if (quotedText && !value.includes(quotedText)) {
      const quotedLines = quotedText.split('\n').map(line => `> ${line}`).join('\n');
      const newValue = `${quotedLines}\n\n`;
      onChange(newValue);
    }
  }, [quotedText]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border rounded-md bg-muted/10">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatBold}
          title="Bold (Ctrl+B)"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatItalic}
          title="Italic (Ctrl+I)"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatCode}
          title="Inline Code"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Code className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatHeading2}
          title="Heading"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatHeading3}
          title="Subheading"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatList}
          title="Bullet List"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatQuote}
          title="Quote"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatLink}
          title="Link"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          title={showPreview ? "Hide Preview" : "Show Preview"}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Editor/Preview */}
      <div className="space-y-3">
        {showPreview ? (
          <div className="space-y-3">
            {/* Preview */}
            <div className="min-h-[150px] p-3 border rounded-md bg-background">
              <div className="text-sm text-muted-foreground mb-2 font-medium">Preview:</div>
              {value.trim() ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <SecureMarkdown>{value}</SecureMarkdown>
                </div>
              ) : (
                <div className="text-muted-foreground italic">Nothing to preview</div>
              )}
            </div>
            
            {/* Editor (smaller when preview is shown) */}
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={Math.max(3, Math.floor(rows / 2))}
              disabled={disabled}
              className="resize-y"
            />
          </div>
        ) : (
          /* Full editor */
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className="resize-y"
          />
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-muted-foreground">
        <details className="cursor-pointer">
          <summary className="hover:text-foreground">Markdown formatting help</summary>
          <div className="mt-2 space-y-1 pl-4">
            <div><code>**bold**</code> → <strong>bold</strong></div>
            <div><code>_italic_</code> → <em>italic</em></div>
            <div><code>`code`</code> → <code>code</code></div>
            <div><code>## Heading</code> → heading</div>
            <div><code>- List item</code> → bullet list</div>
            <div><code>&gt; Quote</code> → blockquote</div>
            <div><code>[text](url)</code> → link</div>
          </div>
        </details>
      </div>
    </div>
  );
} 