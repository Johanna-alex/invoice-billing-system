
const errorHandler = (err, req, res, next) => {
  console.error(err.message);

  if (err.code === 11000) {
    return res.status(409).json({
      message: "A record with this value already exists"
    });
  }

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message
  });
};

module.exports = errorHandler;
