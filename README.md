# Ramble

Ramble is a small chatbot by Marcus Cole. You type a message, and Ramble answers in a short, friendly way. The page is plain HTML, CSS, and JavaScript, and it is published with GitHub Pages:

https://mecolejr.github.io/ramble-and-chat/

GitHub Pages only serves files. It cannot store a secret or call Cohere. The page sends each message to a Cloudflare Worker. The Worker holds the Cohere API key and asks Cohere to reply as Ramble. It calls `https://api.cohere.com/v2/chat` with the model `command-r-08-2024`, and sends the reply text back.

The key never goes in the website files. The page at `/ramble-and-chat/` loads `style.css` and `script.js` with relative links, so those files stay inside the project folder.

The page sends each message to the deployed Worker at https://ramble-chat.mecolejr.workers.dev. That address is `RAMBLE_WORKER_URL` at the top of `script.js`. The Worker accepts the POST on that host and does not use a path.

GitHub Pages serves the `main` branch. After this change is on `main`, open https://mecolejr.github.io/ramble-and-chat/ and send a message. If the request fails, the page says "Something went wrong connecting to Ramble. Please try again."

## Deploy the Worker again

You need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account, Node.js, and Wrangler. The Worker name in `worker/wrangler.toml` is `ramble-chat`.

1. Install Wrangler and log in (a browser window opens):

   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. From the `worker` folder:

   ```bash
   cd worker
   wrangler deploy
   ```

3. The Cohere key is a secret named `COHERE_API_KEY`. Wrangler asks you to paste the key and does not write it into the repo. This also updates the deployed Worker:

   ```bash
   wrangler secret put COHERE_API_KEY
   ```

`RAMBLE_WORKER_URL` is already set to https://ramble-chat.mecolejr.workers.dev. Change it only if a new deploy prints a different URL.

## Try the page on your computer

From the project folder:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080. The Worker accepts that address, `127.0.0.1`, and https://mecolejr.github.io.

For a local Worker, run `wrangler dev` inside `worker` and put the key in `worker/.dev.vars` as `COHERE_API_KEY=...`. That file is gitignored.

## Files

- `index.html`, `script.js`, `style.css` — the chat page
- `worker/src/index.js` — the Worker
- `worker/wrangler.toml` — the Worker name and settings

A message can be up to 4,000 characters. Only the latest 20 turns are sent along with it, and a request larger than 100 KB is refused.

## Check

```bash
node --test
```

If a Cohere key was ever pasted into `script.js`, retire that key in the Cohere dashboard and use a new one for the Worker secret. Old commits can still contain it.
