export const waitForElement = <T extends Element>(
  selector: string,
  options: {
    maxRetry?: number;
    retryInterval?: number;
  } = {
    maxRetry: -1,
    retryInterval: 100,
  },
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    // Check if element already exists
    const existingElement = document.querySelector<T>(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    const maxRetry = options.maxRetry ?? -1;
    const retryInterval = options.retryInterval ?? 100;
    let retryCount = 0;
    let timeoutId: NodeJS.Timeout | undefined;

    // Use MutationObserver for efficient DOM watching
    const observer = new MutationObserver(() => {
      const elem = document.querySelector<T>(selector);
      if (elem) {
        observer.disconnect();
        if (timeoutId) clearTimeout(timeoutId);
        resolve(elem);
      }
    });

    // Start observing
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Fallback polling for timeout/maxRetry support
    if (maxRetry > 0) {
      const checkRetry = () => {
        retryCount++;
        if (retryCount >= maxRetry) {
          observer.disconnect();
          reject(
            new Error(
              `Element ${selector} not found after ${maxRetry} retries`,
            ),
          );
        } else {
          timeoutId = setTimeout(checkRetry, retryInterval);
        }
      };
      timeoutId = setTimeout(checkRetry, retryInterval);
    }
  });
};
