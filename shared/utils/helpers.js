'use strict';

/**
 * Kucuk, bot-icin-benzeri yardimcilar.
 */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function truncate(str, max = 1000) {
  if (typeof str !== 'string') return '';
  return str.length <= max ? str : str.slice(0, max - 3) + '...';
}

function codeBlock(s) {
  if (s == null || Number.isNaN(s) || s === '') s = '-';
  const content = String(s).includes('`') ? String(s).replace(/`/g, '`\u200b') : String(s);
  return '```' + content + '```';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validSnowflake(id) {
  return /^(\d{17,20})$/.test(String(id || ''));
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class ValidationError extends Error {
  constructor(msg, usage) {
    super(msg);
    this.name = 'ValidationError';
    this.usage = usage;
  }
}

module.exports = { chunk, truncate, codeBlock, sleep, validSnowflake, escapeRegex, ValidationError };
