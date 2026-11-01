/** TypeScript entry point for the shared Node/browser article extractor. */

export {
  extractBody,
  extractTitle,
  fetchArticle,
  isUsableBody,
} from "./article-core.mjs";

export type { ArticleContent } from "./article-core.mjs";
