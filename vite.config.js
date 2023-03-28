const isCodeSandbox =
  'SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env;

export default {
  root: 'src/',
  publicDir: '../static/',
  base: '/threejs-journey-basic-playground',
  server: {
    host: true,
    open: !isCodeSandbox, // Open if it's not a CodeSandbox
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
  },
};
