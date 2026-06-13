# AI Video Agent Folder

Drop `.json`, `.txt`, or `.md` video jobs into `inbox/`.

The backend scans this folder, sends the prompt to the configured AI video provider, stores the generated video URL, and posts it to the connected social platforms.

## Text Job Example

```txt
provider: auto
platforms: facebook, instagram, linkedin
durationSeconds: 8
aspectRatio: 9:16
message: AI Tools Store update. DM for today rates.
---
Create a vertical promo video for ChatGPT Plus, Claude Pro, Cursor Pro, Gemini Advanced.
```

## JSON Job Example

```json
{
  "provider": "auto",
  "platforms": ["facebook", "instagram", "linkedin"],
  "prompt": "Create a short vertical AI tools promo video.",
  "message": "AI Tools Store update. DM for today rates.",
  "durationSeconds": 8,
  "aspectRatio": "9:16"
}
```

For local reference images, place the image beside the job file and set `image: filename.jpg`.
