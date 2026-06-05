import { createClient } from '@supabase/supabase-js';
import { HttpsProxyAgent } from 'https-proxy-agent';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

// 自定义 fetch，支持代理
const customFetch = async (url: string, options: RequestInit = {}) => {
  if (proxyUrl) {
    const agent = new HttpsProxyAgent(proxyUrl);
    // 使用 undici 的 dispatcher 或 node-fetch 的 agent
    // 这里用原生 fetch + agent 的方式
    const { default: fetch } = await import('node-fetch');
    return fetch(url, {
      ...options,
      agent,
    } as any);
  }
  return fetch(url, options);
};

// 客户端用的（前端，不走代理）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 服务端用的（API Routes，绕过 RLS，支持代理）
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    global: {
      fetch: proxyUrl ? customFetch : fetch,
    },
  }
);
