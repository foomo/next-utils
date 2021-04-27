/**
 * Logger for the debug mode
 * @param {boolean} enable enable the logger or not
 * @returns {(message: string, force: boolean) => void}
 */
export const createLogger = (enable: boolean) => {
  const getMessage = (message: string) => `@foomo/next-transpile-modules: ${message}`;
  return {
    debug: (message: string, force?: boolean) => {
      if (enable || force) console.debug(getMessage(message));
    },
    log: (message: string, force?: boolean) => {
      if (enable || force) console.log(getMessage(message));
    },
    info: (message: string, force?: boolean) => {
      if (enable || force) console.info(getMessage(message));
    },
    warn: (message: string) => console.warn(getMessage(message)),
    error: (message: string) => console.error(getMessage(message)),
  };
};
