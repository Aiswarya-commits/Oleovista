/*
  Vercel serverless function  ->  POST /api/olivia-chat
  Set ANTHROPIC_API_KEY in Vercel: Project -> Settings -> Environment Variables.
*/
import { oliviaNodeHandler } from '../server/olivia-core.mjs';

export default function handler(req, res) {
  return oliviaNodeHandler(req, res);
}
