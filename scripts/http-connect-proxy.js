const net = require('net');

const targetHost = process.argv[2];
const targetPort = Number(process.argv[3] || 22);
const proxyRaw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy || 'http://172.30.10.10:3128';

if (!targetHost || !targetPort) {
  console.error('Usage: node http-connect-proxy.js <host> <port>');
  process.exit(2);
}

let proxy;
try {
  proxy = new URL(proxyRaw.includes('://') ? proxyRaw : `http://${proxyRaw}`);
} catch (error) {
  console.error(`Invalid proxy URL: ${proxyRaw}`);
  process.exit(2);
}

const socket = net.connect(Number(proxy.port || 3128), proxy.hostname, () => {
  const auth = proxy.username ? `Proxy-Authorization: Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password || '')}`).toString('base64')}\r\n` : '';
  socket.write(`CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n${auth}\r\n`);
});

let header = Buffer.alloc(0);
let connected = false;

socket.on('data', chunk => {
  if (connected) {
    process.stdout.write(chunk);
    return;
  }
  header = Buffer.concat([header, chunk]);
  const end = header.indexOf('\r\n\r\n');
  if (end === -1) return;
  const head = header.subarray(0, end).toString('utf8');
  if (!/^HTTP\/1\.[01] 200/i.test(head)) {
    console.error(head);
    process.exit(1);
  }
  connected = true;
  const rest = header.subarray(end + 4);
  if (rest.length) process.stdout.write(rest);
  process.stdin.pipe(socket);
});

process.stdin.on('data', chunk => {
  if (connected) socket.write(chunk);
});
socket.on('error', error => {
  console.error(error.message);
  process.exit(1);
});
socket.on('close', () => process.exit(0));
