import { createHash, randomBytes } from "node:crypto";
import { connect } from "node:net";

const MAX_FRAME_SIZE = 16 * 1024 * 1024;

function framePayload(opcode, payload) {
  const length = payload.length;
  let headerLength = 2;
  if (length >= 126 && length <= 0xffff) headerLength = 4;
  else if (length > 0xffff) headerLength = 10;
  const header = Buffer.alloc(headerLength + 4);
  header[0] = 0x80 | opcode;
  if (length < 126) header[1] = 0x80 | length;
  else if (length <= 0xffff) {
    header[1] = 0x80 | 126;
    header.writeUInt16BE(length, 2);
  } else {
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  const mask = randomBytes(4);
  mask.copy(header, headerLength);
  const masked = Buffer.alloc(length);
  for (let index = 0; index < length; index += 1) {
    masked[index] = payload[index] ^ mask[index % 4];
  }
  return Buffer.concat([header, masked]);
}

export class NodeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    const parsed = new URL(url);
    if (parsed.protocol !== "ws:") throw new TypeError("Only ws:// URLs are supported");
    this.readyState = NodeWebSocket.CONNECTING;
    const host = parsed.hostname.startsWith("[")
      ? parsed.hostname.slice(1, -1)
      : parsed.hostname;
    this.socket = connect({ host, port: Number(parsed.port) });
    this.buffer = Buffer.alloc(0);
    this.handshake = Buffer.alloc(0);
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this.socket.setNoDelay(true);
    this.socket.on("connect", () => this.sendHandshake(parsed));
    this.socket.on("data", (chunk) => this.handleData(chunk));
    this.socket.on("error", (error) => this.fail(error));
    this.socket.on("close", () => this.finishClose());
  }

  sendHandshake(url) {
    this.key = randomBytes(16).toString("base64");
    const path = `${url.pathname || "/"}${url.search}`;
    this.socket.write(
      `GET ${path} HTTP/1.1\r\nHost: ${url.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${this.key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
    );
  }

  handleData(chunk) {
    if (this.readyState === NodeWebSocket.CONNECTING) {
      this.handshake = Buffer.concat([this.handshake, chunk]);
      const separator = this.handshake.indexOf("\r\n\r\n");
      if (separator < 0) return;
      const response = this.handshake.subarray(0, separator).toString();
      const accept = createHash("sha1")
        .update(`${this.key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest("base64");
      const acceptLine = response
        .split("\r\n")
        .find((line) => /^Sec-WebSocket-Accept\s*:/i.test(line));
      const receivedAccept = acceptLine?.slice(acceptLine.indexOf(":") + 1).trim();
      if (!/^HTTP\/1\.1 101 /i.test(response) || receivedAccept !== accept) {
        this.fail(new Error("CDP WebSocket handshake failed"));
        return;
      }
      this.readyState = NodeWebSocket.OPEN;
      this.onopen?.();
      chunk = this.handshake.subarray(separator + 4);
    }
    if (chunk.length > 0) this.buffer = Buffer.concat([this.buffer, chunk]);
    this.readFrames();
  }

  readFrames() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        const largeLength = this.buffer.readBigUInt64BE(2);
        if (largeLength > BigInt(MAX_FRAME_SIZE)) return this.fail(new Error("CDP WebSocket frame is too large"));
        length = Number(largeLength);
        offset = 10;
      }
      const masked = (second & 0x80) !== 0;
      const dataOffset = offset + (masked ? 4 : 0);
      if (this.buffer.length < dataOffset + length) return;
      const mask = masked ? this.buffer.subarray(offset, offset + 4) : null;
      const payload = Buffer.from(this.buffer.subarray(dataOffset, dataOffset + length));
      this.buffer = this.buffer.subarray(dataOffset + length);
      if (mask) for (let index = 0; index < length; index += 1) payload[index] ^= mask[index % 4];
      const opcode = first & 0x0f;
      if (opcode === 0x1) this.onmessage?.({ data: payload.toString() });
      else if (opcode === 0x8) this.close();
      else if (opcode === 0x9) this.socket.write(framePayload(0x0a, payload));
    }
  }

  send(value) {
    if (this.readyState !== NodeWebSocket.OPEN) throw new Error("WebSocket is not open");
    this.socket.write(framePayload(0x1, Buffer.from(value)));
  }

  close() {
    if (this.readyState >= NodeWebSocket.CLOSING) return;
    this.readyState = NodeWebSocket.CLOSING;
    if (!this.socket.destroyed) this.socket.write(framePayload(0x8, Buffer.alloc(0)));
    this.socket.end();
  }

  fail(error) {
    if (this.readyState === NodeWebSocket.CLOSED) return;
    this.onerror?.({ error, message: error.message });
    this.socket.destroy();
  }

  finishClose() {
    if (this.readyState === NodeWebSocket.CLOSED) return;
    this.readyState = NodeWebSocket.CLOSED;
    this.onclose?.({ code: 1006, reason: "" });
  }
}
