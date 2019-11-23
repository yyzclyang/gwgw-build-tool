const safeData = (fn: () => any) => {
  try {
    return fn();
  } catch (e) {
    return undefined;
  }
};

export default safeData;
