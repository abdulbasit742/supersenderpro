# SuperSender Pro - Antigravity Next 50 Steps

Use this as the next-laptop handoff plan. Start from the GitHub repo, keep secrets local, and verify each block before moving to the next one.

1. Clone `https://github.com/abdulbasit742/supersenderpro.git`.
2. Checkout `main` for the full local backend, or `lovable-deploy` for the Lovable-facing branch.
3. Confirm Node.js 18+ is installed with `node -v`.
4. Run `npm install` in the repo root.
5. Copy `.env.example` to `.env` if it exists.
6. Add local secrets only in `.env`, not in chat or public commits.
7. Run `node --check server.js`.
8. Start the backend with `node server.js`.
9. Open `http://localhost:3001/wa-qr`.
10. Scan the default WhatsApp bot QR.
11. Send a test WhatsApp message and verify the main menu reply.
12. Open `http://localhost:3001/wa-channel-qr`.
13. Connect the channel publisher account if the page asks for QR.
14. Run `!channelcenter` from the admin WhatsApp number.
15. Run `!channelwatch run` and save the result.
16. Fix any blocker shown by the watchdog before heavy automation.
17. Use `!channelpreset fast` for daily operation.
18. Use `!channelpreset safe` if WhatsApp delivery starts failing.
19. Use `!channelpreset max` only after source and target channels are stable.
20. Open the channel dashboard and scan followed channels.
21. Select target channels: Aria, Stickers, or any owner channel.
22. Select source channels: MRF TECH, Cyber Wolf, stickers source, and trusted followed channels.
23. Save source and target channels.
24. Run `Auto-Fix + Sweep` from the dashboard.
25. Check pending manual packets and clear stale ones.
26. Enable Watchdog ON from the dashboard.
27. Keep watchdog interval at 10 minutes until the system is stable.
28. Verify source doctor shows active sources, not dead sources.
29. Add per-source rules for channels that need different branding.
30. Add source blacklist entries for noisy or low-quality channels.
31. Enable phone scrubber for public channel reposts.
32. Keep link scrubber off only when links are useful for the audience.
33. Test one copied post in draft mode before live publishing.
34. Verify branding footer appears correctly.
35. Verify media posts keep the correct caption and image/video.
36. Configure Facebook Page OAuth or manual page token.
37. Test Facebook bridge with dry run first.
38. Configure Instagram Business only after public media URLs are ready.
39. Configure Telegram bridge with bot token and channel/chat ID.
40. Add Tavily API key to `.env` for web research and scholarship/news fetches.
41. Add NVIDIA/OpenAI-compatible LLM key only in `.env`.
42. Test AI caption generation on one image post.
43. Test scholarship fetch pipeline with one trusted source.
44. Test website-to-channel posting with one website URL.
45. Test seller rate sweep from allowed groups.
46. Export a backup zip after every stable milestone.
47. Push every stable change to GitHub.
48. On the second laptop, pull with `git pull origin main`.
49. Re-scan WhatsApp sessions on that laptop because sessions are machine-specific.
50. Keep local server running with a process manager or Cloudflare Tunnel if public access is needed.

Priority fixes for the next build:

- Resolve the WhatsApp channel publisher `getLastMsgKeyForAction` issue by testing a newer WhatsApp Web client stack or forcing manual fallback for channel posts.
- Add a visible dashboard card for Watchdog history and last auto-fix result.
- Add one-click export for channel source/target settings.
- Add environment setup validator for `.env`, social tokens, Telegram token, and Tavily key.
- Add a compact Antigravity startup script that runs syntax check, starts server, and opens the QR page.
