export interface ArticleContent {
  title: string;
  body: string;
}

export function extractTitle(html: string): string;
export function extractBody(html: string): string;
export function isUsableBody(body: string): boolean;
export function fetchArticle(url: string): Promise<ArticleContent>;
