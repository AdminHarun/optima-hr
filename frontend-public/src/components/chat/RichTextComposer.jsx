import React, { useEffect, useState, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';
import { TRANSFORMERS } from '@lexical/markdown';
import { $convertToMarkdownString } from '@lexical/markdown';
import { FORMAT_TEXT_COMMAND, KEY_ENTER_COMMAND, COMMAND_PRIORITY_LOW, $getSelection, $isRangeSelection } from 'lexical';

// Icons
import {
    FormatBold,
    FormatItalic,
    Code as CodeIcon,
    FormatQuote,
    FormatListBulleted,
    FormatListNumbered,
    Send
} from '@mui/icons-material';
import { IconButton, Tooltip, Box } from '@mui/material';

const theme = {
    paragraph: 'editor-paragraph',
    quote: 'editor-quote',
    code: 'editor-code',
    heading: {
        h1: 'editor-heading-h1',
        h2: 'editor-heading-h2'
    },
    list: {
        ul: 'editor-list-ul',
        ol: 'editor-list-ol'
    },
    link: 'editor-link',
    text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        strikethrough: 'editor-text-strikethrough',
        code: 'editor-text-code'
    }
};

const editorConfig = {
    theme,
    nodes: [
        HeadingNode,
        QuoteNode,
        CodeNode,
        LinkNode,
        ListNode,
        ListItemNode
    ],
    onError: (error) => console.error(error)
};

// Toolbar Component
const ToolbarPlugin = () => {
    const [editor] = useLexicalComposerContext();

    const formatText = (format) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderBottom: '1px solid rgba(0,0,0,0.05)', pb: 0.5, mb: 0.5 }}>
            <Tooltip title="Kalın (Ctrl+B)">
                <IconButton size="small" onClick={() => formatText('bold')} sx={{ p: 0.5 }}>
                    <FormatBold fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="İtalik (Ctrl+I)">
                <IconButton size="small" onClick={() => formatText('italic')} sx={{ p: 0.5 }}>
                    <FormatItalic fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Kod (Ctrl+E)">
                <IconButton size="small" onClick={() => formatText('code')} sx={{ p: 0.5 }}>
                    <CodeIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            {/* More buttons can be added */}
        </Box>
    );
};

// Enter Key Plugin (Send on Enter, New Line on Shift+Enter)
const OnEnterPlugin = ({ onSend }) => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            KEY_ENTER_COMMAND,
            (event) => {
                if (!event.shiftKey) {
                    event.preventDefault();
                    editor.update(() => {
                        const markdown = $convertToMarkdownString(TRANSFORMERS);
                        if (markdown.trim()) {
                            onSend(markdown);
                            editor.dispatchCommand(Object.getPrototypeOf(editor).constructor.CLEAR_EDITOR_COMMAND, undefined);
                        }
                    });
                    return true;
                }
                return false;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor, onSend]);

    return null;
};

// Update Parent State Plugin (optional, if we want sync on every keystroke)
const OnChangePlugin = ({ onChange }) => {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const markdown = $convertToMarkdownString(TRANSFORMERS);
                onChange(markdown);
            });
        });
    }, [editor, onChange]);
    return null;
};

// Editor Ref Plugin to expose commands
const EditorRefPlugin = ({ editorRef }) => {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (editorRef) {
            editorRef.current = {
                insertText: (text) => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            selection.insertText(text);
                        }
                    });
                },
                focus: () => {
                    editor.focus();
                },
                clear: () => {
                    editor.dispatchCommand(Object.getPrototypeOf(editor).constructor.CLEAR_EDITOR_COMMAND, undefined);
                }
            };
        }
    }, [editor, editorRef]);
    return null;
};



const RichTextComposer = React.forwardRef(({ onSend, onChange, placeholder = "Mesajınızı yazın..." }, ref) => {
    return (
        <LexicalComposer initialConfig={editorConfig}>
            <Box sx={{
                position: 'relative',
                backgroundColor: 'rgba(100, 150, 200, 0.04)',
                borderRadius: '12px',
                border: '1.5px solid transparent',
                '&:hover': {
                    backgroundColor: 'rgba(100, 150, 200, 0.06)'
                },
                '&:focus-within': {
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(90, 159, 212, 0.3)',
                    boxShadow: '0 0 0 3px rgba(90, 159, 212, 0.08)'
                },
                transition: 'all 0.2s ease',
                p: 1
            }}>
                {/* Toolbar disabled for now to keep it clean, or enable if requested */}
                {/* <ToolbarPlugin /> */}

                <RichTextPlugin
                    contentEditable={
                        <ContentEditable
                            className="editor-input"
                            style={{
                                minHeight: '40px',
                                maxHeight: '150px',
                                outline: 'none',
                                padding: '8px 12px',
                                fontSize: '14px',
                                lineHeight: '1.5',
                                color: '#2d3748',
                                overflowY: 'auto'
                            }}
                        />
                    }
                    placeholder={
                        <Box sx={{
                            position: 'absolute',
                            top: 18,
                            left: 22,
                            color: '#a0aec0',
                            fontSize: '14px',
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}>
                            {placeholder}
                        </Box>
                    }
                    ErrorBoundary={(e) => <div>Error: {e.children}</div>}
                />
                <HistoryPlugin />
                <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                <OnEnterPlugin onSend={onSend} />
                {onChange && <OnChangePlugin onChange={onChange} />}
                <EditorRefPlugin editorRef={ref} />
            </Box>
        </LexicalComposer>
    );
});

export default RichTextComposer;
