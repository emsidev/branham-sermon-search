interface DocumentWithViewTransition extends Document {
  startViewTransition?: (callback: () => void) => unknown;
}

export function runWithViewTransition(callback: () => void): void {
  const doc = document as DocumentWithViewTransition;
  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(callback);
    return;
  }

  callback();
}
