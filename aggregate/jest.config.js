export default {
  transform: {
    "^.+\\.js$": [
      "esbuild-jest",
      {
        sourcemap: true,
      },
    ],
  },
};
