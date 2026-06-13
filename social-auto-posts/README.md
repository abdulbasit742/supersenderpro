# Social Auto Poster

Drop post files into:

```text
social-auto-posts/inbox
```

The backend scans the folder every 60 seconds. Supported files:

- `.json`
- `.txt`
- `.md`

After processing:

- queued files move to `queued`
- posted files move to `posted`
- invalid files move to `failed`

## JSON Example

```json
{
  "platforms": ["facebook", "instagram", "linkedin"],
  "message": "Aaj ke AI tools plans available hain. DM for rates.",
  "image": "offer.jpg",
  "scheduledAt": "2026-05-08T20:00:00+05:00"
}
```

Instagram requires an image. Facebook and LinkedIn can publish text-only posts.

## TXT / MD Example

```text
platforms: facebook, linkedin
image: offer.jpg
scheduledAt:
---
Assalam o Alaikum!

Aaj ke AI tools plans available hain.
Reply for ChatGPT, Claude, Cursor, Gemini rates.
```

You can place the image file beside the post file in `inbox`. Example:

```text
inbox/eid-offer.txt
inbox/eid-offer.jpg
```

If the post file does not include `image:` or `imageUrl:`, the system automatically looks for a matching image with the same filename. Local images are copied to `social-auto-posts/media` and served from `/social-auto-media/...`.

For real Meta/Instagram posting from a VPS, set `SOCIAL_PUBLIC_BASE_URL` to a public HTTPS URL that Meta can fetch.
