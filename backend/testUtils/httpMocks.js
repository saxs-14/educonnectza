export const mockRes = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

export const mockNext = () => {
  const next = (err) => {
    next.calls.push(err);
  };
  next.calls = [];
  return next;
};
