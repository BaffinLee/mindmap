module.exports = {
  globDirectory: "output/",
  globPatterns: [
    "**/*.{html,js,css,ico,png,jpg,jpeg,gif}"
  ],
  inlineWorkboxRuntime: true,
  swDest: "output/service-worker.js",
  sourcemap: false,
};
