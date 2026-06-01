// src/utils/logger.js
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// 判断是否是生产环境（Zeabur 部署时会自动设置 NODE_ENV=production）
const isProduction = process.env.NODE_ENV === 'production';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
);

// =================APP业务日志=================
const appTransports = [
  // 无论是本地还是线上，控制台都要输出（方便本地看，线上 Zeabur 收集）
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), logFormat)
  })
];

// 只有在本地开发环境，才把业务日志写入文件
if (!isProduction) {
  appTransports.push(
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  );
}

const appLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: appTransports
});

// =================HTTP请求日志=================
const httpTransports = [];

// 只有在本地开发环境，才把 HTTP 日志写入文件
if (!isProduction) {
  httpTransports.push(
    new DailyRotateFile({
      filename: 'logs/access-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d'
    })
  );
}

const httpLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: httpTransports
});

// 专门给 morgan 用的流
export const httpLogStream = {
  write: (message) => {
    httpLogger.info(message.trim());
  }
};

export default appLogger;
