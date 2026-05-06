/**
 * AI subtasks — narrow, scoped Cerebras calls used by the executor for
 * quick actions like "analyze this post" and "generate a comment for this
 * post." They take a typed input and return a typed output. No tool use,
 * no chains, no AI-driven control flow.
 */

const { CerebrasService } = require('../../cerebrasService');

const ANALYZE_SYSTEM_PROMPT = `You analyze LinkedIn posts. The user is reading a post in their feed and wants a quick understanding of what it's about so they can decide how to engage.

Output 2-4 short sentences in plain prose. Cover:
1. What the post is about (the main point or topic).
2. The author's stance or tone if relevant (excited, critical, informative, promotional, etc.).
3. The most-engaging or actionable element if there is one (e.g., a link, a question to readers, a controversial claim).

Do not summarize line-by-line. Do not invent details that aren't in the post. If the post is mostly empty (image / link / video), say so.

Output the analysis as plain text — no markdown, no headers, no JSON.`;

const GENERATE_COMMENT_SYSTEM_PROMPT = `You write authentic LinkedIn comments. The user is reading a post and wants to leave a thoughtful reply.

Write ONE comment that:
- Engages with the specific content of the post (not a generic "great share!").
- Sounds human — conversational, lowercase-friendly, no corporate speak.
- Is 1-3 sentences. Never long. No emojis unless the post itself is casual.
- Adds value: a thoughtful question, a related observation, or a small piece of agreement-with-a-twist. Avoid fawning praise.
- Does not include hashtags or @-mentions.

Output ONLY the comment text. No quotes, no preamble like "Here is a comment:", no analysis. Just the text the user would post.`;

class AISubtasks {
  /**
   * Summarize a post in 2-4 sentences.
   * @param {{ text?: string, authorName?: string }} post
   * @returns {Promise<string>}  the analysis prose
   */
  async analyzePost(post) {
    const text = (post?.text || '').trim();
    if (!text) {
      return "This post has no readable text — it's likely an image, video, or shared link. I can't analyze the message itself, but I can still draft a comment if you'd like.";
    }
    const prompt = `Author: ${post?.authorName || 'Unknown'}\n\nPost:\n${text}`;
    const response = await CerebrasService.sendMessage(
      prompt,
      [],
      null,
      ANALYZE_SYSTEM_PROMPT,
      { temperature: 0.3, max_tokens: 250 },
    );
    return (response.message || response || '').toString().trim();
  }

  /**
   * Generate a single comment draft for a post.
   * @param {{ text?: string, authorName?: string }} post
   * @param {string} [tone]  optional tone hint ("supportive", "skeptical", "curious", ...)
   * @returns {Promise<string>}  the comment body
   */
  async generateComment(post, tone) {
    const text = (post?.text || '').trim();
    const prompt = text
      ? `Author: ${post?.authorName || 'Unknown'}\n\nPost:\n${text}\n\n${tone ? `Tone: ${tone}\n` : ''}Write the comment now.`
      : `The post is mostly visual (image / video / link) by ${post?.authorName || 'Unknown'}. Write a short engaged comment that doesn't pretend to know specific text.`;
    const response = await CerebrasService.sendMessage(
      prompt,
      [],
      null,
      GENERATE_COMMENT_SYSTEM_PROMPT,
      { temperature: 0.6, max_tokens: 250 },
    );
    let body = (response.message || response || '').toString().trim();
    // Strip surrounding quotes if the model wrapped its output.
    body = body.replace(/^["'""'](.+)["'""']$/s, '$1').trim();
    return body;
  }
}

module.exports = new AISubtasks();
