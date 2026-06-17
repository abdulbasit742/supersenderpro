-- Add ai_content column to channel_items for AI rewritten text
alter table public.channel_items add column if not exists ai_content text;

-- Add original_content column to posts table
alter table public.posts add column if not exists original_content text;