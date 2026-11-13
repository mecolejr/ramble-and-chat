const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('the page loads its own files from the GitHub Pages subpath', () => {
  const html = read('index.html');
  assert.match(html, /href="style\.css"/);
  assert.match(html, /src="script\.js"/);
  assert.doesNotMatch(html, /(?:href|src)="\/(?:style\.css|script\.js)"/);
});

test('the chat page calls the Worker URL constant and explains a failed request', () => {
  const script = read('script.js');
  const top = script.split('\n').slice(0, 20).join('\n');

  assert.match(top, /const RAMBLE_WORKER_URL = 'https:\/\/ramble-chat\.<your-subdomain>\.workers\.dev'/);
  assert.match(script, /fetch\(RAMBLE_WORKER_URL/);
  assert.match(script, /chatHistory\.slice\(-20\)/);
  assert.match(script, /Something went wrong connecting to Ramble\. Please try again\./);
  assert.doesNotMatch(script, /netlify/i);
  assert.doesNotMatch(script, /COHERE_API_KEY/);
  assert.doesNotMatch(script, /Bearer /);
  assert.doesNotMatch(script, /api\.cohere\.ai/);
});

test('Netlify is no longer part of the site', () => {
  assert.equal(fs.existsSync(path.join(root, 'netlify', 'functions', 'chat.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'netlify.toml')), false);
});

test('the Worker is configured without a committed secret', () => {
  const toml = read('worker/wrangler.toml');
  const source = read('worker/src/index.js');
  const ignore = read('.gitignore');

  assert.match(toml, /name = "ramble-chat"/);
  assert.match(toml, /main = "src\/index\.js"/);
  assert.match(source, /env\.COHERE_API_KEY/);
  assert.match(source, /command-r-08-2024/);
  assert.match(source, /https:\/\/api\.cohere\.com\/v2\/chat/);
  assert.doesNotMatch(source, /api\.cohere\.ai\/v1/);
  assert.doesNotMatch(source, /['"]command-r['"]/);
  assert.doesNotMatch(toml, /COHERE_API_KEY\s*=\s*["'][^"']+["']/);
  assert.match(ignore, /\.dev\.vars/);
  assert.match(ignore, /\.wrangler/);
  assert.doesNotMatch(source, /Bearer [A-Za-z0-9_\-]{20,}/);
});

test('the README explains Ramble and how to deploy the Worker', () => {
  const readme = read('README.md');
  assert.match(readme, /^# Ramble/m);
  assert.match(readme, /wrangler deploy/);
  assert.match(readme, /wrangler secret put COHERE_API_KEY/);
  assert.match(readme, /RAMBLE_WORKER_URL/);
  assert.match(readme, /ramble-chat/);
  assert.match(readme, /https:\/\/mecolejr\.github\.io\/ramble-and-chat\//);
  assert.doesNotMatch(readme, /AI Prompt Saver/);
  assert.doesNotMatch(readme, /Bearer /);
});
