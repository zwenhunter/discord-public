'use strict';
const path = require('path');
const fs = require('fs');
const winston = require('winston');

const SECRET_PATTERNS = [
  /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g
];

function redact(str) {
  if (typeof str !== 'string') return str;
  let out = str;
  out = out.replace(/[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g, '[REDACTED_TOKEN]');
  out = out.replace(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi, 'mongodb$1://[REDACTED]@');
  out = out.replace(/Authorization\s*Bot\s+\S+/gi, 'Bot [REDACTED]');
  return out;
}

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function createLogger(name, level = 'info') {
  const l = winston.createLogger({
    level,
    defaultMeta: { bot: name },
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf((info) => {
        const { timestamp, level: lvl, message, bot } = info;
        const rest = Object.keys(info).filter((k) => !['timestamp', 'level', 'message', 'bot', 'splat'].includes(k));
        let extra = '';
        if (rest.length) {
          try {
            extra = ' ' + JSON.stringify(rest.reduce((a, k) => { a[k] = info[k]; return a; }, {}));
          } catch { /* ignore */ }
        }
        return `[${timestamp}] [${lvl.toUpperCase()}] [${bot}] ${redact(String(message))}${extra && redact(extra)}`;
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: path.join(logDir, `${name}-error.log`), level: 'error', maxsize: 5 * 1024 * 1024, maxFiles: 3 }),
      new winston.transports.File({ filename: path.join(logDir, `${name}-combined.log`), maxsize: 5 * 1024 * 1024, maxFiles: 3 })
    ],
    exceptionHandlers: [new winston.transports.File({ filename: path.join(logDir, `${name}-exceptions.log`) })],
    rejectionHandlers: [new winston.transports.File({ filename: path.join(logDir, `${name}-rejections.log`) })]
  });
  return l;
}

module.exports = { createLogger, redact };
