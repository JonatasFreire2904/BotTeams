const iconv = require('iconv-lite');

function formatarLog(nivel, mensagem) {
  const timestamp = new Date().toLocaleString('pt-BR', { hour12: false });
  const prefixos = {
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    DEBUG: '🔍'
  };
  return `${prefixos[nivel] || 'ℹ️'} [${timestamp}] ${iconv.decode(Buffer.from(mensagem), 'utf8')}`;
}

module.exports = { formatarLog };