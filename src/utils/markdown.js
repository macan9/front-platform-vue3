import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'

export const normalizeMarkdownContent = (content = '') => {
	let normalized = String(content).replace(/\r\n?/g, '\n')

	// Some posts are stored with escaped newlines instead of real line breaks.
	if (!normalized.includes('\n') && normalized.includes('\\n')) {
		normalized = normalized.replace(/\\n/g, '\n')
	}

	// Recover escaped/code-point backticks produced by transport or storage layers.
	normalized = normalized
		.replace(/\\`/g, '`')
		.replace(/&#96;/g, '`')
		.replace(/&grave;/g, '`')

	// Support one-line fenced blocks like ```npm run dev```.
	normalized = normalized.replace(/```([^\n`]+)```/g, (_, code) => {
		return `\n\`\`\`\n${code.trim()}\n\`\`\`\n`
	})

	return normalized
}

export const createMarkdownRenderer = () => {
	const renderer = new Marked(
		markedHighlight({
			langPrefix: 'hljs language-',
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : 'plaintext'
				return hljs.highlight(code, { language }).value
			},
		})
	)

	renderer.setOptions({
		breaks: true,
		gfm: true,
	})

	return renderer
}

const defaultRenderer = createMarkdownRenderer()

export const renderMarkdown = (content = '') => {
	return defaultRenderer.parse(normalizeMarkdownContent(content))
}
