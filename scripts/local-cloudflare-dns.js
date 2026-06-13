const dgram = require('dgram');

const PORT = Number(process.env.CLOUDFLARED_DNS_PORT || 53535);
const HOST = '127.0.0.1';

const REGION1 = [
  '198.41.192.167',
  '198.41.192.67',
  '198.41.192.57',
  '198.41.192.107',
  '198.41.192.27',
  '198.41.192.7',
  '198.41.192.227',
  '198.41.192.47',
  '198.41.192.37',
  '198.41.192.77'
];

const REGION2 = [
  '198.41.200.13',
  '198.41.200.193',
  '198.41.200.33',
  '198.41.200.233',
  '198.41.200.53',
  '198.41.200.63',
  '198.41.200.113',
  '198.41.200.73',
  '198.41.200.43',
  '198.41.200.23'
];

function readName(buf, offset) {
  const labels = [];
  let pos = offset;
  let jumped = false;
  let end = offset;

  for (let i = 0; i < 128; i += 1) {
    const len = buf[pos];
    if (len === 0) {
      if (!jumped) end = pos + 1;
      return { name: labels.join('.').toLowerCase(), end };
    }
    if ((len & 0xc0) === 0xc0) {
      const pointer = ((len & 0x3f) << 8) | buf[pos + 1];
      if (!jumped) end = pos + 2;
      pos = pointer;
      jumped = true;
      continue;
    }
    labels.push(buf.subarray(pos + 1, pos + 1 + len).toString('ascii'));
    pos += len + 1;
  }

  throw new Error('Invalid DNS name');
}

function encodeName(name) {
  const labels = name.replace(/\.$/, '').split('.');
  const parts = [];
  for (const label of labels) {
    const value = Buffer.from(label, 'ascii');
    parts.push(Buffer.from([value.length]), value);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

function encodeARecord(namePointer, ip, ttl = 60) {
  const rdata = Buffer.from(ip.split('.').map(part => Number(part)));
  const header = Buffer.alloc(12);
  header.writeUInt16BE(namePointer, 0);
  header.writeUInt16BE(1, 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt32BE(ttl, 6);
  header.writeUInt16BE(rdata.length, 10);
  return Buffer.concat([header, rdata]);
}

function encodeSrvRecord(namePointer, priority, weight, port, target, ttl = 60) {
  const targetName = encodeName(target);
  const rdata = Buffer.alloc(6 + targetName.length);
  rdata.writeUInt16BE(priority, 0);
  rdata.writeUInt16BE(weight, 2);
  rdata.writeUInt16BE(port, 4);
  targetName.copy(rdata, 6);

  const header = Buffer.alloc(12);
  header.writeUInt16BE(namePointer, 0);
  header.writeUInt16BE(33, 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt32BE(ttl, 6);
  header.writeUInt16BE(rdata.length, 10);
  return Buffer.concat([header, rdata]);
}

function buildAnswers(name, qtype) {
  const clean = name.replace(/\.$/, '');
  if (qtype === 33 && (
    clean === '_v2-origintunneld._tcp.argotunnel.com' ||
    clean === '_origintunneld._tcp.argotunnel.com'
  )) {
    return [
      encodeSrvRecord(0xc00c, 1, 1, 7844, 'region1.v2.argotunnel.com'),
      encodeSrvRecord(0xc00c, 2, 1, 7844, 'region2.v2.argotunnel.com')
    ];
  }

  if (qtype === 1 && clean === 'region1.v2.argotunnel.com') {
    return REGION1.map(ip => encodeARecord(0xc00c, ip));
  }

  if (qtype === 1 && clean === 'region2.v2.argotunnel.com') {
    return REGION2.map(ip => encodeARecord(0xc00c, ip));
  }

  return [];
}

function handleQuery(message) {
  if (message.length < 12) return null;
  const id = message.subarray(0, 2);
  const question = readName(message, 12);
  const qtype = message.readUInt16BE(question.end);
  const qclass = message.readUInt16BE(question.end + 2);
  const questionBytes = message.subarray(12, question.end + 4);
  const answers = qclass === 1 ? buildAnswers(question.name, qtype) : [];

  const header = Buffer.alloc(12);
  id.copy(header, 0);
  header.writeUInt16BE(0x8180, 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(answers.length, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(0, 10);

  return Buffer.concat([header, questionBytes, ...answers]);
}

const server = dgram.createSocket('udp4');
server.on('message', (message, remote) => {
  try {
    const response = handleQuery(message);
    if (response) server.send(response, remote.port, remote.address);
  } catch (error) {
    console.error(`[cloudflare-dns] ${error.message}`);
  }
});

server.on('error', error => {
  console.error(`[cloudflare-dns] ${error.message}`);
  process.exitCode = 1;
});

server.bind(PORT, HOST, () => {
  console.log(`[cloudflare-dns] listening on ${HOST}:${PORT}`);
});
